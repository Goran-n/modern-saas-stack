export default defineNuxtPlugin(async (nuxtApp) => {
  const user = useSupabaseUser();

  // Ensure we're on the client side and DOM is ready
  nuxtApp.hook("app:mounted", () => {
    // Get tenant store after app is mounted to ensure all plugins are initialized
    const tenantStore = useTenantStore();

    // Watch for user changes
    watch(
      user,
      async (newUser, oldUser) => {
        // Only process if there's an actual change
        if (newUser?.id === oldUser?.id) return;

        if (newUser) {
          // User logged in, fetch their tenants
          try {
            await tenantStore.fetchUserTenants();
          } catch (_error) {
            // Error is handled inside fetchUserTenants method
            // which already logs and continues gracefully
            // Failed to fetch user tenants
          }
        } else {
          // User logged out, clear tenant selection
          tenantStore.$reset();
        }
      },
      { immediate: true },
    );
  });
});
