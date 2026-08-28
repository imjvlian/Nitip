import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";
import { NitipIcon } from "./NitipIcon";

const THUMB_SIZE = 46;
const TRACK_PADDING = 4;

export function AvailabilitySwipe({
  isOnline,
  disabled = false,
  labels,
  onChange,
}: {
  isOnline: boolean;
  disabled?: boolean;
  labels: {
    online: string;
    offline: string;
    swipeOnline: string;
    swipeOffline: string;
    processing: string;
  };
  onChange: (nextOnline: boolean) => Promise<boolean>;
}) {
  const theme = useNitipTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const [pending, setPending] = useState(false);
  const maxTravel = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);

  const snapTo = useCallback(
    (online: boolean) => {
      Animated.spring(translateX, {
        toValue: online ? maxTravel : 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 0,
      }).start();
    },
    [maxTravel, translateX],
  );

  useEffect(() => {
    if (!pending) snapTo(isOnline);
  }, [isOnline, pending, snapTo]);

  const requestChange = useCallback(
    async (nextOnline: boolean) => {
      if (disabled || pending || nextOnline === isOnline) {
        snapTo(isOnline);
        return;
      }

      setPending(true);
      snapTo(nextOnline);
      const success = await onChange(nextOnline);
      setPending(false);
      if (!success) snapTo(isOnline);
    },
    [disabled, isOnline, onChange, pending, snapTo],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled &&
          !pending &&
          maxTravel > 0 &&
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const start = isOnline ? maxTravel : 0;
          const next = Math.max(0, Math.min(maxTravel, start + gesture.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const requiredDistance = maxTravel * 0.45;
          const shouldToggle = isOnline
            ? gesture.dx < -requiredDistance
            : gesture.dx > requiredDistance;

          if (shouldToggle) {
            void requestChange(!isOnline);
          } else {
            snapTo(isOnline);
          }
        },
        onPanResponderTerminate: () => snapTo(isOnline),
      }),
    [disabled, isOnline, maxTravel, pending, requestChange, snapTo, translateX],
  );

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (Math.abs(nextWidth - trackWidth) > 1) setTrackWidth(nextWidth);
  }

  const busy = disabled || pending;
  const instruction = pending
    ? labels.processing
    : isOnline
      ? labels.swipeOffline
      : labels.swipeOnline;

  return (
    <View
      accessibilityActions={[
        { name: "increment", label: labels.swipeOnline },
        { name: "decrement", label: labels.swipeOffline },
      ]}
      accessibilityLabel={isOnline ? labels.online : labels.offline}
      accessibilityRole="adjustable"
      accessibilityValue={{ text: isOnline ? labels.online : labels.offline }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment" && !isOnline) {
          void requestChange(true);
        }
        if (event.nativeEvent.actionName === "decrement" && isOnline) {
          void requestChange(false);
        }
      }}
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          backgroundColor: isOnline ? theme.colors.primary : theme.colors.secondary,
          borderColor: isOnline ? theme.colors.primary : theme.colors.border,
          opacity: busy ? 0.68 : 1,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text
        pointerEvents="none"
        style={[
          styles.instruction,
          { color: isOnline ? "rgba(255,255,255,0.88)" : theme.colors.textMuted },
        ]}
      >
        {instruction}
      </Text>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor: "#FFFFFF",
            borderColor: isOnline ? "rgba(255,255,255,0.5)" : theme.colors.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <NitipIcon
          color={isOnline ? theme.colors.primary : theme.colors.textMuted}
          name="power"
          size={19}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 18,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 58,
    position: "relative",
    width: "100%",
  },
  instruction: {
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
  },
  thumb: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: 1,
    height: THUMB_SIZE,
    justifyContent: "center",
    left: TRACK_PADDING,
    position: "absolute",
    top: TRACK_PADDING,
    width: THUMB_SIZE,
  },
});
