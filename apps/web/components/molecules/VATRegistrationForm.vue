<template>
  <div class="space-y-6">
    <!-- VAT Registration Toggle -->
    <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
      <div class="space-y-1">
        <label class="text-sm font-medium text-neutral-900">VAT Registered</label>
        <p class="text-sm text-neutral-500">
          Is your company registered for VAT?
        </p>
      </div>
      <FigSwitch 
        :model-value="localVat.isRegistered"
        @update:model-value="handleVatToggle"
      />
    </div>

    <template v-if="localVat.isRegistered">
      <!-- VAT Registrations -->
      <div class="space-y-4 border-t pt-4">
        <h4 class="font-medium text-neutral-900">VAT Registrations</h4>
        
        <div 
          v-for="(vat, index) in localIdentifiers.vatNumbers" 
          :key="index"
          class="p-4 bg-neutral-50 rounded-lg space-y-4"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FigFormGroup label="VAT Number">
              <FigInput 
                v-model="vat.number" 
                placeholder="GB123456789"
                size="md"
                @blur="updateIdentifiers"
              />
            </FigFormGroup>
            
            <FigFormGroup label="Country">
              <FigSelect
                v-model="vat.country"
                size="md"
                placeholder="Select country"
                :options="euCountryOptions"
                @update:model-value="updateIdentifiers"
              />
            </FigFormGroup>
          </div>
          
          <div class="flex justify-end">
            <FigButton 
              color="error" 
              variant="soft"
              size="sm"
              @click="removeVATRegistration(index)"
            >
              <span class="flex items-center gap-2">
                <Icon name="heroicons:trash" class="h-4 w-4" />
                Remove
              </span>
            </FigButton>
          </div>
        </div>
        
        <FigButton 
          variant="soft"
          @click="addVATRegistration"
          size="sm"
        >
          <span class="flex items-center gap-2">
            <Icon name="heroicons:plus" class="h-4 w-4" />
            Add VAT Registration
          </span>
        </FigButton>
      </div>

      <!-- VAT Options -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
        <div class="flex items-center justify-between">
          <FigFormGroup label="Making Tax Digital" description="MTD compliance enabled" />
          <FigSwitch 
            v-model="localVat.mtdEnabled"
            @change="updateVat"
          />
        </div>

        <div class="flex items-center justify-between">
          <FigFormGroup label="EC Sales List" description="Submit EC sales lists" />
          <FigSwitch 
            v-model="localVat.ecSalesListRequired"
            @change="updateVat"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CompanyConfig } from '@figgy/types';
import { euCountries } from '@figgy/types';
import { FigFormGroup, FigInput, FigButton, FigSwitch, FigSelect } from '@figgy/ui';

// Props & Emits
interface Props {
  vat: CompanyConfig['vat'];
  identifiers: CompanyConfig['identifiers'];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:vat': [vat: CompanyConfig['vat']];
  'update:identifiers': [identifiers: CompanyConfig['identifiers']];
}>();

// State
const localVat = ref<CompanyConfig['vat']>({ ...props.vat });
const localIdentifiers = ref<CompanyConfig['identifiers']>({ ...props.identifiers });

// Transform EU countries for select menu
const euCountryOptions = euCountries.map(code => ({
  value: code,
  label: code,
}));

// Methods
function handleVatToggle(value: boolean) {
  console.log('VAT toggle changed to:', value);
  localVat.value.isRegistered = value;
  updateVat();
}

function updateVat() {
  console.log('Emitting VAT update:', localVat.value);
  emit('update:vat', { ...localVat.value });
}

function updateIdentifiers() {
  emit('update:identifiers', { ...localIdentifiers.value });
}

// VAT Registration
function addVATRegistration() {
  localIdentifiers.value.vatNumbers.push({
    number: '',
    country: 'GB',
    scheme: 'standard',
    isActive: true,
    validFrom: null,
    validTo: null,
  } as any);
  updateIdentifiers();
}

function removeVATRegistration(index: number) {
  localIdentifiers.value.vatNumbers.splice(index, 1);
  updateIdentifiers();
}

// Watch for external changes
watch(() => props.vat, (newVat) => {
  localVat.value = { ...newVat };
}, { deep: true });

watch(() => props.identifiers, (newIdentifiers) => {
  localIdentifiers.value = { ...newIdentifiers };
}, { deep: true });
</script>