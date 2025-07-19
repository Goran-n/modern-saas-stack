export default defineAppConfig({
  ui: {
    // Kibly custom brand palette - modern, sleek, professional
    colors: {
      primary: "electric",
      gray: "neutral",
      green: "prosperity",
      red: "alert",
    },
    notifications: {
      position: "top-0 right-0",
    },
    // Make containers full width by default
    container: {
      constrained: "max-w-none",
    },
  },

  // Application branding - Apple style
  app: {
    name: "Kibly",
    description: "Financial management, reimagined",
    logo: {
      light: "/logo-light.svg",
      dark: "/logo-dark.svg",
      alt: "Kibly",
    },
  },
});
