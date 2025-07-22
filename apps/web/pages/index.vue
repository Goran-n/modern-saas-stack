<template>
  <UContainer class="py-12">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">
        Welcome to Figgy
      </h1>
      <p class="text-xl text-muted mb-8">
        Hello, {{ userName }}! You've successfully signed in.
      </p>
      
      <UCard class="max-w-md mx-auto">
        <template #header>
          <div class="text-center">
            <UAvatar size="xl" class="mx-auto mb-4 bg-success-100">
              <UIcon name="i-heroicons-check-circle" class="text-2xl text-success" />
            </UAvatar>
            <h3 class="text-lg font-semibold mb-2">
              Authentication Complete
            </h3>
            <p class="text-muted text-sm">
              You're now signed in and ready to start building your application.
            </p>
          </div>
        </template>
        
        <div class="space-y-3">
          <div class="flex items-center text-sm text-muted">
            <UIcon name="i-heroicons-user" class="w-4 h-4 mr-2 text-primary" />
            {{ user?.email }}
          </div>
          <div class="flex items-center text-sm text-muted">
            <UIcon name="i-heroicons-clock" class="w-4 h-4 mr-2 text-primary" />
            Signed in at {{ signInTime }}
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

// Use Supabase user composable directly
const user = useSupabaseUser()

const userName = computed(() => {
  const email = user.value?.email || 'User'
  return email.split('@')[0]
})

const signInTime = computed(() => {
  return new Date().toLocaleTimeString()
})
</script>