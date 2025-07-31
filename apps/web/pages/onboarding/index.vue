<template>
  <div class="min-h-screen flex">
    <!-- Left Panel - Form Content -->
    <div class="w-full lg:w-[45%] flex flex-col">
      <!-- Header with Logo -->
      <div class="p-8">
        <NuxtLink to="/" class="inline-flex items-center">
          <img 
            src="/logo.png" 
            alt="Figgy logo" 
            class="h-8 w-auto"
          />
        </NuxtLink>
      </div>

      <!-- Main Content -->
      <div class="flex-1 px-8 lg:px-16 py-8 overflow-y-auto">
        <OnboardingContent />
      </div>
    </div>

    <!-- Right Panel - Dynamic Content -->
    <div class="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-primary-50 to-primary-100">
      <div class="flex-1 flex items-center justify-center p-16">
        <OnboardingRightPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OnboardingContent from '~/components/organisms/OnboardingContent.vue'
import OnboardingRightPanel from '~/components/organisms/OnboardingRightPanel.vue'

// Set the layout
definePageMeta({
  layout: 'onboarding',
  middleware: 'auth'
})

// Check if onboarding is already completed and redirect
const tenantStore = useTenantStore()
const router = useRouter()

onMounted(async () => {
  // If onboarding is already completed, redirect to dashboard
  if (tenantStore.onboardingCompleted) {
    await router.push('/')
  }
})
</script>