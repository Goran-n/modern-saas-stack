export default defineAppConfig({
  ui: {
    // Figgy brand palette - semantic colour mapping
    primary: "primary",
    gray: "neutral",
    colors: {
      primary: "primary",
      secondary: "secondary",
      success: "success",
      warning: "warning",
      error: "error",
    },
    // Component-specific overrides
    button: {
      default: {
        color: "primary",
        size: "md",
      },
      variant: {
        solid: "shadow-sm hover:shadow-md transition-shadow duration-200",
        ghost: "hover:bg-canvas",
      },
      rounded: "rounded-lg",
    },
    card: {
      base: "overflow-hidden",
      background: "bg-white",
      ring: "ring-1 ring-gray-200",
      rounded: "rounded-xl",
      shadow: "shadow-md",
    },
    badge: {
      color: {
        primary: {
          solid: "bg-primary text-white",
        },
        secondary: {
          solid: "bg-secondary text-white",
        },
        success: {
          solid: "bg-success text-white",
        },
      },
    },
    input: {
      default: {
        size: "md",
      },
      color: {
        gray: {
          outline:
            "bg-white text-ink ring-1 ring-gray-300 focus:ring-2 focus:ring-primary",
        },
      },
      rounded: "rounded-lg",
    },
    select: {
      default: {
        size: "md",
      },
      color: {
        gray: {
          outline:
            "bg-white text-ink ring-1 ring-gray-300 focus:ring-2 focus:ring-primary",
        },
      },
      rounded: "rounded-lg",
    },
    notifications: {
      position: "top-0 right-0",
    },
    table: {
      th: {
        base: "text-left font-semibold",
        padding: "px-4 py-3",
      },
      td: {
        base: "whitespace-nowrap",
        padding: "px-4 py-3",
      },
      tr: {
        base: "hover:bg-canvas/50 transition-colors",
      },
    },
    dropdown: {
      item: {
        base: "hover:bg-canvas transition-colors",
        active: "bg-primary-50 text-primary",
      },
    },
    avatar: {
      background: "bg-primary-100",
    },
  },

  // Application branding
  app: {
    name: "Figgy",
    description: "Financial management, reimagined",
    logo: {
      light: "/logo.png",
      dark: "/logo.png",
      alt: "Kibly",
    },
  },
});
