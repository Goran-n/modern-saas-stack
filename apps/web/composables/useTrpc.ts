import type { AppRouter } from "@figgy/trpc";
import type { createTRPCProxyClient } from "@trpc/client";

export const useTrpc = () => {
  const { $trpc } = useNuxtApp();
  return $trpc as ReturnType<typeof createTRPCProxyClient<AppRouter>>;
};
