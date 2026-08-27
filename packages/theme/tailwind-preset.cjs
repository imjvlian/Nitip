/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F5F6F8",
        "surface-raised": "#FFFFFF",
        "surface-accent": "#EEF1FF",
        primary: "#2448F5",
        "primary-strong": "#1836C9",
        secondary: "#EFF1F5",
        foreground: "#111318",
        muted: "#7C8190",
        border: "#E7E9EE",
        "on-primary": "#FFFFFF",
        danger: "#D92D20",
        "danger-surface": "#FFF1F0",
        success: "#159A66",
        "success-surface": "#ECFDF3",
        warning: "#C96A09",
        "warning-surface": "#FFF7E8",
      },
      borderRadius: {
        "nitip-sm": "10px",
        "nitip-md": "14px",
        nitip: "18px",
        "nitip-lg": "24px",
        "nitip-xl": "30px",
        "nitip-pill": "999px",
      },
      fontSize: {
        "nitip-display": ["32px", { lineHeight: "38px", fontWeight: "900" }],
        "nitip-title": ["26px", { lineHeight: "32px", fontWeight: "900" }],
        "nitip-heading": ["20px", { lineHeight: "26px", fontWeight: "800" }],
        "nitip-body": ["15px", { lineHeight: "22px", fontWeight: "500" }],
        "nitip-label": ["13px", { lineHeight: "18px", fontWeight: "800" }],
        "nitip-caption": ["11px", { lineHeight: "16px", fontWeight: "600" }],
      },
      spacing: {
        "nitip-screen": "20px",
        "nitip-section": "28px",
        "nitip-control": "52px",
        "nitip-control-compact": "44px",
        "nitip-nav": "68px",
      },
    },
  },
};
