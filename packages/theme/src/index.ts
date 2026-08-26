export const brandColors = {
  navy: "#14216D",
  blue: "#08349C",
  aqua: "#A1DCD9",
  mint: "#CEFCD9",
} as const;

export const lightTheme = {
  mode: "light",
  colors: {
    background: "#F7FFF9",
    surface: "#FFFFFF",
    surfaceAccent: brandColors.mint,
    primary: brandColors.blue,
    primaryStrong: brandColors.navy,
    secondary: brandColors.aqua,
    text: brandColors.navy,
    textMuted: "#52607F",
    border: brandColors.aqua,
    onPrimary: "#FFFFFF",
  },
} as const;

export const darkTheme = {
  mode: "dark",
  colors: {
    background: "#0A123F",
    surface: brandColors.navy,
    surfaceAccent: brandColors.blue,
    primary: brandColors.aqua,
    primaryStrong: brandColors.mint,
    secondary: brandColors.blue,
    text: "#F7FFF9",
    textMuted: brandColors.aqua,
    border: "#2942A1",
    onPrimary: brandColors.navy,
  },
} as const;

export type NitipTheme = typeof lightTheme | typeof darkTheme;
export type NitipThemeMode = NitipTheme["mode"];

export function getNitipTheme(mode: NitipThemeMode): NitipTheme {
  return mode === "dark" ? darkTheme : lightTheme;
}
