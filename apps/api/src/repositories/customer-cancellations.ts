import type { NitipOrder } from "@nitip/domain/commerce";
import type { ClientSession, Collection } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoClient, getMongoDb } from "../lib/mongodb.js";
import { getCustomerOrder } from "./orders.js";

interface ReservationItem { productId: ObjectId; quantity: number; }
interface CancellationOrderDocument {
  customerFirebaseUid: string;
  status: string;
  cancellationReason?: string | null;
  stockReservationStatus?: string | null;
  stockReservationExpiresAt?: Date | null;
  stockReservationReleasedAt?: Date | null;
  stockReservedItems?: ReservationItem[];
  payment?: {
    provider: "development" | "doku" | null;
    status: "pending" | "paid" | "failed" | "expired" | "refunded";
    method: string | null;
    reference: string | null;
    checkoutUrl: string | null;
    expiresAt: Date | null;
    paidAt: Date | null;
    refundedAt: Date | null;
  } | null;
  updatedAt: Date;
}
interface ProductDocument { stockQuantity: number | null; updatedAt: Date; }

export class CustomerCancellationError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number, message: string) {
    super(message); this.name = "CustomerCancellationError";
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

export async function cancelPendingCustomerOrder(customerFirebaseUid: string, id: string, reason?: string | null): Promise<NitipOrder | null> {
  if (!ObjectId.isValid(id)) return null;
  const objectId = new ObjectId(id);
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const db = await getMongoDb();
      const orders = db.collection<CancellationOrderDocument>("orders") as Collection<CancellationOrderDocument>;
      const existing = await orders.findOne({ _id: objectId, customerFirebaseUid } as never, { session });
      if (!existing) return;
      if (existing.status !== "pending_payment") {
        throw new CustomerCancellationError("cancellation_requires_support", 409, "Pesanan yang sudah diproses pembayaran tidak dapat dibatalkan langsung. Hubungi Support Nitip.");
      }
      const now = new Date();
      const shouldRestore = existing.stockReservationStatus === "reserved";
      const payment = existing.payment ? { ...existing.payment, status: "failed" as const, checkoutUrl: null, expiresAt: now } : null;
      const result = await orders.updateOne(
        { _id: objectId, customerFirebaseUid, status: "pending_payment" } as never,
        { $set: { status: "cancelled", cancellationReason: reason?.trim() || "Dibatalkan customer sebelum pembayaran", payment, stockReservationStatus: shouldRestore ? "released" : existing.stockReservationStatus ?? null, stockReservationExpiresAt: null, stockReservationReleasedAt: shouldRestore ? now : null, updatedAt: now } } as never,
        { session },
      );
      if (result.modifiedCount !== 1) throw new CustomerCancellationError("cancellation_conflict", 409, "Status pesanan berubah. Muat ulang sebelum mencoba lagi.");
      if (shouldRestore) await restoreStock(existing.stockReservedItems ?? [], session, now);
    });
  } finally {
    await session.endSession();
  }
  return getCustomerOrder(customerFirebaseUid, id);
}
