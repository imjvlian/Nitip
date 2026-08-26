import type { NitipUserProfile, UserRole, UserStatus } from "@nitip/domain";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Collection, WithId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface UserDocument {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<UserDocument>("users");

  indexesReady ??= collection
    .createIndex({ firebaseUid: 1 }, { unique: true, name: "users_firebaseUid_unique" })
    .then(() => undefined);

  await indexesReady;
  return collection;
}

function serializeUser(document: WithId<UserDocument>): NitipUserProfile {
  return {
    id: document._id.toHexString(),
    firebaseUid: document.firebaseUid,
    email: document.email,
    displayName: document.displayName,
    photoUrl: document.photoUrl,
    role: document.role,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function upsertUserFromFirebase(
  identity: DecodedIdToken,
): Promise<NitipUserProfile> {
  const users = await getUsersCollection();
  const now = new Date();

  const document = await users.findOneAndUpdate(
    { firebaseUid: identity.uid },
    {
      $set: {
        email: identity.email ?? null,
        displayName: identity.name ?? null,
        photoUrl: identity.picture ?? null,
        updatedAt: now,
      },
      $setOnInsert: {
        firebaseUid: identity.uid,
        role: "customer",
        status: "active",
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  if (!document) {
    throw new Error("Unable to create or load Nitip user profile");
  }

  return serializeUser(document);
}
