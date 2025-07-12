<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-slate-900">
        Create your account
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        Get started with your free account
      </p>
    </div>

    <UForm :schema="schema" :state="state" @submit="onSubmit" class="space-y-4">
      <UFormField name="email" label="Email">
        <UInput 
          v-model="state.email" 
          type="email" 
          placeholder="Enter your email"
          size="lg"
          class="w-full"
          autofocus
        />
      </UFormField>

      <UFormField name="password" label="Password">
        <UInput 
          v-model="state.password" 
          type="password" 
          placeholder="Create a password"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField name="confirmPassword" label="Confirm Password">
        <UInput 
          v-model="state.confirmPassword" 
          type="password" 
          placeholder="Confirm your password"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField name="terms">
        <UCheckbox 
          v-model="state.terms" 
          label="I agree to the Terms and Privacy Policy"
        />
      </UFormField>

      <UButton 
        type="submit" 
        block 
        size="lg"
        :loading="isLoading"
      >
        Create account
      </UButton>
    </UForm>

    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-slate-200"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-white text-slate-500">or continue with</span>
      </div>
    </div>

    <UButton
      block
      size="lg"
      color="neutral"
      variant="outline"
      @click="signUpWithProvider"
    >
      <template #leading>
        <UIcon name="i-simple-icons-google" class="w-4 h-4" />
      </template>
      Continue with Google
    </UButton>

    <p class="text-center text-sm text-slate-500">
      Already have an account?
      <ULink to="/auth/login" class="font-medium text-primary-600 hover:text-primary-700">
        Sign in
      </ULink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'auth'
})

const authStore = useAuthStore()
const { auth, general } = useNotifications()
const router = useRouter()

const isLoading = ref(false)

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  terms: z.boolean()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
}).refine((data) => data.terms, {
  message: "You must accept the terms and conditions",
  path: ["terms"]
})

type Schema = z.output<typeof schema>

const state = ref<Schema>({
  email: '',
  password: '',
  confirmPassword: '',
  terms: false
})

async function onSubmit(event: { data: Schema }) {
  try {
    isLoading.value = true
    await authStore.signUp(event.data.email, event.data.password)
    
    auth.signUpSuccess()
    
    // Redirect to login
    await router.push('/auth/login')
  } catch (error) {
    auth.signUpFailed(error instanceof Error ? error.message : undefined)
  } finally {
    isLoading.value = false
  }
}

async function signUpWithProvider() {
  try {
    general.comingSoon('Google sign-up')
  } catch (error) {
    general.error('Error', error instanceof Error ? error.message : undefined)
  }
}
</script>