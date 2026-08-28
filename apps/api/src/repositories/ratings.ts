import type { OrderStatus } from "@nitip/domain";
import type {
  NitipOrderRating,
  UpsertNitipOrderRatingInput,
} from "@nitip/domain/commerce";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface OrderRatingDocument {
  orderId: ObjectId;
  outletId: ObjectId;
  customerFirebaseUid: string;
  score: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RatingOrderDocument {
  customerFirebaseUid: string;
  outletId: ObjectId;
  status: OrderStatus;
}

export interface OutletRatingSummary {
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

let ratingIndexesReady: Promise<void> | null = null;

async function getRatingsCollection(): Promise<Collection<OrderRatingDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<OrderRatingDocument>("order_ratings");

  ratingIndexesReady ??= Promise.all([
    collection.createIndex(
      { orderId: 1 },
      { name: "order_ratings_order_unique", unique: true },
    ),
    collection.createIndex(
      { outletId: 1, createdAt: -1 },
      { name: "order_ratings_outlet_createdAt" },
    ),
  ]).then(() => undefined);

  await ratingIndexesReady;
  return collection;
}

function serializeRating(document: WithId<OrderRatingDocument>): NitipOrderRating {
  return {
    id: document._id.toHexString(),
    orderId: document.orderId.toHexString(),
    outletId: document.outletId.toHexString(),
    score: document.score,
    comment: document.comment ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function getCustomerOrderRating(
  customerFirebaseUid: string,
  orderId: string,
): Promise<NitipOrderRating | null> {
  if (!ObjectId.isValid(orderId)) return null;
  const ratings = await getRatingsCollection();
  const document = await ratings.findOne({
    orderId: new ObjectId(orderId),
    customerFirebaseUid,
  });
  return document ? serializeRating(document) : null;
}

export async function upsertCustomerOrderRating(
  customerFirebaseUid: string,
  orderId: string,
  input: UpsertNitipOrderRatingInput,
): Promise<NitipOrderRating> {
  if (!ObjectId.isValid(orderId)) {
    throw new RatingError("order_not_found", 404, "Pesanan tidak ditemukan");
  }

  const db = await getMongoDb();
  const orderObjectId = new ObjectId(orderId);
  const order = await db.collection<RatingOrderDocument>("orders").findOne({
    _id: orderObjectId,
    customerFirebaseUid,
  });

  if (!order) {
    throw new RatingError("order_not_found", 404, "Pesanan tidak ditemukan");
  }
  if (order.status !== "delivered") {
    throw new RatingError(
      "order_not_delivered",
      409,
      "Rating hanya dapat diberikan setelah pesanan selesai diantar",
    );
  }

  const ratings = await getRatingsCollection();
  const now = new Date();
  const comment = input.comment?.trim() || null;
  const document = await ratings.findOneAndUpdate(
    {
      orderId: orderObjectId,
      customerFirebaseUid,
    },
    {
      $set: {
        score: input.score,
        comment,
        updatedAt: now,
      },
      $setOnInsert: {
        orderId: orderObjectId,
        outletId: order.outletId,
        customerFirebaseUid,
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  if (!document) {
    throw new Error("Rating upsert completed without a document");
  }
  return serializeRating(document);
}

export async function getOutletRatingSummaries(
  outletIds: ObjectId[],
): Promise<Map<string, OutletRatingSummary>> {
  if (outletIds.length === 0) return new Map();
  const ratings = await getRatingsCollection();
  const rows = await ratings
    .aggregate<{
      _id: ObjectId;
      average: number;
      count: number;
    }>([
      { $match: { outletId: { $in: outletIds } } },
      {
        $group: {
          _id: "$outletId",
          average: { $avg: "$score" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return new Map(
    rows.map((row) => [
      row._id.toHexString(),
      {
        average: Math.round(row.average * 10) / 10,
        count: row.count,
      },
    ]),
  );
}
