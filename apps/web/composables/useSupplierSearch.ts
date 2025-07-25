import { computed, ref, type Ref } from 'vue'

interface Supplier {
  id: string
  legalName: string
  displayName?: string
  companyNumber?: string
  status: string
  logoUrl?: string
  email?: string
  phone?: string
  address?: any
}

export const useSupplierSearch = (suppliers: Ref<Supplier[] | undefined>) => {
  const searchQuery = ref('')

  const filteredSuppliers = computed(() => {
    if (!suppliers.value) return []
    
    const query = searchQuery.value.toLowerCase().trim()
    
    if (!query) {
      return suppliers.value
    }
    
    return suppliers.value.filter(supplier => {
      // Search in multiple fields
      const searchableFields = [
        supplier.legalName,
        supplier.displayName,
        supplier.companyNumber,
        supplier.email,
        supplier.id
      ].filter(Boolean)
      
      return searchableFields.some(field => 
        field!.toLowerCase().includes(query)
      )
    })
  })

  const supplierCount = computed(() => suppliers.value?.length || 0)
  const filteredCount = computed(() => filteredSuppliers.value.length)

  return {
    searchQuery,
    filteredSuppliers,
    supplierCount,
    filteredCount
  }
}