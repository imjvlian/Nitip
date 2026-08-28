import type { NitipOrder, PaymentMethod } from "@nitip/domain/commerce";
import type { ClientSession } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoClient, getMongoDb } from "../lib/mongodb.js";
import { createDokuCheckout, type DokuNotificationBody } from "../lib/doku.js";
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

export class DokuPaymentError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number, message: string) {
    super(message);
    this.name = "DokuPaymentError";
  }
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

function paymentMethodFromNotification(body: DokuNotificationBody): PaymentMethod {
  const value = `${body.service?.id ?? ""} ${body.channel?.id ?? ""}`.toUpperCase();
  if (value.includes("QRIS") || value.includes("QR_")) return "qris";
  if (value.includes("VIRTUAL_ACCOUNT")) return "virtual_account";
  if (value.includes("CREDIT_CARD") || value.includes("CARD")) return "card";
  if (value.includes("EMONEY") || value.includes("EWALLET") || value.includes("WALLET")) return "e_wallet";
  if (value.includes("PAYLATER") || value.includes("PEER_TO_PEER")) return "paylater";
  if (value.includes("ONLINE_TO_OFFLINE") || value.includes("CONVENIENCE")) return "convenience_store";
  return "unknown";
}

function amountFromNotification(body: DokuNotificationBody) {
  const amount = typeof body.order?.amount === "string" ? Number(body.order.amount) : body.order?.amount;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

async function ensureEventIndex() {
  const db = await getMongoDb();
  await db.collection<DokuEventDocument>("doku_notification_events").createIndex(
    { requestId: 1 },
    { unique: true, name: "doku_notification_request_id" },
  );
}

export async function startCustomerDokuCheckout(customerFirebaseUid: string, id: string): Promise<NitipOrder | null> {
  if (!ObjectId.isValid(id)) return null;
  const current = await getCustomerOrder(customerFirebaseUid, id);
  if (!current) return null;
  if (current.status !== "pending_payment") {
    throw new DokuPaymentError("payment_not_pending", 409, "Pesanan tidak lagi menunggu pembayaran.");
  }

  const currentExpiry = current.payment?.expiresAt ? new Date(current.payment.expiresAt) : null;
  if (
    current.payment?.provider === "doku" &&
    current.payment.checkoutUrl &&
    current.payment.status === "pending" &&
    currentExpiry &&
    currentExpiry.getTime() > Date.now() + 10_000
  ) {
    return current;
  }

  const reservationExpiry = current.stockReservationExpiresAt
    ? new Date(current.stockReservationExpiresAt)
    : currentExpiry;
  const remainingMs = reservationExpiry ? reservationExpiry.getTime() - Date.now() : 15 * 60_000;
  if (remainingMs <= 0) {
    throw new DokuPaymentError("payment_expired", 409, "Waktu pembayaran pesanan sudah habis.");
  }
  const dueMinutes = Math.max(1, Math.min(60, Math.ceil(remainingMs / 60_000)));
  const checkout = await createDokuCheckout({
    invoiceNumber: id,
    amount: current.customerTotal,
    dueMinutes,
  });

  const db = await getMongoDb();
  const orders = db.collection<DokuOrderDocument>("orders");
  const now = new Date();
  const expiresAt = checkout.expiresAt && checkout.expiresAt.getTime() < now.getTime() + remainingMs
    ? checkout.expiresAt
    : new Date(now.getTime() + remainingMs);
  const updated = await orders.updateOne(
    {
      _id: new ObjectId(id),
      customerFirebaseUid,
      status: "pending_payment",
      "payment.status": "pending",
    } as never,
    {
      $set: {
        payment: {
          provider: "doku",
          status: "pending",
          method: null,
          reference: checkout.requestId,
          checkoutUrl: checkout.checkoutUrl,
          expiresAt,
          paidAt: null,
          refundedAt: null,
        },
        stockReservationExpiresAt: expiresAt,
        updatedAt: now,
      },
    } as never,
  );
  if (updated.modifiedCount !== 1) {
    throw new DokuPaymentError("payment_conflict", 409, "Status pembayaran berubah. Muat ulang pesanan.");
  }
  return getCustomerOrder(customerFirebaseUid, id);
}

export async function processDokuNotification(requestId: string, body: DokuNotificationBody) {
  const invoiceNumber = body.order?.invoice_number?.trim();
  if (!invoiceNumber || !ObjectId.isValid(invoiceNumber)) {
    throw new DokuPaymentError("invalid_invoice", 400, "DOKU notification contains an invalid invoice number.");
  }
  const transactionStatus = body.transaction?.status?.trim().toUpperCase();
  if (!transactionStatus) {
    throw new DokuPaymentError("invalid_status", 400, "DOKU notification transaction status is missing.");
  }

  await ensureEventIndex();
  const db = await getMongoDb();
  const events = db.collection<DokuEventDocument>("doku_notification_events");
  const duplicate = await events.findOne({ requestId });
  if (duplicate) return { duplicate: true, status: duplicate.transactionStatus };

  const orderId = new ObjectId(invoiceNumber);
  const orders = db.collection<DokuOrderDocument>("orders");
  const existing = await orders.findOne({ _id: orderId } as never);
  if (!existing) throw new DokuPaymentError("order_not_found", 404, "DOKU invoice is not known by Nitip.");

  const notifiedAmount = amountFromNotification(body);
  if (notifiedAmount != null && Math.round(notifiedAmount) !== Math.round(existing.customerTotal)) {
    throw new DokuPaymentError("amount_mismatch", 409, "DOKU notification amount does not match the Nitip order.");
  }
  const originalRequestId = body.transaction?.original_request_id?.trim() || null;
  if (
    existing.payment?.provider === "doku" &&
    existing.payment.reference &&
    originalRequestId &&
    existing.payment.reference !== originalRequestId
  ) {
    throw new DokuPaymentError("request_mismatch", 409, "DOKU notification does not match the active payment request.");
  }

  const now = new Date();
  const method = paymentMethodFromNotification(body);

  if (transactionStatus === "SUCCESS") {
    await orders.updateOne(
      { _id: orderId, status: "pending_payment" } as never,
      {
        $set: {
          status: "paid",
          cancellationReason: null,
          payment: {
            provider: "doku",
            status: "paid",
            method,
            reference: originalRequestId ?? existing.payment?.reference ?? requestId,
            checkoutUrl: existing.payment?.checkoutUrl ?? null,
            expiresAt: existing.payment?.expiresAt ?? null,
            paidAt: body.transaction?.date ? new Date(body.transaction.date) : now,
            refundedAt: null,
          },
          stockReservationStatus: existing.stockReservationStatus === "reserved" ? "committed" : existing.stockReservationStatus ?? null,
          stockReservationExpiresAt: null,
          stockReservationCommittedAt: existing.stockReservationStatus === "reserved" ? now : existing.stockReservationCommittedAt ?? null,
          updatedAt: now,
        },
      } as never,
    );
  } else if (transactionStatus === "EXPIRED" || transactionStatus === "TIMEOUT") {
    const client = await getMongoClient();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const latest = await orders.findOne({ _id: orderId, status: "pending_payment" } as never, { session });
        if (!latest) return;
        const shouldRestore = latest.stockReservationStatus === "reserved";
        const result = await orders.updateOne(
          { _id: orderId, status: "pending_payment" } as never,
          {
            $set: {
              status: "cancelled",
              cancellationReason: "Waktu pembayaran DOKU habis. Pesanan dibatalkan otomatis.",
              payment: {
                provider: "doku",
                status: "expired",
                method,
                reference: originalRequestId ?? latest.payment?.reference ?? requestId,
                checkoutUrl: latest.payment?.checkoutUrl ?? null,
                expiresAt: latest.payment?.expiresAt ?? now,
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
  } else if (transactionStatus === "REFUNDED") {
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
  // For DOKU Checkout, FAILED is intentionally ignored so the customer can retry/change channel.

  try {
    await events.insertOne({ requestId, invoiceNumber, transactionStatus, createdAt: now });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === 11000)) throw error;
  }
  return { duplicate: false, status: transactionStatus };
}
