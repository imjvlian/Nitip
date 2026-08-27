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
}

export type StockReservationStatus =
  | "reserved"
  | "committed"
  | "released"
  | "not_required";

export interface NitipOrder extends NitipCheckoutQuote {
  id: string;
  orderCode: string;
  status: OrderStatus;
  cancellationReason: string | null;
  stockReservationStatus: StockReservationStatus | null;
  stockReservationExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NitipMerchantOrder extends NitipOrder {
  merchantCommission: number;
  merchantNet: number;
}

export type MerchantOrderAction =
  | "confirm"
  | "reject"
  | "start_preparing"
  | "ready_for_pickup";

export interface MerchantOrderActionInput {
  action: MerchantOrderAction;
  reason?: string | null;
}
