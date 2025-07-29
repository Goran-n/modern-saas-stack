<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FigFormGroup label="Company Size" description="Number of employees in your organisation">
        <FigSelect
          v-model="localBusiness.size"
          size="md"
          placeholder="Select company size"
          :options="companySizes"
          @update:model-value="updateBusiness"
        />
      </FigFormGroup>

      <FigFormGroup label="Default Currency" description="Primary currency for transactions">
        <FigSelect
          v-model="localBusiness.defaultCurrency"
          size="md"
          placeholder="Select currency"
          :options="currencies"
          @update:model-value="updateBusiness"
        />
      </FigFormGroup>

      <FigFormGroup label="Accounting Method" description="How you record income and expenses">
        <FigSelect
          v-model="localBusiness.accountingMethod"
          size="md"
          placeholder="Select method"
          :options="accountingMethods"
          @update:model-value="updateBusiness"
        />
      </FigFormGroup>

      <FigFormGroup label="Financial Year End" description="Last day of your financial year">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs text-neutral-500 mb-1">Day</label>
            <FigSelect
              v-model="localBusiness.financialYearEnd.day"
              size="md"
              placeholder="Day"
              :options="days"
              @update:model-value="updateBusiness"
            />
          </div>
          <div>
            <label class="block text-xs text-neutral-500 mb-1">Month</label>
            <FigSelect
              v-model="localBusiness.financialYearEnd.month"
              size="md"
              placeholder="Month"
              :options="months"
              @update:model-value="updateBusiness"
            />
          </div>
        </div>
      </FigFormGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompanyConfig } from '@figgy/types';
import { FigFormGroup, FigSelect } from '@figgy/ui';
import { 
  companySizes,
  currencies,
  accountingMethods,
  months,
  days
} from '~/constants/company';

// Props & Emits
interface Props {
  business: CompanyConfig['business'];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:business': [business: CompanyConfig['business']];
}>();

// State
const localBusiness = ref<CompanyConfig['business']>({ ...props.business });

// Methods
function updateBusiness() {
  emit('update:business', { ...localBusiness.value });
}

// Watch for external changes
watch(() => props.business, (newBusiness) => {
  localBusiness.value = { ...newBusiness };
}, { deep: true });
</script>