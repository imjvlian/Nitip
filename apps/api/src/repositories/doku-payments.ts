import type { NitipOrder, PaymentMethod } from "@nitip/domain/commerce";
import type { ClientSession } from "mongodb";
import { ObjectId } from "mongodb";

import { createDokuCheckout, getDokuOrderStatus, type DokuNotificationBody } from "../lib/doku.js";
import { getMongoClient, getMongoDb } from "../lib/mongodb.js";
import { getCustomerOrder } from "./orders.js";

interface ReservationItem { productId: ObjectId; quantity: number; }
interface DokuOrderDocument {
  customerFirebaseUid: string;
  customerTotal: number;
  status: string;
  cancellationReason?: string | null;
  stockReservationStatus?: string | null;
  stockReservationExpiresAt?: Date | null;
  stockReservationCommittedAt?: Date | null;
  stockReservationReleasedAt?: Date | null;
  stockReservedItems?: ReservationItem[];
  activeDriverAssignment?: boolean;
  payment?: {
    provider: "development" | "doku" | null;
    status: "pending" | "paid" | "failed" | "expired" | "refunded";
    method: PaymentMethod | null;
    reference: string | null;
    checkoutUrl: string | null;
    expiresAt: Date | null;
    paidAt: Date | null;
    refundedAt: Date | null;
  } | null;
  settlement?: {
    status: "pending" | "eligible" | "settled" | "reversed";
    amount: number;
    eligibleAt: Date | null;
    settledAt: Date | null;
    reference: string | null;
  } | null;
  updatedAt: Date;
}
interface ProductDocument { stockQuantity: number | null; updatedAt: Date; }
interface DokuEventDocument { requestId: string; invoiceNumber: string; transactionStatus: string; createdAt: Date; }
interface DokuSessionDocument {
  orderId: ObjectId;
  requestId: string;
  checkoutUrl: string;
  tokenId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date | null;
}

export class DokuPaymentError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number, message: string) {
    super(message);
    this.name = "DokuPaymentError";
  }
}

let dokuIndexesReady: Promise<void> | null = null;
async function ensureDokuIndexes() {
  if (dokuIndexesReady) return dokuIndexesReady;
  dokuIndexesReady = (async () => {
    const db = await getMongoDb();
    await Promise.all([
      db.collection<DokuEventDocument>("doku_notification_events").createIndex(
        { requestId: 1 },
        { unique: true, name: "doku_notification_request_id" },
      ),
      db.collection<DokuSessionDocument>("doku_payment_sessions").createIndex(
        { orderId: 1 },
        { unique: true, name: "doku_payment_session_order" },
      ),
    ]);
  })();
  return dokuIndexesReady;
}

async function restoreStock(items: ReservationItem[], session: ClientSession, now: Date) {
  if (!items.length) return;
  const db = await getMongoDb();
  const products = db.collection<ProductDocument>("products");
  for (const item of items) {
    await products.updateOne(
      { _id: item.productId, stockQuantity: { $ne: null } } as never,
      { $inc: { stockQuantity: item.quantity }, $set: { updatedAt: now } } as never,
      { session },
    );
  }
}

function paymentMethodFromDoku(body: DokuNotificationBody): PaymentMethod {
  const value = `${body.service?.id ?? ""} ${body.channel?.id ?? ""}`.toUpperCase();
  if (value.includes("QRIS") || value.includes("QR_")) return "qris";
  if (value.includes("VIRTUAL_ACCOUNT")) return "virtual_account";
  if (value.includes("CREDIT_CARD") || value.includes("CARD")) return "card";
  if (value.includes("EMONEY") || value.includes("E_MONEY") || value.includes("EWALLET") || value.includes("WALLET")) return "e_wallet";
  if (value.includes("PAYLATER") || value.includes("PEER_TO_PEER")) return "paylater";
  if (value.includes("ONLINE_TO_OFFLINE") || value.includes("CONVENIENCE")) return "convenience_store";
  return "unknown";
}

function amountFromDoku(body: DokuNotificationBody) {
  const amount = typeof body.order?.amount === "string" ? Number(body.order.amount) : body.order?.amount;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function validDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function dokuState(body: DokuNotificationBody) {
  const transactionStatus = body.transaction?.status?.trim().toUpperCase() ?? "";
  const orderStatus = body.order?.status?.trim().toUpperCase() ?? "";
  if (transactionStatus === "SUCCESS") return "success" as const;
  if (transactionStatus === "REFUNDED") return "refunded" as const;
  if (transactionStatus === "EXPIRED" || orderStatus === "ORDER_EXPIRED") return "expired" as const;
  // Checkout FAILED is intentionally non-terminal: customer can retry or switch channel.
  // TIMEOUT and REDIRECT are also non-terminal and must be reconciled through Check Status.
  return "pending" as const;
}

async function validateDokuOrder(body: DokuNotificationBody) {
  const invoiceNumber = body.order?.invoice_number?.trim();
  if (!invoiceNumber || !ObjectId.isValid(invoiceNumber)) {
    throw new DokuPaymentError("invalid_invoice", 400, "DOKU response contains an invalid invoice number.");
  }
  const db = await getMongoDb();
  const orders = db.collection<DokuOrderDocument>("orders");
  const orderId = new ObjectId(invoiceNumber);
  const existing = await orders.findOne({ _id: orderId } as never);
  if (!existing) throw new DokuPaymentError("order_not_found", 404, "DOKU invoice is not known by Nitip.");
  if (existing.payment?.provider !== "doku") {
    throw new DokuPaymentError("payment_provider_mismatch", 409, "Order is not attached to an active DOKU payment.");
  }
  const notifiedAmount = amountFromDoku(body);
  if (notifiedAmount != null && Math.round(notifiedAmount) !== Math.round(existing.customerTotal)) {
    throw new DokuPaymentError("amount_mismatch", 409, "DOKU amount does not match the Nitip order.");
  }
  const originalRequestId = body.transaction?.original_request_id?.trim() || null;
  if (existing.payment.reference && originalRequestId && existing.payment.reference !== originalRequestId) {
    throw new DokuPaymentError("request_mismatch", 409, "DOKU response does not match the active payment request.");
  }
  return { invoiceNumber, orderId, existing, orders, originalRequestId };
}

async function applyDokuState(body: DokuNotificationBody) {
  const { orderId, existing, orders, originalRequestId } = await validateDokuOrder(body);
  const state = dokuState(body);
  const now = new Date();
  const method = paymentMethodFromDoku(body);

  if (state === "success") {
    await orders.updateOne(
      { _id: orderId, status: "pending_payment", "payment.provider": "doku", "payment.status": "pending" } as never,
      {
        $set: {
          status: "paid",
          cancellationReason: null,
          payment: {
            provider: "doku",
            status: "paid",
            method,
            reference: originalRequestId ?? existing.payment?.reference ?? null,
            checkoutUrl: existing.payment?.checkoutUrl ?? null,
            expiresAt: null,
            paidAt: validDate(body.transaction?.date, now),
            refundedAt: null,
          },
          stockReservationStatus: existing.stockReservationStatus === "reserved" ? "committed" : existing.stockReservationStatus ?? null,
          stockReservationExpiresAt: null,
          stockReservationCommittedAt: existing.stockReservationStatus === "reserved" ? now : existing.stockReservationCommittedAt ?? null,
          updatedAt: now,
        },
      } as never,
    );
  } else if (state === "expired") {
    const client = await getMongoClient();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const latest = await orders.findOne(
          { _id: orderId, status: "pending_payment", "payment.provider": "doku", "payment.status": "pending" } as never,
          { session },
        );
        if (!latest) return;
        const shouldRestore = latest.stockReservationStatus === "reserved";
        const result = await orders.updateOne(
          { _id: orderId, status: "pending_payment", "payment.provider": "doku", "payment.status": "pending" } as never,
          {
            $set: {
              status: "cancelled",
              cancellationReason: "DOKU mengonfirmasi waktu pembayaran sudah habis.",
              payment: {
                provider: "doku",
                status: "expired",
                method,
                reference: originalRequestId ?? latest.payment?.reference ?? null,
                checkoutUrl: latest.payment?.checkoutUrl ?? null,
                expiresAt: null,
                paidAt: latest.payment?.paidAt ?? null,
                refundedAt: null,
              },
              stockReservationStatus: shouldRestore ? "released" : latest.stockReservationStatus ?? null,
              stockReservationExpiresAt: null,
              stockReservationReleasedAt: shouldRestore ? now : latest.stockReservationReleasedAt ?? null,
              updatedAt: now,
            },
          } as never,
          { session },
        );
        if (result.modifiedCount === 1 && shouldRestore) {
          await restoreStock(latest.stockReservedItems ?? [], session, now);
        }
      });
    } finally {
      await session.endSession();
    }
  } else if (state === "refunded") {
    await orders.updateOne(
      { _id: orderId, "payment.provider": "doku", "payment.status": "paid" } as never,
      {
        $set: {
          status: "refunded",
          activeDriverAssignment: false,
          "payment.status": "refunded",
          "payment.method": method,
          "payment.refundedAt": now,
          "settlement.status": "reversed",
          updatedAt: now,
        },
      } as never,
    );
  }

  return state;
}

export async function startCustomerDokuCheckout(customerFirebaseUid: string, id: string): Promise<NitipOrder | null> {
  if (!ObjectId.isValid(id)) return null;
  await ensureDokuIndexes();
  let current = await getCustomerOrder(customerFirebaseUid, id);
  if (!current) return null;
  if (current.status !== "pending_payment") {
    throw new DokuPaymentError("payment_not_pending", 409, "Pesanan tidak lagi menunggu pembayaran.");
  }

  const db = await getMongoDb();
  const sessionCollection = db.collection<DokuSessionDocument>("doku_payment_sessions");
  const objectId = new ObjectId(id);
  if (current.payment?.provider === "doku" && current.payment.checkoutUrl) {
    const existingSession = await sessionCollection.findOne({ orderId: objectId });
    if (!existingSession?.expiresAt || existingSession.expiresAt.getTime() > Date.now() + 10_000) {
      return current;
    }
    current = await reconcileCustomerDokuPayment(customerFirebaseUid, id);
    if (!current || current.status !== "pending_payment") return current;
    throw new DokuPaymentError(
      "payment_reconciliation_pending",
      409,
      "Sesi DOKU sebelumnya sudah melewati batas waktu tetapi status final belum diterima. Coba cek status lagi sebelum membuat pembayaran baru.",
    );
  }

  const reservationExpiry = current.stockReservationExpiresAt
    ? new Date(current.stockReservationExpiresAt)
    : current.payment?.expiresAt
      ? new Date(current.payment.expiresAt)
      : null;
  const remainingMs = reservationExpiry ? reservationExpiry.getTime() - Date.now() : 15 * 60_000;
  if (remainingMs <= 0) {
    throw new DokuPaymentError("payment_expired", 409, "Waktu pembayaran pesanan sudah habis.");
  }
  const dueMinutes = Math.max(1, Math.min(60, Math.ceil(remainingMs / 60_000)));
  const checkout = await createDokuCheckout({ invoiceNumber: id, amount: current.customerTotal, dueMinutes });
  const now = new Date();
  const orders = db.collection<DokuOrderDocument>("orders");

  // Once a DOKU Checkout exists, DOKU is the source of truth for expiry. We deliberately
  // clear the generic local expiry fields so a local timer cannot release stock while the
  // remote payment session may still be completing.
  const updated = await orders.updateOne(
    {
      _id: objectId,
      customerFirebaseUid,
      status: "pending_payment",
      "payment.status": "pending",
      $or: [{ "payment.provider": null }, { "payment.provider": { $exists: false } }],
    } as never,
    {
      $set: {
        payment: {
          provider: "doku",
          status: "pending",
          method: null,
          reference: checkout.requestId,
          checkoutUrl: checkout.checkoutUrl,
          expiresAt: null,
          paidAt: null,
          refundedAt: null,
        },
        stockReservationExpiresAt: null,
        updatedAt: now,
      },
    } as never,
  );
  if (updated.modifiedCount !== 1) {
    throw new DokuPaymentError("payment_conflict", 409, "Status pembayaran berubah. Muat ulang pesanan.");
  }

  await sessionCollection.updateOne(
    { orderId: objectId },
    {
      $set: {
        orderId: objectId,
        requestId: checkout.requestId,
        checkoutUrl: checkout.checkoutUrl,
        tokenId: checkout.tokenId,
        expiresAt: checkout.expiresAt,
        updatedAt: now,
        lastCheckedAt: null,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return getCustomerOrder(customerFirebaseUid, id);
}

export async function reconcileCustomerDokuPayment(customerFirebaseUid: string, id: string): Promise<NitipOrder | null> {
  if (!ObjectId.isValid(id)) return null;
  await ensureDokuIndexes();
  const current = await getCustomerOrder(customerFirebaseUid, id);
  if (!current) return null;
  if (current.payment?.provider !== "doku") {
    throw new DokuPaymentError("doku_payment_not_started", 409, "DOKU Checkout belum dibuat untuk pesanan ini.");
  }
  if (current.payment.status !== "pending") return current;

  const status = await getDokuOrderStatus(id);
  if (!status.order?.invoice_number) status.order = { ...(status.order ?? {}), invoice_number: id };
  await applyDokuState(status);
  const db = await getMongoDb();
  await db.collection<DokuSessionDocument>("doku_payment_sessions").updateOne(
    { orderId: new ObjectId(id) },
    { $set: { lastCheckedAt: new Date(), updatedAt: new Date() } },
  );
  return getCustomerOrder(customerFirebaseUid, id);
}

export async function processDokuNotification(requestId: string, body: DokuNotificationBody) {
  await ensureDokuIndexes();
  const invoiceNumber = body.order?.invoice_number?.trim();
  if (!invoiceNumber || !ObjectId.isValid(invoiceNumber)) {
    throw new DokuPaymentError("invalid_invoice", 400, "DOKU notification contains an invalid invoice number.");
  }
  const transactionStatus = body.transaction?.status?.trim().toUpperCase() || body.order?.status?.trim().toUpperCase();
  if (!transactionStatus) {
    throw new DokuPaymentError("invalid_status", 400, "DOKU notification status is missing.");
  }

  const db = await getMongoDb();
  const events = db.collection<DokuEventDocument>("doku_notification_events");
  const duplicate = await events.findOne({ requestId });
  if (duplicate) return { duplicate: true, status: duplicate.transactionStatus };

  await applyDokuState(body);
  const now = new Date();
  try {
    await events.insertOne({ requestId, invoiceNumber, transactionStatus, createdAt: now });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === 11000)) throw error;
    return { duplicate: true, status: transactionStatus };
  }
  return { duplicate: false, status: transactionStatus };
}
