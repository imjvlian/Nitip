import { randomInt } from "node:crypto";

import type { NitipOrderOperations } from "@nitip/domain/commerce";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface OrderDocument {
  customerFirebaseUid: string;
  merchantId: ObjectId;
  status: string;
}

interface OperationDocument {
  orderId: ObjectId;
  preparationMinutes?: number | null;
  estimatedReadyAt?: Date | null;
  deliveryOtp?: string | null;
  proofUrl?: string | null;
  proofUploadedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function operations(): Promise<Collection<OperationDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<OperationDocument>("order_operations");
  indexesReady ??= collection.createIndex({ orderId: 1 }, { name: "order_operations_order", unique: true }).then(() => undefined);
  await indexesReady;
  return collection;
}

function objectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function serialize(document: WithId<OperationDocument> | OperationDocument | null, revealOtp = false): NitipOrderOperations {
  return {
    preparationMinutes: document?.preparationMinutes ?? null,
    estimatedReadyAt: document?.estimatedReadyAt?.toISOString() ?? null,
    deliveryOtp: revealOtp ? document?.deliveryOtp ?? null : null,
    proofUrl: document?.proofUrl ?? null,
    proofUploadedAt: document?.proofUploadedAt?.toISOString() ?? null,
  };
}

export async function setPreparationEstimate(merchantId: string, orderId: string, minutes: number) {
  const merchantObjectId = objectId(merchantId);
  const orderObjectId = objectId(orderId);
  if (!merchantObjectId || !orderObjectId) return null;

  const db = await getMongoDb();
  const order = await db.collection<OrderDocument>("orders").findOne({ _id: orderObjectId, merchantId: merchantObjectId });
  if (!order) return null;

  const now = new Date();
  const estimatedReadyAt = new Date(now.getTime() + minutes * 60_000);
  const collection = await operations();
  await collection.updateOne(
    { orderId: orderObjectId },
    {
      $set: { preparationMinutes: minutes, estimatedReadyAt, updatedAt: now },
      $setOnInsert: { orderId: orderObjectId, createdAt: now },
    },
    { upsert: true },
  );
  return serialize(await collection.findOne({ orderId: orderObjectId }));
}

export async function getMerchantOrderOperations(merchantId: string, orderId: string) {
  const merchantObjectId = objectId(merchantId);
  const orderObjectId = objectId(orderId);
  if (!merchantObjectId || !orderObjectId) return null;
  const db = await getMongoDb();
  const order = await db.collection<OrderDocument>("orders").findOne({ _id: orderObjectId, merchantId: merchantObjectId });
  if (!order) return null;
  return serialize(await (await operations()).findOne({ orderId: orderObjectId }));
}

export async function getCustomerOrderOperations(firebaseUid: string, orderId: string) {
  const orderObjectId = objectId(orderId);
  if (!orderObjectId) return null;
  const db = await getMongoDb();
  const order = await db.collection<OrderDocument>("orders").findOne({ _id: orderObjectId, customerFirebaseUid: firebaseUid });
  if (!order) return null;
  const revealOtp = ["driver_assigned", "picked_up", "on_delivery"].includes(order.status);
  return serialize(await (await operations()).findOne({ orderId: orderObjectId }), revealOtp);
}

export async function ensureDeliveryOtp(orderId: string) {
  const orderObjectId = objectId(orderId);
  if (!orderObjectId) return null;
  const collection = await operations();
  const current = await collection.findOne({ orderId: orderObjectId });
  if (current?.deliveryOtp) return current.deliveryOtp;

  const otp = String(randomInt(1000, 10000));
  const now = new Date();
  await collection.updateOne(
    { orderId: orderObjectId },
    {
      $set: { deliveryOtp: otp, updatedAt: now },
      $setOnInsert: { orderId: orderObjectId, createdAt: now },
    },
    { upsert: true },
  );
  return otp;
}

export async function verifyDeliveryOtp(orderId: string, otp: string) {
  const orderObjectId = objectId(orderId);
  if (!orderObjectId) return false;
  const document = await (await operations()).findOne({ orderId: orderObjectId });
  return Boolean(document?.deliveryOtp && document.deliveryOtp === otp.trim());
}

export async function saveDeliveryProof(orderId: string, proofUrl: string) {
  const orderObjectId = objectId(orderId);
  if (!orderObjectId) return;
  const now = new Date();
  await (await operations()).updateOne(
    { orderId: orderObjectId },
    {
      $set: { proofUrl, proofUploadedAt: now, updatedAt: now },
      $setOnInsert: { orderId: orderObjectId, createdAt: now },
    },
    { upsert: true },
  );
}
