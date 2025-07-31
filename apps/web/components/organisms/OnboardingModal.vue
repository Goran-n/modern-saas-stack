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
        <div v-if="isSaving || lastSavedAt" class="mt-2 text-xs text-neutral-500">
          <span v-if="isSaving" class="flex items-center justify-center gap-1">
            <Icon name="heroicons:arrow-path" class="w-3 h-3 animate-spin" />
            Saving...
          </span>
          <span v-else-if="lastSavedAt">
            Progress saved {{ useTimeAgo(lastSavedAt).value }}
          </span>
        </div>
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
          :is="currentStep?.component"
          v-model:data="formData[currentStep?.id || '']"
          :errors="validationErrors[currentStep?.id || '']"
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
            v-if="currentStep?.skippable"
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
import { ref, computed, watch, onMounted } from 'vue'
import { FigModal, FigButton } from '@figgy/ui'
import { useDebounceFn, useTimeAgo } from '@vueuse/core'
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
    component: CompanyBasicsStep,
    skippable: false,
  },
  {
    id: 'financial',
    label: 'Financial Setup',
    component: FinancialConfigStep,
    skippable: false,
  },
  {
    id: 'vat',
    label: 'VAT & Tax',
    component: VATSetupStep,
    skippable: false,
  },
  {
    id: 'recognition',
    label: 'Recognition',
    component: DocumentRecognitionStep,
    skippable: true,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    component: IntegrationsStep,
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
const isSaving = ref(false)
const hasUnsavedChanges = ref(false)
const lastSavedAt = ref<Date | null>(null)

// Computed
const currentStep = computed(() => steps[currentStepIndex.value] ?? steps[0])

// Load saved progress on mount
onMounted(async () => {
  try {
    const progress = await $trpc.tenant.getOnboardingProgress.query()
    
    if (progress.stepData) {
      formData.value = progress.stepData
    }
    
    if (progress.currentStep > 0) {
      currentStepIndex.value = progress.currentStep
    }
    
    if (progress.lastUpdated) {
      lastSavedAt.value = new Date(progress.lastUpdated)
    }
  } catch (error) {
    console.error('Failed to load onboarding progress:', error)
  }
})

// Auto-save functionality
const saveStepData = useDebounceFn(async () => {
  if (!currentStep.value || !hasUnsavedChanges.value) return
  
  isSaving.value = true
  try {
    const stepId = currentStep.value.id as 'basics' | 'financial' | 'vat' | 'recognition' | 'integrations'
    const stepData = formData.value[stepId]
    
    if (!stepData || Object.keys(stepData).length === 0) {
      return
    }
    
    await $trpc.tenant.saveOnboardingStep.mutate({
      step: stepId,
      data: stepData,
    })
    
    hasUnsavedChanges.value = false
    lastSavedAt.value = new Date()
    
    toast.add({
      title: 'Progress saved',
      color: 'success' as const,
      timeout: 2000,
    })
  } catch (error: any) {
    console.error('Failed to save progress:', error)
    
    // Handle validation errors
    if (error.data?.cause) {
      const errors = error.data.cause as any[]
      const errorMap: Record<string, string> = {}
      errors.forEach((err: any) => {
        errorMap[err.field] = err.message
      })
      validationErrors.value[currentStep.value.id] = errorMap
    }
  } finally {
    isSaving.value = false
  }
}, 1000)

// Watch for form data changes
watch(formData, () => {
  hasUnsavedChanges.value = true
  saveStepData()
}, { deep: true })

// Methods
async function validateCurrentStep(): Promise<boolean> {
  isValidating.value = true
  
  try {
    const stepId = currentStep.value?.id as 'basics' | 'financial' | 'vat' | 'recognition' | 'integrations'
    const stepData = formData.value[stepId]
    
    if (!stepData || Object.keys(stepData).length === 0) {
      // No data to validate
      return currentStep.value?.skippable || false
    }
    
    const validationResult = await $trpc.tenant.validateOnboardingStep.query({
      step: stepId,
      data: stepData,
    })
    
    if (!validationResult.valid) {
      // Transform errors to format expected by step components
      const errorMap: Record<string, string> = {}
      validationResult.errors.forEach((err) => {
        errorMap[err.field] = err.message
      })
      validationErrors.value[stepId] = errorMap
      return false
    }
    
    // Clear errors if validation passed
    validationErrors.value[stepId] = {}
    
    // Show warnings if any
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      validationResult.warnings.forEach((warning) => {
        toast.add({
          title: warning.message,
          description: warning.suggestion,
          color: warning.severity === 'warning' ? 'warning' : 'primary' as const,
        })
      })
    }
    
    return true
  } finally {
    isValidating.value = false
  }
}

async function nextStep() {
  const isValid = await validateCurrentStep()
  if (isValid) {
    // Save current step data before moving forward
    await saveStepData()
    currentStepIndex.value++
    
    // Update current step in backend
    if (currentStep.value) {
      await $trpc.tenant.saveOnboardingStep.mutate({
        step: currentStep.value.id as any,
        data: { ...formData.value[currentStep.value.id], _currentStep: currentStepIndex.value }
      }).catch(() => {})
    }
  }
}

async function previousStep() {
  // Save current step data before moving back
  await saveStepData()
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