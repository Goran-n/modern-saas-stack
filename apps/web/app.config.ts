export default defineAppConfig({
  ui: {
    // Apple-inspired clean theme with system blue
    primary: 'blue',
    gray: 'slate',
    notifications: {
      position: 'top-0 right-0'
    }
  },
  
  // Application branding - Apple style
  app: {
    name: 'Kibly',
    description: 'Financial management, reimagined',
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
      alt: 'Kibly'
    }
  }
})