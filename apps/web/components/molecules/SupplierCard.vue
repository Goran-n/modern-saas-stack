<template>
  <article 
    class="group relative bg-white rounded-lg border border-neutral-200 p-6 
           transition-all duration-200 hover:border-primary-300 hover:shadow-md
           cursor-pointer"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
    :tabindex="0"
    role="link"
    :aria-label="`View details for ${displayName}`"
  >
    <div class="flex items-start gap-4">
      <!-- Logo -->
      <SupplierLogo 
        :name="displayName"
        :logo-url="supplier.logoUrl"
        size="lg"
        class="flex-shrink-0"
      />
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors truncate">
              {{ displayName }}
            </h3>
            <p class="text-sm text-neutral-600 mt-1">
              {{ supplier.companyNumber || 'No company number' }}
            </p>
          </div>
          
          <FigStatusBadge
            :status="supplier.status"
            type="connection"
            variant="soft"
            size="sm"
            class="flex-shrink-0"
          />
        </div>
        
        <!-- Additional Info -->
        <div class="mt-3 space-y-1">
          <div v-if="supplier.email" class="flex items-center gap-2 text-sm text-neutral-500">
            <Icon name="heroicons:envelope" class="h-4 w-4 flex-shrink-0" />
            <span class="truncate">{{ supplier.email }}</span>
          </div>
          <div v-if="supplier.phone" class="flex items-center gap-2 text-sm text-neutral-500">
            <Icon name="heroicons:phone" class="h-4 w-4 flex-shrink-0" />
            <span>{{ supplier.phone }}</span>
          </div>
          <div v-if="supplier.address" class="flex items-center gap-2 text-sm text-neutral-500">
            <FigIcon name="i-heroicons-map-pin" class="h-4 w-4 flex-shrink-0" />
            <span class="truncate">{{ formatAddress(supplier.address) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Hover indicator -->
    <FigIcon 
      name="i-heroicons-arrow-right" 
      class="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-400 
             opacity-0 group-hover:opacity-100 transition-opacity"
    />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FigStatusBadge } from '@figgy/ui'
import SupplierLogo from '../atoms/SupplierLogo.vue'

interface Address {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

interface Supplier {
  id: string
  legalName: string
  displayName?: string
  companyNumber?: string
  status: string
  logoUrl?: string
  email?: string
  phone?: string
  address?: Address
}

interface Props {
  supplier: Supplier
}

interface Emits {
  (e: 'click', supplier: Supplier): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const displayName = computed(() => 
  props.supplier.displayName || props.supplier.legalName
)

const formatAddress = (address: Address): string => {
  const parts = []
  if (address.street) parts.push(address.street)
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  if (address.country) parts.push(address.country)
  return parts.join(', ')
}

const handleClick = () => {
  emit('click', props.supplier)
  navigateTo(`/suppliers/${props.supplier.id}`)
}
</script>