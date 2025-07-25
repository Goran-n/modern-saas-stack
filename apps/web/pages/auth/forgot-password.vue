<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-2">
      Forgot your password?
    </h2>
    <p class="text-gray-600 mb-8">
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
const { auth } = useNotifications()
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
    
    auth.passwordResetSent()
    
    // Redirect back to login after a delay
    setTimeout(() => {
      router.push('/auth/login')
    }, 3000)
  } catch (error) {
    auth.passwordResetFailed(error instanceof Error ? error.message : undefined)
  } finally {
    isLoading.value = false
  }
}
</script>