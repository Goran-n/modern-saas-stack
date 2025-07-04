<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="text-center">
        <h1 class="text-9xl font-bold text-neutral-300">404</h1>
        <h2 class="mt-4 text-3xl font-extrabold text-neutral-900">Page not found</h2>
        <p class="mt-2 text-base text-neutral-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
        
        <div class="mt-6 space-y-3">
          <router-link
            :to="{ name: 'Home' }"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Go back home
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>