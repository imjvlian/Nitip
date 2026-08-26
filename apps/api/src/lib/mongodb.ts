import { Db, MongoClient } from "mongodb";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

let clientPromise: Promise<MongoClient> | null = null;

async function getMongoClient() {
  if (!env.mongodbUri) {
    throw new IntegrationNotConfiguredError("mongodb");
  }

  clientPromise ??= new MongoClient(env.mongodbUri).connect();
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(env.mongodbDbName);
}

export async function closeMongoDb() {
  if (!clientPromise) return;

  const client = await clientPromise;
  await client.close();
  clientPromise = null;
}
