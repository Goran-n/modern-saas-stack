import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default (<Partial<Config>>{
  theme: {
    extend: {
      fontFamily: {
        // Apple font stack
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          ...defaultTheme.fontFamily.sans,
        ],
        display: [
          '"SF Pro Display"',
          "-apple-system",
          "BlinkMacSystemFont",
          ...defaultTheme.fontFamily.sans,
        ],
        text: [
          '"SF Pro Text"',
          "-apple-system",
          "BlinkMacSystemFont",
          ...defaultTheme.fontFamily.sans,
        ],
      },
      fontSize: {
        // Apple typography scale
        xs: ["11px", { lineHeight: "13px", letterSpacing: "0.06px" }],
        sm: ["13px", { lineHeight: "18px", letterSpacing: "-0.08px" }],
        base: ["15px", { lineHeight: "20px", letterSpacing: "-0.24px" }],
        lg: ["17px", { lineHeight: "22px", letterSpacing: "-0.43px" }],
        xl: ["20px", { lineHeight: "25px", letterSpacing: "-0.45px" }],
        "2xl": ["22px", { lineHeight: "28px", letterSpacing: "0.35px" }],
        "3xl": ["28px", { lineHeight: "34px", letterSpacing: "0.36px" }],
        "4xl": ["34px", { lineHeight: "41px", letterSpacing: "0.37px" }],
        "5xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.02px" }],
        "6xl": ["64px", { lineHeight: "68px", letterSpacing: "-0.02px" }],
        "7xl": ["80px", { lineHeight: "84px", letterSpacing: "-0.02px" }],
        "8xl": ["96px", { lineHeight: "100px", letterSpacing: "-0.02px" }],
      },
      spacing: {
        // Apple spacing scale
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "2.5": "10px",
        "3": "12px",
        "3.5": "14px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "9": "36px",
        "10": "40px",
        "11": "44px", // Touch target size
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "28": "112px",
        "32": "128px",
        "36": "144px",
        "40": "160px",
        "44": "176px",
        "48": "192px",
        "52": "208px",
        "56": "224px",
        "60": "240px",
        "64": "256px",
        "72": "288px",
        "80": "320px",
        "96": "384px",
      },
      borderRadius: {
        // Apple corner radius
        none: "0",
        sm: "4px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        full: "9999px",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
      },
      animation: {
        // Apple-style animations
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-out": "fadeOut 0.2s ease-in",
        "slide-up": "slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "slide-down": "slideDown 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "slide-in-right":
          "slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "slide-in-left":
          "slideInLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.2s ease-in",
        "bounce-in": "bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scaleOut: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      boxShadow: {
        // Apple-style shadows
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
        DEFAULT:
          "0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        md: "0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)",
        lg: "0 20px 25px -5px rgba(0, 0, 0, 0.04), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
        xl: "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
        "2xl": "0 35px 60px -15px rgba(0, 0, 0, 0.1)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)",
        none: "none",
      },
    },
  },
});
