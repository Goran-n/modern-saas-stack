<template>
  <div class="space-y-4">
    <div class="flex justify-between items-start">
      <div class="flex items-center gap-2">
        <FigSwitch 
          v-model="localAddress.isActive"
          @update:model-value="updateAddress"
        />
        <span class="text-sm text-gray-600">
          {{ localAddress.isActive ? 'Active' : 'Inactive' }}
        </span>
      </div>
      <FigButton 
        size="sm" 
        color="error" 
        variant="ghost"
        @click="$emit('remove')"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </FigButton>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FigFormGroup label="Address Line 1" required>
        <FigInput 
          v-model="localAddress.line1" 
          placeholder="123 Main Street"
          size="md"
          class="w-full"
          @blur="updateAddress"
        />
      </FigFormGroup>
      
      <FigFormGroup label="Address Line 2">
        <FigInput 
          v-model="localAddress.line2" 
          placeholder="Suite 100"
          size="md"
          class="w-full"
          @blur="updateAddress"
        />
      </FigFormGroup>
      
      <FigFormGroup label="City" required>
        <FigInput 
          v-model="localAddress.city" 
          placeholder="London"
          size="md"
          class="w-full"
          @blur="updateAddress"
        />
      </FigFormGroup>
      
      <FigFormGroup label="County/State">
        <FigInput 
          v-model="localAddress.county" 
          placeholder="Greater London"
          size="md"
          class="w-full"
          @blur="updateAddress"
        />
      </FigFormGroup>
      
      <FigFormGroup label="Postcode" required>
        <FigInput 
          v-model="localAddress.postcode" 
          placeholder="SW1A 1AA"
          size="md"
          class="w-full"
          @blur="updateAddress"
        />
      </FigFormGroup>
      
      <FigFormGroup label="Country" required>
        <FigSelect
          v-model="localAddress.country"
          size="md"
          class="w-full"
          simple
          @change="updateAddress"
        >
          <option value="">Select country</option>
          <option v-for="country in countries" :key="country.value" :value="country.value">
            {{ country.label }}
          </option>
        </FigSelect>
      </FigFormGroup>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FigFormGroup label="Valid From">
        <FigInput 
          v-model="validFromString"
          type="date"
          size="md"
          class="w-full"
          @change="updateValidFrom"
        />
      </FigFormGroup>
      
      <FigFormGroup label="Valid To">
        <FigInput 
          v-model="validToString"
          type="date"
          size="md"
          class="w-full"
          @change="updateValidTo"
        />
      </FigFormGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Address } from '@figgy/types';
import { FigButton, FigSwitch, FigFormGroup, FigInput, FigSelect } from '@figgy/ui';

// Props & Emits
interface Props {
  address: Address;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  update: [address: Address];
  remove: [];
}>();

// State
const localAddress = ref<Address>({ ...props.address });

// Computed values for date handling
const validFromString = computed({
  get: () => {
    if (!localAddress.value.validFrom) return '';
    return new Date(localAddress.value.validFrom).toISOString().split('T')[0];
  },
  set: (value: string) => {
    localAddress.value.validFrom = value ? new Date(value) : null;
  }
});

const validToString = computed({
  get: () => {
    if (!localAddress.value.validTo) return '';
    return new Date(localAddress.value.validTo).toISOString().split('T')[0];
  },
  set: (value: string) => {
    localAddress.value.validTo = value ? new Date(value) : null;
  }
});

// Countries list
const countries = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'IE', label: 'Ireland' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'AT', label: 'Austria' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
];

// Methods
function updateAddress() {
  emit('update', { ...localAddress.value });
}

function updateValidFrom(event: Event) {
  const target = event.target as HTMLInputElement;
  localAddress.value.validFrom = target.value ? new Date(target.value) : null;
  updateAddress();
}

function updateValidTo(event: Event) {
  const target = event.target as HTMLInputElement;
  localAddress.value.validTo = target.value ? new Date(target.value) : null;
  updateAddress();
}

// Watch for external changes
watch(() => props.address, (newAddress) => {
  localAddress.value = { ...newAddress };
}, { deep: true });
</script>