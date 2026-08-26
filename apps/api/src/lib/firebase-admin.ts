import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

export function getFirebaseAdminAuth() {
  if (
    !env.firebaseProjectId ||
    !env.firebaseClientEmail ||
    !env.firebasePrivateKey
  ) {
    throw new IntegrationNotConfiguredError("firebase");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey.replace(/\\n/g, "\n"),
      }),
    });

  return getAuth(app);
}
