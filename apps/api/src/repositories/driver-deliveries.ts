import type { OrderStatus } from "@nitip/domain";
import type { DriverDeliveryActionInput } from "@nitip/domain/driver";
import type { Collection } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";
import { saveDeliveryProof, verifyDeliveryOtp } from "./order-operations.js";

interface DriverDeliveryOrderDocument {
  driverId?: ObjectId | null;
  status: OrderStatus;
  activeDriverAssignment?: boolean;
  pickedUpAt?: Date | null;
  deliveryStartedAt?: Date | null;
  deliveredAt?: Date | null;
  updatedAt: Date;
}

export class DriverDeliveryError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number, message: string) {
    super(message);
    this.name = "DriverDeliveryError";
  }
}

async function getOrdersCollection(): Promise<Collection<DriverDeliveryOrderDocument>> {
  const db = await getMongoDb();
  return db.collection<DriverDeliveryOrderDocument>("orders");
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export async function applyDriverDeliveryAction(
  driverId: string,
  orderId: string,
  input: DriverDeliveryActionInput,
): Promise<boolean> {
  const driverObjectId = parseObjectId(driverId);
  const orderObjectId = parseObjectId(orderId);
  if (!driverObjectId || !orderObjectId) return false;

  if (input.action === "complete_delivery") {
    const otp = input.otp?.trim() ?? "";
    if (!/^\d{4}$/.test(otp)) {
      throw new DriverDeliveryError("delivery_otp_required", 400, "Masukkan 4 digit OTP penerimaan customer");
    }
    if (!(await verifyDeliveryOtp(orderId, otp))) {
      throw new DriverDeliveryError("delivery_otp_invalid", 409, "OTP penerimaan tidak sesuai");
    }
  }

  const now = new Date();
  const transition =
    input.action === "confirm_pickup"
      ? { from: "driver_assigned" as const, set: { status: "picked_up" as const, pickedUpAt: now, updatedAt: now } }
      : input.action === "start_delivery"
        ? { from: "picked_up" as const, set: { status: "on_delivery" as const, deliveryStartedAt: now, updatedAt: now } }
        : { from: "on_delivery" as const, set: { status: "delivered" as const, deliveredAt: now, activeDriverAssignment: false, updatedAt: now } };

  const orders = await getOrdersCollection();
  const document = await orders.findOneAndUpdate(
    { _id: orderObjectId, driverId: driverObjectId, status: transition.from, activeDriverAssignment: true },
    { $set: transition.set },
    { returnDocument: "after" },
  );

  if (document && input.action === "complete_delivery" && input.proofUrl) {
    await saveDeliveryProof(orderId, input.proofUrl);
  }

  return Boolean(document);
}
