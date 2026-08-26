import type {
  CreateNitipAddressInput,
  NitipAddress,
  UpdateNitipAddressInput,
} from "@nitip/domain";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

interface AddressDocument {
  firebaseUid: string;
  label: CreateNitipAddressInput["label"];
  customLabel: string | null;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  notes: string | null;
  location?: GeoPoint;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getAddressesCollection(): Promise<Collection<AddressDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<AddressDocument>("addresses");

  indexesReady ??= Promise.all([
    collection.createIndex(
      { firebaseUid: 1, createdAt: 1 },
      { name: "addresses_owner_createdAt" },
    ),
    collection.createIndex(
      { location: "2dsphere" },
      { name: "addresses_location_2dsphere" },
    ),
    collection.createIndex(
      { firebaseUid: 1, isDefault: 1 },
      {
        name: "addresses_one_default_per_owner",
        unique: true,
        partialFilterExpression: { isDefault: true },
      },
    ),
  ]).then(() => undefined);

  await indexesReady;
  return collection;
}

function serializeAddress(document: WithId<AddressDocument>): NitipAddress {
  const coordinates = document.location?.coordinates;

  return {
    id: document._id.toHexString(),
    label: document.label,
    customLabel: document.customLabel ?? null,
    recipientName: document.recipientName,
    phoneNumber: document.phoneNumber,
    addressLine: document.addressLine,
    notes: document.notes ?? null,
    latitude: coordinates?.[1] ?? null,
    longitude: coordinates?.[0] ?? null,
    isDefault: document.isDefault,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function toLocation(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): GeoPoint | undefined {
  if (latitude == null || longitude == null) return undefined;
  return { type: "Point", coordinates: [longitude, latitude] };
}

function parseAddressId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function listUserAddresses(firebaseUid: string): Promise<NitipAddress[]> {
  const addresses = await getAddressesCollection();
  const documents = await addresses
    .find({ firebaseUid })
    .sort({ isDefault: -1, createdAt: 1 })
    .toArray();

  return documents.map(serializeAddress);
}

export async function createUserAddress(
  firebaseUid: string,
  input: CreateNitipAddressInput,
): Promise<NitipAddress> {
  const addresses = await getAddressesCollection();
  const now = new Date();
  const hasAddress = (await addresses.countDocuments({ firebaseUid }, { limit: 1 })) > 0;
  const makeDefault = !hasAddress || Boolean(input.isDefault);

  if (makeDefault) {
    await addresses.updateMany(
      { firebaseUid, isDefault: true },
      { $set: { isDefault: false, updatedAt: now } },
    );
  }

  const location = toLocation(input.latitude, input.longitude);
  const document: AddressDocument = {
    firebaseUid,
    label: input.label,
    customLabel: input.label === "other" ? input.customLabel ?? null : null,
    recipientName: input.recipientName,
    phoneNumber: input.phoneNumber,
    addressLine: input.addressLine,
    notes: input.notes ?? null,
    ...(location ? { location } : {}),
    isDefault: makeDefault,
    createdAt: now,
    updatedAt: now,
  };

  const result = await addresses.insertOne(document);
  return serializeAddress({ ...document, _id: result.insertedId });
}

export async function updateUserAddress(
  firebaseUid: string,
  id: string,
  input: UpdateNitipAddressInput,
): Promise<NitipAddress | null> {
  const objectId = parseAddressId(id);
  if (!objectId) return null;

  const addresses = await getAddressesCollection();
  const existing = await addresses.findOne({ _id: objectId, firebaseUid });
  if (!existing) return null;

  const now = new Date();
  const set: Partial<AddressDocument> = { updatedAt: now };
  let unsetLocation = false;

  if (input.label !== undefined) {
    set.label = input.label;
    if (input.label !== "other") set.customLabel = null;
  }
  if (Object.prototype.hasOwnProperty.call(input, "customLabel")) {
    set.customLabel = input.customLabel ?? null;
  }
  if (input.recipientName !== undefined) set.recipientName = input.recipientName;
  if (input.phoneNumber !== undefined) set.phoneNumber = input.phoneNumber;
  if (input.addressLine !== undefined) set.addressLine = input.addressLine;
  if (Object.prototype.hasOwnProperty.call(input, "notes")) {
    set.notes = input.notes ?? null;
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

  if (input.isDefault === true && !existing.isDefault) {
    await addresses.updateMany(
      { firebaseUid, isDefault: true, _id: { $ne: objectId } },
      { $set: { isDefault: false, updatedAt: now } },
    );
    set.isDefault = true;
  }

  const update = unsetLocation
    ? { $set: set, $unset: { location: "" } }
    : { $set: set };

  const document = await addresses.findOneAndUpdate(
    { _id: objectId, firebaseUid },
    update,
    { returnDocument: "after" },
  );

  return document ? serializeAddress(document) : null;
}

export async function deleteUserAddress(firebaseUid: string, id: string) {
  const objectId = parseAddressId(id);
  if (!objectId) return false;

  const addresses = await getAddressesCollection();
  const existing = await addresses.findOne({ _id: objectId, firebaseUid });
  if (!existing) return false;

  await addresses.deleteOne({ _id: objectId, firebaseUid });

  if (existing.isDefault) {
    const replacement = await addresses.findOne(
      { firebaseUid },
      { sort: { createdAt: 1 } },
    );

    if (replacement) {
      await addresses.updateOne(
        { _id: replacement._id, firebaseUid },
        { $set: { isDefault: true, updatedAt: new Date() } },
      );
    }
  }

  return true;
}
