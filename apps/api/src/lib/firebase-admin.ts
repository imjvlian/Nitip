import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

function getFirebaseOptions(): AppOptions {
  if (env.googleApplicationCredentials) {
    return { credential: applicationDefault() };
  }

  if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
    return {
      credential: cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey.replace(/\\n/g, "\n"),
      }),
    };
  }

  throw new IntegrationNotConfiguredError("firebase");
}

export function getFirebaseAdminAuth() {
  const app = getApps()[0] ?? initializeApp(getFirebaseOptions());
  return getAuth(app);
}
