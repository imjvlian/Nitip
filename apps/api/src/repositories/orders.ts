import { createHash } from "node:crypto";

import { calculateOrderQuote } from "@nitip/domain";
import type { AddressLabel, OrderStatus } from "@nitip/domain";
import type {
  DeliveryDistanceMethod,
  MerchantOrderActionInput,
  MerchantSettlementStatus,
  NitipCheckoutLine,
  NitipCheckoutQuote,
  NitipCheckoutRequest,
  NitipMerchantOrder,
  NitipMerchantSettlementSnapshot,
  NitipOrder,
  NitipOrderAddressSnapshot,
  NitipPaymentSnapshot,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  StockReservationStatus,
} from "@nitip/domain/commerce";
import type {
  NitipDriverOffer,
  NitipDriverOrder,
  NitipDriverPickup,
} from "@nitip/domain/driver";
import type { ClientSession, Collection, WithId } from "mongodb";
import { MongoServerError, ObjectId } from "mongodb";

import { getMongoClient, getMongoDb } from "../lib/mongodb.js";

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

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

interface ProductAddonDocument {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface ProductDocument {
  outletId: ObjectId;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number | null;
  isAvailable: boolean;
  isActive: boolean;
  addons?: ProductAddonDocument[];
  updatedAt: Date;
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

interface StockReservationItemDocument {
  productId: ObjectId;
  quantity: number;
}

interface PaymentDocument {
  provider: PaymentProvider | null;
  status: PaymentStatus;
  method: PaymentMethod | null;
  reference: string | null;
  checkoutUrl: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
  refundedAt: Date | null;
}

interface MerchantSettlementDocument {
  status: MerchantSettlementStatus;
  amount: number;
  eligibleAt: Date | null;
  settledAt: Date | null;
  reference: string | null;
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
  idempotencyKey?: string;
  idempotencyRequestHash?: string;
  payment?: PaymentDocument | null;
  settlement?: MerchantSettlementDocument | null;
  stockReservationStatus?: StockReservationStatus | null;
  stockReservationExpiresAt?: Date | null;
  stockReservationCommittedAt?: Date | null;
  stockReservationReleasedAt?: Date | null;
  stockReservedItems?: StockReservationItemDocument[];
  driverId?: ObjectId | null;
  driverAssignedAt?: Date | null;
  activeDriverAssignment?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface InternalStockReservation {
  productId: ObjectId;
  quantity: number;
  productName: string;
}

interface InternalCheckout {
  quote: NitipCheckoutQuote;
  merchantCommission: number;
  merchantNet: number;
  stockReservations: InternalStockReservation[];
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

export class DriverDispatchError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DriverDispatchError";
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
    collection.createIndex(
      { stockReservationStatus: 1, stockReservationExpiresAt: 1 },
      { name: "orders_stock_reservation_expiry" },
    ),
    collection.createIndex(
      { "payment.status": 1, "payment.expiresAt": 1 },
      { name: "orders_payment_expiry" },
    ),
    collection.createIndex(
      { customerFirebaseUid: 1, idempotencyKey: 1 },
      {
        name: "orders_customer_idempotency",
        unique: true,
        partialFilterExpression: { idempotencyKey: { $exists: true } },
      },
    ),
    collection.createIndex(
      { driverId: 1 },
      {
        name: "orders_one_active_per_driver",
        unique: true,
        partialFilterExpression: { activeDriverAssignment: true },
      },
    ),
  ]).then(() => undefined);

  await orderIndexesReady;
  return collection;
}

async function runInTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  let result: T | undefined;

  try {
    await session.withTransaction(async () => {
      result = await work(session);
    });
  } finally {
    await session.endSession();
  }

  if (result === undefined) {
    throw new Error("MongoDB transaction completed without a result");
  }
  return result;
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function orderCode(id: ObjectId) {
  return `NTP-${id.toHexString().slice(-8).toUpperCase()}`;
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

function checkoutRequestHash(input: NitipCheckoutRequest) {
  const canonical = {
    outletId: input.outletId,
    addressId: input.addressId,
    items: input.items
      .map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        addonIds: [...(item.addonIds ?? [])].sort(),
      }))
      .sort((a, b) =>
        a.productId === b.productId
          ? a.quantity - b.quantity
          : a.productId.localeCompare(b.productId),
      ),
  };

  return createHash("sha256").update(JSON.stringify(canonical), "utf8").digest("hex");
}

function assertIdempotencyMatch(
  document: WithId<OrderDocument>,
  requestHash: string,
) {
  if (
    document.idempotencyRequestHash &&
    document.idempotencyRequestHash !== requestHash
  ) {
    throw new CheckoutError(
      "idempotency_conflict",
      409,
      "Idempotency-Key sudah digunakan untuk checkout yang berbeda",
    );
  }
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

function serializePayment(payment: PaymentDocument): NitipPaymentSnapshot {
  return {
    provider: payment.provider,
    status: payment.status,
    method: payment.method,
    reference: payment.reference,
    checkoutUrl: payment.checkoutUrl,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    paidAt: payment.paidAt?.toISOString() ?? null,
    refundedAt: payment.refundedAt?.toISOString() ?? null,
  };
}

function serializeSettlement(
  settlement: MerchantSettlementDocument,
): NitipMerchantSettlementSnapshot {
  return {
    status: settlement.status,
    amount: settlement.amount,
    eligibleAt: settlement.eligibleAt?.toISOString() ?? null,
    settledAt: settlement.settledAt?.toISOString() ?? null,
    reference: settlement.reference,
  };
}

function serializeOrder(document: WithId<OrderDocument>): NitipOrder {
  return {
    id: document._id.toHexString(),
    orderCode: orderCode(document._id),
    status: document.status,
    cancellationReason: document.cancellationReason ?? null,
    stockReservationStatus: document.stockReservationStatus ?? null,
    stockReservationExpiresAt:
      document.stockReservationExpiresAt?.toISOString() ?? null,
    payment: document.payment ? serializePayment(document.payment) : null,
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
    settlement: document.settlement
      ? serializeSettlement(document.settlement)
      : null,
  };
}

function serializePickup(
  document: WithId<OrderDocument>,
  outlet: WithId<OutletDocument>,
): NitipDriverPickup {
  const coordinates = outlet.location?.coordinates;
  return {
    outletId: document.outletId.toHexString(),
    businessName: document.businessName,
    outletName: document.outletName,
    addressLine: outlet.addressLine,
    latitude: coordinates?.[1] ?? null,
    longitude: coordinates?.[0] ?? null,
  };
}

function serializeDriverOffer(
  document: WithId<OrderDocument>,
  outlet: WithId<OutletDocument>,
): NitipDriverOffer {
  return {
    id: document._id.toHexString(),
    orderCode: orderCode(document._id),
    status: "ready_for_pickup",
    pickup: serializePickup(document, outlet),
    distanceKm: document.distanceKm,
    deliveryFare: document.deliveryFare,
    itemCount: document.items.reduce((total, item) => total + item.quantity, 0),
    createdAt: document.createdAt.toISOString(),
  };
}

function isDriverDeliveryStatus(
  status: OrderStatus,
): status is NitipDriverOrder["status"] {
  return (
    status === "driver_assigned" ||
    status === "picked_up" ||
    status === "on_delivery" ||
    status === "delivered"
  );
}

function serializeDriverOrder(
  document: WithId<OrderDocument>,
  outlet: WithId<OutletDocument>,
): NitipDriverOrder {
  if (!isDriverDeliveryStatus(document.status) || !document.driverAssignedAt) {
    throw new Error("Order is not assigned to a driver");
  }

  return {
    id: document._id.toHexString(),
    orderCode: orderCode(document._id),
    status: document.status,
    pickup: serializePickup(document, outlet),
    distanceKm: document.distanceKm,
    deliveryFare: document.deliveryFare,
    itemCount: document.items.reduce((total, item) => total + item.quantity, 0),
    createdAt: document.createdAt.toISOString(),
    destination: {
      recipientName: document.address.recipientName,
      phoneNumber: document.address.phoneNumber,
      addressLine: document.address.addressLine,
      notes: document.address.notes,
      latitude: document.address.latitude,
      longitude: document.address.longitude,
    },
    items: document.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
    })),
    assignedAt: document.driverAssignedAt.toISOString(),
  };
}

async function restoreReservedStock(
  items: StockReservationItemDocument[],
  session: ClientSession,
  now = new Date(),
) {
  if (items.length === 0) return;
  const db = await getMongoDb();
  const products = db.collection<ProductDocument>("products");

  for (const item of items) {
    const product = await products.findOne(
      { _id: item.productId },
      { session },
    );
    if (!product || product.stockQuantity == null) continue;

    await products.updateOne(
      { _id: item.productId },
      {
        $inc: { stockQuantity: item.quantity },
        $set: { updatedAt: now },
      },
      { session },
    );
  }
}

async function reserveCheckoutStock(
  reservations: InternalStockReservation[],
  outletId: ObjectId,
  session: ClientSession,
  now: Date,
) {
  if (reservations.length === 0) return;
  const db = await getMongoDb();
  const products = db.collection<ProductDocument>("products");

  for (const reservation of reservations) {
    const result = await products.updateOne(
      {
        _id: reservation.productId,
        outletId,
        isActive: true,
        isAvailable: true,
        stockQuantity: { $gte: reservation.quantity },
      },
      {
        $inc: { stockQuantity: -reservation.quantity },
        $set: { updatedAt: now },
      },
      { session },
    );

    if (result.modifiedCount !== 1) {
      throw new CheckoutError(
        "insufficient_stock",
        409,
        `Stok ${reservation.productName} tidak mencukupi`,
      );
    }
  }
}

async function releaseExpiredStockReservations(
  customerFirebaseUid?: string,
) {
  const orders = await getOrdersCollection();
  const now = new Date();

  return runInTransaction(async (session) => {
    const documents = await orders
      .find(
        {
          status: "pending_payment",
          ...(customerFirebaseUid ? { customerFirebaseUid } : {}),
          $or: [
            {
              "payment.status": "pending",
              "payment.expiresAt": { $lte: now },
            },
            {
              payment: { $exists: false },
              stockReservationStatus: "reserved",
              stockReservationExpiresAt: { $lte: now },
            },
          ],
        },
        { session },
      )
      .limit(50)
      .toArray();

    let released = 0;
    for (const existing of documents) {
      const shouldRestore = existing.stockReservationStatus === "reserved";
      const paymentExpiresAt =
        existing.payment?.expiresAt ??
        existing.stockReservationExpiresAt ??
        now;
      const payment: PaymentDocument = {
        provider: existing.payment?.provider ?? null,
        status: "expired",
        method: existing.payment?.method ?? null,
        reference: existing.payment?.reference ?? null,
        checkoutUrl: existing.payment?.checkoutUrl ?? null,
        expiresAt: paymentExpiresAt,
        paidAt: existing.payment?.paidAt ?? null,
        refundedAt: existing.payment?.refundedAt ?? null,
      };

      const document = await orders.findOneAndUpdate(
        {
          _id: existing._id,
          status: "pending_payment",
        },
        {
          $set: {
            status: "cancelled",
            cancellationReason:
              "Waktu pembayaran habis. Pesanan dibatalkan otomatis.",
            payment,
            stockReservationStatus: shouldRestore
              ? "released"
              : existing.stockReservationStatus ?? null,
            stockReservationExpiresAt: null,
            stockReservationReleasedAt: shouldRestore ? now : null,
            updatedAt: now,
          },
        },
        { returnDocument: "after", session },
      );

      if (!document) continue;
      if (shouldRestore) {
        await restoreReservedStock(existing.stockReservedItems ?? [], session, now);
      }
      released += 1;
    }

    return released;
  });
}

async function buildCheckout(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
  session?: ClientSession,
): Promise<InternalCheckout> {
  const db = await getMongoDb();
  const outletId = parseObjectId(input.outletId);
  const addressId = parseObjectId(input.addressId);
  const productIds = input.items.map((item) => parseObjectId(item.productId));

  if (!outletId || !addressId || productIds.some((id) => !id)) {
    throw new CheckoutError("invalid_checkout", 400, "Checkout tidak valid");
  }

  const address = await db.collection<AddressDocument>("addresses").findOne(
    {
      _id: addressId,
      firebaseUid: customerFirebaseUid,
    },
    { session },
  );
  if (!address) {
    throw new CheckoutError("address_not_found", 404, "Alamat tidak ditemukan");
  }

  const outlet = await db.collection<OutletDocument>("outlets").findOne(
    {
      _id: outletId,
      isActive: true,
    },
    { session },
  );
  if (!outlet) {
    throw new CheckoutError("outlet_unavailable", 409, "Outlet tidak tersedia");
  }
  if (!outlet.acceptingOrders) {
    throw new CheckoutError("outlet_closed", 409, "Outlet sedang tidak menerima pesanan");
  }

  const merchant = await db.collection<MerchantDocument>("merchants").findOne(
    {
      _id: outlet.merchantId,
      status: "approved",
    },
    { session },
  );
  if (!merchant) {
    throw new CheckoutError("merchant_unavailable", 409, "Merchant belum tersedia");
  }

  const products = await db
    .collection<ProductDocument>("products")
    .find(
      {
        _id: { $in: productIds as ObjectId[] },
        outletId,
        isActive: true,
      },
      { session },
    )
    .toArray();

  const productsById = new Map(
    products.map((product) => [product._id.toHexString(), product]),
  );
  const requestedTotals = new Map<string, number>();
  for (const item of input.items) {
    requestedTotals.set(
      item.productId,
      (requestedTotals.get(item.productId) ?? 0) + item.quantity,
    );
  }

  for (const [productId, quantity] of requestedTotals) {
    const product = productsById.get(productId);
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
    if (product.stockQuantity != null && quantity > product.stockQuantity) {
      throw new CheckoutError(
        "insufficient_stock",
        409,
        `Stok ${product.name} tidak mencukupi`,
      );
    }
  }

  const lines: NitipCheckoutLine[] = input.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new CheckoutError(
        "product_unavailable",
        409,
        "Salah satu produk sudah tidak tersedia",
      );
    }

    const addonsById = new Map((product.addons ?? []).map((addon) => [addon.id, addon]));
    const selectedAddons = (item.addonIds ?? []).map((addonId) => {
      const addon = addonsById.get(addonId);
      if (!addon || !addon.isAvailable) {
        throw new CheckoutError(
          "addon_unavailable",
          409,
          `Salah satu add-on untuk ${product.name} sudah tidak tersedia`,
        );
      }
      return { id: addon.id, name: addon.name, price: addon.price };
    });
    const addonsTotal = selectedAddons.reduce((total, addon) => total + addon.price, 0);
    const unitPrice = product.price + addonsTotal;

    return {
      productId: product._id.toHexString(),
      name: product.name,
      imageUrl: product.imageUrl ?? null,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      addons: selectedAddons,
    };
  });

  const stockReservations: InternalStockReservation[] = [];
  for (const [productId, quantity] of requestedTotals) {
    const product = productsById.get(productId);
    if (product && product.stockQuantity != null) {
      stockReservations.push({
        productId: product._id,
        quantity,
        productName: product.name,
      });
    }
  }

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
    stockReservations,
  };
}

export async function quoteCheckout(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
): Promise<NitipCheckoutQuote> {
  await releaseExpiredStockReservations();
  return (await buildCheckout(customerFirebaseUid, input)).quote;
}

export async function createCustomerOrder(
  customerFirebaseUid: string,
  input: NitipCheckoutRequest,
  idempotencyKey: string,
): Promise<NitipOrder> {
  await releaseExpiredStockReservations(customerFirebaseUid);
  const orders = await getOrdersCollection();
  const requestHash = checkoutRequestHash(input);

  const existing = await orders.findOne({
    customerFirebaseUid,
    idempotencyKey,
  });
  if (existing) {
    assertIdempotencyMatch(existing, requestHash);
    return serializeOrder(existing);
  }

  try {
    return await runInTransaction(async (session) => {
      const replay = await orders.findOne(
        { customerFirebaseUid, idempotencyKey },
        { session },
      );
      if (replay) {
        assertIdempotencyMatch(replay, requestHash);
        return serializeOrder(replay);
      }

      const checkout = await buildCheckout(customerFirebaseUid, input, session);
      const { quote } = checkout;
      const outletId = new ObjectId(quote.outletId);
      const now = new Date();
      const paymentExpiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MS);
      const hasReservation = checkout.stockReservations.length > 0;
      const stockExpiresAt = hasReservation ? paymentExpiresAt : null;

      await reserveCheckoutStock(
        checkout.stockReservations,
        outletId,
        session,
        now,
      );

      const document: OrderDocument = {
        customerFirebaseUid,
        merchantId: new ObjectId(quote.merchantId),
        outletId,
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
        idempotencyKey,
        idempotencyRequestHash: requestHash,
        payment: {
          provider: null,
          status: "pending",
          method: null,
          reference: null,
          checkoutUrl: null,
          expiresAt: paymentExpiresAt,
          paidAt: null,
          refundedAt: null,
        },
        settlement: {
          status: "pending",
          amount: checkout.merchantNet,
          eligibleAt: null,
          settledAt: null,
          reference: null,
        },
        stockReservationStatus: hasReservation ? "reserved" : "not_required",
        stockReservationExpiresAt: stockExpiresAt,
        stockReservationCommittedAt: null,
        stockReservationReleasedAt: null,
        stockReservedItems: checkout.stockReservations.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        driverId: null,
        driverAssignedAt: null,
        activeDriverAssignment: false,
        createdAt: now,
        updatedAt: now,
      };

      const result = await orders.insertOne(document, { session });
      return serializeOrder({ ...document, _id: result.insertedId });
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const replay = await orders.findOne({
        customerFirebaseUid,
        idempotencyKey,
      });
      if (replay) {
        assertIdempotencyMatch(replay, requestHash);
        return serializeOrder(replay);
      }
    }
    throw error;
  }
}

export async function simulateCustomerPayment(
  customerFirebaseUid: string,
  id: string,
): Promise<NitipOrder | null> {
  const objectId = parseObjectId(id);
  if (!objectId) return null;
  const orders = await getOrdersCollection();

  return runInTransaction(async (session) => {
    const existing = await orders.findOne(
      {
        _id: objectId,
        customerFirebaseUid,
        status: "pending_payment",
      },
      { session },
    );
    if (!existing) return null;

    const now = new Date();
    const paymentExpiresAt =
      existing.payment?.expiresAt ?? existing.stockReservationExpiresAt ?? null;
    const expired = paymentExpiresAt != null && paymentExpiresAt <= now;

    if (expired) {
      const shouldRestore = existing.stockReservationStatus === "reserved";
      const payment: PaymentDocument = {
        provider: existing.payment?.provider ?? null,
        status: "expired",
        method: existing.payment?.method ?? null,
        reference: existing.payment?.reference ?? null,
        checkoutUrl: existing.payment?.checkoutUrl ?? null,
        expiresAt: paymentExpiresAt,
        paidAt: existing.payment?.paidAt ?? null,
        refundedAt: existing.payment?.refundedAt ?? null,
      };
      const document = await orders.findOneAndUpdate(
        {
          _id: objectId,
          customerFirebaseUid,
          status: "pending_payment",
        },
        {
          $set: {
            status: "cancelled",
            cancellationReason:
              "Waktu pembayaran habis. Pesanan dibatalkan otomatis.",
            payment,
            stockReservationStatus: shouldRestore
              ? "released"
              : existing.stockReservationStatus ?? null,
            stockReservationExpiresAt: null,
            stockReservationReleasedAt: shouldRestore ? now : null,
            updatedAt: now,
          },
        },
        { returnDocument: "after", session },
      );
      if (!document) return null;

      if (shouldRestore) {
        await restoreReservedStock(existing.stockReservedItems ?? [], session, now);
      }
      return serializeOrder(document);
    }

    const nextReservationStatus: StockReservationStatus | null =
      existing.stockReservationStatus === "reserved"
        ? "committed"
        : existing.stockReservationStatus ?? null;
    const payment: PaymentDocument = {
      provider: "development",
      status: "paid",
      method: "simulation",
      reference: `development:${objectId.toHexString()}`,
      checkoutUrl: null,
      expiresAt: paymentExpiresAt,
      paidAt: now,
      refundedAt: null,
    };

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
          payment,
          stockReservationStatus: nextReservationStatus,
          stockReservationExpiresAt: null,
          stockReservationCommittedAt:
            nextReservationStatus === "committed" ? now : null,
          updatedAt: now,
        },
      },
      { returnDocument: "after", session },
    );

    return document ? serializeOrder(document) : null;
  });
}

export async function getCustomerOrder(
  customerFirebaseUid: string,
  id: string,
): Promise<NitipOrder | null> {
  const objectId = parseObjectId(id);
  if (!objectId) return null;
  await releaseExpiredStockReservations(customerFirebaseUid);
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
  await releaseExpiredStockReservations(customerFirebaseUid);
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
  const orders = await getOrdersCollection();

  if (input.action === "reject") {
    return runInTransaction(async (session) => {
      const existing = await orders.findOne(
        {
          _id: orderObjectId,
          merchantId: merchantObjectId,
          status: "paid",
        },
        { session },
      );
      if (!existing) return null;

      const now = new Date();
      const shouldRestore =
        existing.stockReservationStatus === "reserved" ||
        existing.stockReservationStatus === "committed";

      const document = await orders.findOneAndUpdate(
        {
          _id: orderObjectId,
          merchantId: merchantObjectId,
          status: "paid",
        },
        {
          $set: {
            status: "cancelled",
            cancellationReason:
              input.reason?.trim() || "Pesanan ditolak merchant",
            stockReservationStatus: shouldRestore
              ? "released"
              : existing.stockReservationStatus ?? null,
            stockReservationExpiresAt: null,
            stockReservationReleasedAt: shouldRestore ? now : null,
            updatedAt: now,
          },
        },
        { returnDocument: "after", session },
      );
      if (!document) return null;

      if (shouldRestore) {
        await restoreReservedStock(existing.stockReservedItems ?? [], session, now);
      }
      return serializeMerchantOrder(document);
    });
  }

  const transition =
    input.action === "confirm"
      ? { from: "paid" as const, to: "merchant_confirmed" as const }
      : input.action === "start_preparing"
        ? { from: "merchant_confirmed" as const, to: "preparing" as const }
        : { from: "preparing" as const, to: "ready_for_pickup" as const };

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
        cancellationReason: null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? serializeMerchantOrder(document) : null;
}

async function outletMapForOrders(documents: WithId<OrderDocument>[]) {
  if (documents.length === 0) return new Map<string, WithId<OutletDocument>>();

  const db = await getMongoDb();
  const uniqueOutletIds = Array.from(
    new Map(documents.map((document) => [document.outletId.toHexString(), document.outletId])).values(),
  );
  const outlets = await db
    .collection<OutletDocument>("outlets")
    .find({ _id: { $in: uniqueOutletIds } })
    .toArray();

  return new Map(outlets.map((outlet) => [outlet._id.toHexString(), outlet]));
}

export async function listAvailableDriverOffers(
  driverId: string,
): Promise<NitipDriverOffer[]> {
  const driverObjectId = parseObjectId(driverId);
  if (!driverObjectId) return [];

  const orders = await getOrdersCollection();
  const active = await orders.findOne({
    driverId: driverObjectId,
    activeDriverAssignment: true,
  });
  if (active) return [];

  const documents = await orders
    .find({
      status: "ready_for_pickup",
      activeDriverAssignment: { $ne: true },
    })
    .sort({ updatedAt: 1 })
    .limit(30)
    .toArray();

  const outlets = await outletMapForOrders(documents);
  return documents.flatMap((document) => {
    const outlet = outlets.get(document.outletId.toHexString());
    return outlet ? [serializeDriverOffer(document, outlet)] : [];
  });
}

export async function getDriverCurrentOrder(
  driverId: string,
): Promise<NitipDriverOrder | null> {
  const driverObjectId = parseObjectId(driverId);
  if (!driverObjectId) return null;

  const orders = await getOrdersCollection();
  const document = await orders.findOne({
    driverId: driverObjectId,
    activeDriverAssignment: true,
    status: { $in: ["driver_assigned", "picked_up", "on_delivery"] },
  });
  if (!document) return null;

  const outlets = await outletMapForOrders([document]);
  const outlet = outlets.get(document.outletId.toHexString());
  return outlet ? serializeDriverOrder(document, outlet) : null;
}

export async function getDriverOrder(
  driverId: string,
  id: string,
): Promise<NitipDriverOrder | null> {
  const driverObjectId = parseObjectId(driverId);
  const orderObjectId = parseObjectId(id);
  if (!driverObjectId || !orderObjectId) return null;

  const orders = await getOrdersCollection();
  const document = await orders.findOne({
    _id: orderObjectId,
    driverId: driverObjectId,
    status: { $in: ["driver_assigned", "picked_up", "on_delivery", "delivered"] },
  });
  if (!document) return null;

  const outlets = await outletMapForOrders([document]);
  const outlet = outlets.get(document.outletId.toHexString());
  return outlet ? serializeDriverOrder(document, outlet) : null;
}

export async function acceptDriverOrder(
  driverId: string,
  id: string,
): Promise<NitipDriverOrder | null> {
  const driverObjectId = parseObjectId(driverId);
  const orderObjectId = parseObjectId(id);
  if (!driverObjectId || !orderObjectId) return null;

  const orders = await getOrdersCollection();
  const existing = await orders.findOne({
    driverId: driverObjectId,
    activeDriverAssignment: true,
  });
  if (existing) {
    throw new DriverDispatchError(
      "driver_has_active_order",
      409,
      "Selesaikan order aktif sebelum mengambil order baru",
    );
  }

  const now = new Date();
  let document: WithId<OrderDocument> | null = null;

  try {
    document = await orders.findOneAndUpdate(
      {
        _id: orderObjectId,
        status: "ready_for_pickup",
        activeDriverAssignment: { $ne: true },
        $or: [{ driverId: { $exists: false } }, { driverId: null }],
      },
      {
        $set: {
          status: "driver_assigned",
          driverId: driverObjectId,
          driverAssignedAt: now,
          activeDriverAssignment: true,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new DriverDispatchError(
        "driver_has_active_order",
        409,
        "Driver sudah memiliki order aktif",
      );
    }
    throw error;
  }

  if (!document) return null;

  const outlets = await outletMapForOrders([document]);
  const outlet = outlets.get(document.outletId.toHexString());
  if (!outlet) {
    throw new DriverDispatchError(
      "pickup_unavailable",
      409,
      "Lokasi pickup tidak tersedia",
    );
  }

  return serializeDriverOrder(document, outlet);
}
