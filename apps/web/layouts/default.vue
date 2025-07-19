<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Simple Header -->
    <header class="bg-white shadow-sm border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo and Navigation -->
          <div class="flex items-center space-x-8">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">K</span>
              </div>
              <span class="text-xl font-semibold text-slate-900">Kibly</span>
            </NuxtLink>
            
            <!-- Main Navigation -->
            <nav class="hidden md:flex items-center space-x-4">
              <NuxtLink 
                to="/" 
                class="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                :class="{ 'bg-slate-100 text-slate-900': $route.path === '/' }"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink 
                to="/files" 
                class="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                :class="{ 'bg-slate-100 text-slate-900': $route.path.startsWith('/files') }"
              >
                Files
              </NuxtLink>
              <NuxtLink 
                to="/suppliers" 
                class="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                :class="{ 'bg-slate-100 text-slate-900': $route.path.startsWith('/suppliers') }"
              >
                Suppliers
              </NuxtLink>
            </nav>
          </div>

          <!-- User Menu -->
          <div class="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// Simple clean layout - no theme toggle needed
</script>