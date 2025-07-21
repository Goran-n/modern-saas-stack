<template>
  <UApp class="min-h-screen bg-slate-50">
    <!-- Header -->
    <header class="w-full bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div class="flex justify-between items-center h-16 w-full px-4 sm:px-6 lg:px-8">
        <!-- Logo and Navigation -->
        <div class="flex items-center space-x-8">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center space-x-2">
            <UAvatar size="sm" class="bg-primary-600">
              <span class="text-white font-bold text-lg">K</span>
            </UAvatar>
            <span class="text-xl font-semibold text-slate-900">Kibly</span>
          </NuxtLink>
          
          <!-- Main Navigation -->
          <nav class="hidden md:flex items-center space-x-1">
            <NuxtLink 
              v-for="item in navigationItems" 
              :key="item.to"
              :to="item.to"
              class="px-3 py-2 text-sm font-medium rounded-md transition-colors text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              active-class="bg-slate-100 text-slate-900"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>

        <!-- User Menu -->
        <div class="flex items-center">
          <UserDropdown />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <UMain>
      <slot />
    </UMain>
  </UApp>
</template>

<script setup lang="ts">
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
</script>