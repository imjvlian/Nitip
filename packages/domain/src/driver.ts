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
