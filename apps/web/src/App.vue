<template>
  <div id="app">
    <nav
      v-if="showNavigation"
      class="bg-slate-100 border-b border-slate-200"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 justify-between">
          <div class="flex">
            <div class="flex flex-shrink-0 items-center">
              <router-link to="/" class="text-xl font-bold text-slate-900 hover:text-slate-700">
                Kibly
              </router-link>
            </div>
            <div
              v-if="currentWorkspace"
              class="ml-6 flex items-center space-x-6"
            >
              <nav class="flex space-x-4">
                <router-link
                  to="/"
                  class="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md"
                  :class="{ 'bg-slate-200 text-slate-900': route.path === '/' }"
                >
                  Home
                </router-link>
                <router-link
                  to="/accounts"
                  class="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md"
                  :class="{ 'bg-slate-200 text-slate-900': route.path.startsWith('/accounts') }"
                >
                  Accounts
                </router-link>
                <router-link
                  to="/contacts"
                  class="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md"
                  :class="{ 'bg-slate-200 text-slate-900': route.path.startsWith('/contacts') }"
                >
                  Contacts
                </router-link>
                <router-link
                  to="/integrations"
                  class="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md"
                  :class="{ 'bg-slate-200 text-slate-900': route.path.startsWith('/integrations') }"
                >
                  Integrations
                </router-link>
              </nav>
              <div class="border-l border-slate-300 h-6"></div>
              <span class="text-sm text-slate-600">{{ currentWorkspace.name }}</span>
            </div>
          </div>
          <div
            v-if="isAuthenticated"
            class="flex items-center space-x-4"
          >
            <span class="text-sm text-slate-600">{{ userEmail }}</span>
            <button
              class="text-sm text-slate-600 hover:text-slate-900"
              @click="handleSignOut"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main :class="showNavigation ? 'mx-auto max-w-7xl py-6 sm:px-6 lg:px-8' : ''">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useWorkspaceStore } from './stores/workspace'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const userEmail = computed(() => authStore.userEmail)
const currentWorkspace = computed(() => workspaceStore.currentWorkspace)

// Hide navigation on auth pages
const showNavigation = computed(() => {
  return !route.path.startsWith('/auth')
})

const handleSignOut = async () => {
  await authStore.signOut()
  workspaceStore.clearWorkspaceData()
  router.push('/auth/login')
}
</script>