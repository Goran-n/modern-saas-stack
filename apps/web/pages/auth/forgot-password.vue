<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
      Forgot your password?
    </h2>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      No worries, we'll send you reset instructions.
    </p>

    <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-4">
      <UFormGroup label="Email" name="email">
        <UInput 
          v-model="state.email" 
          type="email" 
          placeholder="Enter your email"
          size="lg"
          icon="i-heroicons-envelope"
          autofocus
        />
      </UFormGroup>

      <UButton 
        type="submit" 
        block 
        size="lg"
        :loading="isLoading"
      >
        Send reset instructions
      </UButton>
    </UForm>

    <div class="mt-8 text-center">
      <ULink to="/auth/login" class="text-sm text-primary-600 hover:text-primary-500">
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4 mr-1" />
        Back to sign in
      </ULink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'auth'
})

const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()

const schema = z.object({
  email: z.string().email('Invalid email address')
})

type Schema = z.output<typeof schema>

const state = ref<Schema>({
  email: ''
})

const isLoading = ref(false)

async function onSubmit(event: { data: Schema }) {
  try {
    isLoading.value = true
    await authStore.resetPassword(event.data.email)
    
    toast.add({
      title: 'Check your email',
      description: 'We sent you a password reset link.',
      icon: 'i-heroicons-check-circle',
      color: 'success'
    })
    
    // Redirect back to login after a delay
    setTimeout(() => {
      router.push('/auth/login')
    }, 3000)
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to send reset email',
      icon: 'i-heroicons-exclamation-circle',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>