import type {
  CreateNitipSupportTicketInput,
  NitipSupportTicket,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@nitip/domain";
import type { Collection, WithId } from "mongodb";

import { getMongoDb } from "../lib/mongodb.js";

interface SupportTicketDocument {
  firebaseUid: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  orderCode: string | null;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
}

let indexesReady: Promise<void> | null = null;

async function getSupportTicketsCollection(): Promise<Collection<SupportTicketDocument>> {
  const db = await getMongoDb();
  const collection = db.collection<SupportTicketDocument>("support_tickets");
  indexesReady ??= collection
    .createIndex(
      { firebaseUid: 1, createdAt: -1 },
      { name: "support_tickets_user_createdAt" },
    )
    .then(() => undefined);
  await indexesReady;
  return collection;
}

function serializeTicket(document: WithId<SupportTicketDocument>): NitipSupportTicket {
  return {
    id: document._id.toHexString(),
    category: document.category,
    subject: document.subject,
    message: document.message,
    orderCode: document.orderCode ?? null,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function createSupportTicket(
  firebaseUid: string,
  input: CreateNitipSupportTicketInput,
): Promise<NitipSupportTicket> {
  const tickets = await getSupportTicketsCollection();
  const now = new Date();
  const result = await tickets.insertOne({
    firebaseUid,
    category: input.category,
    subject: input.subject,
    message: input.message,
    orderCode: input.orderCode ?? null,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });

  const created = await tickets.findOne({ _id: result.insertedId });
  if (!created) throw new Error("Unable to load created support ticket");
  return serializeTicket(created);
}

export async function listSupportTickets(firebaseUid: string): Promise<NitipSupportTicket[]> {
  const tickets = await getSupportTicketsCollection();
  const items = await tickets.find({ firebaseUid }).sort({ createdAt: -1 }).limit(20).toArray();
  return items.map(serializeTicket);
}
