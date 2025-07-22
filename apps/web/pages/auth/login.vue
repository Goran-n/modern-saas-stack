<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-semibold text-slate-900">
        Welcome back
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        {{ isFromExtension ? 'Sign in to enable browser extension features' : 'Sign in to continue to Figgy' }}
      </p>
      <div v-if="isFromExtension" class="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Browser Extension Login
      </div>
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

    <UDivider label="or continue with" />

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
      New to Figgy?
      <ULink to="/auth/signup" class="font-medium text-primary-600 hover:text-primary-700">
        Create an account
      </ULink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const authStore = useAuthStore()
const { auth, general } = useNotifications()
const router = useRouter()

const isLoading = ref(false)

// Check if coming from extension
const isFromExtension = ref(false)
const extensionCallbackUrl = ref<string | null>(null)

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  isFromExtension.value = urlParams.get('source') === 'extension'
  extensionCallbackUrl.value = urlParams.get('callback')
  
  if (isFromExtension.value) {
    console.log('Extension login detected', { callbackUrl: extensionCallbackUrl.value })
  }
})

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
    
    if (isFromExtension.value && extensionCallbackUrl.value) {
      console.log('Redirecting to extension callback', { callbackUrl: extensionCallbackUrl.value })
      
      // Show success message before redirecting
      general.success('Success!', 'Redirecting back to browser extension...')
      
      // Get the session data to pass to extension
      const supabaseClient = useSupabaseClient()
      const { data: sessionResponse } = await supabaseClient.auth.getSession()
      const currentSession = sessionResponse?.session
      
      const sessionData = currentSession ? {
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
        expires_at: currentSession.expires_at,
        user: currentSession.user
      } : null
      
      console.log('Session data to pass:', sessionData)
      
      // Small delay to show the success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect back to extension callback page with session data
      const redirectUrl = `${extensionCallbackUrl.value}?auth_success=true&session=${encodeURIComponent(JSON.stringify(sessionData))}&timestamp=${Date.now()}`
      console.log('Final redirect URL:', redirectUrl)
      window.location.href = redirectUrl
    } else {
      await router.push('/')
    }
  } catch (error) {
    console.error('Login error:', error)
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