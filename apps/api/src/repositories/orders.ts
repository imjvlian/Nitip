import { calculateOrderQuote } from "@nitip/domain";
import type { AddressLabel, OrderStatus } from "@nitip/domain";
import type {
  DeliveryDistanceMethod,
  MerchantOrderActionInput,
  NitipCheckoutLine,
  NitipCheckoutQuote,
  NitipCheckoutRequest,
  NitipMerchantOrder,
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
  cancellationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InternalCheckout {
  quote: NitipCheckoutQuote;
  merchantCommission: number;
  merchantNet: number;
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
      { merchantId: 1, status: 1, createdAt: -1 },
      { name: "orders_merchant_status_createdAt" },
    ),
    collection.createIndex(
      { status: 1, createdAt: 1 },
      { name: "orders_status_createdAt" },
    ),
  ]).then(() => undefined);

  await orderIndexesReady;
  return collection;
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
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
    cancellationReason: document.cancellationReason ?? null,
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
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function serializeMerchantOrder(
  document: WithId<OrderDocument>,
): NitipMerchantOrder {
  return {
    ...serializeOrder(document),
    merchantCommission: document.merchantCommission,
    merchantNet: document.merchantNet,
  };
}

async function buildCheckout(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
): Promise<InternalCheckout> {
  const db = await getMongoDb();
  const outletId = parseObjectId(input.outletId);
  const addressId = parseObjectId(input.addressId);
  const productIds = input.items.map((item) => parseObjectId(item.productId));

  if (!outletId || !addressId || productIds.some((id) => !id)) {
    throw new CheckoutError("invalid_checkout", 400, "Checkout tidak valid");
  }

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
      _id: { $in: productIds as ObjectId[] },
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
    quote: {
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
    },
    merchantCommission: pricing.merchantCommission,
    merchantNet: pricing.merchantNet,
  };
}

export async function quoteCheckout(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
): Promise<NitipCheckoutQuote> {
  return (await buildCheckout(customerFirebaseUid, input)).quote;
}

export async function createCustomerOrder(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
): Promise<NitipOrder> {
  const checkout = await buildCheckout(customerFirebaseUid, input);
  const { quote } = checkout;
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
    merchantCommission: checkout.merchantCommission,
    merchantNet: checkout.merchantNet,
    status: "pending_payment",
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await orders.insertOne(document);
  return serializeOrder({ ...document, _id: result.insertedId });
}

export async function simulateCustomerPayment(
  customerFirebaseUid: string,
  id: string,
): Promise<NitipOrder | null> {
  const objectId = parseObjectId(id);
  if (!objectId) return null;

  const orders = await getOrdersCollection();
  const document = await orders.findOneAndUpdate(
    {
      _id: objectId,
      customerFirebaseUid,
      status: "pending_payment",
    },
    {
      $set: {
        status: "paid",
        cancellationReason: null,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return document ? serializeOrder(document) : null;
}

export async function getCustomerOrder(
  customerFirebaseUid: string,
  id: string,
): Promise<NitipOrder | null> {
  const objectId = parseObjectId(id);
  if (!objectId) return null;
  const orders = await getOrdersCollection();
  const document = await orders.findOne({
    _id: objectId,
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

export async function listMerchantOrders(
  merchantId: string,
): Promise<NitipMerchantOrder[]> {
  const merchantObjectId = parseObjectId(merchantId);
  if (!merchantObjectId) return [];

  const orders = await getOrdersCollection();
  const documents = await orders
    .find({
      merchantId: merchantObjectId,
      status: { $ne: "pending_payment" },
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return documents.map(serializeMerchantOrder);
}

export async function getMerchantOrder(
  merchantId: string,
  id: string,
): Promise<NitipMerchantOrder | null> {
  const merchantObjectId = parseObjectId(merchantId);
  const orderObjectId = parseObjectId(id);
  if (!merchantObjectId || !orderObjectId) return null;

  const orders = await getOrdersCollection();
  const document = await orders.findOne({
    _id: orderObjectId,
    merchantId: merchantObjectId,
    status: { $ne: "pending_payment" },
  });

  return document ? serializeMerchantOrder(document) : null;
}

export async function applyMerchantOrderAction(
  merchantId: string,
  id: string,
  input: MerchantOrderActionInput,
): Promise<NitipMerchantOrder | null> {
  const merchantObjectId = parseObjectId(merchantId);
  const orderObjectId = parseObjectId(id);
  if (!merchantObjectId || !orderObjectId) return null;

  const transition =
    input.action === "confirm"
      ? { from: "paid" as const, to: "merchant_confirmed" as const }
      : input.action === "reject"
        ? { from: "paid" as const, to: "cancelled" as const }
        : input.action === "start_preparing"
          ? { from: "merchant_confirmed" as const, to: "preparing" as const }
          : { from: "preparing" as const, to: "ready_for_pickup" as const };

  const orders = await getOrdersCollection();
  const now = new Date();
  const document = await orders.findOneAndUpdate(
    {
      _id: orderObjectId,
      merchantId: merchantObjectId,
      status: transition.from,
    },
    {
      $set: {
        status: transition.to,
        cancellationReason:
          input.action === "reject"
            ? input.reason?.trim() || "Pesanan ditolak merchant"
            : null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? serializeMerchantOrder(document) : null;
}
