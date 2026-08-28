import { useEffect, useRef } from "react";
import { Alert } from "react-native";

import { useAuth } from "../context/AuthContext";
import { getCurrentDriverOrder } from "../lib/api";
import { startDriverBackgroundTracking, stopDriverBackgroundTracking } from "../lib/backgroundTracking";

export function DriverTrackingSupervisor() {
  const { user } = useAuth();
  const permissionNoticeShown = useRef(false);

  useEffect(() => {
    if (!user) {
      void stopDriverBackgroundTracking().catch(() => undefined);
      return;
    }
    let mounted = true;

    const reconcile = async () => {
      try {
        const order = await getCurrentDriverOrder(user);
        if (!mounted) return;
        if (order?.status === "on_delivery") {
          const result = await startDriverBackgroundTracking();
          if (!mounted) return;
          if (result === "permission_denied" && !permissionNoticeShown.current) {
            permissionNoticeShown.current = true;
            Alert.alert(
              "Live tracking membutuhkan izin lokasi",
              "Izinkan lokasi setiap saat agar customer tetap dapat melacak pengantaran saat Nitip Driver berada di background.",
            );
          }
        } else {
          permissionNoticeShown.current = false;
          await stopDriverBackgroundTracking();
        }
      } catch {
        // Foreground tracking remains the fallback; retry on the next reconciliation.
      }
    };

    void reconcile();
    const timer = setInterval(() => { void reconcile(); }, 10000);
    return () => { mounted = false; clearInterval(timer); };
  }, [user]);

  return null;
}
