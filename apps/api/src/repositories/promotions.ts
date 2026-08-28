import type {
  CreateNitipPromotionInput,
  NitipPromotion,
} from "@nitip/domain/catalog";
import type { Collection, Filter, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface PromotionDocument {
  title: string;
  description: string | null;
  ctaLabel: string | null;
  imageUrl: string | null;
  outletId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getPromotionsCollection(): Promise<Collection<PromotionDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<PromotionDocument>("promotions");
  indexesReady ??= Promise.all([
    collection.createIndex(
      { isActive: 1, priority: -1, createdAt: -1 },
      { name: "promotions_active_priority" },
    ),
    collection.createIndex(
      { startsAt: 1, endsAt: 1 },
      { name: "promotions_schedule" },
    ),
  ]).then(() => undefined);
  await indexesReady;
  return collection;
}

function serializePromotion(document: WithId<PromotionDocument>): NitipPromotion {
  return {
    id: document._id.toHexString(),
    title: document.title,
    description: document.description ?? null,
    ctaLabel: document.ctaLabel ?? null,
    imageUrl: document.imageUrl ?? null,
    outletId: document.outletId ?? null,
    startsAt: document.startsAt?.toISOString() ?? null,
    endsAt: document.endsAt?.toISOString() ?? null,
    priority: document.priority,
    isActive: document.isActive,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function parseDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export async function listPromotions(): Promise<NitipPromotion[]> {
  const promotions = await getPromotionsCollection();
  const documents = await promotions
    .find({})
    .sort({ priority: -1, createdAt: -1 })
    .toArray();
  return documents.map(serializePromotion);
}

export async function listActivePromotions(now = new Date()): Promise<NitipPromotion[]> {
  const promotions = await getPromotionsCollection();
  const filter: Filter<PromotionDocument> = {
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
    ],
  };
  const documents = await promotions
    .find(filter)
    .sort({ priority: -1, createdAt: -1 })
    .toArray();
  return documents.map(serializePromotion);
}

export async function createPromotion(
  input: CreateNitipPromotionInput,
): Promise<NitipPromotion> {
  const promotions = await getPromotionsCollection();
  const now = new Date();
  const document: PromotionDocument = {
    title: input.title,
    description: input.description ?? null,
    ctaLabel: input.ctaLabel ?? null,
    imageUrl: input.imageUrl ?? null,
    outletId: input.outletId ?? null,
    startsAt: parseDate(input.startsAt),
    endsAt: parseDate(input.endsAt),
    priority: input.priority ?? 0,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  const result = await promotions.insertOne(document);
  return serializePromotion({ ...document, _id: result.insertedId });
}

export async function setPromotionActive(
  id: string,
  isActive: boolean,
): Promise<NitipPromotion | null> {
  if (!ObjectId.isValid(id)) return null;
  const promotions = await getPromotionsCollection();
  const document = await promotions.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { isActive, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return document ? serializePromotion(document) : null;
}
