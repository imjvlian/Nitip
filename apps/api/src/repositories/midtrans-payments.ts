import { randomUUID } from "node:crypto";

import type {
  MidtransNativeMethod,
  NitipMidtransChargeResult,
  NitipMidtransInstruction,
  NitipOrder,
  PaymentMethod,
  PaymentProvider,
} from "@nitip/domain/commerce";
import type { ClientSession } from "mongodb";
import { MongoServerError, ObjectId } from "mongodb";

import {
  createMidtransCharge,
  findMidtransAction,
  getMidtransTransactionStatus,
  type MidtransChargeBody,
  type MidtransResponse,
} from "../lib/midtrans.js";
import { getMongoClient, getMongoDb } from "../lib/mongodb.js";
import { getCustomerOrder } from "./orders.js";

interface ReservationItem {
  productId: ObjectId;
  quantity: number;
}

interface MidtransOrderDocument {
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
    provider: PaymentProvider | null;
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

interface ProductDocument {
  stockQuantity: number | null;
  updatedAt: Date;
}

interface MidtransSessionDocument {
  orderId: ObjectId;
  midtransOrderId: string;
  transactionId: string | null;
  method: MidtransNativeMethod;
  genericMethod: PaymentMethod;
  grossAmount: number;
  transactionStatus: string;
  expiresAt: Date | null;
  qrCodeUrl: string | null;
  deeplinkUrl: string | null;
  bank: string | null;
  vaNumber: string | null;
  billerCode: string | null;
  billKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date | null;
}

interface MidtransEventDocument {
  eventKey: string;
  midtransOrderId: string;
  transactionStatus: string;
  createdAt: Date;
}

export class MidtransPaymentError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "MidtransPaymentError";
  }
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes() {
  if (indexesReady) return indexesReady;
  indexesReady = (async () => {
    const db = await getMongoDb();
    await Promise.all([
      db.collection<MidtransSessionDocument>("midtrans_payment_sessions").createIndex(
        { midtransOrderId: 1 },
        { unique: true, name: "midtrans_session_order_id" },
      ),
      db.collection<MidtransSessionDocument>("midtrans_payment_sessions").createIndex(
        { orderId: 1, createdAt: -1 },
        { name: "midtrans_session_nitip_order" },
      ),
      db.collection<MidtransEventDocument>("midtrans_notification_events").createIndex(
        { eventKey: 1 },
        { unique: true, name: "midtrans_notification_event" },
      ),
    ]);
  })();
  return indexesReady;
}

async function restoreStock(
  items: ReservationItem[],
  session: ClientSession,
  now: Date,
) {
  if (!items.length) return;
  const db = await getMongoDb();
  const products = db.collection<ProductDocument>("products");
  for (const item of items) {
    await products.updateOne(
      { _id: item.productId, stockQuantity: { $ne: null } } as never,
      {
        $inc: { stockQuantity: item.quantity },
        $set: { updatedAt: now },
      } as never,
      { session },
    );
  }
}

function genericMethod(method: MidtransNativeMethod): PaymentMethod {
  if (method === "qris") return "qris";
  if (method === "gopay" || method === "shopeepay") return "e_wallet";
  return "virtual_account";
}

function isRetryableTerminal(status: string) {
  const value = status.trim().toLowerCase();
  return value === "deny" || value === "cancel";
}

function amountFromMidtrans(body: MidtransResponse) {
  const amount = Number(body.gross_amount);
  return Number.isFinite(amount) ? amount : null;
}

function parseMidtransDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : `${value.replace(" ", "T")}+07:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function stateFromMidtrans(body: MidtransResponse) {
  const status = body.transaction_status?.trim().toLowerCase() ?? "";
  const statusCode = body.status_code?.trim() ?? "";
  const fraud = body.fraud_status?.trim().toLowerCase() ?? "";
  if (
    (status === "settlement" || status === "capture") &&
    statusCode === "200" &&
    (!fraud || fraud === "accept")
  ) {
    return "success" as const;
  }
  if (status === "refund" || status === "partial_refund") return "refunded" as const;
  if (status === "expire") return "expired" as const;
  if (status === "deny" || status === "cancel") return "failed" as const;
  return "pending" as const;
}

function chargeBody(
  method: MidtransNativeMethod,
  midtransOrderId: string,
  amount: number,
  dueMinutes: number,
  nitipOrderId: string,
  customer: NitipOrder["address"],
): MidtransChargeBody {
  const base: MidtransChargeBody = {
    payment_type: "qris",
    transaction_details: {
      order_id: midtransOrderId,
      gross_amount: Math.round(amount),
    },
    custom_expiry: {
      expiry_duration: dueMinutes,
      unit: "minute",
    },
    customer_details: {
      first_name: customer.recipientName,
      phone: customer.phoneNumber,
    },
  };
  const callbackUrl = `nitip://payment/${encodeURIComponent(nitipOrderId)}`;

  if (method === "qris") {
    return { ...base, payment_type: "qris", qris: { acquirer: "gopay" } };
  }
  if (method === "bca_va" || method === "bni_va" || method === "bri_va") {
    return {
      ...base,
      payment_type: "bank_transfer",
      bank_transfer: { bank: method.replace("_va", "") as "bca" | "bni" | "bri" },
    };
  }
  if (method === "mandiri_bill") {
    return {
      ...base,
      payment_type: "echannel",
      echannel: { bill_info1: "Pembayaran", bill_info2: "Nitip" },
    };
  }
  if (method === "gopay") {
    return {
      ...base,
      payment_type: "gopay",
      gopay: { enable_callback: true, callback_url: callbackUrl },
    };
  }
  return {
    ...base,
    payment_type: "shopeepay",
    shopeepay: { callback_url: callbackUrl },
  };
}

function sessionFromCharge(
  nitipOrderId: ObjectId,
  method: MidtransNativeMethod,
  amount: number,
  dueMinutes: number,
  midtransOrderId: string,
  response: MidtransResponse,
  now: Date,
): MidtransSessionDocument {
  const va = response.va_numbers?.[0];
  return {
    orderId: nitipOrderId,
    midtransOrderId,
    transactionId: response.transaction_id ?? null,
    method,
    genericMethod: genericMethod(method),
    grossAmount: amount,
    transactionStatus: response.transaction_status ?? "pending",
    expiresAt: response.expiry_time
      ? parseMidtransDate(response.expiry_time, new Date(now.getTime() + dueMinutes * 60_000))
      : new Date(now.getTime() + dueMinutes * 60_000),
    qrCodeUrl: findMidtransAction(response, "generate-qr-code-v2", "generate-qr-code"),
    deeplinkUrl: findMidtransAction(response, "deeplink-redirect"),
    bank: va?.bank ?? (method === "mandiri_bill" ? "mandiri" : null),
    vaNumber: va?.va_number ?? response.permata_va_number ?? null,
    billerCode: response.biller_code ?? null,
    billKey: response.bill_key ?? null,
    createdAt: now,
    updatedAt: now,
    lastCheckedAt: null,
  };
}

function instructionFromSession(session: MidtransSessionDocument): NitipMidtransInstruction {
  return {
    provider: "midtrans",
    method: session.method,
    reference: session.midtransOrderId,
    transactionId: session.transactionId,
    transactionStatus: session.transactionStatus,
    expiresAt: session.expiresAt?.toISOString() ?? null,
    qrCodeUrl: session.qrCodeUrl,
    deeplinkUrl: session.deeplinkUrl,
    bank: session.bank,
    vaNumber: session.vaNumber,
    billerCode: session.billerCode,
    billKey: session.billKey,
  };
}

async function validateResponse(body: MidtransResponse) {
  const midtransOrderId = body.order_id?.trim();
  if (!midtransOrderId) {
    throw new MidtransPaymentError("invalid_reference", 400, "Referensi pembayaran tidak valid.");
  }
  const db = await getMongoDb();
  const sessions = db.collection<MidtransSessionDocument>("midtrans_payment_sessions");
  const session = await sessions.findOne({ midtransOrderId });
  if (!session) {
    throw new MidtransPaymentError("payment_session_not_found", 404, "Sesi pembayaran tidak ditemukan.");
  }
  const orders = db.collection<MidtransOrderDocument>("orders");
  const existing = await orders.findOne({ _id: session.orderId } as never);
  if (!existing) {
    throw new MidtransPaymentError("order_not_found", 404, "Pesanan tidak ditemukan.");
  }
  const amount = amountFromMidtrans(body);
  if (amount != null && Math.round(amount) !== Math.round(existing.customerTotal)) {
    throw new MidtransPaymentError("amount_mismatch", 409, "Nominal pembayaran tidak sesuai pesanan.");
  }
  return { midtransOrderId, session, sessions, orders, existing };
}

async function applyMidtransState(body: MidtransResponse) {
  const { midtransOrderId, session, sessions, orders, existing } = await validateResponse(body);
  const state = stateFromMidtrans(body);
  const now = new Date();
  const isActiveAttempt =
    existing.payment?.provider === "midtrans" &&
    existing.payment.reference === midtransOrderId;

  await sessions.updateOne(
    { midtransOrderId },
    {
      $set: {
        transactionId: body.transaction_id ?? session.transactionId,
        transactionStatus: body.transaction_status ?? session.transactionStatus,
        updatedAt: now,
        lastCheckedAt: now,
      },
    },
  );

  if (state === "success") {
    await orders.updateOne(
      {
        _id: session.orderId,
        status: "pending_payment",
        "payment.provider": "midtrans",
      } as never,
      {
        $set: {
          status: "paid",
          cancellationReason: null,
          payment: {
            provider: "midtrans",
            status: "paid",
            method: session.genericMethod,
            reference: midtransOrderId,
            checkoutUrl: null,
            expiresAt: null,
            paidAt: parseMidtransDate(
              body.settlement_time ?? body.transaction_time,
              now,
            ),
            refundedAt: null,
          },
          stockReservationStatus:
            existing.stockReservationStatus === "reserved"
              ? "committed"
              : existing.stockReservationStatus ?? null,
          stockReservationExpiresAt: null,
          stockReservationCommittedAt:
            existing.stockReservationStatus === "reserved"
              ? now
              : existing.stockReservationCommittedAt ?? null,
          updatedAt: now,
        },
      } as never,
    );
  } else if (state === "expired" && isActiveAttempt) {
    const client = await getMongoClient();
    const mongoSession = client.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        const latest = await orders.findOne(
          {
            _id: session.orderId,
            status: "pending_payment",
            "payment.provider": "midtrans",
            "payment.reference": midtransOrderId,
          } as never,
          { session: mongoSession },
        );
        if (!latest) return;
        const shouldRestore = latest.stockReservationStatus === "reserved";
        const result = await orders.updateOne(
          {
            _id: session.orderId,
            status: "pending_payment",
            "payment.provider": "midtrans",
            "payment.reference": midtransOrderId,
          } as never,
          {
            $set: {
              status: "cancelled",
              cancellationReason: "Waktu pembayaran sudah habis.",
              payment: {
                provider: "midtrans",
                status: "expired",
                method: session.genericMethod,
                reference: midtransOrderId,
                checkoutUrl: null,
                expiresAt: session.expiresAt,
                paidAt: latest.payment?.paidAt ?? null,
                refundedAt: null,
              },
              stockReservationStatus: shouldRestore
                ? "released"
                : latest.stockReservationStatus ?? null,
              stockReservationExpiresAt: null,
              stockReservationReleasedAt: shouldRestore
                ? now
                : latest.stockReservationReleasedAt ?? null,
              updatedAt: now,
            },
          } as never,
          { session: mongoSession },
        );
        if (result.modifiedCount === 1 && shouldRestore) {
          await restoreStock(latest.stockReservedItems ?? [], mongoSession, now);
        }
      });
    } finally {
      await mongoSession.endSession();
    }
  } else if (state === "failed" && isActiveAttempt) {
    // The charge attempt is terminal, but the Nitip order remains payable until its
    // original Midtrans expiry. payment.status stays pending so another method can be tried.
    await orders.updateOne(
      {
        _id: session.orderId,
        status: "pending_payment",
        "payment.provider": "midtrans",
        "payment.reference": midtransOrderId,
      } as never,
      {
        $set: {
          "payment.status": "pending",
          "payment.method": session.genericMethod,
          "payment.expiresAt": session.expiresAt,
          updatedAt: now,
        },
      } as never,
    );
  } else if (state === "refunded") {
    await orders.updateOne(
      {
        _id: session.orderId,
        "payment.provider": "midtrans",
        "payment.status": "paid",
      } as never,
      {
        $set: {
          status: "refunded",
          activeDriverAssignment: false,
          "payment.status": "refunded",
          "payment.method": session.genericMethod,
          "payment.refundedAt": now,
          "settlement.status": "reversed",
          updatedAt: now,
        },
      } as never,
    );
  }

  return state;
}

async function resultFor(
  customerFirebaseUid: string,
  id: string,
  session: MidtransSessionDocument,
): Promise<NitipMidtransChargeResult> {
  const order = await getCustomerOrder(customerFirebaseUid, id);
  if (!order) throw new MidtransPaymentError("order_not_found", 404, "Pesanan tidak ditemukan.");
  const db = await getMongoDb();
  const refreshed = await db
    .collection<MidtransSessionDocument>("midtrans_payment_sessions")
    .findOne({ midtransOrderId: session.midtransOrderId });
  return {
    order,
    instruction: instructionFromSession(refreshed ?? session),
  };
}

export async function startCustomerMidtransPayment(
  customerFirebaseUid: string,
  id: string,
  method: MidtransNativeMethod,
): Promise<NitipMidtransChargeResult | null> {
  if (!ObjectId.isValid(id)) return null;
  await ensureIndexes();
  let current = await getCustomerOrder(customerFirebaseUid, id);
  if (!current) return null;
  if (current.status !== "pending_payment") {
    throw new MidtransPaymentError("payment_not_pending", 409, "Pesanan tidak lagi menunggu pembayaran.");
  }
  if (current.payment?.provider && current.payment.provider !== "midtrans") {
    throw new MidtransPaymentError("payment_provider_mismatch", 409, "Pesanan sudah menggunakan penyedia pembayaran lain.");
  }

  const db = await getMongoDb();
  const sessions = db.collection<MidtransSessionDocument>("midtrans_payment_sessions");
  const orderId = new ObjectId(id);
  if (current.payment?.provider === "midtrans" && current.payment.reference) {
    const existingSession = await sessions.findOne({
      orderId,
      midtransOrderId: current.payment.reference,
    });
    if (existingSession && !isRetryableTerminal(existingSession.transactionStatus)) {
      if (!existingSession.expiresAt || existingSession.expiresAt.getTime() > Date.now() + 5_000) {
        return resultFor(customerFirebaseUid, id, existingSession);
      }
      const reconciled = await reconcileCustomerMidtransPayment(customerFirebaseUid, id);
      if (!reconciled || reconciled.order.status !== "pending_payment") return reconciled;
      if (!isRetryableTerminal(reconciled.instruction.transactionStatus)) return reconciled;
      current = reconciled.order;
    }
  }

  const reservationExpiry = current.payment?.expiresAt
    ? new Date(current.payment.expiresAt)
    : current.stockReservationExpiresAt
      ? new Date(current.stockReservationExpiresAt)
      : null;
  const remainingMs = reservationExpiry
    ? reservationExpiry.getTime() - Date.now()
    : 15 * 60_000;
  if (remainingMs <= 0) {
    throw new MidtransPaymentError("payment_expired", 409, "Waktu pembayaran pesanan sudah habis.");
  }
  const dueMinutes = Math.max(1, Math.min(60, Math.ceil(remainingMs / 60_000)));
  const midtransOrderId = `NITIP-${id}-${randomUUID().slice(0, 8)}`;
  const response = await createMidtransCharge(
    chargeBody(method, midtransOrderId, current.customerTotal, dueMinutes, id, current.address),
    `nitip-${midtransOrderId}`,
  );
  if (!response.order_id || !response.transaction_status) {
    throw new MidtransPaymentError("invalid_charge_response", 502, "Pembayaran belum dapat disiapkan.");
  }
  const now = new Date();
  const newSession = sessionFromCharge(
    orderId,
    method,
    current.customerTotal,
    dueMinutes,
    midtransOrderId,
    response,
    now,
  );
  try {
    await sessions.insertOne(newSession);
  } catch (error) {
    if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    const replay = await sessions.findOne({ midtransOrderId });
    if (replay) return resultFor(customerFirebaseUid, id, replay);
    throw error;
  }

  const orders = db.collection<MidtransOrderDocument>("orders");
  const updated = await orders.updateOne(
    {
      _id: orderId,
      customerFirebaseUid,
      status: "pending_payment",
      "payment.status": "pending",
      $or: [
        { "payment.provider": null },
        { "payment.provider": { $exists: false } },
        { "payment.provider": "midtrans" },
      ],
    } as never,
    {
      $set: {
        payment: {
          provider: "midtrans",
          status: "pending",
          method: newSession.genericMethod,
          reference: midtransOrderId,
          checkoutUrl: null,
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
    throw new MidtransPaymentError("payment_conflict", 409, "Status pembayaran berubah. Muat ulang pesanan.");
  }

  return resultFor(customerFirebaseUid, id, newSession);
}

export async function reconcileCustomerMidtransPayment(
  customerFirebaseUid: string,
  id: string,
): Promise<NitipMidtransChargeResult | null> {
  if (!ObjectId.isValid(id)) return null;
  await ensureIndexes();
  const current = await getCustomerOrder(customerFirebaseUid, id);
  if (!current) return null;
  if (current.payment?.provider !== "midtrans" || !current.payment.reference) {
    throw new MidtransPaymentError("midtrans_payment_not_started", 409, "Pembayaran belum dimulai.");
  }
  const db = await getMongoDb();
  const sessions = db.collection<MidtransSessionDocument>("midtrans_payment_sessions");
  const session = await sessions.findOne({
    orderId: new ObjectId(id),
    midtransOrderId: current.payment.reference,
  });
  if (!session) {
    throw new MidtransPaymentError("payment_session_not_found", 404, "Sesi pembayaran tidak ditemukan.");
  }
  if (current.status !== "pending_payment") return resultFor(customerFirebaseUid, id, session);

  const status = await getMidtransTransactionStatus(session.midtransOrderId);
  await applyMidtransState(status);
  return resultFor(customerFirebaseUid, id, session);
}

export async function processMidtransNotification(body: MidtransResponse) {
  await ensureIndexes();
  const midtransOrderId = body.order_id?.trim();
  const transactionStatus = body.transaction_status?.trim().toLowerCase();
  if (!midtransOrderId || !transactionStatus) {
    throw new MidtransPaymentError("invalid_notification", 400, "Notifikasi pembayaran tidak valid.");
  }
  const eventKey = [
    body.transaction_id ?? midtransOrderId,
    transactionStatus,
    body.status_code ?? "",
    body.settlement_time ?? body.transaction_time ?? "",
  ].join(":");

  const db = await getMongoDb();
  const events = db.collection<MidtransEventDocument>("midtrans_notification_events");
  const duplicate = await events.findOne({ eventKey });
  if (duplicate) return { duplicate: true, status: duplicate.transactionStatus };

  await applyMidtransState(body);
  try {
    await events.insertOne({
      eventKey,
      midtransOrderId,
      transactionStatus,
      createdAt: new Date(),
    });
  } catch (error) {
    if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    return { duplicate: true, status: transactionStatus };
  }
  return { duplicate: false, status: transactionStatus };
}
