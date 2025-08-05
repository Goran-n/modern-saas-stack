export default defineNuxtRouteMiddleware(async (to, _from) => {
  const user = useSupabaseUser();
  const tenantStore = useTenantStore();
  const $trpc = useTrpc();

  // Skip check for auth pages and onboarding itself
  const publicRoutes = ["/auth/login", "/auth/signup", "/auth/forgot-password"];
  const onboardingRoute = "/onboarding";
  
  if (publicRoutes.includes(to.path) || to.path === onboardingRoute) {
    return;
  }

  // Only check if user is authenticated
  if (!user.value) {
    return;
  }

  try {
    // Ensure we have fetched user tenants
    if (!tenantStore.userTenants.length && !tenantStore.isLoading) {
      await tenantStore.fetchUserTenants();
    }

    // Check if user has no tenants - redirect to onboarding for tenant creation
    if (tenantStore.userTenants.length === 0) {
      return navigateTo(onboardingRoute);
    }

    // Only check tenant details if user has tenants
    if (tenantStore.selectedTenantId) {
      // Get tenant details
      const tenant = await $trpc.tenant.get.query();

      // Check if onboarding is completed
      const onboardingCompleted = tenant.metadata?.onboardingCompleted || false;

      // Store onboarding status in tenant store for easy access
      tenantStore.setOnboardingStatus(!!onboardingCompleted);

      // If onboarding is not completed, redirect to onboarding page
      if (!onboardingCompleted) {
        return navigateTo(onboardingRoute);
      }
    }
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    // Don't block navigation on error
  }
});
