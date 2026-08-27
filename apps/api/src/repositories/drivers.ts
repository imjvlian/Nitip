import type {
  CreateNitipDriverInput,
  NitipDriverProfile,
  ReviewNitipDriverInput,
  UpdateDriverLocationInput,
  UpdateNitipDriverInput,
} from "@nitip/domain/driver";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface DriverDocument {
  ownerFirebaseUid: string;
  fullName: string;
  phoneNumber: string;
  vehicleType: NitipDriverProfile["vehicleType"];
  vehicleBrandModel: string;
  vehiclePlate: string;
  status: NitipDriverProfile["status"];
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyMeters: number | null;
  locationUpdatedAt: Date | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByFirebaseUid: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getDriversCollection(): Promise<Collection<DriverDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<DriverDocument>("drivers");

  indexesReady ??= Promise.all([
    collection.createIndex(
      { ownerFirebaseUid: 1 },
      { unique: true, name: "drivers_ownerFirebaseUid_unique" },
    ),
    collection.createIndex(
      { status: 1, submittedAt: -1 },
      { name: "drivers_status_submittedAt" },
    ),
    collection.createIndex(
      { status: 1, isOnline: 1, updatedAt: -1 },
      { name: "drivers_availability" },
    ),
  ]).then(() => undefined);

  await indexesReady;
  return collection;
}

function serializeDriver(document: WithId<DriverDocument>): NitipDriverProfile {
  return {
    id: document._id.toHexString(),
    ownerFirebaseUid: document.ownerFirebaseUid,
    fullName: document.fullName,
    phoneNumber: document.phoneNumber,
    vehicleType: document.vehicleType,
    vehicleBrandModel: document.vehicleBrandModel,
    vehiclePlate: document.vehiclePlate,
    status: document.status,
    isOnline: document.isOnline,
    latitude: document.latitude ?? null,
    longitude: document.longitude ?? null,
    locationAccuracyMeters: document.locationAccuracyMeters ?? null,
    locationUpdatedAt: document.locationUpdatedAt?.toISOString() ?? null,
    submittedAt: document.submittedAt?.toISOString() ?? null,
    reviewedAt: document.reviewedAt?.toISOString() ?? null,
    rejectionReason: document.rejectionReason ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function driverObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function getDriverProfileByOwner(
  ownerFirebaseUid: string,
): Promise<NitipDriverProfile | null> {
  const drivers = await getDriversCollection();
  const document = await drivers.findOne({ ownerFirebaseUid });
  return document ? serializeDriver(document) : null;
}

export async function listDriverProfiles(): Promise<NitipDriverProfile[]> {
  const drivers = await getDriversCollection();
  const documents = await drivers.find({}).sort({ createdAt: -1 }).toArray();

  const statusOrder: Record<NitipDriverProfile["status"], number> = {
    pending_review: 0,
    rejected: 1,
    approved: 2,
    draft: 3,
  };

  return documents
    .map(serializeDriver)
    .sort((left, right) => {
      const statusDifference = statusOrder[left.status] - statusOrder[right.status];
      if (statusDifference !== 0) return statusDifference;
      return (right.submittedAt ?? right.createdAt).localeCompare(
        left.submittedAt ?? left.createdAt,
      );
    });
}

export async function createDriverProfile(
  ownerFirebaseUid: string,
  input: CreateNitipDriverInput,
): Promise<NitipDriverProfile> {
  const drivers = await getDriversCollection();
  const existing = await drivers.findOne({ ownerFirebaseUid });
  if (existing) return serializeDriver(existing);

  const now = new Date();
  const document: DriverDocument = {
    ownerFirebaseUid,
    fullName: input.fullName,
    phoneNumber: input.phoneNumber,
    vehicleType: input.vehicleType,
    vehicleBrandModel: input.vehicleBrandModel,
    vehiclePlate: input.vehiclePlate,
    status: "draft",
    isOnline: false,
    latitude: null,
    longitude: null,
    locationAccuracyMeters: null,
    locationUpdatedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewedByFirebaseUid: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await drivers.insertOne(document);
  return serializeDriver({ ...document, _id: result.insertedId });
}

export async function updateDriverProfile(
  ownerFirebaseUid: string,
  input: UpdateNitipDriverInput,
): Promise<NitipDriverProfile | null> {
  const drivers = await getDriversCollection();
  const set: Partial<DriverDocument> = { updatedAt: new Date(), isOnline: false };

  if (input.fullName !== undefined) set.fullName = input.fullName;
  if (input.phoneNumber !== undefined) set.phoneNumber = input.phoneNumber;
  if (input.vehicleType !== undefined) set.vehicleType = input.vehicleType;
  if (input.vehicleBrandModel !== undefined) {
    set.vehicleBrandModel = input.vehicleBrandModel;
  }
  if (input.vehiclePlate !== undefined) set.vehiclePlate = input.vehiclePlate;

  const document = await drivers.findOneAndUpdate(
    { ownerFirebaseUid, status: { $in: ["draft", "rejected"] } },
    { $set: set },
    { returnDocument: "after" },
  );

  return document ? serializeDriver(document) : null;
}

export async function submitDriverProfile(
  ownerFirebaseUid: string,
): Promise<NitipDriverProfile | null> {
  const drivers = await getDriversCollection();
  const now = new Date();

  const document = await drivers.findOneAndUpdate(
    { ownerFirebaseUid, status: { $in: ["draft", "rejected"] } },
    {
      $set: {
        status: "pending_review",
        isOnline: false,
        submittedAt: now,
        reviewedAt: null,
        reviewedByFirebaseUid: null,
        rejectionReason: null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (document) return serializeDriver(document);
  const existing = await drivers.findOne({ ownerFirebaseUid });
  return existing ? serializeDriver(existing) : null;
}

export async function reviewDriverProfile(
  id: string,
  reviewerFirebaseUid: string,
  input: ReviewNitipDriverInput,
): Promise<NitipDriverProfile | null> {
  const objectId = driverObjectId(id);
  if (!objectId) return null;

  const drivers = await getDriversCollection();
  const now = new Date();
  const document = await drivers.findOneAndUpdate(
    {
      _id: objectId,
      status: "pending_review",
      ownerFirebaseUid: { $ne: reviewerFirebaseUid },
    },
    {
      $set: {
        status: input.decision === "approve" ? "approved" : "rejected",
        isOnline: false,
        reviewedAt: now,
        reviewedByFirebaseUid: reviewerFirebaseUid,
        rejectionReason:
          input.decision === "reject" ? input.reason?.trim() || null : null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? serializeDriver(document) : null;
}

export async function setDriverAvailability(
  ownerFirebaseUid: string,
  isOnline: boolean,
): Promise<NitipDriverProfile | null> {
  const drivers = await getDriversCollection();
  const document = await drivers.findOneAndUpdate(
    { ownerFirebaseUid, status: "approved" },
    { $set: { isOnline, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  return document ? serializeDriver(document) : null;
}

export async function setDriverLocation(
  ownerFirebaseUid: string,
  input: UpdateDriverLocationInput,
): Promise<NitipDriverProfile | null> {
  const drivers = await getDriversCollection();
  const now = new Date();
  const document = await drivers.findOneAndUpdate(
    { ownerFirebaseUid, status: "approved" },
    {
      $set: {
        latitude: input.latitude,
        longitude: input.longitude,
        locationAccuracyMeters: input.accuracyMeters ?? null,
        locationUpdatedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? serializeDriver(document) : null;
}
