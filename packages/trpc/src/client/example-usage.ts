import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { createLoggingLink } from "./logging-link";
import type { AppRouter } from "../routers";
import superjson from "superjson";

// Example of how to create a TRPC client with logging enabled
export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    // Add logging link first to capture all requests
    createLoggingLink({
      enabled: true,
      logErrors: true,
      logSlowRequests: true,
      slowRequestThreshold: 1000, // Log requests slower than 1 second
      logger: {
        info: (message, data) => console.log(message, data),
        warn: (message, data) => console.warn(message, data),
        error: (message, data) => console.error(message, data),
      },
    }),
    // Then add your HTTP link
    httpBatchLink({
      url: "http://localhost:4000/trpc",
      headers() {
        return {
          authorization: `Bearer ${getAuthToken()}`,
          "x-tenant-id": getTenantId(),
        };
      },
    }),
  ],
});

// Helper functions (implement these based on your auth setup)
function getAuthToken(): string {
  // Return the current user's auth token
  return localStorage.getItem("authToken") || "";
}

function getTenantId(): string {
  // Return the current tenant ID
  return localStorage.getItem("tenantId") || "";
}