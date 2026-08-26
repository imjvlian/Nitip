import type { AddressLabel, OrderStatus } from "./index.js";

export interface NitipCartLineInput {
  productId: string;
  quantity: number;
}

export interface NitipCheckoutRequest {
  outletId: string;
  addressId: string;
  items: NitipCartLineInput[];
}

export type DeliveryDistanceMethod = "haversine" | "minimum_fare_fallback";

export interface NitipCheckoutLine {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface NitipOrderAddressSnapshot {
  addressId: string;
  label: AddressLabel;
  customLabel: string | null;
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface NitipCheckoutQuote {
  outletId: string;
  merchantId: string;
  businessName: string;
  outletName: string;
  address: NitipOrderAddressSnapshot;
  items: NitipCheckoutLine[];
  subtotal: number;
  distanceKm: number | null;
  distanceMethod: DeliveryDistanceMethod;
  deliveryFare: number;
  serviceFee: number;
  customerTotal: number;
  merchantCommission: number;
  merchantNet: number;
}

export interface NitipOrder extends NitipCheckoutQuote {
  id: string;
  orderCode: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
