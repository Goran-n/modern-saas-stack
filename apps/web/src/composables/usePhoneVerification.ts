import { ref, computed } from 'vue'
import { useToast } from './useToast'
import { trpc } from '../lib/trpc'

/**
 * Composable for handling phone number verification flow
 * Used in WhatsApp setup and similar verification processes
 */
export function usePhoneVerification() {
  const { showToast } = useToast()
  
  // State
  const isProcessing = ref(false)
  const channelId = ref<string | null>(null)
  const resendCooldown = ref(0)
  const resendTimer = ref<NodeJS.Timeout | null>(null)
  
  // Form errors
  const errors = ref({
    phone_number: '',
    verification_code: ''
  })

  /**
   * Validate phone number format
   */
  const validatePhoneNumber = (phoneNumber: string): boolean => {
    errors.value.phone_number = ''
    
    if (!phoneNumber) {
      errors.value.phone_number = 'Phone number is required'
      return false
    }
    
    // Basic international phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(phoneNumber)) {
      errors.value.phone_number = 'Please enter a valid international phone number'
      return false
    }
    
    return true
  }

  /**
   * Send verification code to phone number
   */
  const sendVerificationCode = async (phoneNumber: string, channelName?: string): Promise<string | null> => {
    if (!validatePhoneNumber(phoneNumber)) return null
    
    isProcessing.value = true
    errors.value.phone_number = ''
    
    try {
      const result = await trpc.userChannel.registerWhatsApp.mutate({
        phoneNumber,
        channelName
      })
      
      channelId.value = result.id
      startResendCooldown()
      
      showToast({
        title: 'Verification code sent',
        description: 'Check your WhatsApp messages',
        type: 'success'
      })
      
      return result.id
    } catch (error: any) {
      errors.value.phone_number = error.message || 'Failed to send verification code'
      showToast({
        title: 'Error',
        description: error.message || 'Failed to send verification code',
        type: 'error'
      })
      return null
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Verify the code entered by user
   */
  const verifyCode = async (verificationCode: string): Promise<boolean> => {
    if (!channelId.value) {
      errors.value.verification_code = 'No verification in progress'
      return false
    }
    
    if (verificationCode.length !== 6) {
      errors.value.verification_code = 'Code must be 6 digits'
      return false
    }
    
    isProcessing.value = true
    errors.value.verification_code = ''
    
    try {
      await trpc.userChannel.verifyPhone.mutate({
        channelId: channelId.value,
        verificationCode
      })
      
      showToast({
        title: 'Success!',
        description: 'Your phone number has been verified',
        type: 'success'
      })
      
      return true
    } catch (error: any) {
      errors.value.verification_code = error.message || 'Invalid verification code'
      showToast({
        title: 'Verification failed',
        description: error.message || 'Invalid verification code',
        type: 'error'
      })
      return false
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Resend verification code
   */
  const resendCode = async (): Promise<boolean> => {
    if (resendCooldown.value > 0 || !channelId.value) return false
    
    isProcessing.value = true
    
    try {
      await trpc.userChannel.resendVerification.mutate({
        channelId: channelId.value
      })
      
      startResendCooldown()
      showToast({
        title: 'Code resent',
        description: 'Check your WhatsApp messages',
        type: 'success'
      })
      return true
    } catch (error: any) {
      showToast({
        title: 'Error',
        description: error.message || 'Failed to resend code',
        type: 'error'
      })
      return false
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Start cooldown timer for resending code
   */
  const startResendCooldown = () => {
    resendCooldown.value = 60
    
    if (resendTimer.value) {
      clearInterval(resendTimer.value)
    }
    
    resendTimer.value = setInterval(() => {
      resendCooldown.value--
      if (resendCooldown.value <= 0) {
        if (resendTimer.value) {
          clearInterval(resendTimer.value)
          resendTimer.value = null
        }
      }
    }, 1000)
  }

  /**
   * Reset verification state
   */
  const reset = () => {
    channelId.value = null
    errors.value = {
      phone_number: '',
      verification_code: ''
    }
    resendCooldown.value = 0
    
    if (resendTimer.value) {
      clearInterval(resendTimer.value)
      resendTimer.value = null
    }
  }

  // Computed
  const canResend = computed(() => resendCooldown.value === 0)

  return {
    // State
    isProcessing,
    channelId,
    resendCooldown,
    errors,
    canResend,
    
    // Actions
    validatePhoneNumber,
    sendVerificationCode,
    verifyCode,
    resendCode,
    reset
  }
}