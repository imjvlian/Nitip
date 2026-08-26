import type { DecodedIdToken } from "firebase-admin/auth";
import type { FastifyReply, FastifyRequest } from "fastify";

import { env } from "../config/env.js";
import { upsertUserFromFirebase } from "../repositories/users.js";
import { authenticateRequest } from "./authenticate.js";

export interface AdminIdentity {
  identity: DecodedIdToken;
  authorizedBy: "role" | "email_allowlist";
}

export async function authorizeAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AdminIdentity | null> {
  const identity = await authenticateRequest(request, reply);
  if (!identity) return null;

  const profile = await upsertUserFromFirebase(identity);
  const email = identity.email?.trim().toLowerCase() ?? null;
  const authorizedByRole = profile.role === "admin";
  const authorizedByEmail = Boolean(email && env.adminEmails.includes(email));

  if (
    profile.status !== "active" ||
    (!authorizedByRole && !authorizedByEmail)
  ) {
    await reply.code(403).send({
      error: "admin_required",
      message: "Akun ini tidak memiliki akses Nitip Ops",
    });
    return null;
  }

  return {
    identity,
    authorizedBy: authorizedByRole ? "role" : "email_allowlist",
  };
}
