import type { OutletOpeningHour } from "./index.js";

export interface NitipCategory {
  id: string;
  outletId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNitipCategoryInput {
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateNitipCategoryInput = Partial<CreateNitipCategoryInput>;

export interface NitipProductAddon {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface CreateNitipProductAddonInput {
  id?: string;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface NitipProduct {
  id: string;
  outletId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  stockQuantity: number | null;
  isAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  addons: NitipProductAddon[];
  ratingAverage?: number | null;
  ratingCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNitipProductInput {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  stockQuantity?: number | null;
  isAvailable?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  addons?: CreateNitipProductAddonInput[];
}

export type UpdateNitipProductInput = Partial<CreateNitipProductInput>;

export interface NitipCatalogOutletSummary {
  id: string;
  merchantId: string;
  businessName: string;
  name: string;
  addressLine: string;
  acceptingOrders: boolean;
  productCount: number;
  minPrice: number | null;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
}

export interface NitipCatalogCategory extends NitipCategory {
  products: NitipProduct[];
}

export interface NitipCatalogOutlet {
  id: string;
  merchantId: string;
  businessName: string;
  name: string;
  addressLine: string;
  phoneNumber: string;
  latitude: number | null;
  longitude: number | null;
  acceptingOrders: boolean;
  ratingAverage: number | null;
  ratingCount: number;
  openingHours: OutletOpeningHour[];
  categories: NitipCatalogCategory[];
}

export interface NitipPromotion {
  id: string;
  title: string;
  description: string | null;
  ctaLabel: string | null;
  imageUrl: string | null;
  outletId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNitipPromotionInput {
  title: string;
  description?: string | null;
  ctaLabel?: string | null;
  imageUrl?: string | null;
  outletId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  priority?: number;
  isActive?: boolean;
}

export interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}
