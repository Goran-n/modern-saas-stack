<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-slate-900">
        Welcome back
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        Sign in to continue to Kibly
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
          placeholder="Enter your password"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <div class="flex items-center justify-between">
        <UCheckbox 
          v-model="state.remember" 
          label="Remember me"
        />
        <ULink 
          to="/auth/forgot-password" 
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          Forgot password?
        </ULink>
      </div>

      <UButton 
        type="submit" 
        block 
        size="lg"
        :loading="isLoading"
      >
        Sign In
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
      @click="signInWithProvider"
    >
      <template #leading>
        <UIcon name="i-simple-icons-google" class="w-4 h-4" />
      </template>
      Continue with Google
    </UButton>

    <p class="text-center text-sm text-slate-500">
      New to Kibly?
      <ULink to="/auth/signup" class="font-medium text-primary-600 hover:text-primary-700">
        Create an account
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
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().default(false)
})

type Schema = z.output<typeof schema>

const state = ref<Schema>({
  email: '',
  password: '',
  remember: false
})

async function onSubmit(event: { data: Schema }) {
  try {
    isLoading.value = true
    await authStore.signIn(event.data.email, event.data.password)
    
    auth.signInSuccess()
    
    await router.push('/')
  } catch (error) {
    auth.signInFailed(error instanceof Error ? error.message : undefined)
  } finally {
    isLoading.value = false
  }
}

async function signInWithProvider() {
  try {
    general.comingSoon('Google sign-in')
  } catch (error) {
    general.error('Error', error instanceof Error ? error.message : undefined)
  }
}
</script>