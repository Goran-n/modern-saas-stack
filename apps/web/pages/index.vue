<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-slate-900 mb-4">
          Welcome to Kibly
        </h1>
        <p class="text-xl text-slate-600 mb-8">
          Hello, {{ userName }}! You've successfully signed in.
        </p>
        
        <div class="bg-white rounded-xl shadow-sm p-8 max-w-md mx-auto ring-1 ring-slate-200">
          <div class="mb-6">
            <div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 mb-2">
              Authentication Complete
            </h3>
            <p class="text-slate-600 text-sm">
              You're now signed in and ready to start building your application.
            </p>
          </div>
          
          <div class="space-y-3">
            <div class="flex items-center text-sm text-slate-500">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              {{ user?.email }}
            </div>
            <div class="flex items-center text-sm text-slate-500">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Signed in at {{ signInTime }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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