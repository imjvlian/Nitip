import "dotenv/config";

export class IntegrationNotConfiguredError extends Error {
  constructor(
    public readonly integration: "firebase" | "mongodb" | "cloudinary" | "doku" | "midtrans",
  ) {
    super(`${integration} is not configured`);
    this.name = "IntegrationNotConfiguredError";
  }
}

function read(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readCsv(name: string) {
  const value = read(name);
  if (!value) return [] as string[];

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const parsedPort = Number(process.env.PORT ?? "3001");
const nodeEnv = process.env.NODE_ENV ?? "development";

// New Nitip payment sessions are routed through DOKU again.
// Midtrans configuration is retained temporarily so existing Midtrans orders can still reconcile.
const paymentProviderValue = "doku" as const;

if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

export const env = {
  nodeEnv,
  host: process.env.HOST?.trim() || "0.0.0.0",
  port: parsedPort,
  mongodbUri: read("MONGODB_URI"),
  mongodbDbName: read("MONGODB_DB_NAME") ?? "nitip",
  googleApplicationCredentials: read("GOOGLE_APPLICATION_CREDENTIALS"),
  firebaseProjectId: read("FIREBASE_PROJECT_ID"),
  firebaseClientEmail: read("FIREBASE_CLIENT_EMAIL"),
  firebasePrivateKey: read("FIREBASE_PRIVATE_KEY"),
  cloudinaryCloudName: read("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: read("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: read("CLOUDINARY_API_SECRET"),
  paymentProvider: paymentProviderValue,
  dokuBaseUrl:
    read("DOKU_BASE_URL") ??
    (nodeEnv === "production"
      ? "https://api.doku.com"
      : "https://api-sandbox.doku.com"),
  dokuClientId: read("DOKU_CLIENT_ID"),
  dokuSecretKey: read("DOKU_SECRET_KEY"),
  dokuNotificationUrl: read("DOKU_NOTIFICATION_URL"),
  midtransBaseUrl:
    read("MIDTRANS_BASE_URL") ??
    (nodeEnv === "production"
      ? "https://api.midtrans.com"
      : "https://api.sandbox.midtrans.com"),
  midtransServerKey: read("MIDTRANS_SERVER_KEY"),
  midtransNotificationUrl: read("MIDTRANS_NOTIFICATION_URL"),
  adminEmails: readCsv("ADMIN_EMAILS"),
} as const;

const explicitFirebaseCredentials = Boolean(
  env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey,
);

export const integrationStatus = {
  mongodb: Boolean(env.mongodbUri),
  firebase: Boolean(env.googleApplicationCredentials) || explicitFirebaseCredentials,
  cloudinary: Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret,
  ),
  doku: Boolean(env.dokuClientId && env.dokuSecretKey),
  midtrans: Boolean(env.midtransServerKey),
} as const;
