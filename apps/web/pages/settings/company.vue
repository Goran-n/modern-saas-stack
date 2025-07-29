<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
        <!-- Page Header -->
        <div class="mb-8">
          <FigButton 
            variant="ghost" 
            color="neutral"
            size="sm"
            @click="router.push('/settings')"
            class="mb-4"
          >
            <span class="flex items-center gap-2">
              <Icon name="heroicons:arrow-left" class="h-4 w-4" />
              Back to Settings
            </span>
          </FigButton>
          <h1 class="text-3xl font-bold text-neutral-900">Company Settings</h1>
          <p class="mt-2 text-neutral-600">
            Manage your company information and preferences
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm text-neutral-500">
            <Icon name="heroicons:information-circle" class="h-4 w-4" />
            <span>Changes are saved automatically as you type</span>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <FigSkeleton height="xl" />
          <FigSkeleton height="h-96" />
        </div>

        <!-- Error State -->
        <FigAlert 
          v-else-if="error"
          color="error"
          variant="subtle"
          title="Error loading configuration"
          :description="error?.message || 'An unknown error occurred'"
        />

        <!-- Configuration Form -->
        <form v-else class="space-y-8">
          <!-- Essential Company Info - Always Visible -->
          <FigCard>
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-semibold mb-4">Essential Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FigFormGroup label="Legal Company Name" required :error="validationErrors.legal">
                    <FigInput 
                      v-model="formState.names.legal" 
                      placeholder="ABC Limited"
                      size="lg"
                      @blur="saveField('names')"
                    />
                  </FigFormGroup>
                  
                  <FigFormGroup label="Company Type" required :error="validationErrors.type">
                    <FigSelect
                      v-model="formState.business.type"
                      size="lg"
                      placeholder="Select type"
                      :options="companyTypes"
                      @update:model-value="saveField('business')"
                    />
                  </FigFormGroup>
                </div>
              </div>
            </div>
          </FigCard>

          <!-- Company Details Section -->
          <FigCard header="Company Details">
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">Company Details</h3>
                <p class="text-sm text-neutral-500 mt-1">Trading names, abbreviations, and variations</p>
              </div>
            </template>

            <CompanyNameFields
              v-model:names="formState.names"
              @update:names="saveField('names')"
            />
          </FigCard>

          <!-- Addresses Section -->
          <FigCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">Addresses</h3>
                <p class="text-sm text-neutral-500 mt-1">Registered and trading addresses</p>
              </div>
            </template>

            <AddressSection 
              v-model:addresses="formState.addresses"
              @update:addresses="saveField('addresses')"
            />
          </FigCard>

          <!-- VAT & Tax Section -->
          <FigCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">VAT & Tax Configuration</h3>
                <p class="text-sm text-neutral-500 mt-1">VAT registration and tax settings</p>
              </div>
            </template>

            <VATRegistrationForm
              v-model:vat="formState.vat"
              v-model:identifiers="formState.identifiers"
              @update:vat="saveField('vat')"
              @update:identifiers="saveField('identifiers')"
            />
          </FigCard>

          <!-- Business Information Section -->
          <FigCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">Business Information</h3>
                <p class="text-sm text-neutral-500 mt-1">Company structure and financial details</p>
              </div>
            </template>

            <BusinessDetailsForm
              v-model:business="formState.business"
              @update:business="saveField('business')"
            />
          </FigCard>
        </form>
    </FigContainer>
  </div>

  <!-- Save Status Indicator -->
  <SaveStatusIndicator :status="saveStatus" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import type { CompanyConfig } from '@figgy/types';
import AddressSection from '~/components/company/AddressSection.vue';
import SaveStatusIndicator from '~/components/molecules/SaveStatusIndicator.vue';
import CompanyNameFields from '~/components/molecules/CompanyNameFields.vue';
import VATRegistrationForm from '~/components/molecules/VATRegistrationForm.vue';
import BusinessDetailsForm from '~/components/molecules/BusinessDetailsForm.vue';
import { companyTypes } from '~/constants/company';
import { 
  FigButton, 
  FigInput, 
  FigSelect, 
  FigFormGroup,
  FigContainer,
  FigCard,
  FigAlert,
  FigSkeleton
} from '@figgy/ui';

// Page metadata
definePageMeta({
  middleware: ['auth']
});

// Router
const router = useRouter();

// Composables
const $trpc = useTrpc();
const tenantStore = useTenantStore();
const toast = useToast();

// Form validation schema (not used currently)
/* const validationSchema = z.object({
  names: z.object({
    legal: z.string().min(1, 'Legal name is required'),
    trading: z.array(z.string()),
    abbreviations: z.array(z.string()),
    misspellings: z.array(z.string()),
  }),
  business: z.object({
    type: z.string(),
    size: z.string(),
    defaultCurrency: z.string(),
    accountingMethod: z.string(),
    industrySectors: z.array(z.string()),
    financialYearEnd: z.object({
      month: z.number(),
      day: z.number(),
    }),
  }),
  vat: z.object({
    isRegistered: z.boolean(),
    mtdEnabled: z.boolean(),
    ecSalesListRequired: z.boolean(),
  }),
}); */

// State
const isLoading = ref(true);
const error = ref<Error | null>(null);
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
const validationErrors = reactive<Record<string, string>>({});


const formState = ref<CompanyConfig>({
  names: {
    legal: '',
    trading: [],
    previous: [],
    abbreviations: [],
    misspellings: [],
  },
  identifiers: {
    vatNumbers: [],
    companyNumbers: [],
    taxReferences: [],
  },
  addresses: {
    registered: null,
    trading: [],
    billing: [],
    historical: [],
  },
  matching: {
    emailDomains: [],
    phoneNumbers: [],
    bankStatementNames: [],
    commonSuppliers: [],
    websites: [],
  },
  business: {
    type: 'limited_company',
    industrySectors: [],
    size: 'small',
    financialYearEnd: { month: 3, day: 31 },
    accountingMethod: 'accrual',
    defaultCurrency: 'GBP',
  },
  vat: {
    isRegistered: false,
    schemes: [],
    taxYearBasis: 'accrual' as const,
    mtdEnabled: false,
    ecSalesListRequired: false,
  },
});

// Methods
async function loadConfiguration() {
  if (!tenantStore.selectedTenantId) {
    error.value = new Error('No tenant selected');
    isLoading.value = false;
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;
    
    const config = await $trpc.tenant.getCompanyConfig.query();
    // Deep merge to preserve default values
    formState.value = {
      names: {
        legal: config.names?.legal || '',
        trading: config.names?.trading || [],
        previous: config.names?.previous || [],
        abbreviations: config.names?.abbreviations || [],
        misspellings: config.names?.misspellings || [],
        groupName: config.names?.groupName,
      },
      identifiers: {
        vatNumbers: config.identifiers?.vatNumbers || [],
        companyNumbers: config.identifiers?.companyNumbers || [],
        taxReferences: config.identifiers?.taxReferences || [],
      },
      addresses: {
        registered: config.addresses?.registered || null,
        trading: config.addresses?.trading || [],
        billing: config.addresses?.billing || [],
        historical: config.addresses?.historical || [],
      },
      matching: {
        emailDomains: config.matching?.emailDomains || [],
        phoneNumbers: config.matching?.phoneNumbers || [],
        bankStatementNames: config.matching?.bankStatementNames || [],
        commonSuppliers: config.matching?.commonSuppliers || [],
        websites: config.matching?.websites || [],
      },
      business: {
        type: config.business?.type || 'limited_company',
        industrySectors: config.business?.industrySectors || [],
        size: config.business?.size || 'small',
        financialYearEnd: config.business?.financialYearEnd || { month: 3, day: 31 },
        accountingMethod: config.business?.accountingMethod || 'accrual',
        defaultCurrency: config.business?.defaultCurrency || 'GBP',
        incorporationDate: config.business?.incorporationDate,
      },
      vat: {
        isRegistered: config.vat?.isRegistered || false,
        schemes: config.vat?.schemes || [],
        taxYearBasis: config.vat?.taxYearBasis || 'accrual',
        mtdEnabled: config.vat?.mtdEnabled || false,
        ecSalesListRequired: config.vat?.ecSalesListRequired || false,
      },
    };
  } catch (e: any) {
    // Error loading company config
    error.value = e;
    toast.add({
      title: 'Error',
      description: e.message || 'Failed to load company configuration',
      color: 'error' as const,
    });
  } finally {
    isLoading.value = false;
  }
}

// Auto-save functionality
const saveField = useDebounceFn(async (_field: string) => {
  if (!formState.value.names.legal) {
    return;
  }
  
  try {
    saveStatus.value = 'saving';
    
    await $trpc.tenant.updateCompanyConfig.mutate(formState.value);
    
    saveStatus.value = 'saved';
    
    setTimeout(() => {
      if (saveStatus.value === 'saved') {
        saveStatus.value = 'idle';
      }
    }, 2000);
  } catch (e: any) {
    saveStatus.value = 'error';
    toast.add({
      title: 'Failed to save',
      description: e.message || 'An error occurred while saving',
      color: 'error' as const,
    });
    
    setTimeout(() => {
      if (saveStatus.value === 'error') {
        saveStatus.value = 'idle';
      }
    }, 3000);
  }
}, 1000);



// Lifecycle
onMounted(async () => {
  if (!tenantStore.selectedTenantId) {
    await tenantStore.fetchUserTenants();
  }
  loadConfiguration();
});

// Watch for tenant changes
watch(() => tenantStore.selectedTenantId, () => {
  loadConfiguration();
});
</script>