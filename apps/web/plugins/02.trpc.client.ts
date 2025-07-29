import type { AppRouter } from "@figgy/trpc";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const supabase = useSupabaseClient();

  // For now, use direct URL to API server to bypass proxy issues
  // TODO: Fix proxy configuration and revert to using '/trpc' in development
  const trpcUrl = `${config.public.apiUrl}/trpc`;

  // [TRPC Client] Initializing with URL

  // Create the tRPC client with batch link
  const trpc = createTRPCProxyClient<AppRouter>({
    links: [
      // HTTP batch link
      httpBatchLink({
        url: trpcUrl,
        transformer: superjson,
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
              const tenantId = toValue(tenantStore.selectedTenantId);
              if (tenantId) {
                headers["x-tenant-id"] = tenantId;
              }
            }
          } catch (_error) {
            // Tenant store might not be initialized yet, which is fine
            // The header will be omitted for this request
          }

          return headers;
        },
        // Add fetch options for better error handling
        fetch(url, options) {
          // [TRPC Client] Making request
          return fetch(url, {
            ...options,
            credentials: "include",
          }).then((response) => {
            // [TRPC Client] Response
            if (!response.ok) {
              // [TRPC Client] Request failed
            }
            return response;
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
