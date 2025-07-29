<template>
  <div class="space-y-6">
    <div class="text-center mb-6">
      <Icon name="heroicons:calculator" class="w-12 h-12 text-primary-500 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-neutral-900">Financial Configuration</h3>
      <p class="mt-2 text-sm text-neutral-600">
        Set up your accounting parameters for accurate document processing
      </p>
    </div>

    <FigAlert
      color="warning"
      variant="subtle"
      title="Critical Settings"
      description="These settings affect how we process all your documents and cannot be changed without system intervention"
    />

    <div class="space-y-4">
      <FigFormGroup
        label="Financial Year End"
        description="The last day of your financial year"
        required
        :error="localErrors.financialYearEnd"
      >
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-neutral-500 mb-1">Day</label>
            <FigSelect
              v-model="localData.financialYearEnd.day"
              :options="dayOptions"
              placeholder="Day"
              size="md"
              @change="validateField('financialYearEnd')"
            />
          </div>
          <div>
            <label class="block text-xs text-neutral-500 mb-1">Month</label>
            <FigSelect
              v-model="localData.financialYearEnd.month"
              :options="monthOptions"
              placeholder="Month"
              size="md"
              @change="validateField('financialYearEnd')"
            />
          </div>
        </div>
      </FigFormGroup>

      <FigFormGroup
        label="Accounting Method"
        description="How you record income and expenses"
        required
        :error="localErrors.accountingMethod"
      >
        <FigSelect
          v-model="localData.accountingMethod"
          :options="accountingMethodOptions"
          placeholder="Select accounting method"
          size="lg"
          @change="validateField('accountingMethod')"
        />
        <div class="mt-2 p-3 bg-neutral-50 rounded-md">
          <p class="text-xs text-neutral-600">
            <template v-if="localData.accountingMethod === 'cash'">
              <strong>Cash basis:</strong> Income and expenses are recorded when money actually changes hands
            </template>
            <template v-else-if="localData.accountingMethod === 'accrual'">
              <strong>Accrual basis:</strong> Income and expenses are recorded when they are earned or incurred
            </template>
            <template v-else>
              Select a method to see description
            </template>
          </p>
        </div>
      </FigFormGroup>

      <FigFormGroup
        label="Default Currency"
        description="Primary currency for your transactions"
        required
        :error="localErrors.defaultCurrency"
      >
        <FigSelect
          v-model="localData.defaultCurrency"
          :options="currencyOptions"
          placeholder="Select currency"
          size="lg"
          @change="validateField('defaultCurrency')"
        />
      </FigFormGroup>

      <FigFormGroup
        label="Company Size"
        description="Number of employees in your organisation"
        required
        :error="localErrors.companySize"
      >
        <FigSelect
          v-model="localData.companySize"
          :options="companySizeOptions"
          placeholder="Select company size"
          size="lg"
          @change="validateField('companySize')"
        />
        <div class="mt-2 text-xs text-neutral-500">
          This affects reporting requirements and compliance checks
        </div>
      </FigFormGroup>
    </div>

    <div class="bg-neutral-50 rounded-lg p-4 mt-6">
      <h4 class="text-sm font-medium text-neutral-900 mb-2">Impact of these settings</h4>
      <ul class="text-sm text-neutral-600 space-y-1">
        <li class="flex items-start">
          <Icon name="heroicons:document-text" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Determines how invoices are categorised and dated</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:chart-bar" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Affects financial reporting and tax calculations</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:shield-check" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Ensures compliance with accounting standards</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { z } from 'zod'
import { FigFormGroup, FigSelect, FigAlert } from '@figgy/ui'
import { 
  companySizes,
  currencies,
  accountingMethods,
  months,
  days
} from '~/constants/company'

// Props & Emits
interface Props {
  data: {
    financialYearEnd?: {
      month: number
      day: number
    }
    accountingMethod?: string
    defaultCurrency?: string
    companySize?: string
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
  financialYearEnd: z.object({
    month: z.number().min(1).max(12),
    day: z.number().min(1).max(31),
  }),
  accountingMethod: z.enum(['cash', 'accrual']),
  defaultCurrency: z.string().length(3, 'Currency must be 3 characters'),
  companySize: z.enum(['micro', 'small', 'medium', 'large']),
})

// State
const localData = ref({
  financialYearEnd: {
    month: props.data?.financialYearEnd?.month || 3,
    day: props.data?.financialYearEnd?.day || 31,
  },
  accountingMethod: props.data?.accountingMethod || '',
  defaultCurrency: props.data?.defaultCurrency || 'GBP',
  companySize: props.data?.companySize || '',
})

const localErrors = ref<Record<string, string>>({})

// Options
const dayOptions = days
const monthOptions = months
const accountingMethodOptions = accountingMethods
const currencyOptions = currencies
const companySizeOptions = companySizes

// Methods
function validateField(field: keyof typeof localData.value) {
  try {
    if (field === 'financialYearEnd') {
      schema.shape.financialYearEnd.parse(localData.value.financialYearEnd)
    } else {
      (schema.shape[field] as any).parse(localData.value[field])
    }
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
        const path = issue.path.join('.')
        localErrors.value[path] = issue.message
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