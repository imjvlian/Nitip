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

export type PaymentProvider = "development" | "doku";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export type PaymentMethod =
  | "simulation"
  | "qris"
  | "virtual_account"
  | "card"
  | "e_wallet"
  | "paylater"
  | "convenience_store"
  | "unknown";

export interface NitipPaymentSnapshot {
  provider: PaymentProvider | null;
  status: PaymentStatus;
  method: PaymentMethod | null;
  reference: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
}

export type MerchantSettlementStatus =
  | "pending"
  | "eligible"
  | "settled"
  | "reversed";

export interface NitipMerchantSettlementSnapshot {
  status: MerchantSettlementStatus;
  amount: number;
  eligibleAt: string | null;
  settledAt: string | null;
  reference: string | null;
}

export interface NitipOrder extends NitipCheckoutQuote {
  id: string;
  orderCode: string;
  status: OrderStatus;
  cancellationReason: string | null;
  stockReservationStatus: StockReservationStatus | null;
  stockReservationExpiresAt: string | null;
  payment?: NitipPaymentSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export interface NitipOrderRating {
  id: string;
  orderId: string;
  outletId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertNitipOrderRatingInput {
  score: number;
  comment?: string | null;
}

export interface NitipMerchantOrder extends NitipOrder {
  merchantCommission: number;
  merchantNet: number;
  settlement?: NitipMerchantSettlementSnapshot | null;
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
