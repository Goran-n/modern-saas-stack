import type { FetchOptions } from "ofetch";

interface ApiMethods {
  get: <T = unknown>(url: string, options?: FetchOptions) => Promise<T>;
  post: <T = unknown>(
    url: string,
    body?: unknown,
    options?: FetchOptions,
  ) => Promise<T>;
  put: <T = unknown>(
    url: string,
    body?: unknown,
    options?: FetchOptions,
  ) => Promise<T>;
  patch: <T = unknown>(
    url: string,
    body?: unknown,
    options?: FetchOptions,
  ) => Promise<T>;
  delete: <T = unknown>(url: string, options?: FetchOptions) => Promise<T>;
}

export const useApi = (): ApiMethods => {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const tenantStore = useTenantStore();
  const { auth } = useNotifications();

  const apiFetch = $fetch.create({
    baseURL: config.public.apiUrl,
    async onRequest({ options }) {
      // Get actual JWT token from Supabase session
      const supabaseClient = useSupabaseClient();
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      if (token) {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };

        // Add tenant ID if selected
        const tenantId = tenantStore.selectedTenantId;
        if (tenantId) {
          headers["x-tenant-id"] = String(tenantId);
        }

        // Merge with existing headers if any
        if (options.headers instanceof Headers) {
          Object.entries(headers).forEach(([key, value]) => {
            (options.headers as Headers).set(key, value);
          });
        } else {
          const existingHeaders =
            (options.headers as Record<string, string>) || {};
          options.headers = { ...existingHeaders, ...headers } as any;
        }
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        // Token expired or invalid - sign out user
        try {
          await authStore.signOut();
          auth.signOutSuccess();
        } catch (_error) {
          // Error during automatic logout
        }
        await navigateTo("/auth/login");
      }
    },
  });

  return {
    get: <T = unknown>(url: string, options?: FetchOptions): Promise<T> =>
      apiFetch<T>(url, { ...options, method: "GET" }) as Promise<T>,

    post: <T = unknown>(
      url: string,
      body?: unknown,
      options?: FetchOptions,
    ): Promise<T> =>
      apiFetch<T>(url, {
        ...options,
        method: "POST",
        body: body as any,
      }) as Promise<T>,

    put: <T = unknown>(
      url: string,
      body?: unknown,
      options?: FetchOptions,
    ): Promise<T> =>
      apiFetch<T>(url, {
        ...options,
        method: "PUT",
        body: body as any,
      }) as Promise<T>,

    patch: <T = unknown>(
      url: string,
      body?: unknown,
      options?: FetchOptions,
    ): Promise<T> =>
      apiFetch<T>(url, {
        ...options,
        method: "PATCH",
        body: body as any,
      }) as Promise<T>,

    delete: <T = unknown>(url: string, options?: FetchOptions): Promise<T> =>
      apiFetch<T>(url, { ...options, method: "DELETE" }) as Promise<T>,
  };
};
