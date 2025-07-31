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

    <form @submit="handleSubmit" class="space-y-4">
      <FigFormField 
        label="Email" 
        :error="errors.email"
        required
      >
        <FigInput 
          v-model="state.email" 
          type="email" 
          placeholder="Enter your email"
          size="lg"
          autofocus
          @blur="validateField('email')"
        />
      </FigFormField>

      <FigFormField 
        label="Password" 
        :error="errors.password"
        required
      >
        <FigInput 
          v-model="state.password" 
          type="password" 
          placeholder="Enter your password"
          size="lg"
          @blur="validateField('password')"
        />
      </FigFormField>

      <div class="flex items-center justify-between">
        <FigCheckbox 
          v-model="state.remember" 
          label="Remember me"
        />
        <NuxtLink 
          to="/auth/forgot-password" 
          class="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Forgot password?
        </NuxtLink>
      </div>

      <FigButton 
        type="submit" 
        class="w-full"
        size="lg"
        :loading="isLoading"
      >
        Sign In
      </FigButton>
    </form>

    <FigDivider label="or continue with" class="my-6" />

    <FigButton
      class="w-full"
      size="lg"
      color="neutral"
      variant="outline"
      @click="signInWithProvider"
    >
      <NuxtIcon name="simple-icons:google" class="w-4 h-4 mr-2" />
      Continue with Google
    </FigButton>

    <p class="text-center text-sm text-slate-500">
      New to Figgy?
      <NuxtLink to="/auth/signup" class="font-medium text-primary-600 hover:text-primary-700">
        Create an account
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { FigButton, FigInput, FigFormField, FigCheckbox, FigDivider } from '@figgy/ui';
import { z } from 'zod'
import { reactive } from 'vue'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const authStore = useAuthStore()
const { auth, general } = useNotifications()
const router = useRouter()

const isLoading = ref(false)
const errors = reactive<Record<string, string | undefined>>({
  email: undefined,
  password: undefined
})

// Check if coming from extension
const isFromExtension = ref(false)
const extensionCallbackUrl = ref<string | null>(null)

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  isFromExtension.value = urlParams.get('source') === 'extension'
  extensionCallbackUrl.value = urlParams.get('callback')
  
  if (isFromExtension.value) {
    // Extension login detected
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

function validateField(field: keyof Schema) {
  try {
    const fieldSchema = {
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      remember: z.boolean()
    }[field];
    
    fieldSchema.parse(state.value[field]);
    errors[field] = undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors[field] = error.issues[0]?.message || 'Invalid input';
    }
  }
}

function validateForm(): boolean {
  // Clear errors
  Object.keys(errors).forEach(key => {
    errors[key] = undefined;
  });
  
  try {
    schema.parse(state.value);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
    }
    return false;
  }
}

function handleSubmit(event: Event) {
  event.preventDefault();
  onSubmit();
}

async function onSubmit() {
  if (!validateForm()) {
    return;
  }
  
  const formData = state.value;
  try {
    isLoading.value = true
    await authStore.signIn(formData.email, formData.password)
    
    auth.signInSuccess()
    
    if (isFromExtension.value && extensionCallbackUrl.value) {
      // Redirecting to extension callback
      
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
      
      // Session data to pass
      
      // Small delay to show the success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect back to extension callback page with session data
      const redirectUrl = `${extensionCallbackUrl.value}?auth_success=true&session=${encodeURIComponent(JSON.stringify(sessionData))}&timestamp=${Date.now()}`
      // Final redirect URL
      window.location.href = redirectUrl
    } else {
      await router.push('/')
    }
  } catch (error) {
    // Login error
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