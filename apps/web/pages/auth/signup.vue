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

    <form @submit.prevent="onSubmit" class="space-y-4">
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
          placeholder="Create a password"
          size="lg"
          @blur="validateField('password')"
        />
      </FigFormField>

      <FigFormField 
        label="Confirm Password" 
        :error="errors.confirmPassword"
        required
      >
        <FigInput 
          v-model="state.confirmPassword" 
          type="password" 
          placeholder="Confirm your password"
          size="lg"
          @blur="validateField('confirmPassword')"
        />
      </FigFormField>

      <FigFormField :error="errors.terms">
        <FigCheckbox 
          v-model="state.terms" 
          label="I agree to the Terms and Privacy Policy"
        />
      </FigFormField>

      <FigButton 
        type="submit" 
        class="w-full"
        size="lg"
        :loading="isLoading"
      >
        Create account
      </FigButton>
    </form>

    <FigDivider label="or continue with" class="my-6" />

    <FigButton
      class="w-full"
      size="lg"
      color="neutral"
      variant="outline"
      @click="signUpWithProvider"
    >
      <Icon name="simple-icons:google" class="w-4 h-4 mr-2" />
      Continue with Google
    </FigButton>

    <p class="text-center text-sm text-slate-500">
      Already have an account?
      <NuxtLink to="/auth/login" class="font-medium text-primary-600 hover:text-primary-700">
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { FigButton, FigInput, FigFormField, FigCheckbox, FigDivider } from '@figgy/ui';
import { z } from 'zod'

definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const authStore = useAuthStore()
const { auth, general } = useNotifications()
const router = useRouter()

const isLoading = ref(false)
const errors = ref<Record<string, string>>({})

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

function validateField(field: keyof Schema) {
  try {
    if (field === 'confirmPassword') {
      if (state.value.password !== state.value.confirmPassword) {
        errors.value.confirmPassword = "Passwords don't match";
        return;
      }
    }
    
    const fieldSchemas = {
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string(),
      terms: z.boolean()
    };
    
    fieldSchemas[field].parse(state.value[field]);
    
    if (field === 'terms' && !state.value.terms) {
      errors.value.terms = 'You must accept the terms and conditions';
      return;
    }
    
    delete errors.value[field];
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.value[field] = error.issues[0]?.message || 'Invalid input';
    }
  }
}

function validateForm(): boolean {
  errors.value = {};
  
  try {
    schema.parse(state.value);
    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors.value[issue.path[0].toString()] = issue.message;
        }
      });
    }
    return false;
  }
}

async function onSubmit() {
  if (!validateForm()) {
    return;
  }
  
  const formData = state.value;
  try {
    isLoading.value = true
    await authStore.signUp(formData.email, formData.password)
    
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