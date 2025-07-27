import { computed, type Ref, ref } from "vue";

interface Supplier {
  id: string;
  legalName: string;
  displayName?: string;
  companyNumber?: string;
  status: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: any;
}

export const useSupplierSearch = (suppliers: Ref<Supplier[] | undefined>) => {
  const searchQuery = ref("");

  const filteredSuppliers = computed(() => {
    if (!suppliers.value) return [];

    const query = searchQuery.value.toLowerCase().trim();

    let result = suppliers.value;

    if (query) {
      result = result.filter((supplier) => {
        // Search in multiple fields
        const searchableFields = [
          supplier.legalName,
          supplier.displayName,
          supplier.companyNumber,
          supplier.email,
          supplier.id,
        ].filter(Boolean);

        return searchableFields.some((field) =>
          field!.toLowerCase().includes(query),
        );
      });
    }

    // Sort alphabetically by displayName (or legalName if displayName is not available)
    return result.sort((a, b) => {
      const nameA = (a.displayName || a.legalName).toLowerCase();
      const nameB = (b.displayName || b.legalName).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  const supplierCount = computed(() => suppliers.value?.length || 0);
  const filteredCount = computed(() => filteredSuppliers.value.length);

  return {
    searchQuery,
    filteredSuppliers,
    supplierCount,
    filteredCount,
  };
};
