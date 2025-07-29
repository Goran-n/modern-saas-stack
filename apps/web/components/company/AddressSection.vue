<template>
  <div class="space-y-6">
    <!-- Registered Address -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-base font-medium text-neutral-900">Registered Address</h4>
        <FigBadge v-if="addresses.registered" color="success" variant="soft">
          Active
        </FigBadge>
      </div>
      
      <div v-if="addresses.registered" class="bg-neutral-50 rounded-lg p-4">
        <AddressForm
          :address="addresses.registered"
          @update="updateRegisteredAddress"
          @remove="removeRegisteredAddress"
        />
      </div>
      <FigButton 
        v-else
        variant="soft"
        size="sm"
        @click="addRegisteredAddress"
      >
        <span class="flex items-center gap-2">
          <Icon name="heroicons:plus" class="h-4 w-4" />
          Add Registered Address
        </span>
      </FigButton>
    </div>

    <!-- Trading Addresses -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-base font-medium text-neutral-900">Trading Addresses</h4>
        <FigBadge v-if="addresses.trading.length" color="primary" variant="soft">
          {{ addresses.trading.length }}
        </FigBadge>
      </div>
      
      <div class="space-y-3">
        <div 
          v-for="(address, index) in addresses.trading"
          :key="index"
          class="bg-neutral-50 rounded-lg p-4"
        >
          <AddressForm
            :address="address"
            @update="(updated) => updateAddress('trading', index, updated)"
            @remove="() => removeAddress('trading', index)"
          />
        </div>
        
        <FigButton 
          variant="soft"
          size="sm"
          @click="() => addAddress('trading')"
        >
          <span class="flex items-center gap-2">
            <Icon name="heroicons:plus" class="h-4 w-4" />
            Add Trading Address
          </span>
        </FigButton>
      </div>
    </div>

    <!-- Billing Addresses -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-base font-medium text-neutral-900">Billing Addresses</h4>
        <FigBadge v-if="addresses.billing.length" color="primary" variant="soft">
          {{ addresses.billing.length }}
        </FigBadge>
      </div>
      
      <div class="space-y-3">
        <div 
          v-for="(address, index) in addresses.billing"
          :key="index"
          class="bg-neutral-50 rounded-lg p-4"
        >
          <AddressForm
            :address="address"
            @update="(updated) => updateAddress('billing', index, updated)"
            @remove="() => removeAddress('billing', index)"
          />
        </div>
        
        <FigButton 
          variant="soft"
          size="sm"
          @click="() => addAddress('billing')"
        >
          <span class="flex items-center gap-2">
            <Icon name="heroicons:plus" class="h-4 w-4" />
            Add Billing Address
          </span>
        </FigButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Address, CompanyConfig } from '@figgy/types';
import { FigButton, FigBadge } from '@figgy/ui';
import AddressForm from './AddressForm.vue';

// Props & Emits
interface Props {
  addresses: CompanyConfig['addresses'];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:addresses': [addresses: CompanyConfig['addresses']];
}>();

// Methods
function createNewAddress(type: string): Address {
  return {
    id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID for new addresses
    type: type as Address['type'],
    line1: '',
    line2: '',
    city: '',
    county: '',
    postcode: '',
    country: 'GB',
    isActive: true,
    validFrom: null,
    validTo: null,
  };
}

function addRegisteredAddress() {
  emit('update:addresses', {
    ...props.addresses,
    registered: createNewAddress('registered'),
  });
}

function updateRegisteredAddress(updated: Address) {
  emit('update:addresses', {
    ...props.addresses,
    registered: updated,
  });
}

function removeRegisteredAddress() {
  emit('update:addresses', {
    ...props.addresses,
    registered: null,
  });
}

function addAddress(type: string) {
  const newAddress = createNewAddress(type);
  const updated = { ...props.addresses };
  
  switch (type) {
    case 'trading':
      updated.trading = [...updated.trading, newAddress];
      break;
    case 'billing':
      updated.billing = [...updated.billing, newAddress];
      break;
    case 'historical':
      updated.historical = [...updated.historical, newAddress];
      break;
  }
  
  emit('update:addresses', updated);
}

function updateAddress(type: string, index: number, updated: Address) {
  const newAddresses = { ...props.addresses };
  
  switch (type) {
    case 'trading':
      newAddresses.trading = [...newAddresses.trading];
      newAddresses.trading[index] = updated;
      break;
    case 'billing':
      newAddresses.billing = [...newAddresses.billing];
      newAddresses.billing[index] = updated;
      break;
    case 'historical':
      newAddresses.historical = [...newAddresses.historical];
      newAddresses.historical[index] = updated;
      break;
  }
  
  emit('update:addresses', newAddresses);
}

function removeAddress(type: string, index: number) {
  const updated = { ...props.addresses };
  
  switch (type) {
    case 'trading':
      updated.trading = updated.trading.filter((_, i) => i !== index);
      break;
    case 'billing':
      updated.billing = updated.billing.filter((_, i) => i !== index);
      break;
    case 'historical':
      updated.historical = updated.historical.filter((_, i) => i !== index);
      break;
  }
  
  emit('update:addresses', updated);
}
</script>