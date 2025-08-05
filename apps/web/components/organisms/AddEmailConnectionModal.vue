<template>
  <FigModal 
    v-model="isOpen"
    :title="modalTitle"
    size="md"
  >
    <template #body>
      <!-- Step 1: Provider Selection -->
      <div v-if="currentStep === 'provider'" class="space-y-6">
        <p class="text-sm text-neutral-600">
          Choose your email provider to get started
        </p>
        
        <div class="space-y-3">
          <button
            v-for="provider in providers"
            :key="provider.value"
            @click="selectProvider(provider.value as 'gmail' | 'outlook' | 'imap')"
            class="w-full p-4 border rounded-lg transition-all text-left group"
            :class="[
              formData.provider === provider.value 
                ? 'border-primary-300 bg-primary-50' 
                : 'border-neutral-200',
              availableProviders[provider.value]?.available !== false
                ? 'hover:border-primary-300 hover:bg-primary-50'
                : 'opacity-60 cursor-not-allowed'
            ]"
            :disabled="availableProviders[provider.value]?.available === false"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-12 h-12 rounded-lg flex items-center justify-center"
                :class="provider.bgColor"
              >
                <Icon 
                  :name="provider.icon" 
                  class="w-7 h-7"
                  :class="provider.iconColor"
                />
              </div>
              <div class="flex-1">
                <h4 class="font-medium text-neutral-900">
                  {{ provider.label }}
                  <span v-if="availableProviders[provider.value]?.available === false" class="text-xs text-orange-600 ml-2">
                    (Not configured)
                  </span>
                </h4>
                <p class="text-sm text-neutral-500 mt-0.5">{{ provider.description }}</p>
              </div>
              <Icon 
                name="heroicons:chevron-right" 
                class="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors"
              />
            </div>
          </button>
        </div>
      </div>
      
      <!-- Step 2: Email Configuration -->
      <div v-else-if="currentStep === 'configuration'" class="space-y-6">
        <FigFormGroup 
          label="Email Address" 
          required
          :error="errors.emailAddress"
        >
          <FigInput
            v-model="formData.emailAddress"
            type="email"
            placeholder="invoices@company.com"
            :disabled="isLoading"
          />
          <template #hint>
            <span class="text-xs text-neutral-500">
              Use a dedicated email address for receiving invoices and receipts
            </span>
          </template>
        </FigFormGroup>
        
        <FigFormGroup 
          label="Folders to Monitor"
          :error="errors.folderFilter"
        >
          <div class="space-y-2">
            <div class="flex gap-2 flex-wrap">
              <label
                v-for="folder in folderOptions"
                :key="folder.value"
                class="inline-flex items-center"
              >
                <FigCheckbox
                  :model-value="formData.folderFilter.includes(folder.value)"
                  @update:model-value="toggleFolder(folder.value)"
                  :disabled="isLoading"
                />
                <span class="ml-2 text-sm text-neutral-700">{{ folder.label }}</span>
              </label>
            </div>
          </div>
          <template #hint>
            <span class="text-xs text-neutral-500">
              Leave empty to monitor all folders
            </span>
          </template>
        </FigFormGroup>
        
        <FigFormGroup 
          label="Sender Filter"
          :error="errors.senderFilter"
        >
          <div class="space-y-2">
            <div class="flex gap-2">
              <FigInput
                v-model="newSenderEmail"
                type="email"
                placeholder="Add email address"
                :disabled="isLoading"
                @keydown.enter.prevent="addSender"
              />
              <FigButton
                @click="addSender"
                size="sm"
                variant="outline"
                :disabled="!newSenderEmail || isLoading"
              >
                Add
              </FigButton>
            </div>
            <div v-if="formData.senderFilter.length > 0" class="flex flex-wrap gap-2">
              <FigBadge
                v-for="(sender, index) in formData.senderFilter"
                :key="sender"
                color="neutral"
                variant="soft"
                size="sm"
                class="inline-flex items-center gap-1"
              >
                {{ sender }}
                <button
                  @click="removeSender(index)"
                  class="ml-1 hover:text-neutral-700"
                  :disabled="isLoading"
                >
                  <Icon name="heroicons:x-mark" class="h-3 w-3" />
                </button>
              </FigBadge>
            </div>
          </div>
          <template #hint>
            <span class="text-xs text-neutral-500">
              Only process emails from these senders (optional)
            </span>
          </template>
        </FigFormGroup>
      </div>
      
      <!-- Step 3: IMAP Credentials (only for IMAP) -->
      <div v-else-if="currentStep === 'imap'" class="space-y-6">
        <FigAlert
          color="primary"
          variant="subtle"
          title="App-specific password required"
          description="For Gmail and Outlook.com, you'll need to generate an app-specific password instead of using your regular password."
        />
        
        <FigFormGroup 
          label="IMAP Server" 
          required
          :error="errors.imapHost"
        >
          <FigInput
            v-model="imapData.host"
            placeholder="imap.gmail.com"
            :disabled="isLoading"
          />
        </FigFormGroup>
        
        <div class="grid grid-cols-2 gap-4">
          <FigFormGroup 
            label="Port" 
            required
            :error="errors.imapPort"
          >
            <FigInput
              :model-value="String(imapData.port)"
              @update:model-value="imapData.port = Number($event)"
              type="number"
              placeholder="993"
              :disabled="isLoading"
            />
          </FigFormGroup>
          
          <FigFormGroup label="Security">
            <FigSelect
              v-model="imapData.tls"
              :options="[
                { label: 'TLS/SSL', value: 'true' },
                { label: 'None', value: 'false' }
              ]"
              :disabled="isLoading"
            />
          </FigFormGroup>
        </div>
        
        <FigFormGroup 
          label="Username" 
          required
          :error="errors.imapUsername"
        >
          <FigInput
            v-model="imapData.username"
            placeholder="user@example.com"
            :disabled="isLoading"
          />
        </FigFormGroup>
        
        <FigFormGroup 
          label="Password" 
          required
          :error="errors.imapPassword"
        >
          <FigInput
            v-model="imapData.password"
            type="password"
            placeholder="App-specific password"
            :disabled="isLoading"
          />
        </FigFormGroup>
      </div>
    </template>
    
    <template #footer>
      <div class="flex items-center justify-between">
        <FigButton
          v-if="currentStep !== 'provider'"
          @click="previousStep"
          variant="ghost"
          color="neutral"
          :disabled="isLoading"
        >
          <Icon name="heroicons:arrow-left" class="h-4 w-4 mr-1" />
          Back
        </FigButton>
        <div v-else />
        
        <div class="flex items-center gap-3">
          <FigButton
            @click="close"
            variant="ghost"
            color="neutral"
            :disabled="isLoading"
          >
            Cancel
          </FigButton>
          
          <FigButton
            @click="nextStep"
            color="primary"
            :loading="isLoading"
            :disabled="!canProceed"
          >
            {{ nextButtonLabel }}
            <Icon v-if="currentStep !== 'imap'" name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </FigButton>
        </div>
      </div>
    </template>
  </FigModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  FigModal, 
  FigButton, 
  FigFormGroup, 
  FigInput, 
  FigSelect,
  FigAlert,
  FigCheckbox,
  FigBadge
} from '@figgy/ui'

// Props & Emits
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

// Composables
const $trpc = useTrpc()
const toast = useToast()

// State
type Step = 'provider' | 'configuration' | 'imap'
const currentStep = ref<Step>('provider')
const isLoading = ref(false)
const connectionId = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const newSenderEmail = ref('')
const availableProviders = ref<Record<string, { available: boolean; name: string; description: string }>>({
  gmail: { available: true, name: 'Gmail', description: 'Connect your Gmail account' },
  outlook: { available: true, name: 'Outlook', description: 'Connect your Outlook or Office 365 account' },
  imap: { available: true, name: 'IMAP', description: 'Connect any email account with IMAP support' }
})

const formData = ref({
  provider: '' as 'gmail' | 'outlook' | 'imap' | '',
  emailAddress: '',
  folderFilter: [] as string[],
  senderFilter: [] as string[],
  subjectFilter: [] as string[]
})

const imapData = ref({
  host: '',
  port: 993,
  tls: 'true' as string,
  username: '',
  password: ''
})

// Constants
const providers = [
  {
    value: 'gmail',
    label: 'Gmail',
    description: 'Connect with Google OAuth',
    icon: 'logos:google-gmail',
    bgColor: 'bg-red-100',
    iconColor: 'text-red-600'
  },
  {
    value: 'outlook',
    label: 'Outlook / Office 365',
    description: 'Connect with Microsoft OAuth',
    icon: 'logos:microsoft-icon',
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    value: 'imap',
    label: 'Other Email (IMAP)',
    description: 'Connect using IMAP credentials',
    icon: 'heroicons:envelope',
    bgColor: 'bg-neutral-100',
    iconColor: 'text-neutral-600'
  }
]

const folderOptions = [
  { label: 'INBOX', value: 'INBOX' },
  { label: 'Receipts', value: 'Receipts' },
  { label: 'Invoices', value: 'Invoices' },
  { label: 'Purchases', value: 'Purchases' },
  { label: 'Expenses', value: 'Expenses' }
]

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const modalTitle = computed(() => {
  switch (currentStep.value) {
    case 'provider':
      return 'Connect Email Account'
    case 'configuration':
      return 'Configure Email Settings'
    case 'imap':
      return 'IMAP Configuration'
    default:
      return 'Add Email Connection'
  }
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 'provider':
      return !!formData.value.provider
    case 'configuration':
      return !!formData.value.emailAddress && isValidEmail(formData.value.emailAddress)
    case 'imap':
      return !!(
        imapData.value.host &&
        imapData.value.port &&
        imapData.value.username &&
        imapData.value.password
      )
    default:
      return false
  }
})

const nextButtonLabel = computed(() => {
  switch (currentStep.value) {
    case 'provider':
      return 'Continue'
    case 'configuration':
      return formData.value.provider === 'imap' ? 'Next' : 'Connect'
    case 'imap':
      return 'Connect'
    default:
      return 'Continue'
  }
})

// Methods
async function fetchAvailableProviders() {
  try {
    const providers = await $trpc.email.getAvailableProviders.query()
    availableProviders.value = providers
  } catch (error) {
    console.error('Failed to fetch available providers:', error)
  }
}

function selectProvider(provider: 'gmail' | 'outlook' | 'imap') {
  const providerInfo = availableProviders.value[provider]
  if (providerInfo && !providerInfo.available) {
    toast.add({
      title: 'Provider Not Available',
      description: `${providerInfo.name} integration is not configured. Please contact your administrator.`,
      color: 'warning' as const,
    })
    return
  }
  formData.value.provider = provider as 'gmail' | 'outlook' | 'imap' | ''
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function nextStep() {
  errors.value = {}
  
  if (currentStep.value === 'provider') {
    currentStep.value = 'configuration'
  } else if (currentStep.value === 'configuration') {
    await createConnection()
  } else if (currentStep.value === 'imap') {
    await saveIMAPCredentials()
  }
}

function previousStep() {
  if (currentStep.value === 'imap') {
    currentStep.value = 'configuration'
  } else if (currentStep.value === 'configuration') {
    currentStep.value = 'provider'
  }
}

async function createConnection() {
  try {
    isLoading.value = true
    
    if (formData.value.provider !== 'imap') {
      // For OAuth providers, skip email connection creation and go directly to OAuth
      const redirectUri = `${window.location.origin}/settings/oauth-callback`
      
      // Store email configuration in localStorage for after OAuth
      localStorage.setItem('pending_email_config', JSON.stringify({
        emailAddress: formData.value.emailAddress,
        folderFilter: formData.value.folderFilter,
        senderFilter: formData.value.senderFilter,
        subjectFilter: formData.value.subjectFilter
      }))
      
      const { authUrl } = await $trpc.oauth.initiateOAuth.mutate({
        provider: formData.value.provider,
        redirectUrl: redirectUri,
        additionalScopes: [] // Email scopes are already included in the provider defaults
      })
      
      // Redirect to OAuth
      window.location.href = authUrl
    } else {
      // For IMAP, create email connection as before
      const result = await $trpc.email.createConnection.mutate({
        provider: formData.value.provider as 'gmail' | 'outlook' | 'imap',
        emailAddress: formData.value.emailAddress,
        folderFilter: formData.value.folderFilter,
        senderFilter: formData.value.senderFilter,
        subjectFilter: formData.value.subjectFilter
      })
      
      connectionId.value = result.connectionId
      // For IMAP, pre-fill username with email address
      imapData.value.username = formData.value.emailAddress
      // Set common IMAP settings based on email domain
      const domain = formData.value.emailAddress.split('@')[1]?.toLowerCase()
      if (domain?.includes('gmail.com')) {
        imapData.value.host = 'imap.gmail.com'
      } else if (domain?.includes('outlook.com') || domain?.includes('hotmail.com')) {
        imapData.value.host = 'outlook.office365.com'
      }
      currentStep.value = 'imap'
    }
  } catch (error: any) {
    console.error('Failed to create connection:', error)
    
    if (error.message?.includes('already exists')) {
      errors.value.emailAddress = 'This email is already connected'
    } else {
      toast.add({
        title: 'Connection Failed',
        description: error.message || 'Failed to create email connection',
        color: 'error' as const
      })
    }
  } finally {
    isLoading.value = false
  }
}

async function saveIMAPCredentials() {
  if (!connectionId.value) return
  
  try {
    isLoading.value = true
    
    await $trpc.email.setIMAPCredentials.mutate({
      connectionId: connectionId.value,
      host: imapData.value.host,
      port: imapData.value.port,
      username: imapData.value.username,
      password: imapData.value.password
    })
    
    toast.add({
      title: 'Success',
      description: 'Email account connected successfully',
      color: 'success' as const
    })
    
    emit('success')
    close()
  } catch (error: any) {
    console.error('Failed to save IMAP credentials:', error)
    
    if (error.message?.includes('Failed to connect')) {
      errors.value.imapPassword = 'Failed to connect. Check your credentials and server settings.'
    } else {
      toast.add({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to IMAP server',
        color: 'error' as const
      })
    }
  } finally {
    isLoading.value = false
  }
}

function close() {
  isOpen.value = false
  // Reset form after close animation
  setTimeout(() => {
    currentStep.value = 'provider'
    formData.value = {
      provider: '',
      emailAddress: '',
      folderFilter: [],
      senderFilter: [],
      subjectFilter: []
    }
    imapData.value = {
      host: '',
      port: 993,
      tls: 'true',
      username: '',
      password: ''
    }
    connectionId.value = null
    errors.value = {}
  }, 300)
}

// Lifecycle
onMounted(() => {
  fetchAvailableProviders()
})

// Watch for modal open/close
watch(isOpen, (newValue) => {
  if (newValue) {
    fetchAvailableProviders()
  } else {
    close()
  }
})

// Helper methods for folder and sender management
function toggleFolder(folder: string) {
  const index = formData.value.folderFilter.indexOf(folder)
  if (index > -1) {
    formData.value.folderFilter.splice(index, 1)
  } else {
    formData.value.folderFilter.push(folder)
  }
}

function addSender() {
  if (newSenderEmail.value && isValidEmail(newSenderEmail.value)) {
    if (!formData.value.senderFilter.includes(newSenderEmail.value)) {
      formData.value.senderFilter.push(newSenderEmail.value)
      newSenderEmail.value = ''
    }
  }
}

function removeSender(index: number) {
  formData.value.senderFilter.splice(index, 1)
}
</script>