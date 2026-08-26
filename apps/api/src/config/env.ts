import "dotenv/config";

export class IntegrationNotConfiguredError extends Error {
  constructor(public readonly integration: "firebase" | "mongodb" | "cloudinary") {
    super(`${integration} is not configured`);
    this.name = "IntegrationNotConfiguredError";
  }
}

function read(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

const parsedPort = Number(process.env.PORT ?? "3001");

if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
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
} as const;
