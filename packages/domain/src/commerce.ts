import type { AddressLabel, OrderStatus } from "./index.js";

export interface NitipCartLineInput {
  productId: string;
  quantity: number;
  addonIds?: string[];
}

export interface NitipCheckoutRequest {
  outletId: string;
  addressId: string;
  items: NitipCartLineInput[];
}

export type DeliveryDistanceMethod = "haversine" | "minimum_fare_fallback";

export interface NitipCheckoutAddon {
  id: string;
  name: string;
  price: number;
}

export interface NitipCheckoutLine {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  addons?: NitipCheckoutAddon[];
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

export type StockReservationStatus = "reserved" | "committed" | "released" | "not_required";
export type PaymentProvider = "development" | "doku";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded";
export type PaymentMethod = "simulation" | "qris" | "virtual_account" | "card" | "e_wallet" | "paylater" | "convenience_store" | "unknown";

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

export type MerchantSettlementStatus = "pending" | "eligible" | "settled" | "reversed";

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

export interface NitipOrderOperations {
  preparationMinutes: number | null;
  estimatedReadyAt: string | null;
  deliveryOtp: string | null;
  proofUrl: string | null;
  proofUploadedAt: string | null;
}

export interface NitipOrderTrackingDriver {
  fullName: string;
  photoUrl: string | null;
  vehicleBrandModel: string;
  vehiclePlate: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  locationUpdatedAt: string;
}

export interface NitipOrderTracking {
  status: OrderStatus;
  active: boolean;
  driver: NitipOrderTrackingDriver | null;
  destination: {
    recipientName: string;
    addressLine: string;
    latitude: number | null;
    longitude: number | null;
  };
}

export type NitipReviewTargetType = "product" | "driver";

export interface NitipReview {
  id: string;
  orderId: string;
  outletId: string;
  targetType: NitipReviewTargetType;
  targetId: string;
  targetName: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NitipDriverReviewSlot {
  driverId: string;
  driverName: string;
  review: NitipReview | null;
}

export interface NitipOrderReviews {
  products: NitipReview[];
  driver: NitipDriverReviewSlot | null;
}

export interface UpsertNitipReviewInput {
  score: number;
  comment?: string | null;
}

/** @deprecated Order-level merchant ratings are replaced by product and driver reviews. */
export interface NitipOrderRating {
  id: string;
  orderId: string;
  outletId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use UpsertNitipReviewInput. */
export type UpsertNitipOrderRatingInput = UpsertNitipReviewInput;

export type OrderChatSenderRole = "customer" | "driver";

export interface NitipOrderChatMessage {
  id: string;
  orderId: string;
  senderRole: OrderChatSenderRole;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface NitipOrderChatThread {
  orderId: string;
  orderCode: string;
  status: OrderStatus;
  writable: boolean;
  counterpartRole: OrderChatSenderRole;
  counterpartName: string;
  messages: NitipOrderChatMessage[];
}

export interface SendNitipOrderChatMessageInput {
  text: string;
}

export interface NitipMerchantOrder extends NitipOrder {
  merchantCommission: number;
  merchantNet: number;
  settlement?: NitipMerchantSettlementSnapshot | null;
}

export type MerchantOrderAction = "confirm" | "reject" | "start_preparing" | "ready_for_pickup";

export interface MerchantOrderActionInput {
  action: MerchantOrderAction;
  reason?: string | null;
  preparationMinutes?: number;
}
