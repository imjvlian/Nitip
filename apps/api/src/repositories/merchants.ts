import type {
  CreateNitipMerchantInput,
  NitipMerchantProfile,
  UpdateNitipMerchantInput,
} from "@nitip/domain";
import type { Collection, WithId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface MerchantDocument {
  ownerFirebaseUid: string;
  businessName: string;
  contactName: string;
  phoneNumber: string;
  description: string | null;
  status: NitipMerchantProfile["status"];
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getMerchantsCollection(): Promise<Collection<MerchantDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<MerchantDocument>("merchants");

  indexesReady ??= collection
    .createIndex(
      { ownerFirebaseUid: 1 },
      { unique: true, name: "merchants_ownerFirebaseUid_unique" },
    )
    .then(() => undefined);

  await indexesReady;
  return collection;
}

function serializeMerchant(
  document: WithId<MerchantDocument>,
): NitipMerchantProfile {
  return {
    id: document._id.toHexString(),
    ownerFirebaseUid: document.ownerFirebaseUid,
    businessName: document.businessName,
    contactName: document.contactName,
    phoneNumber: document.phoneNumber,
    description: document.description ?? null,
    status: document.status,
    submittedAt: document.submittedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function getMerchantProfileByOwner(
  ownerFirebaseUid: string,
): Promise<NitipMerchantProfile | null> {
  const merchants = await getMerchantsCollection();
  const document = await merchants.findOne({ ownerFirebaseUid });
  return document ? serializeMerchant(document) : null;
}

export async function createMerchantProfile(
  ownerFirebaseUid: string,
  input: CreateNitipMerchantInput,
): Promise<NitipMerchantProfile> {
  const merchants = await getMerchantsCollection();
  const existing = await merchants.findOne({ ownerFirebaseUid });

  if (existing) {
    return serializeMerchant(existing);
  }

  const now = new Date();
  const document: MerchantDocument = {
    ownerFirebaseUid,
    businessName: input.businessName,
    contactName: input.contactName,
    phoneNumber: input.phoneNumber,
    description: input.description ?? null,
    status: "draft",
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await merchants.insertOne(document);
  return serializeMerchant({ ...document, _id: result.insertedId });
}

export async function updateMerchantProfile(
  ownerFirebaseUid: string,
  input: UpdateNitipMerchantInput,
): Promise<NitipMerchantProfile | null> {
  const merchants = await getMerchantsCollection();
  const set: Partial<MerchantDocument> = {
    updatedAt: new Date(),
  };

  if (input.businessName !== undefined) set.businessName = input.businessName;
  if (input.contactName !== undefined) set.contactName = input.contactName;
  if (input.phoneNumber !== undefined) set.phoneNumber = input.phoneNumber;
  if (Object.prototype.hasOwnProperty.call(input, "description")) {
    set.description = input.description ?? null;
  }

  const document = await merchants.findOneAndUpdate(
    { ownerFirebaseUid, status: { $in: ["draft", "rejected"] } },
    { $set: set },
    { returnDocument: "after" },
  );

  return document ? serializeMerchant(document) : null;
}

export async function submitMerchantProfile(
  ownerFirebaseUid: string,
): Promise<NitipMerchantProfile | null> {
  const merchants = await getMerchantsCollection();
  const now = new Date();

  const document = await merchants.findOneAndUpdate(
    { ownerFirebaseUid, status: { $in: ["draft", "rejected"] } },
    {
      $set: {
        status: "pending_review",
        submittedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (document) return serializeMerchant(document);

  const existing = await merchants.findOne({ ownerFirebaseUid });
  return existing ? serializeMerchant(existing) : null;
}
