import { createHash } from "node:crypto";

import type { CloudinaryUploadSignature } from "@nitip/domain/catalog";

import { env, IntegrationNotConfiguredError } from "../config/env.js";

export interface ProfilePhotoUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId: string;
  overwrite: true;
  signature: string;
  uploadUrl: string;
}

function requireCloudinary() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new IntegrationNotConfiguredError("cloudinary");
  }
  return { cloudName: env.cloudinaryCloudName, apiKey: env.cloudinaryApiKey, apiSecret: env.cloudinaryApiSecret };
}

function basicSignature(folder: string): CloudinaryUploadSignature {
  const cloudinary = requireCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${cloudinary.apiSecret}`)
    .digest("hex");
  return {
    cloudName: cloudinary.cloudName,
    apiKey: cloudinary.apiKey,
    timestamp,
    folder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
  };
}

export function createProductUploadSignature(merchantId: string): CloudinaryUploadSignature {
  return basicSignature(`nitip/products/${merchantId}`);
}

export function createDeliveryProofUploadSignature(driverId: string): CloudinaryUploadSignature {
  return basicSignature(`nitip/delivery-proofs/${driverId}`);
}

export function createProfilePhotoUploadSignature(firebaseUid: string): ProfilePhotoUploadSignature {
  const cloudinary = requireCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const userKey = createHash("sha256").update(firebaseUid).digest("hex").slice(0, 32);
  const folder = `nitip/users/${userKey}`;
  const publicId = "avatar";
  const signature = createHash("sha1")
    .update(`folder=${folder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${cloudinary.apiSecret}`)
    .digest("hex");
  return {
    cloudName: cloudinary.cloudName,
    apiKey: cloudinary.apiKey,
    timestamp,
    folder,
    publicId,
    overwrite: true,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
  };
}
