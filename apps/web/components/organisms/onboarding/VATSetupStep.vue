<template>
  <div class="space-y-6">
    <div class="text-center mb-6">
      <Icon name="heroicons:receipt-percent" class="w-12 h-12 text-primary-500 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-neutral-900">VAT & Tax Setup</h3>
      <p class="mt-2 text-sm text-neutral-600">
        Configure your VAT registration for accurate invoice processing
      </p>
    </div>

    <!-- VAT Registration Toggle -->
    <div class="bg-neutral-50 rounded-lg p-6">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <label class="text-base font-medium text-neutral-900">VAT Registered?</label>
          <p class="text-sm text-neutral-600">
            Is your company registered for VAT?
          </p>
        </div>
        <FigSwitch 
          v-model="localData.isRegistered"
          @change="handleVATToggle"
        />
      </div>
    </div>

    <!-- VAT Details (shown when registered) -->
    <template v-if="localData.isRegistered">
      <div class="space-y-4 animate-in fade-in slide-in-from-top-2">
        <FigFormGroup
          label="VAT Number"
          description="Your VAT registration number"
          required
          :error="localErrors.vatNumber"
        >
          <FigInput
            v-model="localData.vatNumber"
            placeholder="GB123456789"
            size="lg"
            @blur="validateField('vatNumber')"
          />
        </FigFormGroup>

        <FigFormGroup
          label="VAT Country"
          description="Country of VAT registration"
          required
          :error="localErrors.country"
        >
          <FigSelect
            v-model="localData.country"
            :options="countryOptions"
            placeholder="Select country"
            size="lg"
            @change="validateField('country')"
          />
        </FigFormGroup>

        <FigFormGroup
          label="VAT Scheme"
          description="Your VAT accounting scheme"
          required
          :error="localErrors.scheme"
        >
          <FigSelect
            v-model="localData.scheme"
            :options="vatSchemeOptions"
            placeholder="Select VAT scheme"
            size="lg"
            @change="validateField('scheme')"
          />
        </FigFormGroup>

        <!-- Additional VAT Options -->
        <div class="space-y-4 border-t pt-4">
          <div class="flex items-center justify-between">
            <FigFormGroup 
              label="Making Tax Digital" 
              description="MTD compliance enabled"
              class="mb-0"
            />
            <FigSwitch v-model="localData.mtdEnabled" />
          </div>

          <div class="flex items-center justify-between">
            <FigFormGroup 
              label="EC Sales List" 
              description="Submit EC sales lists"
              class="mb-0"
            />
            <FigSwitch v-model="localData.ecSalesListRequired" />
          </div>
        </div>
      </div>
    </template>

    <!-- Company Address -->
    <div class="space-y-4">
      <h4 class="text-base font-medium text-neutral-900">Registered Address</h4>
      <p class="text-sm text-neutral-600">Your company's registered address for tax purposes</p>
      
      <FigFormGroup
        label="Address Line 1"
        required
        :error="localErrors['address.line1']"
      >
        <FigInput
          v-model="localData.address.line1"
          placeholder="123 Main Street"
          size="md"
          @blur="validateField('address')"
        />
      </FigFormGroup>

      <FigFormGroup
        label="Address Line 2"
        :error="localErrors['address.line2']"
      >
        <FigInput
          v-model="localData.address.line2"
          placeholder="Suite 100"
          size="md"
        />
      </FigFormGroup>

      <div class="grid grid-cols-2 gap-4">
        <FigFormGroup
          label="City"
          required
          :error="localErrors['address.city']"
        >
          <FigInput
            v-model="localData.address.city"
            placeholder="London"
            size="md"
            @blur="validateField('address')"
          />
        </FigFormGroup>

        <FigFormGroup
          label="Postcode"
          required
          :error="localErrors['address.postcode']"
        >
          <FigInput
            v-model="localData.address.postcode"
            placeholder="SW1A 1AA"
            size="md"
            @blur="validateField('address')"
          />
        </FigFormGroup>
      </div>

      <FigFormGroup
        label="Country"
        required
        :error="localErrors['address.country']"
      >
        <FigSelect
          v-model="localData.address.country"
          :options="countryOptions"
          placeholder="Select country"
          size="md"
          @change="validateField('address')"
        />
      </FigFormGroup>
    </div>

    <div class="bg-blue-50 rounded-lg p-4 mt-6">
      <h4 class="text-sm font-medium text-blue-900 mb-2">Why accurate VAT setup matters</h4>
      <ul class="text-sm text-blue-700 space-y-1">
        <li class="flex items-start">
          <Icon name="heroicons:check-circle" class="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <span>Ensures correct VAT calculations on all invoices</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:check-circle" class="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <span>Maintains compliance with HMRC requirements</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:check-circle" class="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <span>Enables automatic VAT return preparation</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { z } from 'zod'
import { FigFormGroup, FigInput, FigSelect, FigSwitch } from '@figgy/ui'
import { euCountries } from '@figgy/types'

// Props & Emits
interface Props {
  data: {
    isRegistered?: boolean
    vatNumber?: string
    country?: string
    scheme?: string
    mtdEnabled?: boolean
    ecSalesListRequired?: boolean
    address?: {
      line1: string
      line2?: string
      city: string
      postcode: string
      country: string
    }
  }
  errors?: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:data': [data: Props['data']]
  'validate': [isValid: boolean]
}>()

// Schema
const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  country: z.string().min(2).max(2, 'Country must be 2-letter code'),
})

const vatSchema = z.object({
  isRegistered: z.boolean(),
  vatNumber: z.string().optional(),
  country: z.string().optional(),
  scheme: z.string().optional(),
  mtdEnabled: z.boolean(),
  ecSalesListRequired: z.boolean(),
  address: addressSchema,
}).refine((data) => {
  if (data.isRegistered) {
    return data.vatNumber && data.country && data.scheme
  }
  return true
}, {
  message: 'VAT details are required when registered',
  path: ['vatNumber'],
})

// State
const localData = ref({
  isRegistered: props.data?.isRegistered || false,
  vatNumber: props.data?.vatNumber || '',
  country: props.data?.country || 'GB',
  scheme: props.data?.scheme || 'standard',
  mtdEnabled: props.data?.mtdEnabled || false,
  ecSalesListRequired: props.data?.ecSalesListRequired || false,
  address: {
    line1: props.data?.address?.line1 || '',
    line2: props.data?.address?.line2 || '',
    city: props.data?.address?.city || '',
    postcode: props.data?.address?.postcode || '',
    country: props.data?.address?.country || 'GB',
  },
})

const localErrors = ref<Record<string, string>>({})

// Options
const countryOptions = ['GB', ...euCountries].map(code => ({
  value: code,
  label: code === 'GB' ? 'United Kingdom' : code,
}))

const vatSchemeOptions = [
  { value: 'standard', label: 'Standard' },
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'cash_accounting', label: 'Cash Accounting' },
  { value: 'annual_accounting', label: 'Annual Accounting' },
]

// Methods
function handleVATToggle() {
  if (!localData.value.isRegistered) {
    // Clear VAT-specific fields when toggled off
    localData.value.vatNumber = ''
    localData.value.scheme = 'standard'
    localData.value.mtdEnabled = false
    localData.value.ecSalesListRequired = false
  }
  validateAll()
}

function validateField(field: string) {
  try {
    if (field === 'address') {
      addressSchema.parse(localData.value.address)
      // Clear all address errors
      Object.keys(localErrors.value).forEach(key => {
        if (key.startsWith('address.')) {
          delete localErrors.value[key]
        }
      })
    } else {
      // Validate individual field
      const value = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj[key], localData.value as any)
        : localData.value[field as keyof typeof localData.value]
      
      // Simple validation for now
      if (field === 'vatNumber' && localData.value.isRegistered && !value) {
        localErrors.value[field] = 'VAT number is required'
      } else {
        delete localErrors.value[field]
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        const path = issue.path.join('.')
        localErrors.value[field === 'address' ? `address.${path}` : field] = issue.message
      })
    }
  }
}

function validateAll(): boolean {
  localErrors.value = {}
  
  try {
    vatSchema.parse(localData.value)
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

<style scoped>
@keyframes animate-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: animate-in 0.3s ease-out;
}
</style>