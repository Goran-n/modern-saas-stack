export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser();

  // Only apply to auth routes (login, signup, etc.)
  if (!to.path.startsWith("/auth")) {
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
