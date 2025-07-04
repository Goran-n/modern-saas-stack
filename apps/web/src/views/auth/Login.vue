<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-neutral-900">
          Sign in to Kibly
        </h2>
      </div>
      <form
        class="mt-8 space-y-6"
        @submit.prevent="handleSubmit"
      >
        <div class="space-y-4">
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
            :error-message="error && error.includes('password') ? error : undefined"
          >
            <BaseInput
              v-model="password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
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

        <div>
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :disabled="loading"
            :loading="loading"
            class="w-full"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </BaseButton>
        </div>

        <div class="text-center">
          <router-link
            to="/auth/signup"
            class="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Don't have an account? Sign up
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import BaseInput from '../../components/ui/BaseInput.vue'
import BaseButton from '../../components/ui/BaseButton.vue'
import FormField from '../../components/form/FormField.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

const handleSubmit = async () => {
  if (!email.value || !password.value) return

  loading.value = true
  error.value = null

  try {
    await authStore.signIn(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>