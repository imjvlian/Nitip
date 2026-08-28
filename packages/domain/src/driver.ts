import type { OrderStatus } from "./index.js";

export type DriverOnboardingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected";

export type DriverVehicleType = "motorcycle" | "car";

export interface NitipDriverProfile {
  id: string;
  ownerFirebaseUid: string;
  fullName: string;
  phoneNumber: string;
  vehicleType: DriverVehicleType;
  vehicleBrandModel: string;
  vehiclePlate: string;
  status: DriverOnboardingStatus;
  isOnline: boolean;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyMeters: number | null;
  locationUpdatedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNitipDriverInput {
  fullName: string;
  phoneNumber: string;
  vehicleType: DriverVehicleType;
  vehicleBrandModel: string;
  vehiclePlate: string;
}

export type UpdateNitipDriverInput = Partial<CreateNitipDriverInput>;
export type DriverReviewDecision = "approve" | "reject";

export interface ReviewNitipDriverInput {
  decision: DriverReviewDecision;
  reason?: string | null;
}

export interface UpdateDriverAvailabilityInput {
  isOnline: boolean;
}

export interface UpdateDriverLocationInput {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}

export interface NitipDriverPickup {
  outletId: string;
  businessName: string;
  outletName: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
}

export interface NitipDriverOffer {
  id: string;
  orderCode: string;
  status: "ready_for_pickup";
  pickup: NitipDriverPickup;
  distanceKm: number | null;
  pickupDistanceKm?: number | null;
  deliveryDistanceKm?: number | null;
  deliveryFare: number;
  itemCount: number;
  createdAt: string;
}

export interface NitipDriverOrderItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface NitipDriverDestination {
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type DriverDeliveryStatus = Extract<
  OrderStatus,
  "driver_assigned" | "picked_up" | "on_delivery" | "delivered"
>;

export type DriverDeliveryAction =
  | "confirm_pickup"
  | "start_delivery"
  | "complete_delivery";

export interface DriverDeliveryActionInput {
  action: DriverDeliveryAction;
}

export interface NitipDriverOrder extends Omit<NitipDriverOffer, "status"> {
  status: DriverDeliveryStatus;
  destination: NitipDriverDestination;
  items: NitipDriverOrderItem[];
  assignedAt: string;
}

export interface NitipDriverEarningsSummary {
  completedTrips: number;
  totalEarnings: number;
  todayTrips: number;
  todayEarnings: number;
}
