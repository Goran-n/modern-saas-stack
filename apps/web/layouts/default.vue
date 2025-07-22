<template>
  <UApp class="min-h-screen bg-canvas">
    <!-- Header -->
    <header class="w-full bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div class="flex justify-between items-center h-16 w-full px-4 sm:px-6 lg:px-8">
        <!-- Logo and Navigation -->
        <div class="flex items-center space-x-8">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center space-x-2">
            <UAvatar size="sm" class="bg-primary">
              <span class="text-white font-bold text-lg">K</span>
            </UAvatar>
            <span class="text-xl font-semibold">Figgy</span>
          </NuxtLink>
          
          <!-- Main Navigation -->
          <nav class="hidden md:flex items-center space-x-1">
            <NuxtLink 
              v-for="item in navigationItems" 
              :key="item.to"
              :to="item.to"
              class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-muted hover:text-primary hover:bg-primary-50"
              active-class="bg-primary-50 text-primary font-semibold"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Right side: User Menu and Mobile Menu -->
        <div class="flex items-center space-x-4">
          <!-- Mobile menu button -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <UIcon 
              :name="mobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" 
              class="h-6 w-6"
            />
          </button>
          
          <!-- User Menu -->
          <UserDropdown />
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
          class="block px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 text-muted hover:text-primary hover:bg-primary-50"
          active-class="bg-primary-50 text-primary font-semibold"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>

    <!-- Main Content -->
    <UMain>
      <slot />
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
const mobileMenuOpen = ref(false)

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
    label: 'Communications',
    to: '/communications'
  }
]

// Close mobile menu on route change
const route = useRoute()
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})
</script>