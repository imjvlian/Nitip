import type { OrderStatus } from "@nitip/domain";
import type {
  NitipOrderReviews,
  NitipReview,
  NitipReviewTargetType,
  UpsertNitipReviewInput,
} from "@nitip/domain/commerce";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface ReviewDocument {
  orderId: ObjectId;
  merchantId: ObjectId;
  outletId: ObjectId;
  customerFirebaseUid: string;
  targetType: NitipReviewTargetType;
  targetKey: string;
  targetId: ObjectId;
  targetName: string;
  score: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RatingOrderItemDocument {
  productId: string;
  name: string;
}

interface RatingOrderDocument {
  customerFirebaseUid: string;
  merchantId: ObjectId;
  outletId: ObjectId;
  status: OrderStatus;
  items: RatingOrderItemDocument[];
  driverId?: ObjectId | null;
}

interface DriverDocument {
  fullName: string;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export class RatingError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "RatingError";
  }
}

let reviewIndexesReady: Promise<void> | null = null;

async function getReviewsCollection(): Promise<Collection<ReviewDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<ReviewDocument>("reviews");

  reviewIndexesReady ??= Promise.all([
    collection.createIndex(
      { orderId: 1, customerFirebaseUid: 1, targetKey: 1 },
      { name: "reviews_order_customer_target_unique", unique: true },
    ),
    collection.createIndex(
      { targetType: 1, merchantId: 1, createdAt: -1 },
      { name: "reviews_type_merchant_createdAt" },
    ),
    collection.createIndex(
      { targetType: 1, outletId: 1, createdAt: -1 },
      { name: "reviews_type_outlet_createdAt" },
    ),
    collection.createIndex(
      { targetType: 1, targetId: 1, createdAt: -1 },
      { name: "reviews_type_target_createdAt" },
    ),
  ]).then(() => undefined);

  await reviewIndexesReady;
  return collection;
}

function serializeReview(document: WithId<ReviewDocument>): NitipReview {
  return {
    id: document._id.toHexString(),
    orderId: document.orderId.toHexString(),
    outletId: document.outletId.toHexString(),
    targetType: document.targetType,
    targetId: document.targetId.toHexString(),
    targetName: document.targetName,
    score: document.score,
    comment: document.comment ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

async function getCustomerOrder(
  customerFirebaseUid: string,
  orderId: string,
): Promise<WithId<RatingOrderDocument>> {
  if (!ObjectId.isValid(orderId)) {
    throw new RatingError("order_not_found", 404, "Pesanan tidak ditemukan");
  }
  const db = await getMongoDb();
  const order = await db.collection<RatingOrderDocument>("orders").findOne({
    _id: new ObjectId(orderId),
    customerFirebaseUid,
  });
  if (!order) throw new RatingError("order_not_found", 404, "Pesanan tidak ditemukan");
  return order;
}

function assertDelivered(order: WithId<RatingOrderDocument>) {
  if (order.status !== "delivered") {
    throw new RatingError(
      "order_not_delivered",
      409,
      "Review hanya dapat diberikan setelah pesanan selesai diantar",
    );
  }
}

async function upsertReview(
  customerFirebaseUid: string,
  order: WithId<RatingOrderDocument>,
  targetType: NitipReviewTargetType,
  targetId: ObjectId,
  targetName: string,
  input: UpsertNitipReviewInput,
): Promise<NitipReview> {
  assertDelivered(order);
  const reviews = await getReviewsCollection();
  const now = new Date();
  const targetKey = `${targetType}:${targetId.toHexString()}`;
  const document = await reviews.findOneAndUpdate(
    { orderId: order._id, customerFirebaseUid, targetKey },
    {
      $set: {
        score: input.score,
        comment: input.comment?.trim() || null,
        targetName,
        updatedAt: now,
      },
      $setOnInsert: {
        orderId: order._id,
        merchantId: order.merchantId,
        outletId: order.outletId,
        customerFirebaseUid,
        targetType,
        targetKey,
        targetId,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!document) throw new Error("Review upsert completed without a document");
  return serializeReview(document);
}

export async function getCustomerOrderReviews(
  customerFirebaseUid: string,
  orderId: string,
): Promise<NitipOrderReviews> {
  const order = await getCustomerOrder(customerFirebaseUid, orderId);
  const db = await getMongoDb();
  const reviews = await getReviewsCollection();
  const documents = await reviews
    .find({ orderId: order._id, customerFirebaseUid })
    .sort({ createdAt: 1 })
    .toArray();

  const productReviews = documents
    .filter((document) => document.targetType === "product")
    .map(serializeReview);
  const driverReview = documents.find((document) => document.targetType === "driver") ?? null;

  if (!order.driverId) return { products: productReviews, driver: null };
  const driver = await db.collection<DriverDocument>("drivers").findOne({ _id: order.driverId });
  return {
    products: productReviews,
    driver: {
      driverId: order.driverId.toHexString(),
      driverName: driver?.fullName?.trim() || "Driver Nitip",
      review: driverReview ? serializeReview(driverReview) : null,
    },
  };
}

export async function upsertCustomerProductReview(
  customerFirebaseUid: string,
  orderId: string,
  productId: string,
  input: UpsertNitipReviewInput,
): Promise<NitipReview> {
  if (!ObjectId.isValid(productId)) {
    throw new RatingError("product_not_found", 404, "Menu tidak ditemukan pada pesanan ini");
  }
  const order = await getCustomerOrder(customerFirebaseUid, orderId);
  const item = order.items.find((current) => current.productId === productId);
  if (!item) {
    throw new RatingError("product_not_in_order", 404, "Menu tidak ditemukan pada pesanan ini");
  }
  return upsertReview(
    customerFirebaseUid,
    order,
    "product",
    new ObjectId(productId),
    item.name,
    input,
  );
}

export async function upsertCustomerDriverReview(
  customerFirebaseUid: string,
  orderId: string,
  input: UpsertNitipReviewInput,
): Promise<NitipReview> {
  const order = await getCustomerOrder(customerFirebaseUid, orderId);
  if (!order.driverId) {
    throw new RatingError("driver_not_assigned", 409, "Pesanan ini tidak memiliki driver untuk direview");
  }
  const db = await getMongoDb();
  const driver = await db.collection<DriverDocument>("drivers").findOne({ _id: order.driverId });
  return upsertReview(
    customerFirebaseUid,
    order,
    "driver",
    order.driverId,
    driver?.fullName?.trim() || "Driver Nitip",
    input,
  );
}

async function getRatingSummaries(
  match: Record<string, unknown>,
  groupField: "$merchantId" | "$outletId" | "$targetId",
): Promise<Map<string, RatingSummary>> {
  const reviews = await getReviewsCollection();
  const rows = await reviews
    .aggregate<{ _id: ObjectId; average: number; count: number }>([
      { $match: match },
      { $group: { _id: groupField, average: { $avg: "$score" }, count: { $sum: 1 } } },
    ])
    .toArray();

  return new Map(
    rows.map((row) => [
      row._id.toHexString(),
      { average: Math.round(row.average * 10) / 10, count: row.count },
    ]),
  );
}

export async function getMerchantRatingSummaries(
  merchantIds: ObjectId[],
): Promise<Map<string, RatingSummary>> {
  if (merchantIds.length === 0) return new Map();
  return getRatingSummaries(
    { targetType: "product", merchantId: { $in: merchantIds } },
    "$merchantId",
  );
}

export async function getOutletRatingSummaries(
  outletIds: ObjectId[],
): Promise<Map<string, RatingSummary>> {
  if (outletIds.length === 0) return new Map();
  return getRatingSummaries(
    { targetType: "product", outletId: { $in: outletIds } },
    "$outletId",
  );
}

export async function getProductRatingSummaries(
  productIds: ObjectId[],
): Promise<Map<string, RatingSummary>> {
  if (productIds.length === 0) return new Map();
  return getRatingSummaries(
    { targetType: "product", targetId: { $in: productIds } },
    "$targetId",
  );
}
