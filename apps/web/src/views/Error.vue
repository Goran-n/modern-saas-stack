<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="text-center">
        <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100">
          <ExclamationTriangleIcon class="h-12 w-12 text-red-600" />
        </div>
        
        <h2 class="mt-6 text-3xl font-extrabold text-neutral-900">
          {{ title }}
        </h2>
        
        <p class="mt-2 text-base text-neutral-600">
          {{ message }}
        </p>
        
        <div class="mt-6 space-y-3">
          <button
            @click="retry"
            v-if="showRetry"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Try again
          </button>
          
          <router-link
            :to="{ name: 'Home' }"
            class="inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Go to home
          </router-link>
          
          <div class="text-sm">
            <button
              @click="goBack"
              class="text-primary-600 hover:text-primary-500"
            >
              <span aria-hidden="true">&larr;</span>
              Go back
            </button>
          </div>
        </div>
        
        <!-- Error details for development -->
        <div v-if="isDevelopment && errorDetails" class="mt-8">
          <details class="text-left bg-neutral-100 rounded-lg p-4">
            <summary class="cursor-pointer text-sm font-medium text-neutral-900">
              Error details
            </summary>
            <pre class="mt-2 text-xs text-neutral-600 overflow-auto">{{ errorDetails }}</pre>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

interface Props {
  title?: string
  message?: string
  showRetry?: boolean
  errorDetails?: any
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Something went wrong',
  message: 'An unexpected error occurred. Please try again later.',
  showRetry: true
})

const router = useRouter()
const route = useRoute()

const isDevelopment = computed(() => import.meta.env.DEV)

const retry = () => {
  // Reload the current route
  router.go(0)
}

const goBack = () => {
  router.back()
}

// Handle route query parameters for dynamic error messages
const title = computed(() => route.query.title as string || props.title)
const message = computed(() => route.query.message as string || props.message)
</script>