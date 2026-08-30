import type { NitipCatalogOutlet, NitipProduct } from "@nitip/domain/catalog";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";
import { getPublicCatalogOutlet } from "./catalog.js";

interface FavoriteDocument {
  customerFirebaseUid: string;
  productId: ObjectId;
  outletId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface FavoriteProductDocument {
  outletId: ObjectId;
  isActive: boolean;
}

export interface FavoriteProductResult {
  id: string;
  outletId: string;
  outletName: string;
  businessName: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  createdAt: string;
}

let indexesReady: Promise<void> | null = null;

async function getFavoritesCollection(): Promise<Collection<FavoriteDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<FavoriteDocument>("user_favorites");
  indexesReady ??= Promise.all([
    collection.createIndex(
      { customerFirebaseUid: 1, productId: 1 },
      { unique: true, name: "user_favorites_customer_product" },
    ),
    collection.createIndex(
      { customerFirebaseUid: 1, createdAt: -1 },
      { name: "user_favorites_customer_created" },
    ),
  ]).then(() => undefined);
  await indexesReady;
  return collection;
}

function findProduct(catalog: NitipCatalogOutlet, productId: string): NitipProduct | null {
  for (const category of catalog.categories) {
    const product = category.products.find((item) => item.id === productId);
    if (product) return product;
  }
  return null;
}

function serializeFavorite(
  favorite: WithId<FavoriteDocument>,
  catalog: NitipCatalogOutlet,
  product: NitipProduct,
): FavoriteProductResult {
  return {
    id: product.id,
    outletId: catalog.id,
    outletName: catalog.name,
    businessName: catalog.businessName,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    ratingAverage: product.ratingAverage ?? null,
    ratingCount: product.ratingCount ?? 0,
    createdAt: favorite.createdAt.toISOString(),
  };
}

async function hydrateFavorites(
  favorites: WithId<FavoriteDocument>[],
): Promise<{ items: FavoriteProductResult[]; staleIds: ObjectId[] }> {
  const catalogCache = new Map<string, NitipCatalogOutlet | null>();
  const items: FavoriteProductResult[] = [];
  const staleIds: ObjectId[] = [];

  for (const favorite of favorites) {
    const outletId = favorite.outletId.toHexString();
    let catalog = catalogCache.get(outletId);
    if (catalog === undefined) {
      catalog = await getPublicCatalogOutlet(outletId);
      catalogCache.set(outletId, catalog);
    }
    const product = catalog ? findProduct(catalog, favorite.productId.toHexString()) : null;
    if (!catalog || !product) {
      staleIds.push(favorite._id);
      continue;
    }
    items.push(serializeFavorite(favorite, catalog, product));
  }

  return { items, staleIds };
}

export async function listCustomerFavoriteProducts(
  customerFirebaseUid: string,
): Promise<FavoriteProductResult[]> {
  const favorites = await getFavoritesCollection();
  const documents = await favorites
    .find({ customerFirebaseUid })
    .sort({ createdAt: -1 })
    .toArray();
  if (documents.length === 0) return [];

  const hydrated = await hydrateFavorites(documents);
  if (hydrated.staleIds.length > 0) {
    await favorites.deleteMany({
      customerFirebaseUid,
      _id: { $in: hydrated.staleIds },
    } as never);
  }
  return hydrated.items;
}

export async function addCustomerFavoriteProduct(
  customerFirebaseUid: string,
  productId: string,
): Promise<FavoriteProductResult | null> {
  if (!ObjectId.isValid(productId)) return null;

  const db = await getMongoDb();
  const product = await db.collection<FavoriteProductDocument>("products").findOne({
    _id: new ObjectId(productId),
    isActive: true,
  } as never);
  if (!product) return null;

  const catalog = await getPublicCatalogOutlet(product.outletId.toHexString());
  if (!catalog) return null;
  const publicProduct = findProduct(catalog, productId);
  if (!publicProduct) return null;

  const favorites = await getFavoritesCollection();
  const now = new Date();
  await favorites.updateOne(
    { customerFirebaseUid, productId: new ObjectId(productId) },
    {
      $set: {
        outletId: product.outletId,
        updatedAt: now,
      },
      $setOnInsert: {
        customerFirebaseUid,
        productId: new ObjectId(productId),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const favorite = await favorites.findOne({
    customerFirebaseUid,
    productId: new ObjectId(productId),
  });
  if (!favorite) return null;
  return serializeFavorite(favorite, catalog, publicProduct);
}

export async function removeCustomerFavoriteProduct(
  customerFirebaseUid: string,
  productId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(productId)) return false;
  const favorites = await getFavoritesCollection();
  const result = await favorites.deleteOne({
    customerFirebaseUid,
    productId: new ObjectId(productId),
  });
  return result.deletedCount === 1;
}
