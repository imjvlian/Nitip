/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [
    require("nativewind/preset"),
    require("../../packages/theme/tailwind-preset.cjs"),
  ],
  theme: { extend: {} },
  plugins: [],
};
