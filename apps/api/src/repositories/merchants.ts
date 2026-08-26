import type {
  CreateNitipMerchantInput,
  NitipMerchantProfile,
  ReviewNitipMerchantInput,
  UpdateNitipMerchantInput,
} from "@nitip/domain";
import type { Collection, WithId } from "mongodb";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface MerchantDocument {
  ownerFirebaseUid: string;
  businessName: string;
  contactName: string;
  phoneNumber: string;
  description: string | null;
  status: NitipMerchantProfile["status"];
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByFirebaseUid: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getMerchantsCollection(): Promise<Collection<MerchantDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<MerchantDocument>("merchants");

  indexesReady ??= Promise.all([
    collection.createIndex(
      { ownerFirebaseUid: 1 },
      { unique: true, name: "merchants_ownerFirebaseUid_unique" },
    ),
    collection.createIndex(
      { status: 1, submittedAt: -1 },
      { name: "merchants_status_submittedAt" },
    ),
  ]).then(() => undefined);

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
    reviewedAt: document.reviewedAt?.toISOString() ?? null,
    rejectionReason: document.rejectionReason ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

function merchantObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function getMerchantProfileByOwner(
  ownerFirebaseUid: string,
): Promise<NitipMerchantProfile | null> {
  const merchants = await getMerchantsCollection();
  const document = await merchants.findOne({ ownerFirebaseUid });
  return document ? serializeMerchant(document) : null;
}

export async function listMerchantProfiles(): Promise<NitipMerchantProfile[]> {
  const merchants = await getMerchantsCollection();
  const documents = await merchants
    .find({})
    .sort({ status: -1, submittedAt: -1, createdAt: -1 })
    .toArray();

  const statusOrder: Record<NitipMerchantProfile["status"], number> = {
    pending_review: 0,
    rejected: 1,
    approved: 2,
    draft: 3,
  };

  return documents
    .map(serializeMerchant)
    .sort((left, right) => {
      const statusDifference = statusOrder[left.status] - statusOrder[right.status];
      if (statusDifference !== 0) return statusDifference;
      return (right.submittedAt ?? right.createdAt).localeCompare(
        left.submittedAt ?? left.createdAt,
      );
    });
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
    reviewedAt: null,
    reviewedByFirebaseUid: null,
    rejectionReason: null,
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
        reviewedAt: null,
        reviewedByFirebaseUid: null,
        rejectionReason: null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (document) return serializeMerchant(document);

  const existing = await merchants.findOne({ ownerFirebaseUid });
  return existing ? serializeMerchant(existing) : null;
}

export async function reviewMerchantProfile(
  id: string,
  reviewerFirebaseUid: string,
  input: ReviewNitipMerchantInput,
): Promise<NitipMerchantProfile | null> {
  const objectId = merchantObjectId(id);
  if (!objectId) return null;

  const merchants = await getMerchantsCollection();
  const now = new Date();
  const document = await merchants.findOneAndUpdate(
    {
      _id: objectId,
      status: "pending_review",
      ownerFirebaseUid: { $ne: reviewerFirebaseUid },
    },
    {
      $set: {
        status: input.decision === "approve" ? "approved" : "rejected",
        reviewedAt: now,
        reviewedByFirebaseUid: reviewerFirebaseUid,
        rejectionReason:
          input.decision === "reject" ? input.reason?.trim() || null : null,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? serializeMerchant(document) : null;
}
