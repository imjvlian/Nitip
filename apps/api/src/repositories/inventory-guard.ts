import type { NitipCheckoutLine } from "@nitip/domain/commerce";
import { ObjectId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

function idsFromLines(lines: NitipCheckoutLine[]) {
  return lines.flatMap((line) => (ObjectId.isValid(line.productId) ? [new ObjectId(line.productId)] : []));
}

export async function autoDisableSoldOutProducts(lines: NitipCheckoutLine[]) {
  const ids = idsFromLines(lines);
  if (ids.length === 0) return;
  const db = await getMongoDb();
  await db.collection("products").updateMany(
    { _id: { $in: ids }, stockQuantity: { $lte: 0 }, isAvailable: true },
    { $set: { isAvailable: false, autoSoldOut: true, updatedAt: new Date() } },
  );
}

export async function restoreAutoSoldOutProducts(lines: NitipCheckoutLine[]) {
  const ids = idsFromLines(lines);
  if (ids.length === 0) return;
  const db = await getMongoDb();
  await db.collection("products").updateMany(
    { _id: { $in: ids }, stockQuantity: { $gt: 0 }, autoSoldOut: true },
    { $set: { isAvailable: true, autoSoldOut: false, updatedAt: new Date() } },
  );
}
