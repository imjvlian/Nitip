import type {
  NitipDriverOffer,
  NitipDriverProfile,
} from "@nitip/domain/driver";

import { listAvailableDriverOffers } from "./orders.js";

function roundDistance(value: number) {
  return Math.round(value * 100) / 100;
}

function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLatitude = toRadians(latitudeB - latitudeA);
  const dLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(dLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(dLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pickupDistanceKm(
  driver: Pick<NitipDriverProfile, "latitude" | "longitude">,
  offer: NitipDriverOffer,
) {
  if (
    driver.latitude == null ||
    driver.longitude == null ||
    offer.pickup.latitude == null ||
    offer.pickup.longitude == null
  ) {
    return null;
  }

  return roundDistance(
    haversineKm(
      driver.latitude,
      driver.longitude,
      offer.pickup.latitude,
      offer.pickup.longitude,
    ),
  );
}

export async function listProximityDriverOffers(
  driver: Pick<NitipDriverProfile, "id" | "latitude" | "longitude">,
): Promise<NitipDriverOffer[]> {
  const offers = await listAvailableDriverOffers(driver.id);
  const ranked = offers.map((offer, index) => ({
    index,
    offer: {
      ...offer,
      pickupDistanceKm: pickupDistanceKm(driver, offer),
      deliveryDistanceKm: offer.distanceKm,
    },
  }));

  ranked.sort((left, right) => {
    const leftDistance = left.offer.pickupDistanceKm;
    const rightDistance = right.offer.pickupDistanceKm;

    if (leftDistance == null && rightDistance == null) {
      return left.index - right.index;
    }
    if (leftDistance == null) return 1;
    if (rightDistance == null) return -1;
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return left.index - right.index;
  });

  return ranked.map(({ offer }) => offer);
}
