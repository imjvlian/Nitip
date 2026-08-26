import type {
  CreateNitipProductInput,
  NitipProduct,
  UpdateNitipProductInput,
} from "@nitip/domain/catalog";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";
import { categoryBelongsToOutlet } from "./categories.js";

interface ProductDocument {
  outletId: ObjectId;
  categoryId: ObjectId;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  stockQuantity: number | null;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getProductsCollection(): Promise<Collection<ProductDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<ProductDocument>("products");
  indexesReady ??= Promise.all([
    collection.createIndex(
      { outletId: 1, categoryId: 1, sortOrder: 1, createdAt: 1 },
      { name: "products_outlet_category_sort" },
    ),
    collection.createIndex(
      { outletId: 1, isActive: 1, isAvailable: 1 },
      { name: "products_outlet_visibility" },
    ),
  ]).then(() => undefined);
  await indexesReady;
  return collection;
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function serializeProduct(document: WithId<ProductDocument>): NitipProduct {
  return {
    id: document._id.toHexString(),
    outletId: document.outletId.toHexString(),
    categoryId: document.categoryId.toHexString(),
    name: document.name,
    description: document.description ?? null,
    price: document.price,
    imageUrl: document.imageUrl ?? null,
    imagePublicId: document.imagePublicId ?? null,
    stockQuantity: document.stockQuantity ?? null,
    isAvailable: document.isAvailable,
    isActive: document.isActive,
    sortOrder: document.sortOrder,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function listOutletProducts(outletId: string): Promise<NitipProduct[]> {
  const outletObjectId = parseObjectId(outletId);
  if (!outletObjectId) return [];
  const products = await getProductsCollection();
  const documents = await products
    .find({ outletId: outletObjectId })
    .sort({ categoryId: 1, sortOrder: 1, createdAt: 1 })
    .toArray();
  return documents.map(serializeProduct);
}

export async function createOutletProduct(
  outletId: string,
  input: CreateNitipProductInput,
): Promise<NitipProduct | null> {
  const outletObjectId = parseObjectId(outletId);
  const categoryObjectId = parseObjectId(input.categoryId);
  if (!outletObjectId || !categoryObjectId) return null;
  if (!(await categoryBelongsToOutlet(outletId, input.categoryId))) return null;

  const products = await getProductsCollection();
  const now = new Date();
  const stockQuantity = input.stockQuantity ?? null;
  const document: ProductDocument = {
    outletId: outletObjectId,
    categoryId: categoryObjectId,
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    imageUrl: input.imageUrl ?? null,
    imagePublicId: input.imagePublicId ?? null,
    stockQuantity,
    isAvailable: stockQuantity === 0 ? false : (input.isAvailable ?? true),
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  const result = await products.insertOne(document);
  return serializeProduct({ ...document, _id: result.insertedId });
}

export async function updateOutletProduct(
  outletId: string,
  id: string,
  input: UpdateNitipProductInput,
): Promise<NitipProduct | null> {
  const outletObjectId = parseObjectId(outletId);
  const productObjectId = parseObjectId(id);
  if (!outletObjectId || !productObjectId) return null;

  if (input.categoryId !== undefined && !(await categoryBelongsToOutlet(outletId, input.categoryId))) {
    return null;
  }

  const products = await getProductsCollection();
  const set: Partial<ProductDocument> = { updatedAt: new Date() };
  if (input.categoryId !== undefined) {
    const categoryObjectId = parseObjectId(input.categoryId);
    if (!categoryObjectId) return null;
    set.categoryId = categoryObjectId;
  }
  if (input.name !== undefined) set.name = input.name;
  if (Object.prototype.hasOwnProperty.call(input, "description")) set.description = input.description ?? null;
  if (input.price !== undefined) set.price = input.price;
  if (Object.prototype.hasOwnProperty.call(input, "imageUrl")) set.imageUrl = input.imageUrl ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "imagePublicId")) set.imagePublicId = input.imagePublicId ?? null;
  if (Object.prototype.hasOwnProperty.call(input, "stockQuantity")) {
    set.stockQuantity = input.stockQuantity ?? null;
    if (input.stockQuantity === 0) set.isAvailable = false;
  }
  if (input.isAvailable !== undefined && input.stockQuantity !== 0) set.isAvailable = input.isAvailable;
  if (input.isActive !== undefined) set.isActive = input.isActive;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;

  const document = await products.findOneAndUpdate(
    { _id: productObjectId, outletId: outletObjectId },
    { $set: set },
    { returnDocument: "after" },
  );
  return document ? serializeProduct(document) : null;
}

export async function deleteOutletProduct(outletId: string, id: string): Promise<boolean> {
  const outletObjectId = parseObjectId(outletId);
  const productObjectId = parseObjectId(id);
  if (!outletObjectId || !productObjectId) return false;
  const products = await getProductsCollection();
  const result = await products.deleteOne({ _id: productObjectId, outletId: outletObjectId });
  return result.deletedCount === 1;
}
