<template>
  <div class="space-y-6">
    <div class="text-center mb-6">
      <Icon name="heroicons:building-office-2" class="w-12 h-12 text-primary-500 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-neutral-900">Company Information</h3>
      <p class="mt-2 text-sm text-neutral-600">
        This information must match your official company documents
      </p>
    </div>

    <FigAlert
      color="primary"
      variant="subtle"
      title="Important"
      description="These details cannot be changed later without contacting support"
    />

    <div class="space-y-4">
      <FigFormGroup
        label="Legal Company Name"
        description="As registered with Companies House"
        required
        :error="localErrors.legalName"
      >
        <FigInput
          v-model="localData.legalName"
          placeholder="ABC Limited"
          size="lg"
          @blur="validateField('legalName')"
        />
      </FigFormGroup>

      <FigFormGroup
        label="Company Type"
        description="Your company structure type"
        required
        :error="localErrors.companyType"
      >
        <FigSelect
          v-model="localData.companyType"
          :options="companyTypeOptions"
          placeholder="Select company type"
          size="lg"
          @change="validateField('companyType')"
        />
      </FigFormGroup>

      <FigFormGroup
        label="Company Registration Number"
        description="Optional but helps with document matching"
        :error="localErrors.companyNumber"
      >
        <FigInput
          v-model="localData.companyNumber"
          placeholder="12345678"
          size="lg"
          @blur="validateField('companyNumber')"
        />
      </FigFormGroup>
    </div>

    <div class="bg-neutral-50 rounded-lg p-4 mt-6">
      <h4 class="text-sm font-medium text-neutral-900 mb-2">Why we need this</h4>
      <ul class="text-sm text-neutral-600 space-y-1">
        <li class="flex items-start">
          <Icon name="heroicons:check-circle" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Ensures accurate document matching</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:check-circle" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Maintains compliance with accounting standards</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:check-circle" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Prevents misclassification of documents</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { z } from 'zod'
import { FigFormGroup, FigInput, FigSelect, FigAlert } from '@figgy/ui'
import { companyTypes } from '~/constants/company'

// Props & Emits
interface Props {
  data: {
    legalName?: string
    companyType?: string
    companyNumber?: string
  }
  errors?: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:data': [data: Props['data']]
  'validate': [isValid: boolean]
}>()

// Schema
const schema = z.object({
  legalName: z.string().min(1, 'Legal company name is required'),
  companyType: z.enum([
    'limited_company',
    'plc',
    'llp',
    'partnership',
    'sole_trader',
    'charity',
    'community_interest_company',
    'other',
  ]),
  companyNumber: z.string().optional(),
})

// State
const localData = ref({
  legalName: props.data?.legalName || '',
  companyType: props.data?.companyType || '',
  companyNumber: props.data?.companyNumber || '',
})

const localErrors = ref<Record<string, string>>({})

// Company type options
const companyTypeOptions = companyTypes.map(type => ({
  value: type.value,
  label: type.label,
}))

// Methods
function validateField(field: keyof typeof localData.value) {
  try {
    const fieldSchema = {
      legalName: z.string().min(1, 'Legal company name is required'),
      companyType: z.enum([
        'limited_company',
        'plc',
        'llp',
        'partnership',
        'sole_trader',
        'charity',
        'community_interest_company',
        'other',
      ]),
      companyNumber: z.string().optional(),
    }
    
    fieldSchema[field].parse(localData.value[field])
    delete localErrors.value[field]
  } catch (error) {
    if (error instanceof z.ZodError) {
      localErrors.value[field] = error.issues[0]?.message || 'Invalid input'
    }
  }
}

function validateAll(): boolean {
  localErrors.value = {}
  
  try {
    schema.parse(localData.value)
    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        if (issue.path[0]) {
          localErrors.value[issue.path[0].toString()] = issue.message
        }
      })
    }
    return false
  }
}

// Watch for changes and emit
watch(localData, (newData) => {
  emit('update:data', newData)
  emit('validate', validateAll())
}, { deep: true })

// Initial validation
emit('validate', validateAll())
</script>