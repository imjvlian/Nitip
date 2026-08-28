import type {
  NitipOrderChatMessage,
  NitipOrderChatThread,
  OrderChatSenderRole,
} from "@nitip/domain/commerce";
import { ObjectId, type WithId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

const CHAT_WRITABLE_STATUSES = new Set(["driver_assigned", "picked_up", "on_delivery"]);
const CHAT_READABLE_STATUSES = new Set([...CHAT_WRITABLE_STATUSES, "delivered"]);
const MAX_MESSAGES = 120;

interface ChatOrderDocument {
  _id: ObjectId;
  customerFirebaseUid: string;
  driverId?: ObjectId | null;
  orderCode: string;
  status: string;
  address: {
    recipientName: string;
  };
}

interface ChatDriverDocument {
  _id: ObjectId;
  fullName: string;
}

interface ChatMessageDocument {
  orderId: ObjectId;
  senderRole: OrderChatSenderRole;
  senderName: string;
  text: string;
  createdAt: Date;
}

export class OrderChatError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "OrderChatError";
  }
}

let indexesPromise: Promise<void> | null = null;

async function ensureIndexes() {
  if (indexesPromise) return indexesPromise;
  indexesPromise = (async () => {
    const db = await getMongoDb();
    const messages = db.collection<ChatMessageDocument>("order_chat_messages");
    await Promise.all([
      messages.createIndex({ orderId: 1, createdAt: 1 }),
      messages.createIndex({ orderId: 1, senderRole: 1, createdAt: -1 }),
    ]);
  })();
  return indexesPromise;
}

function parseOrderId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function serializeMessage(document: WithId<ChatMessageDocument>): NitipOrderChatMessage {
  return {
    id: document._id.toHexString(),
    orderId: document.orderId.toHexString(),
    senderRole: document.senderRole,
    senderName: document.senderName,
    text: document.text,
    createdAt: document.createdAt.toISOString(),
  };
}

async function driverName(driverId: ObjectId | null | undefined) {
  if (!driverId) return "Driver Nitip";
  const db = await getMongoDb();
  const driver = await db.collection<ChatDriverDocument>("drivers").findOne({ _id: driverId });
  return driver?.fullName?.trim() || "Driver Nitip";
}

async function loadMessages(orderId: ObjectId) {
  await ensureIndexes();
  const db = await getMongoDb();
  const documents = await db
    .collection<ChatMessageDocument>("order_chat_messages")
    .find({ orderId })
    .sort({ createdAt: 1 })
    .limit(MAX_MESSAGES)
    .toArray();
  return documents.map(serializeMessage);
}

function assertChatAvailable(order: ChatOrderDocument) {
  if (!order.driverId) {
    throw new OrderChatError(
      "chat_unavailable",
      409,
      "Chat tersedia setelah driver menerima pesanan.",
    );
  }
  if (!CHAT_READABLE_STATUSES.has(order.status)) {
    throw new OrderChatError(
      "chat_unavailable",
      409,
      "Chat customer-driver belum tersedia untuk status pesanan ini.",
    );
  }
}

async function customerOrder(customerFirebaseUid: string, id: string) {
  const orderId = parseOrderId(id);
  if (!orderId) return null;
  const db = await getMongoDb();
  return db.collection<ChatOrderDocument>("orders").findOne({
    _id: orderId,
    customerFirebaseUid,
  });
}

async function driverOrder(driverId: string, id: string) {
  const orderId = parseOrderId(id);
  const driverObjectId = parseOrderId(driverId);
  if (!orderId || !driverObjectId) return null;
  const db = await getMongoDb();
  return db.collection<ChatOrderDocument>("orders").findOne({
    _id: orderId,
    driverId: driverObjectId,
  });
}

async function buildThread(
  order: ChatOrderDocument,
  viewerRole: OrderChatSenderRole,
): Promise<NitipOrderChatThread> {
  assertChatAvailable(order);
  const counterpartRole: OrderChatSenderRole = viewerRole === "customer" ? "driver" : "customer";
  const counterpartName = viewerRole === "customer"
    ? await driverName(order.driverId)
    : order.address.recipientName?.trim() || "Customer";

  return {
    orderId: order._id.toHexString(),
    orderCode: order.orderCode,
    status: order.status as NitipOrderChatThread["status"],
    writable: CHAT_WRITABLE_STATUSES.has(order.status),
    counterpartRole,
    counterpartName,
    messages: await loadMessages(order._id),
  };
}

function normalizeMessage(text: string) {
  const normalized = text.trim().replace(/\r\n/g, "\n");
  if (!normalized) {
    throw new OrderChatError("chat_message_required", 400, "Pesan tidak boleh kosong.");
  }
  if (normalized.length > 700) {
    throw new OrderChatError(
      "chat_message_too_long",
      400,
      "Pesan maksimal 700 karakter.",
    );
  }
  return normalized;
}

async function insertMessage(
  order: ChatOrderDocument,
  senderRole: OrderChatSenderRole,
  senderName: string,
  text: string,
) {
  assertChatAvailable(order);
  if (!CHAT_WRITABLE_STATUSES.has(order.status)) {
    throw new OrderChatError(
      "chat_read_only",
      409,
      "Chat sudah menjadi read-only karena pengantaran selesai.",
    );
  }

  await ensureIndexes();
  const db = await getMongoDb();
  const document: ChatMessageDocument = {
    orderId: order._id,
    senderRole,
    senderName: senderName.trim() || (senderRole === "driver" ? "Driver Nitip" : "Customer"),
    text: normalizeMessage(text),
    createdAt: new Date(),
  };
  const result = await db.collection<ChatMessageDocument>("order_chat_messages").insertOne(document);
  return serializeMessage({ ...document, _id: result.insertedId });
}

export async function getCustomerOrderChat(customerFirebaseUid: string, id: string) {
  const order = await customerOrder(customerFirebaseUid, id);
  if (!order) return null;
  return buildThread(order, "customer");
}

export async function sendCustomerOrderChatMessage(
  customerFirebaseUid: string,
  id: string,
  text: string,
) {
  const order = await customerOrder(customerFirebaseUid, id);
  if (!order) return null;
  return insertMessage(order, "customer", order.address.recipientName, text);
}

export async function getDriverOrderChat(driverId: string, id: string) {
  const order = await driverOrder(driverId, id);
  if (!order) return null;
  return buildThread(order, "driver");
}

export async function sendDriverOrderChatMessage(driverId: string, id: string, text: string) {
  const order = await driverOrder(driverId, id);
  if (!order) return null;
  return insertMessage(order, "driver", await driverName(order.driverId), text);
}
