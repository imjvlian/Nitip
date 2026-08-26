export type UserRole = "customer" | "merchant" | "driver" | "admin";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "merchant_confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "driver_assigned"
  | "picked_up"
  | "on_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  "pending_payment",
  "paid",
  "merchant_confirmed",
  "preparing",
  "ready_for_pickup",
  "driver_assigned",
  "picked_up",
  "on_delivery",
  "delivered",
] as const;

export interface DriverPricingRules {
  baseFare: number;
  baseDistanceKm: number;
  midDistanceLimitKm: number;
  midDistanceRatePerKm: number;
  farDistanceRatePerKm: number;
  waitingGraceMinutes: number;
  waitingRatePerMinute: number;
  waitingFeeCap: number;
}

export const DEFAULT_DRIVER_PRICING: DriverPricingRules = {
  baseFare: 8_000,
  baseDistanceKm: 2,
  midDistanceLimitKm: 5,
  midDistanceRatePerKm: 2_000,
  farDistanceRatePerKm: 2_500,
  waitingGraceMinutes: 10,
  waitingRatePerMinute: 500,
  waitingFeeCap: 5_000,
};

export interface MarketplaceRules {
  merchantCommissionRate: number;
  serviceFee: number;
}

export const DEFAULT_MARKETPLACE_RULES: MarketplaceRules = {
  merchantCommissionRate: 0.08,
  serviceFee: 1_000,
};

function assertNonNegative(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
}

export function calculateDriverFare(
  distanceKm: number,
  waitingMinutes = 0,
  rules: DriverPricingRules = DEFAULT_DRIVER_PRICING,
) {
  assertNonNegative(distanceKm, "distanceKm");
  assertNonNegative(waitingMinutes, "waitingMinutes");

  let deliveryFare = rules.baseFare;

  if (distanceKm > rules.baseDistanceKm) {
    const midDistance = Math.min(distanceKm, rules.midDistanceLimitKm) - rules.baseDistanceKm;
    deliveryFare += Math.ceil(midDistance) * rules.midDistanceRatePerKm;
  }

  if (distanceKm > rules.midDistanceLimitKm) {
    const farDistance = distanceKm - rules.midDistanceLimitKm;
    deliveryFare += Math.ceil(farDistance) * rules.farDistanceRatePerKm;
  }

  const billableWaitingMinutes = Math.max(0, Math.ceil(waitingMinutes - rules.waitingGraceMinutes));
  const waitingFee = Math.min(
    billableWaitingMinutes * rules.waitingRatePerMinute,
    rules.waitingFeeCap,
  );

  return {
    deliveryFare,
    waitingFee,
    driverEarning: deliveryFare + waitingFee,
  } as const;
}

export interface OrderQuoteInput {
  subtotal: number;
  distanceKm: number;
  waitingMinutes?: number;
  marketplaceRules?: MarketplaceRules;
  driverRules?: DriverPricingRules;
}

export function calculateOrderQuote({
  subtotal,
  distanceKm,
  waitingMinutes = 0,
  marketplaceRules = DEFAULT_MARKETPLACE_RULES,
  driverRules = DEFAULT_DRIVER_PRICING,
}: OrderQuoteInput) {
  assertNonNegative(subtotal, "subtotal");

  const driver = calculateDriverFare(distanceKm, waitingMinutes, driverRules);
  const merchantCommission = Math.round(subtotal * marketplaceRules.merchantCommissionRate);

  // Waiting fee default-nya disubsidi platform, bukan dibebankan ke customer.
  // Payment gateway fee juga belum dimasukkan dan akan menjadi komponen settlement terpisah.
  const customerTotal = subtotal + driver.deliveryFare + marketplaceRules.serviceFee;
  const merchantNet = subtotal - merchantCommission;
  const platformGross = merchantCommission + marketplaceRules.serviceFee - driver.waitingFee;

  return {
    subtotal,
    customerTotal,
    merchantCommission,
    merchantNet,
    serviceFee: marketplaceRules.serviceFee,
    deliveryFare: driver.deliveryFare,
    waitingFee: driver.waitingFee,
    driverEarning: driver.driverEarning,
    platformGross,
  } as const;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
