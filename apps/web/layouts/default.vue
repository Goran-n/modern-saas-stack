<template>
  <FigApp class="min-h-screen bg-neutral-50">
    <!-- Header -->
    <header class="w-full bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo and Navigation -->
          <div class="flex items-center">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center focus:outline-none mr-10">
              <img 
                src="/logo.png" 
                alt="Kibly logo" 
                class="h-8 w-auto select-none"
                @error="handleLogoError"
              />
            </NuxtLink>
            
            <!-- Main Navigation -->
            <nav class="hidden md:flex items-center space-x-1">
              <NuxtLink 
                v-for="item in navigationItems" 
                :key="item.to"
                :to="item.to"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-neutral-600 hover:text-primary-600 hover:bg-primary-50"
                active-class="bg-primary-50 text-primary-600"
              >
                {{ item.label }}
              </NuxtLink>
            </nav>
          </div>

          <!-- Right side: Search, User Menu and Mobile Menu -->
          <div class="flex items-center gap-4">
            <!-- Global Search -->
            <div class="hidden md:block">
              <GlobalSearch />
            </div>
            
            <!-- User Menu -->
            <UserDropdown />
            
            <!-- Mobile menu button -->
            <button
              @click="mobileMenuOpen = !mobileMenuOpen"
              class="md:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <Icon 
                :name="mobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" 
                class="w-6 h-6"
              />
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Navigation Menu -->
    <div
      v-if="mobileMenuOpen"
      class="md:hidden fixed inset-0 top-16 z-40 bg-white border-t border-gray-200"
    >
      
      <nav class="px-4 py-6 space-y-1">
        <NuxtLink 
          v-for="item in navigationItems" 
          :key="item.to"
          :to="item.to"
          @click="mobileMenuOpen = false"
          class="block px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 text-neutral-600 hover:text-primary-600 hover:bg-primary-50"
          active-class="bg-primary-50 text-primary-600"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>

    <!-- Main Content -->
    <FigMain :padding="false">
      <slot />
    </FigMain>
  </FigApp>
</template>

<script setup lang="ts">
import { FigApp, FigMain } from '@figgy/ui';
import UserDropdown from '~/components/UserDropdown.vue';

const mobileMenuOpen = ref(false)

// Handle logo loading error
const handleLogoError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  // Try dark logo as fallback
  if (img.src.includes('/logo.png')) {
    img.src = '/logo-dark.svg';
  }
}

const navigationItems = [
  {
    label: 'Dashboard',
    to: '/'
  },
  {
    label: 'Files',
    to: '/files'
  },
  {
    label: 'Suppliers',
    to: '/suppliers'
  },
  {
    label: 'Settings',
    to: '/settings'
  }
]

// Close mobile menu on route change
const route = useRoute()
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})
</script>