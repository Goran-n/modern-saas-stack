<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-neutral-900">
          Create your account
        </h2>
      </div>
      <form
        class="mt-8 space-y-6"
        @submit.prevent="handleSubmit"
      >
        <div class="space-y-4">
          <FormField
            label="Full name"
            required
          >
            <BaseInput
              v-model="fullName"
              type="text"
              placeholder="Enter your full name"
              autocomplete="name"
              required
            />
          </FormField>

          <FormField
            label="Email address"
            required
            :error-message="error && error.includes('email') ? error : undefined"
          >
            <BaseInput
              v-model="email"
              type="email"
              placeholder="Enter your email"
              autocomplete="email"
              required
              :error-message="error && error.includes('email') ? error : undefined"
            />
          </FormField>

          <FormField
            label="Password"
            required
            helper-text="Must be at least 8 characters long"
            :error-message="error && error.includes('password') ? error : undefined"
          >
            <BaseInput
              v-model="password"
              type="password"
              placeholder="Create a password"
              autocomplete="new-password"
              required
              :error-message="error && error.includes('password') ? error : undefined"
            />
          </FormField>
        </div>

        <div
          v-if="error && !error.includes('email') && !error.includes('password')"
          class="text-error-600 text-sm p-3 bg-error-50 border border-error-200 rounded-md"
        >
          {{ error }}
        </div>

        <div
          v-if="success"
          class="text-success-600 text-sm p-3 bg-success-50 border border-success-200 rounded-md"
        >
          {{ success }}
        </div>

        <div>
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :disabled="loading"
            :loading="loading"
            class="w-full"
          >
            {{ loading ? 'Creating account...' : 'Create account' }}
          </BaseButton>
        </div>

        <div class="text-center">
          <router-link
            to="/auth/login"
            class="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Already have an account? Sign in
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import BaseInput from '../../components/ui/BaseInput.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import FormField from '../../components/form/FormField.vue'

const authStore = useAuthStore()

const fullName = ref('')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const loading = ref(false)

const handleSubmit = async () => {
  if (!email.value || !password.value || !fullName.value) return

  loading.value = true
  error.value = null
  success.value = null

  try {
    await authStore.signUp(email.value, password.value, fullName.value)
    success.value = 'Account created! Please check your email to verify your account.'
    
    // Clear form
    fullName.value = ''
    email.value = ''
    password.value = ''
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>