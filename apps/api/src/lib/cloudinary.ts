import { createHash } from "node:crypto";

import type { CloudinaryUploadSignature } from "@nitip/domain/catalog";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

export function createProductUploadSignature(merchantId: string): CloudinaryUploadSignature {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new IntegrationNotConfiguredError("cloudinary");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `nitip/products/${merchantId}`;
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${env.cloudinaryApiSecret}`)
    .digest("hex");

  return {
    cloudName: env.cloudinaryCloudName,
    apiKey: env.cloudinaryApiKey,
    timestamp,
    folder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`,
  };
}
