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
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <BaseInput
              id="email"
              v-model="formData.email"
              type="email"
              placeholder="Enter your email"
              autocomplete="email"
              :error="validationErrors.email"
              @blur="validateField('email')"
            />
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <BaseInput
              id="password"
              v-model="formData.password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              :error="validationErrors.password"
              @blur="validateField('password')"
            />
          </div>
        </div>

        <div
          v-if="authError"
          class="text-red-600 text-sm p-3 bg-red-50 border border-red-200 rounded-md"
        >
          {{ authError }}
        </div>

        <div>
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :disabled="loading || !isFormValid"
            :loading="loading"
            class="w-full"
          >
            Sign in
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
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { createValidator, required, email, minLength } from '@/utils/validation'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const formData = reactive({
  email: '',
  password: ''
})

const validationErrors = reactive({
  email: '',
  password: ''
})

const loading = ref(false)
const authError = ref('')

const validators = {
  email: createValidator([
    required('Email is required'),
    email('Please enter a valid email address')
  ]),
  password: createValidator([
    required('Password is required'),
    minLength(6, 'Password must be at least 6 characters')
  ])
}

const isFormValid = computed(() => {
  return formData.email && formData.password && 
         !validationErrors.email && !validationErrors.password
})

function validateField(field: keyof typeof formData) {
  const result = validators[field](formData[field])
  validationErrors[field] = result.errors[0] || ''
}

function validateForm(): boolean {
  let isValid = true
  
  for (const field of Object.keys(validators) as Array<keyof typeof validators>) {
    validateField(field)
    if (validationErrors[field]) {
      isValid = false
    }
  }
  
  return isValid
}

async function handleSubmit() {
  authError.value = ''
  
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    await authStore.signIn(formData.email, formData.password)
    router.push('/')
  } catch (err) {
    authError.value = (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>