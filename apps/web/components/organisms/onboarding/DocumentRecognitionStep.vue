<template>
  <div class="space-y-6">
    <div class="text-center mb-6">
      <Icon name="heroicons:magnifying-glass-circle" class="w-12 h-12 text-primary-500 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-neutral-900">Document Recognition</h3>
      <p class="mt-2 text-sm text-neutral-600">
        Help our AI better identify your company's documents
      </p>
    </div>

    <FigAlert
      color="success"
      variant="subtle"
      title="Optional but recommended"
      description="The more information you provide, the more accurate our document matching will be"
    />

    <div class="space-y-6">
      <!-- Trading Names -->
      <div>
        <FigFormGroup 
          label="Trading Names" 
          description="Names your company trades under (different from legal name)"
        >
          <div class="space-y-2">
            <div 
              v-for="(_, index) in localData.tradingNames" 
              :key="`trading-${index}`"
              class="flex items-center gap-2"
            >
              <FigInput 
                v-model="localData.tradingNames[index]" 
                placeholder="Enter trading name"
                size="md"
                class="flex-1"
              />
              <FigButton 
                color="error" 
                variant="ghost"
                size="sm"
                @click="removeTradingName(index)"
              >
                <Icon name="heroicons:trash" class="h-4 w-4" />
              </FigButton>
            </div>
            <FigButton 
              variant="soft"
              @click="addTradingName"
              size="sm"
              class="w-full"
            >
              <span class="flex items-center justify-center gap-2">
                <Icon name="heroicons:plus" class="h-4 w-4" />
                Add Trading Name
              </span>
            </FigButton>
          </div>
        </FigFormGroup>
      </div>

      <!-- Common Abbreviations -->
      <div>
        <FigFormGroup 
          label="Common Abbreviations" 
          description="How your company name might be abbreviated (e.g., ABC, ABC Ltd)"
        >
          <FigInput 
            v-model="abbreviationInput"
            placeholder="Press Enter to add"
            size="md"
            @keydown.enter.prevent="addAbbreviation"
          />
          <div v-if="localData.abbreviations.length" class="mt-2 flex flex-wrap gap-2">
            <FigBadge 
              v-for="(abbr, index) in localData.abbreviations" 
              :key="`abbr-${index}`"
              color="neutral"
              variant="solid"
              class="cursor-pointer group"
              @click="removeAbbreviation(index)"
            >
              {{ abbr }}
              <Icon name="heroicons:x-mark" class="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" />
            </FigBadge>
          </div>
        </FigFormGroup>
      </div>

      <!-- Common Misspellings -->
      <div>
        <FigFormGroup 
          label="Common Misspellings" 
          description="Help AI recognise typos in your company name"
        >
          <FigInput 
            v-model="misspellingInput"
            placeholder="Press Enter to add"
            size="md"
            @keydown.enter.prevent="addMisspelling"
          />
          <div v-if="localData.misspellings.length" class="mt-2 flex flex-wrap gap-2">
            <FigBadge 
              v-for="(spell, index) in localData.misspellings" 
              :key="`spell-${index}`"
              color="neutral"
              variant="solid"
              class="cursor-pointer group"
              @click="removeMisspelling(index)"
            >
              {{ spell }}
              <Icon name="heroicons:x-mark" class="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" />
            </FigBadge>
          </div>
        </FigFormGroup>
      </div>

      <!-- Email Domains -->
      <div>
        <FigFormGroup 
          label="Company Email Domains" 
          description="Email domains used by your company (e.g., company.com)"
        >
          <FigInput 
            v-model="emailDomainInput"
            placeholder="example.com (press Enter to add)"
            size="md"
            @keydown.enter.prevent="addEmailDomain"
          />
          <div v-if="localData.emailDomains.length" class="mt-2 flex flex-wrap gap-2">
            <FigBadge 
              v-for="(domain, index) in localData.emailDomains" 
              :key="`domain-${index}`"
              color="primary"
              variant="soft"
              class="cursor-pointer group"
              @click="removeEmailDomain(index)"
            >
              <Icon name="heroicons:at-symbol" class="mr-1 h-3 w-3" />
              {{ domain }}
              <Icon name="heroicons:x-mark" class="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" />
            </FigBadge>
          </div>
        </FigFormGroup>
      </div>
    </div>

    <div class="bg-primary-50 rounded-lg p-4 mt-6">
      <h4 class="text-sm font-medium text-primary-900 mb-2">Examples of what to include</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-primary-700">
        <div>
          <strong>Trading Names:</strong>
          <ul class="mt-1 space-y-0.5 ml-4">
            <li>• ABC Trading</li>
            <li>• ABC Solutions</li>
          </ul>
        </div>
        <div>
          <strong>Abbreviations:</strong>
          <ul class="mt-1 space-y-0.5 ml-4">
            <li>• ABC</li>
            <li>• ABC Ltd</li>
          </ul>
        </div>
        <div>
          <strong>Misspellings:</strong>
          <ul class="mt-1 space-y-0.5 ml-4">
            <li>• Veplar (for Vepler)</li>
            <li>• Figy (for Figgy)</li>
          </ul>
        </div>
        <div>
          <strong>Email Domains:</strong>
          <ul class="mt-1 space-y-0.5 ml-4">
            <li>• company.com</li>
            <li>• company.co.uk</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FigFormGroup, FigInput, FigButton, FigBadge, FigAlert } from '@figgy/ui'

// Props & Emits
interface Props {
  data: {
    tradingNames?: string[]
    abbreviations?: string[]
    misspellings?: string[]
    emailDomains?: string[]
  }
  errors?: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:data': [data: Props['data']]
  'validate': [isValid: boolean]
}>()

// State
const localData = ref({
  tradingNames: props.data?.tradingNames || [],
  abbreviations: props.data?.abbreviations || [],
  misspellings: props.data?.misspellings || [],
  emailDomains: props.data?.emailDomains || [],
})

// Input fields
const abbreviationInput = ref('')
const misspellingInput = ref('')
const emailDomainInput = ref('')

// Trading Names
function addTradingName() {
  localData.value.tradingNames.push('')
}

function removeTradingName(index: number) {
  localData.value.tradingNames.splice(index, 1)
}

// Abbreviations
function addAbbreviation() {
  const value = abbreviationInput.value.trim()
  if (value && !localData.value.abbreviations.includes(value)) {
    localData.value.abbreviations.push(value)
    abbreviationInput.value = ''
  }
}

function removeAbbreviation(index: number) {
  localData.value.abbreviations.splice(index, 1)
}

// Misspellings
function addMisspelling() {
  const value = misspellingInput.value.trim()
  if (value && !localData.value.misspellings.includes(value)) {
    localData.value.misspellings.push(value)
    misspellingInput.value = ''
  }
}

function removeMisspelling(index: number) {
  localData.value.misspellings.splice(index, 1)
}

// Email Domains
function addEmailDomain() {
  const value = emailDomainInput.value.trim()
  // Basic domain validation
  const domainRegex = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/
  if (value && domainRegex.test(value) && !localData.value.emailDomains.includes(value)) {
    localData.value.emailDomains.push(value)
    emailDomainInput.value = ''
  }
}

function removeEmailDomain(index: number) {
  localData.value.emailDomains.splice(index, 1)
}

// Watch for changes and emit
watch(localData, (newData) => {
  // Filter out empty trading names
  const filteredData = {
    ...newData,
    tradingNames: newData.tradingNames.filter(name => name.trim() !== ''),
  }
  emit('update:data', filteredData)
  // This step is always valid since all fields are optional
  emit('validate', true)
}, { deep: true })

// Initial emit
emit('validate', true)
</script>