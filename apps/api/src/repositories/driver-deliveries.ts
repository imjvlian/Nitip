import type { OrderStatus } from "@nitip/domain";
import type { DriverDeliveryAction } from "@nitip/domain/driver";
import type { Collection } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface DriverDeliveryOrderDocument {
  driverId?: ObjectId | null;
  status: OrderStatus;
  activeDriverAssignment?: boolean;
  pickedUpAt?: Date | null;
  deliveryStartedAt?: Date | null;
  deliveredAt?: Date | null;
  updatedAt: Date;
}

async function getOrdersCollection(): Promise<Collection<DriverDeliveryOrderDocument>> {
  const db = await getMongoDb();
  return db.collection<DriverDeliveryOrderDocument>("orders");
}

function parseObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export async function applyDriverDeliveryAction(
  driverId: string,
  orderId: string,
  action: DriverDeliveryAction,
): Promise<boolean> {
  const driverObjectId = parseObjectId(driverId);
  const orderObjectId = parseObjectId(orderId);
  if (!driverObjectId || !orderObjectId) return false;

  const now = new Date();
  const transition =
    action === "confirm_pickup"
      ? {
          from: "driver_assigned" as const,
          set: {
            status: "picked_up" as const,
            pickedUpAt: now,
            updatedAt: now,
          },
        }
      : action === "start_delivery"
        ? {
            from: "picked_up" as const,
            set: {
              status: "on_delivery" as const,
              deliveryStartedAt: now,
              updatedAt: now,
            },
          }
        : {
            from: "on_delivery" as const,
            set: {
              status: "delivered" as const,
              deliveredAt: now,
              activeDriverAssignment: false,
              updatedAt: now,
            },
          };

  const orders = await getOrdersCollection();
  const document = await orders.findOneAndUpdate(
    {
      _id: orderObjectId,
      driverId: driverObjectId,
      status: transition.from,
      activeDriverAssignment: true,
    },
    { $set: transition.set },
    { returnDocument: "after" },
  );

  return Boolean(document);
}
