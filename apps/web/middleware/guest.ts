export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to auth routes (login, signup, etc.)
  if (!to.path.startsWith("/auth")) {
    return;
  }

  // Try to get the user, but handle if Supabase isn't ready
  let user;
  try {
    user = useSupabaseUser();
  } catch (error) {
    // Supabase not initialized yet, user is undefined
    console.warn('Supabase not initialized in guest middleware');
    return;
  }

  // Wait for auth to be ready
  const isAuthReady = useState('auth.ready', () => false);
  if (!isAuthReady.value) {
    // Don't block navigation, just return
    return;
  }

  // If user is already authenticated
  if (user.value) {
    // Check if this is an extension auth request
    const isExtensionAuth =
      to.query.source === "extension" && to.query.callback;

    if (isExtensionAuth) {
      // Redirect to extension consent page instead of login
      return navigateTo({
        path: "/auth/extension-consent",
        query: to.query, // Preserve the callback URL and other params
      });
    } else {
      // Regular authenticated user trying to access auth pages - redirect to home
      return navigateTo("/");
    }
  }
});
