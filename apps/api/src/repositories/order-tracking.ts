import type { OrderStatus } from "@nitip/domain";
import type { NitipOrderAddressSnapshot, NitipOrderTracking } from "@nitip/domain/commerce";
import type { Collection } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface OrderDocument {
  customerFirebaseUid: string;
  driverId?: ObjectId | null;
  status: OrderStatus;
  address: NitipOrderAddressSnapshot;
}

interface DriverDocument {
  fullName: string;
  vehicleBrandModel: string;
  vehiclePlate: string;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyMeters: number | null;
  locationUpdatedAt: Date | null;
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export async function getCustomerOrderTracking(
  firebaseUid: string,
  orderId: string,
): Promise<NitipOrderTracking | null> {
  const orderObjectId = parseObjectId(orderId);
  if (!orderObjectId) return null;

  const db = await getMongoDb();
  const orders = db.collection<OrderDocument>("orders");
  const order = await orders.findOne({
    _id: orderObjectId,
    customerFirebaseUid: firebaseUid,
  });
  if (!order) return null;

  const destination = {
    recipientName: order.address.recipientName,
    addressLine: order.address.addressLine,
    latitude: order.address.latitude ?? null,
    longitude: order.address.longitude ?? null,
  };

  if (order.status !== "on_delivery" || !order.driverId) {
    return {
      status: order.status,
      active: false,
      driver: null,
      destination,
    };
  }

  const drivers = db.collection<DriverDocument>("drivers");
  const driver = await drivers.findOne({ _id: order.driverId });
  if (
    !driver ||
    driver.latitude == null ||
    driver.longitude == null ||
    !driver.locationUpdatedAt
  ) {
    return {
      status: order.status,
      active: false,
      driver: null,
      destination,
    };
  }

  return {
    status: order.status,
    active: true,
    driver: {
      fullName: driver.fullName,
      vehicleBrandModel: driver.vehicleBrandModel,
      vehiclePlate: driver.vehiclePlate,
      latitude: driver.latitude,
      longitude: driver.longitude,
      accuracyMeters: driver.locationAccuracyMeters ?? null,
      locationUpdatedAt: driver.locationUpdatedAt.toISOString(),
    },
    destination,
  };
}
