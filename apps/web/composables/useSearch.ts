import { useDebounceFn } from "@vueuse/core";
import { computed, ref, watch } from "vue";

export interface SearchFilters {
  type?: "file" | "supplier" | "document";
  category?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchOptions {
  limit?: number;
  debounce?: number;
}

export function useSearch(options: SearchOptions = {}) {
  const { limit = 20, debounce = 300 } = options;
  const $trpc = useTrpc();

  const query = ref("");
  const filters = ref<SearchFilters>({});
  const results = ref<any[]>([]);
  const isSearching = ref(false);
  const error = ref<Error | null>(null);

  const search = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      results.value = [];
      return;
    }

    isSearching.value = true;
    error.value = null;

    try {
      // Check if search router is available
      if (!$trpc.search || !$trpc.search.search) {
        // Search functionality not available - Upstash may not be configured
        // Return mock results for development
        results.value = [];
        return;
      }

      const response = await $trpc.search.search.query({
        query: searchQuery,
        filters: filters.value,
        limit,
      });
      results.value = response.results || [];
    } catch (err) {
      // Search error
      error.value = err as Error;
      results.value = [];
    } finally {
      isSearching.value = false;
    }
  };

  const debouncedSearch = useDebounceFn(search, debounce);

  // Watch for changes in query
  watch(query, (newQuery) => {
    if (newQuery.trim()) {
      debouncedSearch(newQuery);
    } else {
      results.value = [];
    }
  });

  // Watch for changes in filters
  watch(
    filters,
    () => {
      if (query.value.trim()) {
        debouncedSearch(query.value);
      }
    },
    { deep: true },
  );

  const hasResults = computed(() => results.value.length > 0);

  const setFilters = (newFilters: SearchFilters) => {
    filters.value = newFilters;
  };

  const clearSearch = () => {
    query.value = "";
    filters.value = {};
  };

  return {
    query,
    filters,
    results,
    hasResults,
    isSearching,
    error,
    search: (searchQuery: string) => {
      query.value = searchQuery;
    },
    setFilters,
    clearSearch,
  };
}

export function useSearchSuggestions(
  options: { limit?: number; debounce?: number } = {},
) {
  const { limit = 10, debounce = 150 } = options;
  const $trpc = useTrpc();

  const prefix = ref("");
  const suggestions = ref<string[]>([]);
  const isLoading = ref(false);

  const fetchSuggestions = async (searchPrefix: string) => {
    if (!searchPrefix.trim()) {
      suggestions.value = [];
      return;
    }

    isLoading.value = true;
    try {
      if (!$trpc.search || !$trpc.search.suggest) {
        // Suggestions functionality not available
        suggestions.value = [];
        return;
      }

      const response = await $trpc.search.suggest.query({
        prefix: searchPrefix,
        limit,
      });
      suggestions.value = response.suggestions || [];
    } catch (_error) {
      // Failed to fetch suggestions
      suggestions.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const debouncedFetch = useDebounceFn(fetchSuggestions, debounce);

  watch(prefix, (newPrefix) => {
    if (newPrefix.trim()) {
      debouncedFetch(newPrefix);
    } else {
      suggestions.value = [];
    }
  });

  const getSuggestions = (searchPrefix: string) => {
    prefix.value = searchPrefix;
  };

  return {
    prefix,
    suggestions,
    isLoading,
    getSuggestions,
  };
}
