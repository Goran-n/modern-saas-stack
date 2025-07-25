import type { UserTenant, Tenant } from '@figgy/types';

export const useTenantStore = defineStore("tenant", () => {
  // State
  const userTenants = ref<UserTenant[]>([]);
  const selectedTenantId = ref<string | null>(null);
  const isLoading = ref(false);

  // Getters
  const selectedTenant = computed<Tenant | undefined>(
    () =>
      userTenants.value.find((ut) => ut.tenant.id === selectedTenantId.value)
        ?.tenant,
  );

  // Actions
  async function fetchUserTenants(): Promise<void> {
    try {
      isLoading.value = true;
      // Get trpc client at runtime to ensure it's available
      const trpc = useTrpc();
      const response = await trpc.auth.getUserTenants.query();
      userTenants.value = response;

      // Auto-select tenant if needed
      loadSelectedTenant();

      // If no tenant selected yet, auto-select:
      // - The only tenant if user has one tenant
      // - The tenant with the most recent access if user has multiple tenants
      if (!selectedTenantId.value && userTenants.value.length > 0) {
        // Sort by lastAccessAt to get the most recently accessed tenant
        const sortedTenants = [...userTenants.value].sort((a, b) => {
          const dateA = new Date(a.lastAccessAt).getTime();
          const dateB = new Date(b.lastAccessAt).getTime();
          return dateB - dateA; // Most recent first
        });
        selectTenant(sortedTenants[0].tenant.id);
      }
    } catch (error) {
      // Don't throw on error - this allows the app to continue working
      // even if tenant fetching fails temporarily
      const err = error as { data?: { code?: string }; message?: string; stack?: string };
      if (err?.data?.code === "UNAUTHORIZED") {
        // User is not authenticated, this is expected
        return;
      }

      // Log other errors for debugging
      console.error("Failed to fetch tenants:", {
        error: err?.message || error,
        code: err?.data?.code,
        stack: err?.stack,
      });
    } finally {
      isLoading.value = false;
    }
  }

  function selectTenant(tenantId: string): void {
    selectedTenantId.value = tenantId;
    // Persist to localStorage (client-side only)
    if (process.client && window.localStorage) {
      try {
        localStorage.setItem("selectedTenantId", tenantId);
      } catch (e) {
        // Silent fail for localStorage errors
      }
    }
  }

  function loadSelectedTenant(): void {
    if (process.client && window.localStorage) {
      try {
        const stored = localStorage.getItem("selectedTenantId");
        if (stored && userTenants.value.some((ut) => ut.tenant.id === stored)) {
          selectedTenantId.value = stored;
        }
      } catch (e) {
        // Silent fail for localStorage errors
      }
    }
  }

  function $reset(): void {
    userTenants.value = [];
    selectedTenantId.value = null;
    isLoading.value = false;
    if (process.client && window.localStorage) {
      try {
        localStorage.removeItem("selectedTenantId");
      } catch (e) {
        // Silent fail for localStorage errors
      }
    }
  }

  return {
    userTenants: readonly(userTenants),
    selectedTenantId,
    selectedTenant,
    isLoading: readonly(isLoading),
    fetchUserTenants,
    selectTenant,
    loadSelectedTenant,
    $reset,
  };
});
