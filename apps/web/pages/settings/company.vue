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
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Settings
            </span>
          </FigButton>
          <h1 class="text-3xl font-bold text-gray-900">Company Settings</h1>
          <p class="mt-2 text-gray-600">
            Manage your company information and preferences
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                      simple
                      @change="saveField('business')"
                    >
                      <option value="">Select type</option>
                      <option v-for="type in companyTypes" :key="type.value" :value="type.value">
                        {{ type.label }}
                      </option>
                    </FigSelect>
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
                <p class="text-sm text-gray-500 mt-1">Trading names, abbreviations, and variations</p>
              </div>
            </template>

            <div class="space-y-6">
              <div>
                <FigFormGroup label="Trading Names" description="Names your company trades under">
                  <div class="space-y-2">
                    <div 
                      v-for="(_, index) in formState.names.trading" 
                      :key="`trading-${index}`"
                      class="flex items-center gap-2"
                    >
                      <FigInput 
                        v-model="formState.names.trading[index]" 
                        placeholder="Enter trading name"
                        size="md"
                        class="flex-1"
                        @blur="saveField('names')"
                      />
                      <FigButton 
                        color="error" 
                        variant="ghost"
                        size="sm"
                        @click="removeTradingName(index)"
                      >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </FigButton>
                    </div>
                    <FigButton 
                      variant="soft"
                      @click="addTradingName"
                      size="sm"
                    >
                      <span class="flex items-center gap-2">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Trading Name
                      </span>
                    </FigButton>
                  </div>
                </FigFormGroup>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FigFormGroup label="Common Abbreviations" description="e.g., ABC, ABC Ltd">
                  <FigInput 
                    v-model="abbreviationsInput"
                    placeholder="ABC Ltd"
                    size="md"
                    @keydown.enter.prevent="addAbbreviation"
                  />
                  <div v-if="formState.names.abbreviations.length" class="mt-2 flex flex-wrap gap-2">
                    <FigBadge 
                      v-for="(abbr, index) in formState.names.abbreviations" 
                      :key="index"
                      color="neutral"
                      variant="solid"
                      class="cursor-pointer group"
                      @click="removeAbbreviation(index)"
                    >
                      {{ abbr }}
                      <svg class="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </FigBadge>
                  </div>
                </FigFormGroup>

                <FigFormGroup label="Common Misspellings" description="Help AI recognise typos">
                  <FigInput 
                    v-model="misspellingsInput"
                    placeholder="Vepler, Veplar"
                    size="md"
                    @keydown.enter.prevent="addMisspelling"
                  />
                  <div v-if="formState.names.misspellings.length" class="mt-2 flex flex-wrap gap-2">
                    <FigBadge 
                      v-for="(spell, index) in formState.names.misspellings" 
                      :key="index"
                      color="neutral"
                      variant="solid"
                      class="cursor-pointer group"
                      @click="removeMisspelling(index)"
                    >
                      {{ spell }}
                      <svg class="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </FigBadge>
                  </div>
                </FigFormGroup>
              </div>
            </div>
          </FigCard>

          <!-- Addresses Section -->
          <FigCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">Addresses</h3>
                <p class="text-sm text-gray-500 mt-1">Registered and trading addresses</p>
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
                <p class="text-sm text-gray-500 mt-1">VAT registration and tax settings</p>
              </div>
            </template>

            <div class="space-y-6">
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="space-y-1">
                  <label class="text-sm font-medium text-gray-900">VAT Registered</label>
                  <p class="text-sm text-gray-500">
                    Is your company registered for VAT?
                  </p>
                </div>
                <FigSwitch 
                  v-model="formState.vat.isRegistered"
                  @change="saveField('vat')"
                />
              </div>

              <template v-if="formState.vat.isRegistered">
                <div class="space-y-4 border-t pt-4">
                  <h4 class="font-medium text-gray-900">VAT Registrations</h4>
                  
                  <div 
                    v-for="(vat, index) in formState.identifiers.vatNumbers" 
                    :key="index"
                    class="p-4 bg-gray-50 rounded-lg space-y-4"
                  >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FigFormGroup label="VAT Number">
                        <FigInput 
                          v-model="vat.number" 
                          placeholder="GB123456789"
                          size="md"
                          @blur="saveField('identifiers')"
                        />
                      </FigFormGroup>
                      
                      <FigFormGroup label="Country">
                        <FigSelect
                          v-model="vat.country"
                          size="md"
                          simple
                          @change="saveField('identifiers')"
                        >
                          <option value="">Select country</option>
                          <option v-for="country in euCountryOptions" :key="country.value" :value="country.value">
                            {{ country.label }}
                          </option>
                        </FigSelect>
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
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add VAT Registration
                    </span>
                  </FigButton>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
                  <div class="flex items-center justify-between">
                    <FigFormGroup label="Making Tax Digital" description="MTD compliance enabled" />
                    <FigSwitch 
                      v-model="formState.vat.mtdEnabled"
                      @change="saveField('vat')"
                    />
                  </div>

                  <div class="flex items-center justify-between">
                    <FigFormGroup label="EC Sales List" description="Submit EC sales lists" />
                    <FigSwitch 
                      v-model="formState.vat.ecSalesListRequired"
                      @change="saveField('vat')"
                    />
                  </div>
                </div>
              </template>
            </div>
          </FigCard>

          <!-- Business Information Section -->
          <FigCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">Business Information</h3>
                <p class="text-sm text-gray-500 mt-1">Company structure and financial details</p>
              </div>
            </template>

            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FigFormGroup label="Company Size" description="Number of employees in your organisation">
                  <FigSelect
                    v-model="formState.business.size"
                    size="md"
                    simple
                    @change="saveField('business')"
                  >
                    <option value="">Select company size</option>
                    <option v-for="size in companySizes" :key="size.value" :value="size.value">
                      {{ size.label }}
                    </option>
                  </FigSelect>
                </FigFormGroup>

                <FigFormGroup label="Default Currency" description="Primary currency for transactions">
                  <FigSelect
                    v-model="formState.business.defaultCurrency"
                    size="md"
                    simple
                    @change="saveField('business')"
                  >
                    <option value="">Select currency</option>
                    <option v-for="currency in currencies" :key="currency.value" :value="currency.value">
                      {{ currency.label }}
                    </option>
                  </FigSelect>
                </FigFormGroup>

                <FigFormGroup label="Accounting Method" description="How you record income and expenses">
                  <FigSelect
                    v-model="formState.business.accountingMethod"
                    size="md"
                    simple
                    @change="saveField('business')"
                  >
                    <option value="">Select method</option>
                    <option v-for="method in accountingMethods" :key="method.value" :value="method.value">
                      {{ method.label }}
                    </option>
                  </FigSelect>
                </FigFormGroup>

                <FigFormGroup label="Financial Year End" description="Last day of your financial year">
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Day</label>
                      <FigSelect
                        v-model="formState.business.financialYearEnd.day"
                        size="md"
                        simple
                        @change="saveField('business')"
                      >
                        <option value="">Day</option>
                        <option v-for="day in days" :key="day" :value="day">
                          {{ day }}
                        </option>
                      </FigSelect>
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Month</label>
                      <FigSelect
                        v-model="formState.business.financialYearEnd.month"
                        size="md"
                        simple
                        @change="saveField('business')"
                      >
                        <option value="">Month</option>
                        <option v-for="month in months" :key="month.value" :value="month.value">
                          {{ month.label }}
                        </option>
                      </FigSelect>
                    </div>
                  </div>
                </FigFormGroup>
              </div>
            </div>
          </FigCard>
        </form>
    </FigContainer>
  </div>

  <!-- Save Status Indicator -->
  <div class="fixed bottom-4 right-4 z-50">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div v-if="saveStatus !== 'idle'" class="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div v-if="saveStatus === 'saving'" class="flex items-center gap-2 text-yellow-600">
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="font-medium">Saving changes...</span>
        </div>
        <div v-else-if="saveStatus === 'saved'" class="flex items-center gap-2 text-green-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">Changes saved</span>
        </div>
        <div v-else-if="saveStatus === 'error'" class="flex items-center gap-2 text-red-600">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-medium">Error saving changes</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import type { CompanyConfig } from '@figgy/types';
import { euCountries } from '@figgy/types';
import AddressSection from '~/components/company/AddressSection.vue';
import { 
  FigButton, 
  FigInput, 
  FigSelect, 
  FigSwitch, 
  FigBadge,
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

// Input fields for tag-like inputs
const abbreviationsInput = ref('');
const misspellingsInput = ref('');

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

// Options for dropdowns
const companyTypes = [
  { value: 'limited_company', label: 'Limited Company' },
  { value: 'plc', label: 'Public Limited Company' },
  { value: 'llp', label: 'Limited Liability Partnership' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_trader', label: 'Sole Trader' },
  { value: 'charity', label: 'Charity' },
  { value: 'community_interest_company', label: 'Community Interest Company' },
  { value: 'other', label: 'Other' },
];

const companySizes = [
  { value: 'micro', label: 'Micro (< 10 employees)' },
  { value: 'small', label: 'Small (10-49 employees)' },
  { value: 'medium', label: 'Medium (50-249 employees)' },
  { value: 'large', label: 'Large (250+ employees)' },
];

const currencies = [
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
];

const accountingMethods = [
  { value: 'cash', label: 'Cash Basis' },
  { value: 'accrual', label: 'Accrual Basis' },
];

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const days = Array.from({ length: 31 }, (_, i) => i + 1);

// Transform EU countries for select menu
const euCountryOptions = euCountries.map(code => ({
  value: code,
  label: code,
}));

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

// Trading Names
function addTradingName() {
  formState.value.names.trading.push('');
  saveField('names');
}

function removeTradingName(index: number) {
  formState.value.names.trading.splice(index, 1);
  saveField('names');
}

// Abbreviations
function addAbbreviation() {
  if (abbreviationsInput.value.trim()) {
    formState.value.names.abbreviations.push(abbreviationsInput.value.trim());
    abbreviationsInput.value = '';
    saveField('names');
  }
}

function removeAbbreviation(index: number) {
  formState.value.names.abbreviations.splice(index, 1);
  saveField('names');
}

// Misspellings
function addMisspelling() {
  if (misspellingsInput.value.trim()) {
    formState.value.names.misspellings.push(misspellingsInput.value.trim());
    misspellingsInput.value = '';
    saveField('names');
  }
}

function removeMisspelling(index: number) {
  formState.value.names.misspellings.splice(index, 1);
  saveField('names');
}

// VAT Registration
function addVATRegistration() {
  formState.value.identifiers.vatNumbers.push({
    number: '',
    country: 'GB',
    scheme: 'standard',
    isActive: true,
    validFrom: null,
    validTo: null,
  } as any);
}

function removeVATRegistration(index: number) {
  formState.value.identifiers.vatNumbers.splice(index, 1);
  saveField('identifiers');
}

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