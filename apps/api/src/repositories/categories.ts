import type {
  CreateNitipCategoryInput,
  NitipCategory,
  UpdateNitipCategoryInput,
} from "@nitip/domain/catalog";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface CategoryDocument {
  outletId: ObjectId;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getCategoriesCollection(): Promise<Collection<CategoryDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<CategoryDocument>("categories");
  indexesReady ??= Promise.all([
    collection.createIndex(
      { outletId: 1, sortOrder: 1, createdAt: 1 },
      { name: "categories_outlet_sort" },
    ),
    collection.createIndex(
      { outletId: 1, isActive: 1 },
      { name: "categories_outlet_active" },
    ),
  ]).then(() => undefined);
  await indexesReady;
  return collection;
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function serializeCategory(document: WithId<CategoryDocument>): NitipCategory {
  return {
    id: document._id.toHexString(),
    outletId: document.outletId.toHexString(),
    name: document.name,
    description: document.description ?? null,
    sortOrder: document.sortOrder,
    isActive: document.isActive,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function listOutletCategories(outletId: string): Promise<NitipCategory[]> {
  const outletObjectId = parseObjectId(outletId);
  if (!outletObjectId) return [];
  const categories = await getCategoriesCollection();
  const documents = await categories
    .find({ outletId: outletObjectId })
    .sort({ sortOrder: 1, createdAt: 1 })
    .toArray();
  return documents.map(serializeCategory);
}

export async function createOutletCategory(
  outletId: string,
  input: CreateNitipCategoryInput,
): Promise<NitipCategory> {
  const outletObjectId = parseObjectId(outletId);
  if (!outletObjectId) throw new Error("Invalid outlet id");
  const categories = await getCategoriesCollection();
  const now = new Date();
  const document: CategoryDocument = {
    outletId: outletObjectId,
    name: input.name,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  const result = await categories.insertOne(document);
  return serializeCategory({ ...document, _id: result.insertedId });
}

export async function updateOutletCategory(
  outletId: string,
  id: string,
  input: UpdateNitipCategoryInput,
): Promise<NitipCategory | null> {
  const outletObjectId = parseObjectId(outletId);
  const categoryObjectId = parseObjectId(id);
  if (!outletObjectId || !categoryObjectId) return null;
  const categories = await getCategoriesCollection();
  const set: Partial<CategoryDocument> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name;
  if (Object.prototype.hasOwnProperty.call(input, "description")) set.description = input.description ?? null;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) set.isActive = input.isActive;
  const document = await categories.findOneAndUpdate(
    { _id: categoryObjectId, outletId: outletObjectId },
    { $set: set },
    { returnDocument: "after" },
  );
  return document ? serializeCategory(document) : null;
}

export async function deleteOutletCategory(
  outletId: string,
  id: string,
): Promise<"deleted" | "not_found" | "not_empty"> {
  const outletObjectId = parseObjectId(outletId);
  const categoryObjectId = parseObjectId(id);
  if (!outletObjectId || !categoryObjectId) return "not_found";

  const db = await getMongoDb();
  const categories = await getCategoriesCollection();
  const category = await categories.findOne({ _id: categoryObjectId, outletId: outletObjectId });
  if (!category) return "not_found";

  const productExists = await db.collection("products").findOne(
    { outletId: outletObjectId, categoryId: categoryObjectId },
    { projection: { _id: 1 } },
  );
  if (productExists) return "not_empty";

  await categories.deleteOne({ _id: categoryObjectId, outletId: outletObjectId });
  return "deleted";
}

export async function categoryBelongsToOutlet(outletId: string, categoryId: string) {
  const outletObjectId = parseObjectId(outletId);
  const categoryObjectId = parseObjectId(categoryId);
  if (!outletObjectId || !categoryObjectId) return false;
  const categories = await getCategoriesCollection();
  return Boolean(await categories.findOne(
    { _id: categoryObjectId, outletId: outletObjectId },
    { projection: { _id: 1 } },
  ));
}
