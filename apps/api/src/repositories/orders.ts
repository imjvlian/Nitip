import { calculateOrderQuote } from "@nitip/domain";
import type { AddressLabel, OrderStatus } from "@nitip/domain";
import type {
  DeliveryDistanceMethod,
  NitipCheckoutLine,
  NitipCheckoutQuote,
  NitipCheckoutRequest,
  NitipOrder,
  NitipOrderAddressSnapshot,
} from "@nitip/domain/commerce";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

interface MerchantDocument {
  businessName: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
}

interface OutletDocument {
  merchantId: ObjectId;
  name: string;
  addressLine: string;
  location?: GeoPoint;
  isActive: boolean;
  acceptingOrders: boolean;
}

interface ProductDocument {
  outletId: ObjectId;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number | null;
  isAvailable: boolean;
  isActive: boolean;
}

interface AddressDocument {
  firebaseUid: string;
  label: AddressLabel;
  customLabel: string | null;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  notes: string | null;
  location?: GeoPoint;
}

interface OrderDocument {
  customerFirebaseUid: string;
  merchantId: ObjectId;
  outletId: ObjectId;
  businessName: string;
  outletName: string;
  address: NitipOrderAddressSnapshot;
  items: NitipCheckoutLine[];
  subtotal: number;
  distanceKm: number | null;
  distanceMethod: DeliveryDistanceMethod;
  deliveryFare: number;
  serviceFee: number;
  customerTotal: number;
  merchantCommission: number;
  merchantNet: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class CheckoutError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

let orderIndexesReady: Promise<void> | null = null;

async function getOrdersCollection(): Promise<Collection<OrderDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<OrderDocument>("orders");

  orderIndexesReady ??= Promise.all([
    collection.createIndex(
      { customerFirebaseUid: 1, createdAt: -1 },
      { name: "orders_customer_createdAt" },
    ),
    collection.createIndex(
      { merchantId: 1, createdAt: -1 },
      { name: "orders_merchant_createdAt" },
    ),
    collection.createIndex(
      { status: 1, createdAt: 1 },
      { name: "orders_status_createdAt" },
    ),
  ]).then(() => undefined);

  await orderIndexesReady;
  return collection;
}

function roundDistance(value: number) {
  return Math.round(value * 100) / 100;
}

function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLatitude = toRadians(latitudeB - latitudeA);
  const dLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(dLongitude / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function snapshotAddress(
  address: WithId<AddressDocument>,
): NitipOrderAddressSnapshot {
  const coordinates = address.location?.coordinates;
  return {
    addressId: address._id.toHexString(),
    label: address.label,
    customLabel: address.customLabel ?? null,
    recipientName: address.recipientName,
    phoneNumber: address.phoneNumber,
    addressLine: address.addressLine,
    notes: address.notes ?? null,
    latitude: coordinates?.[1] ?? null,
    longitude: coordinates?.[0] ?? null,
  };
}

function serializeOrder(document: WithId<OrderDocument>): NitipOrder {
  return {
    id: document._id.toHexString(),
    orderCode: `NTP-${document._id.toHexString().slice(-8).toUpperCase()}`,
    status: document.status,
    outletId: document.outletId.toHexString(),
    merchantId: document.merchantId.toHexString(),
    businessName: document.businessName,
    outletName: document.outletName,
    address: document.address,
    items: document.items,
    subtotal: document.subtotal,
    distanceKm: document.distanceKm,
    distanceMethod: document.distanceMethod,
    deliveryFare: document.deliveryFare,
    serviceFee: document.serviceFee,
    customerTotal: document.customerTotal,
    merchantCommission: document.merchantCommission,
    merchantNet: document.merchantNet,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function quoteCheckout(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
): Promise<NitipCheckoutQuote> {
  const db = await getMongoDb();
  const outletId = new ObjectId(input.outletId);
  const addressId = new ObjectId(input.addressId);
  const productIds = input.items.map((item) => new ObjectId(item.productId));

  const address = await db.collection<AddressDocument>("addresses").findOne({
    _id: addressId,
    firebaseUid: customerFirebaseUid,
  });
  if (!address) {
    throw new CheckoutError("address_not_found", 404, "Alamat tidak ditemukan");
  }

  const outlet = await db.collection<OutletDocument>("outlets").findOne({
    _id: outletId,
    isActive: true,
  });
  if (!outlet) {
    throw new CheckoutError("outlet_unavailable", 409, "Outlet tidak tersedia");
  }
  if (!outlet.acceptingOrders) {
    throw new CheckoutError("outlet_closed", 409, "Outlet sedang tidak menerima pesanan");
  }

  const merchant = await db.collection<MerchantDocument>("merchants").findOne({
    _id: outlet.merchantId,
    status: "approved",
  });
  if (!merchant) {
    throw new CheckoutError("merchant_unavailable", 409, "Merchant belum tersedia");
  }

  const products = await db
    .collection<ProductDocument>("products")
    .find({
      _id: { $in: productIds },
      outletId,
      isActive: true,
    })
    .toArray();

  const productsById = new Map(
    products.map((product) => [product._id.toHexString(), product]),
  );

  const lines: NitipCheckoutLine[] = input.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new CheckoutError(
        "product_unavailable",
        409,
        "Salah satu produk sudah tidak tersedia",
      );
    }
    if (!product.isAvailable) {
      throw new CheckoutError(
        "product_unavailable",
        409,
        `${product.name} sedang tidak tersedia`,
      );
    }
    if (product.stockQuantity != null && item.quantity > product.stockQuantity) {
      throw new CheckoutError(
        "insufficient_stock",
        409,
        `Stok ${product.name} tidak mencukupi`,
      );
    }

    return {
      productId: product._id.toHexString(),
      name: product.name,
      imageUrl: product.imageUrl ?? null,
      unitPrice: product.price,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity,
    };
  });

  const subtotal = lines.reduce((total, item) => total + item.lineTotal, 0);
  const addressCoordinates = address.location?.coordinates;
  const outletCoordinates = outlet.location?.coordinates;

  let distanceKm: number | null = null;
  let distanceMethod: DeliveryDistanceMethod = "minimum_fare_fallback";

  if (addressCoordinates && outletCoordinates) {
    distanceKm = roundDistance(
      haversineKm(
        addressCoordinates[1],
        addressCoordinates[0],
        outletCoordinates[1],
        outletCoordinates[0],
      ),
    );
    distanceMethod = "haversine";
  }

  const pricing = calculateOrderQuote({
    subtotal,
    distanceKm: distanceKm ?? 0,
  });

  return {
    outletId: outlet._id.toHexString(),
    merchantId: outlet.merchantId.toHexString(),
    businessName: merchant.businessName,
    outletName: outlet.name,
    address: snapshotAddress(address),
    items: lines,
    subtotal,
    distanceKm,
    distanceMethod,
    deliveryFare: pricing.deliveryFare,
    serviceFee: pricing.serviceFee,
    customerTotal: pricing.customerTotal,
    merchantCommission: pricing.merchantCommission,
    merchantNet: pricing.merchantNet,
  };
}

export async function createCustomerOrder(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
): Promise<NitipOrder> {
  const quote = await quoteCheckout(customerFirebaseUid, input);
  const orders = await getOrdersCollection();
  const now = new Date();

  const document: OrderDocument = {
    customerFirebaseUid,
    merchantId: new ObjectId(quote.merchantId),
    outletId: new ObjectId(quote.outletId),
    businessName: quote.businessName,
    outletName: quote.outletName,
    address: quote.address,
    items: quote.items,
    subtotal: quote.subtotal,
    distanceKm: quote.distanceKm,
    distanceMethod: quote.distanceMethod,
    deliveryFare: quote.deliveryFare,
    serviceFee: quote.serviceFee,
    customerTotal: quote.customerTotal,
    merchantCommission: quote.merchantCommission,
    merchantNet: quote.merchantNet,
    status: "pending_payment",
    createdAt: now,
    updatedAt: now,
  };

  const result = await orders.insertOne(document);
  return serializeOrder({ ...document, _id: result.insertedId });
}

export async function getCustomerOrder(
  customerFirebaseUid: string,
  id: string,
): Promise<NitipOrder | null> {
  if (!ObjectId.isValid(id)) return null;
  const orders = await getOrdersCollection();
  const document = await orders.findOne({
    _id: new ObjectId(id),
    customerFirebaseUid,
  });
  return document ? serializeOrder(document) : null;
}

export async function listCustomerOrders(
  customerFirebaseUid: string,
): Promise<NitipOrder[]> {
  const orders = await getOrdersCollection();
  const documents = await orders
    .find({ customerFirebaseUid })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return documents.map(serializeOrder);
}
