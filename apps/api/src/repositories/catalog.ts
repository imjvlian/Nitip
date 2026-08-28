import type { OutletOpeningHour } from "@nitip/domain";
import type {
  NitipCatalogCategory,
  NitipCatalogOutlet,
  NitipCatalogOutletSummary,
  NitipCategory,
  NitipProduct,
} from "@nitip/domain/catalog";
import type { WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";
import { getOutletRatingSummaries } from "./ratings.js";

interface MerchantDocument {
  businessName: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
}

interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

interface OutletDocument {
  merchantId: ObjectId;
  name: string;
  phoneNumber: string;
  addressLine: string;
  location?: GeoPoint;
  isActive: boolean;
  acceptingOrders: boolean;
  openingHours: OutletOpeningHour[];
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryDocument {
  outletId: ObjectId;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

function productAvailable(document: ProductDocument) {
  return document.isAvailable && document.stockQuantity !== 0;
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
    isAvailable: productAvailable(document),
    isActive: document.isActive,
    sortOrder: document.sortOrder,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function listPublicCatalogOutlets(): Promise<NitipCatalogOutletSummary[]> {
  const db = await getMongoDb();
  const merchants = await db
    .collection<MerchantDocument>("merchants")
    .find({ status: "approved" })
    .toArray();

  if (merchants.length === 0) return [];
  const merchantMap = new Map(
    merchants.map((merchant) => [merchant._id.toHexString(), merchant.businessName]),
  );
  const outlets = await db
    .collection<OutletDocument>("outlets")
    .find({ merchantId: { $in: merchants.map((merchant) => merchant._id) }, isActive: true })
    .sort({ createdAt: 1 })
    .toArray();
  if (outlets.length === 0) return [];

  const outletIds = outlets.map((outlet) => outlet._id);
  const [products, ratingsByOutlet] = await Promise.all([
    db
      .collection<ProductDocument>("products")
      .find({ outletId: { $in: outletIds }, isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray(),
    getOutletRatingSummaries(outletIds),
  ]);

  const byOutlet = new Map<string, WithId<ProductDocument>[]>();
  for (const product of products) {
    const key = product.outletId.toHexString();
    const list = byOutlet.get(key) ?? [];
    list.push(product);
    byOutlet.set(key, list);
  }

  return outlets.map((outlet) => {
    const outletKey = outlet._id.toHexString();
    const outletProducts = byOutlet.get(outletKey) ?? [];
    const availableProducts = outletProducts.filter(productAvailable);
    const prices = availableProducts.map((product) => product.price);
    const image = outletProducts.find((product) => product.imageUrl)?.imageUrl ?? null;
    const rating = ratingsByOutlet.get(outletKey) ?? { average: null, count: 0 };
    return {
      id: outletKey,
      merchantId: outlet.merchantId.toHexString(),
      businessName: merchantMap.get(outlet.merchantId.toHexString()) ?? "Merchant Nitip",
      name: outlet.name,
      addressLine: outlet.addressLine,
      acceptingOrders: outlet.acceptingOrders,
      productCount: outletProducts.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      imageUrl: image,
      ratingAverage: rating.average,
      ratingCount: rating.count,
    };
  });
}

export async function getPublicCatalogOutlet(id: string): Promise<NitipCatalogOutlet | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getMongoDb();
  const outlet = await db.collection<OutletDocument>("outlets").findOne({
    _id: new ObjectId(id),
    isActive: true,
  });
  if (!outlet) return null;

  const merchant = await db.collection<MerchantDocument>("merchants").findOne({
    _id: outlet.merchantId,
    status: "approved",
  });
  if (!merchant) return null;

  const [categories, products, ratingsByOutlet] = await Promise.all([
    db
      .collection<CategoryDocument>("categories")
      .find({ outletId: outlet._id, isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray(),
    db
      .collection<ProductDocument>("products")
      .find({ outletId: outlet._id, isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray(),
    getOutletRatingSummaries([outlet._id]),
  ]);

  const productsByCategory = new Map<string, WithId<ProductDocument>[]>();
  for (const product of products) {
    const key = product.categoryId.toHexString();
    const list = productsByCategory.get(key) ?? [];
    list.push(product);
    productsByCategory.set(key, list);
  }

  const catalogCategories: NitipCatalogCategory[] = categories.map((category) => ({
    ...serializeCategory(category),
    products: (productsByCategory.get(category._id.toHexString()) ?? []).map(serializeProduct),
  }));
  const coordinates = outlet.location?.coordinates;
  const rating = ratingsByOutlet.get(outlet._id.toHexString()) ?? {
    average: null,
    count: 0,
  };

  return {
    id: outlet._id.toHexString(),
    merchantId: outlet.merchantId.toHexString(),
    businessName: merchant.businessName,
    name: outlet.name,
    addressLine: outlet.addressLine,
    phoneNumber: outlet.phoneNumber,
    latitude: coordinates?.[1] ?? null,
    longitude: coordinates?.[0] ?? null,
    acceptingOrders: outlet.acceptingOrders,
    ratingAverage: rating.average,
    ratingCount: rating.count,
    openingHours: outlet.openingHours,
    categories: catalogCategories,
  };
}
