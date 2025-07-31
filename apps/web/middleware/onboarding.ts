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
    // Ensure we have a selected tenant
    if (!tenantStore.selectedTenantId) {
      await tenantStore.fetchUserTenants();
    }

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
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    // Don't block navigation on error
  }
});
