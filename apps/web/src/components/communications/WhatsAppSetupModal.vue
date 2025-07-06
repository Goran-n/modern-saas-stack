<template>
  <BaseModal
    v-model:is-open="isOpen"
    title="Connect WhatsApp"
    size="md"
    :prevent-close="isProcessing"
  >
    <!-- Step indicators -->
    <div class="mb-6">
      <nav aria-label="Progress">
        <ol
          role="list"
          class="flex items-center"
        >
          <li
            v-for="(stepItem, stepIdx) in steps"
            :key="stepItem.name"
            :class="[stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '', 'relative']"
          >
            <template v-if="stepItem.status === 'complete'">
              <div
                class="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div class="h-0.5 w-full bg-primary-600" />
              </div>
              <div class="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary-600">
                <CheckIcon
                  class="h-5 w-5 text-white"
                  aria-hidden="true"
                />
              </div>
            </template>
            <template v-else-if="stepItem.status === 'current'">
              <div
                class="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div class="h-0.5 w-full bg-gray-200" />
              </div>
              <div
                class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary-600 bg-white"
                aria-current="step"
              >
                <span
                  class="h-2.5 w-2.5 rounded-full bg-primary-600"
                  aria-hidden="true"
                />
              </div>
            </template>
            <template v-else>
              <div
                class="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div class="h-0.5 w-full bg-gray-200" />
              </div>
              <div class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                <span
                  class="h-2.5 w-2.5 rounded-full bg-transparent"
                  aria-hidden="true"
                />
              </div>
            </template>
          </li>
        </ol>
      </nav>
    </div>

    <!-- Step content -->
    <div class="mt-8">
      <!-- Step 1: Phone Number -->
      <div
        v-if="currentStep === 0"
        class="space-y-4"
      >
        <div>
          <h3 class="text-lg font-medium text-gray-900">
            Enter your WhatsApp number
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            We'll send a verification code to this number via WhatsApp
          </p>
        </div>
        
        <PhoneNumberInput
          v-model="formData.phone_number"
          label="WhatsApp Phone Number"
          placeholder="Enter your phone number"
          :error="errors.phone_number"
          hint="Make sure this number is registered with WhatsApp"
        />

        <FormField
          label="Channel Name (optional)"
          helper-text="A friendly name to identify this channel"
        >
          <input
            v-model="formData.channel_name"
            type="text"
            placeholder="e.g. My WhatsApp"
            class="block w-full rounded-lg border-0 px-3.5 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
          >
        </FormField>
      </div>

      <!-- Step 2: Verification -->
      <div
        v-if="currentStep === 1"
        class="space-y-4"
      >
        <div>
          <h3 class="text-lg font-medium text-gray-900">
            Verify your number
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            We've sent a verification code to {{ formData.phone_number }}
          </p>
        </div>

        <FormField
          label="Verification Code"
          :error-message="errors.verification_code"
          helper-text="Check your WhatsApp messages for the code"
        >
          <input
            v-model="verificationCode"
            type="text"
            placeholder="Enter 6-digit code"
            maxlength="6"
            pattern="[0-9]*"
            inputmode="numeric"
            class="block w-full rounded-lg border-0 px-3.5 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            :class="{ 'ring-error-500': errors.verification_code }"
          >
        </FormField>

        <div class="flex items-center justify-between text-sm">
          <button
            type="button"
            class="text-primary-600 hover:text-primary-500"
            :disabled="resendCooldown > 0"
            @click="handleResendCode"
          >
            <template v-if="resendCooldown > 0">
              Resend code in {{ resendCooldown }}s
            </template>
            <template v-else>
              Resend code
            </template>
          </button>
        </div>
      </div>

      <!-- Step 3: Success -->
      <div
        v-if="currentStep === 2"
        class="space-y-4"
      >
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-100">
            <CheckIcon
              class="h-6 w-6 text-success-600"
              aria-hidden="true"
            />
          </div>
          <h3 class="mt-3 text-lg font-medium text-gray-900">
            WhatsApp Connected!
          </h3>
          <p class="mt-2 text-sm text-gray-500">
            Your WhatsApp number has been successfully connected
          </p>
        </div>

        <div class="rounded-md bg-gray-50 p-4">
          <h4 class="text-sm font-medium text-gray-900">
            Next steps:
          </h4>
          <ul class="mt-2 list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Save Kibly's WhatsApp number: <span class="font-medium">{{ KIBLY_WHATSAPP_NUMBER }}</span></li>
            <li>Send a PDF document to test the integration</li>
            <li>The system will automatically process and store your files</li>
            <li>You'll receive a confirmation message for each file received</li>
          </ul>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
        <BaseButton
          v-if="currentStep < 2"
          variant="secondary"
          :disabled="isProcessing"
          @click="handleCancel"
        >
          Cancel
        </BaseButton>
        
        <BaseButton
          v-if="currentStep === 0"
          variant="primary"
          :loading="isProcessing"
          :disabled="!canProceedToVerification"
          @click="sendVerification"
        >
          Send Verification Code
        </BaseButton>
        
        <BaseButton
          v-if="currentStep === 1"
          variant="secondary"
          :disabled="isProcessing"
          class="mr-auto sm:mr-0"
          @click="goBack"
        >
          Back
        </BaseButton>
        
        <BaseButton
          v-if="currentStep === 1"
          variant="primary"
          :loading="isProcessing"
          :disabled="!canVerify"
          @click="verifyCode"
        >
          Verify
        </BaseButton>
        
        <BaseButton
          v-if="currentStep === 2"
          variant="primary"
          @click="handleComplete"
        >
          Done
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CheckIcon } from '@heroicons/vue/24/outline'
import BaseModal from '../ui/BaseModal.vue'
import BaseButton from '../ui/BaseButton.vue'
import FormField from '../form/FormField.vue'
import PhoneNumberInput from './PhoneNumberInput.vue'
import { usePhoneVerification } from '../../composables/usePhoneVerification'
import { KIBLY_WHATSAPP_NUMBER } from '../../constants/conversation'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'success': [channelId: string]
}>()

// Use phone verification composable
const {
  isProcessing,
  channelId,
  resendCooldown,
  errors,
  canResend,
  validatePhoneNumber,
  sendVerificationCode,
  verifyCode: verifyPhoneCode,
  resendCode,
  reset: resetVerification
} = usePhoneVerification()

// Local state
const currentStep = ref(0)
const verificationCode = ref('')
const formData = ref({
  phone_number: '',
  channel_name: ''
})

const steps = computed(() => [
  { name: 'Phone Number', status: currentStep.value > 0 ? 'complete' : currentStep.value === 0 ? 'current' : 'upcoming' },
  { name: 'Verification', status: currentStep.value > 1 ? 'complete' : currentStep.value === 1 ? 'current' : 'upcoming' },
  { name: 'Complete', status: currentStep.value === 2 ? 'current' : 'upcoming' }
])

const canProceedToVerification = computed(() => {
  return formData.value.phone_number.length >= 10 // Basic validation
})

const canVerify = computed(() => {
  return verificationCode.value.length === 6
})

const isOpen = computed({
  get: () => props.isOpen,
  set: (value) => emit('update:isOpen', value)
})

watch(isOpen, (newVal) => {
  if (!newVal) {
    resetModal()
  }
})


const sendVerification = async () => {
  if (!validatePhoneNumber(formData.value.phone_number)) return
  
  const resultChannelId = await sendVerificationCode(
    formData.value.phone_number,
    formData.value.channel_name
  )
  
  if (resultChannelId) {
    currentStep.value = 1
  }
}

const verifyCode = async () => {
  if (!canVerify.value) return
  
  const success = await verifyPhoneCode(verificationCode.value)
  
  if (success) {
    currentStep.value = 2
  }
}

const handleResendCode = async () => {
  await resendCode()
}

const goBack = () => {
  currentStep.value = 0
  verificationCode.value = ''
}

const handleCancel = () => {
  if (!isProcessing.value) {
    isOpen.value = false
  }
}

const handleComplete = () => {
  if (channelId.value) {
    emit('success', channelId.value)
  }
  isOpen.value = false
}

const resetModal = () => {
  currentStep.value = 0
  formData.value = {
    phone_number: '',
    channel_name: ''
  }
  verificationCode.value = ''
  resetVerification()
}
</script>