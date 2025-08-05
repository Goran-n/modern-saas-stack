export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check for auth routes (except extension-consent which requires auth)
  if (to.path.startsWith("/auth") && to.path !== "/auth/extension-consent") {
    return;
  }

  // Try to get the user, but handle if Supabase isn't ready
  let user;
  try {
    user = useSupabaseUser();
  } catch (error) {
    // Supabase not initialized yet, redirect to login
    return navigateTo("/auth/login");
  }

  // Wait for auth to be ready
  const isAuthReady = useState('auth.ready', () => false);
  if (!isAuthReady.value) {
    // If auth isn't ready yet, redirect to login
    return navigateTo("/auth/login");
  }

  // Check authentication status
  if (!user.value) {
    // Special handling for extension consent - it requires auth
    if (to.path === "/auth/extension-consent") {
      return navigateTo({
        path: "/auth/login",
        query: { ...to.query, redirect: to.fullPath }
      });
    }
    
    return navigateTo("/auth/login");
  }
});
