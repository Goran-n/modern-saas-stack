export default defineAppConfig({
  ui: {
    // Kibly custom brand palette - modern, sleek, professional
    colors: {
      primary: 'electric',
      gray: 'neutral',
      green: 'prosperity',
      red: 'alert'
    },
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