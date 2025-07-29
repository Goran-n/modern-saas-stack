<template>
  <FigModal
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :dismissible="false"
    size="lg"
    class="onboarding-modal"
  >
    <template #header>
      <div class="text-center">
        <h2 class="text-2xl font-bold text-neutral-900">Welcome to Figgy</h2>
        <p class="mt-2 text-sm text-neutral-600">
          Let's set up your company to get the most accurate results
        </p>
      </div>
    </template>

    <!-- Progress Indicator -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div
          v-for="(step, index) in steps"
          :key="step.id"
          class="flex items-center"
          :class="{ 'flex-1': index < steps.length - 1 }"
        >
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full transition-all"
            :class="{
              'bg-primary-500 text-white': currentStepIndex >= index,
              'bg-neutral-200 text-neutral-500': currentStepIndex < index,
            }"
          >
            <Icon
              v-if="currentStepIndex > index"
              name="heroicons:check"
              class="w-5 h-5"
            />
            <span v-else class="text-sm font-medium">{{ index + 1 }}</span>
          </div>
          <div
            v-if="index < steps.length - 1"
            class="flex-1 h-0.5 mx-4"
            :class="{
              'bg-primary-500': currentStepIndex > index,
              'bg-neutral-200': currentStepIndex <= index,
            }"
          />
        </div>
      </div>
      <div class="flex justify-between mt-2">
        <span
          v-for="(step, index) in steps"
          :key="`label-${step.id}`"
          class="text-xs"
          :class="{
            'text-primary-600 font-medium': currentStepIndex === index,
            'text-neutral-500': currentStepIndex !== index,
          }"
        >
          {{ step.label }}
        </span>
      </div>
    </div>

    <!-- Step Content -->
    <div class="min-h-[400px]">
      <transition name="fade" mode="out-in">
        <component
          :is="currentStep.component"
          v-model:data="formData[currentStep.id]"
          :errors="validationErrors[currentStep.id]"
          @validate="validateCurrentStep"
        />
      </transition>
    </div>

    <!-- Navigation -->
    <template #footer>
      <div class="flex justify-between items-center">
        <FigButton
          v-if="currentStepIndex > 0"
          variant="ghost"
          @click="previousStep"
        >
          <Icon name="heroicons:arrow-left" class="w-4 h-4 mr-2" />
          Previous
        </FigButton>
        <div v-else />
        
        <div class="flex items-center gap-4">
          <FigButton
            v-if="currentStep.skippable"
            variant="ghost"
            @click="skipStep"
          >
            Skip for now
          </FigButton>
          <FigButton
            v-if="currentStepIndex < steps.length - 1"
            color="primary"
            @click="nextStep"
            :loading="isValidating"
          >
            Continue
            <Icon name="heroicons:arrow-right" class="w-4 h-4 ml-2" />
          </FigButton>
          <FigButton
            v-else
            color="primary"
            @click="completeOnboarding"
            :loading="isSubmitting"
          >
            Complete Setup
            <Icon name="heroicons:check" class="w-4 h-4 ml-2" />
          </FigButton>
        </div>
      </div>
    </template>
  </FigModal>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef } from 'vue'
import { FigModal, FigButton } from '@figgy/ui'
import CompanyBasicsStep from './onboarding/CompanyBasicsStep.vue'
import FinancialConfigStep from './onboarding/FinancialConfigStep.vue'
import VATSetupStep from './onboarding/VATSetupStep.vue'
import DocumentRecognitionStep from './onboarding/DocumentRecognitionStep.vue'
import IntegrationsStep from './onboarding/IntegrationsStep.vue'

// Props
interface Props {
  modelValue: boolean
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'complete': [data: any]
}>()

// Composables
const $trpc = useTrpc()
const toast = useToast()
const router = useRouter()

// Step Configuration
const steps = [
  {
    id: 'basics',
    label: 'Company Basics',
    component: shallowRef(CompanyBasicsStep),
    skippable: false,
  },
  {
    id: 'financial',
    label: 'Financial Setup',
    component: shallowRef(FinancialConfigStep),
    skippable: false,
  },
  {
    id: 'vat',
    label: 'VAT & Tax',
    component: shallowRef(VATSetupStep),
    skippable: false,
  },
  {
    id: 'recognition',
    label: 'Recognition',
    component: shallowRef(DocumentRecognitionStep),
    skippable: true,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    component: shallowRef(IntegrationsStep),
    skippable: true,
  },
]

// State
const currentStepIndex = ref(0)
const formData = ref<Record<string, any>>({
  basics: {},
  financial: {},
  vat: {},
  recognition: {},
  integrations: {},
})
const validationErrors = ref<Record<string, any>>({})
const isValidating = ref(false)
const isSubmitting = ref(false)

// Computed
const currentStep = computed(() => steps[currentStepIndex.value] || steps[0])

// Methods
async function validateCurrentStep(): Promise<boolean> {
  isValidating.value = true
  if (currentStep.value) {
    validationErrors.value[currentStep.value.id] = {}
  }
  
  try {
    // Validation will be handled by individual step components
    // They will emit validation status
    return true
  } finally {
    isValidating.value = false
  }
}

async function nextStep() {
  const isValid = await validateCurrentStep()
  if (isValid) {
    currentStepIndex.value++
  }
}

function previousStep() {
  currentStepIndex.value--
}

function skipStep() {
  currentStepIndex.value++
}

async function completeOnboarding() {
  isSubmitting.value = true
  
  try {
    // Transform form data to match CompanyConfig schema
    const companyConfig = {
      names: {
        legal: formData.value.basics.legalName || '',
        trading: formData.value.recognition?.tradingNames || [],
        previous: [],
        abbreviations: formData.value.recognition?.abbreviations || [],
        misspellings: formData.value.recognition?.misspellings || [],
      },
      identifiers: {
        vatNumbers: formData.value.vat.isRegistered && formData.value.vat.vatNumber
          ? [{
              id: crypto.randomUUID(),
              number: formData.value.vat.vatNumber,
              country: formData.value.vat.country || 'GB',
              scheme: formData.value.vat.scheme || 'standard',
              isActive: true,
              validFrom: null,
              validTo: null,
            }]
          : [],
        companyNumbers: formData.value.basics.companyNumber
          ? [{
              id: crypto.randomUUID(),
              number: formData.value.basics.companyNumber,
              jurisdiction: 'UK',
              type: 'company_number' as const,
              validFrom: null,
              validTo: null,
            }]
          : [],
        taxReferences: [],
      },
      addresses: {
        registered: formData.value.vat.address
          ? {
              id: crypto.randomUUID(),
              type: 'registered' as const,
              ...formData.value.vat.address,
              isActive: true,
              validFrom: null,
              validTo: null,
            }
          : null,
        trading: [],
        billing: [],
        historical: [],
      },
      matching: {
        emailDomains: formData.value.recognition?.emailDomains || [],
        phoneNumbers: [],
        bankStatementNames: [],
        commonSuppliers: [],
        websites: [],
      },
      business: {
        type: formData.value.basics.companyType || 'limited_company',
        industrySectors: [],
        size: formData.value.financial.companySize || 'small',
        financialYearEnd: {
          month: formData.value.financial.financialYearEnd?.month || 3,
          day: formData.value.financial.financialYearEnd?.day || 31,
        },
        accountingMethod: formData.value.financial.accountingMethod || 'accrual',
        defaultCurrency: formData.value.financial.defaultCurrency || 'GBP',
      },
      vat: {
        isRegistered: formData.value.vat.isRegistered || false,
        schemes: [],
        taxYearBasis: formData.value.financial.accountingMethod || 'accrual',
        mtdEnabled: formData.value.vat.mtdEnabled || false,
        ecSalesListRequired: formData.value.vat.ecSalesListRequired || false,
      },
    }

    // Save company configuration
    await $trpc.tenant.updateCompanyConfig.mutate(companyConfig)
    
    // Mark onboarding as complete
    await $trpc.tenant.completeOnboarding.mutate()
    
    toast.add({
      title: 'Welcome to Figgy!',
      description: 'Your company has been set up successfully',
      color: 'success' as const,
    })
    
    emit('complete', formData.value)
    emit('update:modelValue', false)
    
    // Redirect to dashboard
    await router.push('/files')
  } catch (error: any) {
    toast.add({
      title: 'Setup failed',
      description: error.message || 'An error occurred during setup',
      color: 'error' as const,
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>