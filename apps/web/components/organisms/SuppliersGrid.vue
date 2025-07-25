<template>
  <div 
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    role="list"
  >
    <SupplierCard
      v-for="supplier in suppliers"
      :key="supplier.id"
      :supplier="supplier"
      role="listitem"
      @click="$emit('supplier-click', supplier)"
    />
  </div>
</template>

<script setup lang="ts">
import SupplierCard from '../molecules/SupplierCard.vue'

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

interface Props {
  suppliers: Supplier[]
}

interface Emits {
  (e: 'supplier-click', supplier: Supplier): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>