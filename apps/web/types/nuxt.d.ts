import type { AppRouter } from "@figgy/trpc";
import type { createTRPCProxyClient } from "@trpc/client";

declare module "#app" {
  interface NuxtApp {
    $trpc: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  }
}
