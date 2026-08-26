import {
  createDefaultOutletOpeningHours,
  type CreateNitipOutletInput,
  type NitipOutlet,
  type OutletOpeningHour,
  type UpdateNitipOutletInput,
} from "@nitip/domain";
import type { Collection, UpdateFilter, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

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

let indexesReady: Promise<void> | null = null;

async function getOutletsCollection(): Promise<Collection<OutletDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<OutletDocument>("outlets");

  indexesReady ??= Promise.all([
    collection.createIndex(
      { merchantId: 1, createdAt: 1 },
      { name: "outlets_merchant_createdAt" },
    ),
    collection.createIndex(
      { location: "2dsphere" },
      { name: "outlets_location_2dsphere" },
    ),
  ]).then(() => undefined);

  await indexesReady;
  return collection;
}

function serializeOutlet(document: WithId<OutletDocument>): NitipOutlet {
  const coordinates = document.location?.coordinates;

  return {
    id: document._id.toHexString(),
    merchantId: document.merchantId.toHexString(),
    name: document.name,
    phoneNumber: document.phoneNumber,
    addressLine: document.addressLine,
    latitude: coordinates?.[1] ?? null,
    longitude: coordinates?.[0] ?? null,
    isActive: document.isActive,
    acceptingOrders: document.acceptingOrders,
    openingHours: document.openingHours,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toLocation(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): GeoPoint | undefined {
  if (latitude == null || longitude == null) return undefined;
  return {
    type: "Point",
    coordinates: [longitude, latitude],
  };
}

function merchantObjectId(merchantId: string) {
  if (!ObjectId.isValid(merchantId)) {
    throw new Error("Invalid merchant id");
  }
  return new ObjectId(merchantId);
}

function outletObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function listMerchantOutlets(
  merchantId: string,
): Promise<NitipOutlet[]> {
  const outlets = await getOutletsCollection();
  const documents = await outlets
    .find({ merchantId: merchantObjectId(merchantId) })
    .sort({ createdAt: 1 })
    .toArray();

  return documents.map(serializeOutlet);
}

export async function createMerchantOutlet(
  merchantId: string,
  input: CreateNitipOutletInput,
): Promise<NitipOutlet> {
  const outlets = await getOutletsCollection();
  const now = new Date();
  const location = toLocation(input.latitude, input.longitude);
  const isActive = input.isActive ?? true;

  const document: OutletDocument = {
    merchantId: merchantObjectId(merchantId),
    name: input.name,
    phoneNumber: input.phoneNumber,
    addressLine: input.addressLine,
    ...(location ? { location } : {}),
    isActive,
    acceptingOrders: isActive && Boolean(input.acceptingOrders),
    openingHours:
      input.openingHours?.map((item) => ({ ...item })) ??
      createDefaultOutletOpeningHours(),
    createdAt: now,
    updatedAt: now,
  };

  const result = await outlets.insertOne(document);
  return serializeOutlet({ ...document, _id: result.insertedId });
}

export async function updateMerchantOutlet(
  merchantId: string,
  id: string,
  input: UpdateNitipOutletInput,
): Promise<NitipOutlet | null> {
  const objectId = outletObjectId(id);
  if (!objectId) return null;

  const outlets = await getOutletsCollection();
  const merchantIdObject = merchantObjectId(merchantId);
  const existing = await outlets.findOne({
    _id: objectId,
    merchantId: merchantIdObject,
  });
  if (!existing) return null;

  const set: Partial<OutletDocument> = {
    updatedAt: new Date(),
  };
  let unsetLocation = false;

  if (input.name !== undefined) set.name = input.name;
  if (input.phoneNumber !== undefined) set.phoneNumber = input.phoneNumber;
  if (input.addressLine !== undefined) set.addressLine = input.addressLine;
  if (input.openingHours !== undefined) {
    set.openingHours = input.openingHours.map((item) => ({ ...item }));
  }
  if (input.isActive !== undefined) {
    set.isActive = input.isActive;
    if (!input.isActive) set.acceptingOrders = false;
  }
  if (input.acceptingOrders !== undefined) {
    const nextActive = input.isActive ?? existing.isActive;
    set.acceptingOrders = nextActive ? input.acceptingOrders : false;
  }

  const coordinatesChanged =
    Object.prototype.hasOwnProperty.call(input, "latitude") ||
    Object.prototype.hasOwnProperty.call(input, "longitude");

  if (coordinatesChanged) {
    const latitude = Object.prototype.hasOwnProperty.call(input, "latitude")
      ? input.latitude
      : existing.location?.coordinates[1] ?? null;
    const longitude = Object.prototype.hasOwnProperty.call(input, "longitude")
      ? input.longitude
      : existing.location?.coordinates[0] ?? null;

    if ((latitude == null) !== (longitude == null)) {
      throw new Error("latitude and longitude must be provided together");
    }

    const location = toLocation(latitude, longitude);
    if (location) set.location = location;
    else unsetLocation = true;
  }

  const update: UpdateFilter<OutletDocument> = unsetLocation
    ? { $set: set, $unset: { location: "" } }
    : { $set: set };

  const document = await outlets.findOneAndUpdate(
    {
      _id: objectId,
      merchantId: merchantIdObject,
    },
    update,
    { returnDocument: "after" },
  );

  return document ? serializeOutlet(document) : null;
}

export async function deleteMerchantOutlet(
  merchantId: string,
  id: string,
): Promise<boolean> {
  const objectId = outletObjectId(id);
  if (!objectId) return false;

  const outlets = await getOutletsCollection();
  const result = await outlets.deleteOne({
    _id: objectId,
    merchantId: merchantObjectId(merchantId),
  });

  return result.deletedCount === 1;
}
