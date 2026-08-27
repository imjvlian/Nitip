export const brandColors = {
  cobalt: "#2448F5",
  cobaltStrong: "#1836C9",
  cobaltDark: "#5A72FF",
  ink: "#111318",
} as const;

export const nitipSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
} as const;

export const nitipRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  "2xl": 30,
  pill: 999,
} as const;

export const nitipTypography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "900" },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "900" },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "800" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "500" },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "800" },
  caption: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
} as const;

export const nitipLayout = {
  screenHorizontalPadding: 20,
  sectionGap: 28,
  controlHeight: 52,
  compactControlHeight: 44,
  minimumTouchTarget: 44,
  bottomNavigationHeight: 68,
} as const;

export const nitipMotion = {
  fast: 140,
  standard: 220,
  emphasized: 320,
} as const;

export const lightTheme = {
  mode: "light",
  colors: {
    background: "#FFFFFF",
    surface: "#F5F6F8",
    surfaceRaised: "#FFFFFF",
    surfaceAccent: "#EEF1FF",
    primary: brandColors.cobalt,
    primaryStrong: brandColors.cobaltStrong,
    secondary: "#EFF1F5",
    text: brandColors.ink,
    textMuted: "#7C8190",
    border: "#E7E9EE",
    shadow: brandColors.ink,
    onPrimary: "#FFFFFF",
    danger: "#D92D20",
    dangerSurface: "#FFF1F0",
    success: "#159A66",
    successSurface: "#ECFDF3",
    warning: "#C96A09",
    warningSurface: "#FFF7E8",
  },
} as const;

export const darkTheme = {
  mode: "dark",
  colors: {
    background: "#0F1014",
    surface: "#191B20",
    surfaceRaised: "#22242B",
    surfaceAccent: "#242943",
    primary: brandColors.cobaltDark,
    primaryStrong: "#AAB7FF",
    secondary: "#24272E",
    text: "#F7F7F8",
    textMuted: "#9A9FAA",
    border: "#2C3038",
    shadow: "#000000",
    onPrimary: "#FFFFFF",
    danger: "#FF8A80",
    dangerSurface: "#351E1E",
    success: "#72D6A4",
    successSurface: "#153226",
    warning: "#F8C36A",
    warningSurface: "#352A16",
  },
} as const;

export type NitipTheme = typeof lightTheme | typeof darkTheme;
export type NitipThemeMode = NitipTheme["mode"];

export function getNitipTheme(mode: NitipThemeMode): NitipTheme {
  return mode === "dark" ? darkTheme : lightTheme;
}
