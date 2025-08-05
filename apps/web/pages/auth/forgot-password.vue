<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-2">
      Forgot your password?
    </h2>
    <p class="text-gray-600 mb-8">
      No worries, we'll send you reset instructions.
    </p>

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

      <FigButton 
        type="submit" 
        class="w-full"
        size="lg"
        :loading="isLoading"
      >
        Send reset instructions
      </FigButton>
    </form>

    <div class="mt-8 text-center">
      <NuxtLink to="/auth/login" class="text-sm text-primary-600 hover:text-primary-500 inline-flex items-center">
        <Icon name="heroicons:arrow-left" class="w-4 h-4 mr-1" />
        Back to sign in
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FigButton, FigInput, FigFormField } from '@figgy/ui';
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
const errors = ref<Record<string, string>>({})

function validateField(field: keyof Schema) {
  try {
    const fieldSchema = z.string().email('Invalid email address');
    fieldSchema.parse(state.value[field]);
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
    await authStore.resetPassword(formData.email)
    
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