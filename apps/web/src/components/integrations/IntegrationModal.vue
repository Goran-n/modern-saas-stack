<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-10" @close="handleClose">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <!-- Header -->
              <div class="bg-white px-6 py-4 border-b border-neutral-200">
                <div class="flex items-center justify-between">
                  <DialogTitle as="h3" class="text-lg font-semibold leading-6 text-neutral-900">
                    {{ isEditing ? `Edit ${integration?.name}` : 'Add Integration' }}
                  </DialogTitle>
                  <button
                    @click="handleClose"
                    class="rounded-md bg-white text-neutral-400 hover:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <XMarkIcon class="h-6 w-6" />
                  </button>
                </div>
                
                <!-- Step indicator -->
                <div v-if="!isEditing" class="mt-4">
                  <div class="flex items-center">
                    <div
                      v-for="(step, index) in steps"
                      :key="step.id"
                      class="flex items-center"
                    >
                      <div
                        :class="[
                          'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                          index < currentStep
                            ? 'bg-blue-600 text-white'
                            : index === currentStep
                            ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                            : 'bg-neutral-100 text-neutral-500'
                        ]"
                      >
                        {{ index + 1 }}
                      </div>
                      <div
                        v-if="index < steps.length - 1"
                        :class="[
                          'w-12 h-0.5 mx-2',
                          index < currentStep ? 'bg-blue-600' : 'bg-neutral-200'
                        ]"
                      />
                    </div>
                  </div>
                  <div class="mt-2 text-sm text-neutral-600">
                    {{ steps[currentStep]?.name }}
                  </div>
                </div>
              </div>

              <!-- Content -->
              <div class="bg-white px-6 py-6">
                <!-- Error display -->
                <div v-if="error" class="mb-4 rounded-md bg-red-50 p-4">
                  <div class="flex">
                    <XCircleIcon class="h-5 w-5 text-red-400" />
                    <div class="ml-3">
                      <h3 class="text-sm font-medium text-red-800">Error</h3>
                      <div class="mt-2 text-sm text-red-700">
                        <p>{{ error }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 1: Configuration -->
                <div v-if="currentStep === 0 || isEditing" class="space-y-6">
                  <div>
                    <h4 class="text-lg font-medium text-neutral-900 mb-4">
                      {{ isEditing ? 'Integration Settings' : 'Configure Integration' }}
                    </h4>
                    
                    <!-- Integration name -->
                    <FormField 
                      label="Integration Name" 
                      required 
                      helper-text="A friendly name to identify this integration"
                      class="mb-6"
                    >
                      <BaseInput
                        id="integration-name"
                        v-model="form.name"
                        type="text"
                        required
                        :placeholder="selectedProvider?.name || 'My Integration'"
                      />
                    </FormField>

                    <!-- Sync frequency -->
                    <FormField label="Sync Frequency" class="mb-6">
                      <select
                        id="sync-frequency"
                        v-model="form.settings.syncFrequency"
                        class="mt-1 block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm h-10 px-3 py-2 bg-white text-neutral-900"
                      >
                        <option value="realtime">Real-time (if supported)</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </FormField>

                    <!-- Notifications -->
                    <FormField label="Notifications" class="mb-6">
                      <div class="space-y-3">
                        <label class="flex items-center">
                          <input
                            v-model="form.settings.notifications.onSync"
                            type="checkbox"
                            class="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 w-4 h-4"
                          />
                          <span class="ml-3 text-sm text-neutral-700">Notify when sync completes</span>
                        </label>
                        <label class="flex items-center">
                          <input
                            v-model="form.settings.notifications.onError"
                            type="checkbox"
                            class="rounded border-neutral-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 w-4 h-4"
                          />
                          <span class="ml-3 text-sm text-neutral-700">Notify when errors occur</span>
                        </label>
                      </div>
                    </FormField>
                  </div>
                </div>

                <!-- Step 2: OAuth Connection (for new integrations) -->
                <div v-if="currentStep === 1 && !isEditing" class="space-y-6">
                  <div class="text-center">
                    <div class="mx-auto h-12 w-12 text-primary-600 mb-4">
                      <LinkIcon class="w-full h-full" />
                    </div>
                    <h4 class="text-lg font-medium text-neutral-900 mb-2">Connect to Xero</h4>
                    <p class="text-sm text-neutral-600 mb-6">
                      You'll be redirected to Xero to authorise the connection. 
                      This allows us to securely access your data.
                    </p>
                    
                    <div v-if="oauthProcessing" class="space-y-4">
                      <div class="animate-spin mx-auto h-8 w-8 border-b-2 border-primary-600 rounded-full"></div>
                      <p class="text-sm text-neutral-600">{{ oauthStatusMessage }}</p>
                    </div>
                    
                    <!-- Debug information -->
                    <div class="mt-4 p-3 bg-neutral-50 rounded text-xs text-left">
                      <p class="text-neutral-900"><strong>Debug Info:</strong></p>
                      <p class="text-neutral-700">Integration name: {{ form.name || 'Not set' }}</p>
                      <p class="text-neutral-700">Selected provider: {{ selectedProvider?.provider || 'None' }}</p>
                      <p class="text-neutral-700">OAuth processing: {{ oauthProcessing }}</p>
                      <p class="text-neutral-700">Can proceed: {{ canProceed }}</p>
                      <p class="text-neutral-700">Current step: {{ currentStep }}</p>
                      <p class="text-neutral-700">Is editing: {{ isEditing }}</p>
                    </div>
                    
                    <!-- Manual test button -->
                    <div class="mt-4 space-y-2">
                      <button
                        @click="testOAuthFlow"
                        class="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        🐛 Test OAuth Flow
                      </button>
                      <button
                        @click="testOAuthURL"
                        class="px-4 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                      >
                        🔗 Test OAuth URL Generation
                      </button>
                      <button
                        @click="testSkipToOrganisationSelection"
                        class="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        🔄 Skip to Organisation Selection
                      </button>
                      <button
                        @click="debugOAuthState"
                        class="px-4 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                      >
                        🔍 Debug OAuth State
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Organisation Selection (for new integrations) -->
                <div v-if="currentStep === 2 && !isEditing" class="space-y-6">
                  <AccountSelector
                    v-model="selectedOrganisationId"
                    :organisations="availableOrganisations"
                    :loading="organisationsLoading"
                    :error="error || undefined"
                    @selection-changed="handleOrganisationSelection"
                  />
                </div>
              </div>

              <!-- Footer -->
              <div class="bg-gray-50 px-6 py-3 flex justify-between">
                <button
                  v-if="currentStep > 0 && !isEditing"
                  @click="previousStep"
                  :disabled="loading"
                  class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon class="h-4 w-4 mr-1" />
                  Back
                </button>
                <div v-else></div>

                <div class="flex space-x-3">
                  <button
                    @click="handleClose"
                    :disabled="loading || oauthProcessing"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  
                  <button
                    v-if="isEditing"
                    @click="handleUpdate"
                    :disabled="loading || !isFormValid"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span v-if="loading" class="mr-2">
                      <div class="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                    </span>
                    Update Integration
                  </button>
                  
                  <button
                    v-else-if="currentStep < steps.length - 1"
                    @click="nextStep"
                    :disabled="!canProceed"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ChevronRightIcon class="h-4 w-4 ml-1" />
                  </button>
                  
                  <button
                    v-else-if="currentStep === 1"
                    @click="handleConnect"
                    :disabled="loading || oauthProcessing || !canProceed"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span v-if="loading || oauthProcessing" class="mr-2">
                      <div class="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                    </span>
                    Connect to Xero
                  </button>
                  
                  <button
                    v-else-if="currentStep === 2"
                    @click="handleCompleteIntegration"
                    :disabled="loading || !canProceed"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span v-if="loading" class="mr-2">
                      <div class="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                    </span>
                    Complete Integration
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline'

import ProviderIcon from './ProviderIcon.vue'
import AccountSelector from './AccountSelector.vue'
import BaseInput from '../ui/BaseInput.vue'
import FormField from '../form/FormField.vue'
import { useIntegrations } from '../../composables/useIntegrations'
import { useOAuth } from '../../composables/useOAuth'
import { useIntegrationStore } from '../../stores/integration'

import type { 
  Integration, 
  SupportedProvider, 
  IntegrationProvider,
  IntegrationSettings,
  SyncFrequency
} from '@kibly/shared-types'

interface Props {
  isOpen: boolean
  integration?: Integration
}

interface Emits {
  (e: 'close'): void
  (e: 'created', integration: Integration): void
  (e: 'updated', integration: Integration): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Router
const route = useRoute()

// Composables
const { supportedProviders, updateIntegration, loading, error: integrationError } = useIntegrations()
const { 
  startOAuthFlow, 
  isProcessing: oauthProcessing, 
  getOAuthStatusMessage,
  fetchAvailableOrganisations,
  completeOAuthWithOrganisation,
  oauthState,
  cleanup: cleanupOAuth
} = useOAuth()

// Local state
const currentStep = ref(0)
const selectedProvider = ref<SupportedProvider | null>(null)
const selectedOrganisationId = ref<string>('')
const organisationsLoading = ref(false)
const localError = ref<string | null>(null)
const form = ref({
  name: '',
  settings: {
    syncFrequency: 'daily' as SyncFrequency,
    notifications: {
      onSync: true,
      onError: true
    }
  }
})

// Computed
const isEditing = computed(() => !!props.integration)

const steps = [
  { id: 'configure', name: 'Configure Settings' },
  { id: 'connect', name: 'Connect to Xero' },
  { id: 'select-organisation', name: 'Select Organisation' }
]

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return !!form.value.name.trim()
  }
  if (currentStep.value === 2) {
    return !!selectedOrganisationId.value
  }
  return true
})

const isFormValid = computed(() => {
  if (isEditing.value) {
    return !!form.value.name.trim()
  }
  return !!form.value.name.trim() && !!selectedOrganisationId.value
})

const availableOrganisations = computed(() => oauthState.value?.availableOrganisations || [])

const oauthStatusMessage = computed(() => getOAuthStatusMessage())

const error = computed(() => localError.value || integrationError.value)

// Methods - auto-select Xero since it's the only provider
const selectXeroProvider = () => {
  const xeroProvider = supportedProviders.value.find((p: any) => p.provider === 'xero')
  if (xeroProvider) {
    selectedProvider.value = xeroProvider
    // Set default integration name
    if (!form.value.name) {
      form.value.name = 'Xero Integration'
    }
  }
}

const getProviderCapabilities = (provider: SupportedProvider) => {
  const caps = provider.capabilities
  const result: string[] = []
  
  if (caps.read.length > 0) result.push('Read')
  if (caps.write.length > 0) result.push('Write')
  if (caps.webhook) result.push('Webhooks')
  if (caps.realtime) result.push('Real-time')
  
  return result.slice(0, 3)
}

const nextStep = async () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    
    // If advancing to organisation selection step, check if we need to fetch organisations
    if (currentStep.value === 2) {
      console.log('🔍 Advanced to organisation selection step, checking for organisations...')
      console.log('Available organisations:', availableOrganisations.value)
      console.log('OAuth state:', oauthState.value)
      
      // If no organisations available, try to fetch them from localStorage or OAuth state
      if (!availableOrganisations.value || availableOrganisations.value.length === 0) {
        console.log('🔄 No organisations available, checking sources...')
        
        // First check if we have them in localStorage
        const storedState = localStorage.getItem('oauth_state')
        let codeToUse = oauthState.value?.code
        let stateToUse = oauthState.value?.state
        
        if (storedState) {
          try {
            const parsedState = JSON.parse(storedState)
            console.log('📦 Found localStorage state for organisation fetching:', parsedState)
            
            if (parsedState.code && parsedState.state) {
              codeToUse = parsedState.code
              stateToUse = parsedState.state
              console.log('✅ Using code/state from localStorage')
            }
          } catch (err) {
            console.error('❌ Failed to parse localStorage state:', err)
          }
        }
        
        if (codeToUse && stateToUse) {
          console.log('🔄 Fetching organisations with code/state...')
          try {
            organisationsLoading.value = true
            await fetchAvailableOrganisations(codeToUse, stateToUse)
            console.log('✅ Successfully fetched organisations via nextStep')
          } catch (err) {
            console.error('❌ Failed to fetch organisations via nextStep:', err)
            localError.value = 'Failed to load available organisations. Please try the integration setup again.'
          } finally {
            organisationsLoading.value = false
          }
        } else {
          console.log('⚠️ No code/state available for fetching organisations')
          localError.value = 'No OAuth parameters available. Please restart the integration setup.'
        }
      }
    }
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const testOAuthURL = async () => {
  console.log('🔗 Testing OAuth URL generation...')
  
  try {
    // Call the backend directly to get the OAuth URL
    const { supportedProviders } = useIntegrations()
    console.log('Supported providers:', supportedProviders.value)
    
    // Try to get the auth URL from the integration store
    const integrationStore = useIntegrationStore()
    const authUrl = await integrationStore.startOAuthFlow('xero', form.value.name, form.value.settings)
    
    console.log('✅ OAuth URL generated:', authUrl)
    console.log('🔗 Opening URL in new tab for inspection...')
    
    // Open the URL in a new tab so we can see where it goes
    window.open(authUrl.authUrl, '_blank')
    
  } catch (err) {
    console.error('❌ OAuth URL generation failed:', err)
    localError.value = `Failed to generate OAuth URL: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

const testOAuthFlow = async () => {
  console.log('🐛 Testing OAuth flow with detailed logging...')
  console.log('Form data:', form.value)
  console.log('Selected provider:', selectedProvider.value)
  console.log('OAuth processing state:', oauthProcessing.value)
  
  try {
    // Test if we can call window.open directly
    const testPopup = window.open('about:blank', 'test', 'width=600,height=700')
    if (testPopup) {
      console.log('✅ Popup window opened successfully')
      testPopup.close()
    } else {
      console.error('❌ Popup blocked by browser')
      localError.value = 'Popup blocker is preventing OAuth window from opening. Please disable popup blockers.'
      return
    }
    
    // Now try the actual OAuth flow
    await handleConnect()
  } catch (err) {
    console.error('🐛 Test OAuth flow failed:', err)
  }
}

const testSkipToOrganisationSelection = async () => {
  console.log('🔄 Testing skip to organisation selection...')
  
  // Check if we have organisations in localStorage
  const storedState = localStorage.getItem('oauth_state')
  if (storedState) {
    try {
      const parsedState = JSON.parse(storedState)
      console.log('📦 Found stored OAuth state:', parsedState)
      
      if (parsedState.availableOrganisations && parsedState.availableOrganisations.length > 0) {
        console.log('✅ Found organisations, advancing to step 2')
        currentStep.value = 2
        selectXeroProvider()
        
        // Restore the state
        const integrationStore = useIntegrationStore()
        integrationStore.updateOAuthState(parsedState)
        
        if (parsedState.integrationName) {
          form.value.name = parsedState.integrationName
        }
      } else {
        console.log('⚠️ No organisations found in stored state')
        localError.value = 'No organisations found. Please complete the OAuth flow first.'
      }
    } catch (err) {
      console.error('❌ Failed to parse stored OAuth state:', err)
      localError.value = 'Invalid stored OAuth state. Please start the integration setup again.'
    }
  } else {
    console.log('⚠️ No stored OAuth state found')
    localError.value = 'No OAuth state found. Please complete the OAuth flow first.'
  }
}

const debugOAuthState = () => {
  console.log('🔍 OAuth State Debug Information:')
  console.log('Current step:', currentStep.value)
  console.log('OAuth state from store:', oauthState.value)
  console.log('Available organisations:', availableOrganisations.value)
  console.log('Selected organisation ID:', selectedOrganisationId.value)
  
  const storedState = localStorage.getItem('oauth_state')
  if (storedState) {
    try {
      const parsedState = JSON.parse(storedState)
      console.log('localStorage OAuth state:', parsedState)
    } catch (err) {
      console.error('Failed to parse localStorage OAuth state:', err)
    }
  } else {
    console.log('No OAuth state in localStorage')
  }
}

const handleConnect = async () => {
  if (!selectedProvider.value) {
    selectXeroProvider() // Auto-select Xero if not already selected
  }
  
  if (!selectedProvider.value) {
    localError.value = 'Unable to select Xero provider. Please try again.'
    return
  }

  try {
    console.log('Starting OAuth flow for Xero...')
    console.log('Provider:', selectedProvider.value)
    console.log('Integration name:', form.value.name)
    console.log('Settings:', form.value.settings)
    
    // Start OAuth flow but don't complete integration yet
    const result = await startOAuthFlow(
      'xero', // Always use Xero since it's the only provider
      form.value.name,
      form.value.settings as IntegrationSettings
    )
    
    console.log('OAuth flow completed:', result)
    
    // Check if this requires organisation selection
    if (result && (result as any).requiresOrganisationSelection) {
      console.log('✅ OAuth completed successfully - waiting for organisation selection via redirect flow')
      // The OAuthCallback.vue component will handle the rest
      return
    }
    
    // For other providers that complete immediately
    if (result && !(result as any).requiresOrganisationSelection) {
      // Integration was completed, close modal
      emit('created', result as Integration)
    }
  } catch (oauthError) {
    console.error('OAuth flow failed:', oauthError)
    console.error('Error details:', {
      message: oauthError instanceof Error ? oauthError.message : 'Unknown error',
      stack: oauthError instanceof Error ? oauthError.stack : 'No stack trace',
      oauthError
    })
    
    // Provide user-friendly error messages
    if (oauthError instanceof Error) {
      if (oauthError.message.includes('popup')) {
        localError.value = 'Unable to open OAuth window. Please disable popup blockers and try again.'
      } else if (oauthError.message.includes('cancelled')) {
        localError.value = 'OAuth process was cancelled. Please try again to connect to Xero.'
      } else {
        localError.value = `Connection failed: ${oauthError.message}`
      }
    } else {
      localError.value = 'An unexpected error occurred while connecting to Xero. Please try again.'
    }
  }
}

const handleUpdate = async () => {
  if (!props.integration) return

  try {
    const updated = await updateIntegration(props.integration.id, {
      name: form.value.name,
      settings: form.value.settings as IntegrationSettings
    })
    
    emit('updated', {
      ...props.integration!,
      ...updated,
      capabilities: props.integration!.capabilities
    } as Integration)
  } catch (error) {
    console.error('Failed to update integration:', error)
  }
}

const handleOrganisationSelection = (organisationId: string) => {
  selectedOrganisationId.value = organisationId
}

const handleCompleteIntegration = async () => {
  if (!selectedOrganisationId.value) {
    console.error('No organisation selected')
    return
  }

  if (!oauthState.value?.code || !oauthState.value?.state) {
    console.error('Missing OAuth state')
    return
  }

  try {
    const integration = await completeOAuthWithOrganisation(form.value.name, selectedOrganisationId.value)
    
    // Transform backend response to include capabilities
    const integrationWithCapabilities = {
      ...integration as any,
      capabilities: {
        read: ['transactions', 'contacts', 'invoices', 'accounts'],
        write: ['contacts', 'invoices'],
        webhook: true,
        realtime: true,
        fileUpload: true,
        batchOperations: true
      }
    } as Integration
    
    emit('created', integrationWithCapabilities)
  } catch (error) {
    console.error('Failed to complete integration:', error)
  }
}

const handleClose = () => {
  emit('close')
}

const resetForm = () => {
  currentStep.value = 0
  selectedProvider.value = null
  selectedOrganisationId.value = ''
  organisationsLoading.value = false
  localError.value = null
  form.value = {
    name: '',
    settings: {
      syncFrequency: 'daily' as SyncFrequency,
      notifications: {
        onSync: true,
        onError: true
      }
    }
  }
}

// Watchers
watch(() => props.isOpen, async (isOpen) => {
  console.log('🔍 IntegrationModal isOpen changed:', isOpen)
  
  if (isOpen && props.integration) {
    // Populate form for editing
    form.value.name = props.integration.name
    form.value.settings = {
      syncFrequency: (props.integration.settings.syncFrequency || 'daily') as SyncFrequency,
      notifications: {
        onSync: props.integration.settings.notifications?.onSync ?? true,
        onError: props.integration.settings.notifications?.onError ?? true
      }
    }
  } else if (isOpen && !props.integration) {
    // Check if we're returning from OAuth callback
    if (route.query.step === 'select-organisation') {
      console.log('🔍 OAuth callback detected in modal, checking state...')
      console.log('Route query:', route.query)
      console.log('OAuth state:', oauthState.value)
      
      currentStep.value = 2 // Jump to organisation selection step
      selectXeroProvider()
      
      // If we have OAuth state, populate the form
      if (oauthState.value?.integrationName) {
        form.value.name = oauthState.value.integrationName
        console.log('✅ Populated form with OAuth state data')
      }
      
      // If organisations are available, we're ready to proceed
      if (oauthState.value?.availableOrganisations && oauthState.value.availableOrganisations.length > 0) {
        console.log('✅ Organisations already available:', oauthState.value.availableOrganisations)
      } else {
        // If organisations aren't loaded yet, try to fetch them using the query parameters
        const code = route.query.code as string
        const state = route.query.state as string
        
        if (code && state) {
          console.log('🔄 Fetching organisations using URL parameters...')
          try {
            organisationsLoading.value = true
            await fetchAvailableOrganisations(code, state)
            console.log('✅ Successfully fetched organisations from URL parameters')
          } catch (err) {
            console.error('❌ Failed to fetch organisations from URL parameters:', err)
            localError.value = 'Failed to load available organisations. Please try the integration setup again.'
          } finally {
            organisationsLoading.value = false
          }
        } else {
          console.log('⚠️ No code/state in URL, cannot fetch organisations')
          localError.value = 'Missing OAuth parameters. Please try the integration setup again.'
        }
      }
    }
  } else if (!isOpen) {
    resetForm()
  }
})

// Lifecycle
onMounted(() => {
  // Auto-select Xero provider
  selectXeroProvider()
  
  // Initialize form if editing
  if (isEditing.value && props.integration) {
    form.value.name = props.integration.name
    form.value.settings = {
      syncFrequency: (props.integration.settings.syncFrequency || 'daily') as SyncFrequency,
      notifications: {
        onSync: props.integration.settings.notifications?.onSync ?? true,
        onError: props.integration.settings.notifications?.onError ?? true
      }
    }
  }
})

onUnmounted(() => {
  cleanupOAuth()
})
</script>