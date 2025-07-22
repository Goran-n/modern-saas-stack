import type { AppRouter } from "@figgy/trpc";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const supabase = useSupabaseClient();

  // Create the tRPC client with batch link
  const trpc = createTRPCProxyClient<AppRouter>({
    transformer: superjson,
    links: [
      // HTTP batch link
      httpBatchLink({
        url: `${config.public.apiUrl}/trpc`,
        async headers() {
          // Get the current session token
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const headers: Record<string, string> = {};

          if (session?.access_token) {
            headers.authorization = `Bearer ${session.access_token}`;
          }

          // Get tenant store at request time to avoid circular dependency
          try {
            const { $pinia } = useNuxtApp();
            if ($pinia) {
              const tenantStore = useTenantStore();
              // Add tenant ID if selected
              if (tenantStore.selectedTenantId) {
                headers["x-tenant-id"] = tenantStore.selectedTenantId;
              }
            }
          } catch (error) {
            // Tenant store might not be initialized yet, which is fine
            // The header will be omitted for this request
          }

          return headers;
        },
        // Add fetch options for better error handling
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });

  return {
    provide: {
      trpc,
    },
  };
});
