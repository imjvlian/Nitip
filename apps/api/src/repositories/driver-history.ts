import type { NitipDriverOrder } from "@nitip/domain/driver";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

interface DriverHistoryOrderDocument {
  outletId: ObjectId;
  driverId?: ObjectId | null;
  businessName: string;
  outletName: string;
  address: {
    recipientName: string;
    phoneNumber: string;
    addressLine: string;
    notes: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  items: Array<{ productId: string; name: string; quantity: number }>;
  distanceKm: number | null;
  deliveryFare: number;
  status: "driver_assigned" | "picked_up" | "on_delivery" | "delivered" | string;
  driverAssignedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OutletDocument {
  addressLine: string;
  location?: GeoPoint;
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function orderCode(id: ObjectId) {
  return `NTP-${id.toHexString().slice(-8).toUpperCase()}`;
}

function isDeliveryStatus(
  status: string,
): status is NitipDriverOrder["status"] {
  return (
    status === "driver_assigned" ||
    status === "picked_up" ||
    status === "on_delivery" ||
    status === "delivered"
  );
}

async function getOrdersCollection(): Promise<Collection<DriverHistoryOrderDocument>> {
  const db = await getMongoDb();
  return db.collection<DriverHistoryOrderDocument>("orders");
}

async function getOutlets(ids: ObjectId[]) {
  const db = await getMongoDb();
  const uniqueIds = [...new Map(ids.map((id) => [id.toHexString(), id])).values()];
  const documents = await db
    .collection<OutletDocument>("outlets")
    .find({ _id: { $in: uniqueIds } })
    .toArray();
  return new Map(documents.map((outlet) => [outlet._id.toHexString(), outlet]));
}

function serializeHistoryOrder(
  document: WithId<DriverHistoryOrderDocument>,
  outlet: WithId<OutletDocument>,
): NitipDriverOrder | null {
  if (!isDeliveryStatus(document.status) || !document.driverAssignedAt) return null;
  const coordinates = outlet.location?.coordinates;
  return {
    id: document._id.toHexString(),
    orderCode: orderCode(document._id),
    status: document.status,
    pickup: {
      outletId: document.outletId.toHexString(),
      businessName: document.businessName,
      outletName: document.outletName,
      addressLine: outlet.addressLine,
      latitude: coordinates?.[1] ?? null,
      longitude: coordinates?.[0] ?? null,
    },
    distanceKm: document.distanceKm,
    deliveryFare: document.deliveryFare,
    itemCount: document.items.reduce((total, item) => total + item.quantity, 0),
    createdAt: document.createdAt.toISOString(),
    destination: {
      recipientName: document.address.recipientName,
      phoneNumber: document.address.phoneNumber,
      addressLine: document.address.addressLine,
      notes: document.address.notes ?? null,
      latitude: document.address.latitude ?? null,
      longitude: document.address.longitude ?? null,
    },
    items: document.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
    })),
    assignedAt: document.driverAssignedAt.toISOString(),
  };
}

export async function listDriverCompletedOrders(
  driverId: string,
  limit = 100,
): Promise<NitipDriverOrder[]> {
  const driverObjectId = parseObjectId(driverId);
  if (!driverObjectId) return [];

  const orders = await getOrdersCollection();
  const documents = await orders
    .find({
      driverId: driverObjectId,
      status: "delivered",
      driverAssignedAt: { $exists: true, $ne: null },
    })
    .sort({ updatedAt: -1 })
    .limit(Math.max(1, Math.min(limit, 250)))
    .toArray();

  if (documents.length === 0) return [];
  const outlets = await getOutlets(documents.map((document) => document.outletId));
  return documents.flatMap((document) => {
    const outlet = outlets.get(document.outletId.toHexString());
    if (!outlet) return [];
    const serialized = serializeHistoryOrder(document, outlet);
    return serialized ? [serialized] : [];
  });
}
