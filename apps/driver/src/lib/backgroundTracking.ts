import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { onAuthStateChanged, type User } from "firebase/auth";

import { firebaseAuth } from "./firebase";

export const DRIVER_BACKGROUND_LOCATION_TASK = "nitip-driver-live-location-v1";
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

type LocationTaskData = { locations?: Location.LocationObject[] };

async function waitForUser(timeoutMs = 5000): Promise<User | null> {
  if (firebaseAuth?.currentUser) return firebaseAuth.currentUser;
  if (!firebaseAuth) return null;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (user: User | null) => { if (settled) return; settled = true; clearTimeout(timer); unsubscribe(); resolve(user); };
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => finish(user));
    const timer = setTimeout(() => finish(firebaseAuth.currentUser), timeoutMs);
  });
}

async function publish(location: Location.LocationObject) {
  if (!apiBaseUrl) return;
  const user = await waitForUser();
  if (!user) return;
  const token = await user.getIdToken();
  await fetch(`${apiBaseUrl}/driver/me/location`, {
    method: "PATCH",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: location.coords.latitude, longitude: location.coords.longitude, accuracyMeters: location.coords.accuracy ?? null }),
  });
}

TaskManager.defineTask(DRIVER_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as LocationTaskData).locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;
  try { await publish(latest); } catch { /* next background update retries */ }
});

export type BackgroundTrackingResult = "started" | "already_started" | "permission_denied" | "unavailable";

export async function startDriverBackgroundTracking(): Promise<BackgroundTrackingResult> {
  if (!(await TaskManager.isAvailableAsync())) return "unavailable";
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK)) return "already_started";

  let foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return "permission_denied";

  let background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== "granted") background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return "permission_denied";

  await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 8,
    timeInterval: 5000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Nitip Driver · Live tracking aktif",
      notificationBody: "Lokasi dibagikan selama pengantaran aktif.",
      killServiceOnDestroy: false,
    },
  });
  return "started";
}

export async function stopDriverBackgroundTracking() {
  if (!(await TaskManager.isAvailableAsync())) return;
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
  }
}

export async function isDriverBackgroundTrackingActive() {
  if (!(await TaskManager.isAvailableAsync())) return false;
  return Location.hasStartedLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
}
