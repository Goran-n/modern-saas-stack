<template>
  <nav class="sticky top-0 z-50 bg-canvas-light/95 backdrop-blur-sm border-b border-neutral-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <a href="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">F</span>
            </div>
            <span class="text-xl font-bold text-neutral-800">Figgy</span>
          </a>
        </div>

        <!-- Desktop Navigation -->
        <div class="hidden md:flex items-center space-x-8">
          <a href="#features" class="text-neutral-600 hover:text-neutral-900 font-medium transition-colors">
            Features
          </a>
          <a href="#how-it-works" class="text-neutral-600 hover:text-neutral-900 font-medium transition-colors">
            How it Works
          </a>
          <a href="#integrations" class="text-neutral-600 hover:text-neutral-900 font-medium transition-colors">
            Integrations
          </a>
          <a href="#pricing" class="text-neutral-600 hover:text-neutral-900 font-medium transition-colors">
            Pricing
          </a>
        </div>

        <!-- CTA Buttons -->
        <div class="hidden md:flex items-center space-x-4">
          <a 
            href="/auth/login" 
            class="text-neutral-700 hover:text-neutral-900 font-medium transition-colors"
          >
            Sign In
          </a>
          <a 
            href="/auth/signup" 
            class="inline-flex items-center px-4 py-2 rounded-lg bg-secondary-500 text-white font-medium hover:bg-secondary-600 transition-colors shadow-subtle"
          >
            Get Started Free
          </a>
        </div>

        <!-- Mobile menu button -->
        <div class="md:hidden">
          <button 
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <Icon :name="mobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-neutral-100">
      <div class="px-4 py-4 space-y-3 bg-canvas-light">
        <a href="#features" class="block px-3 py-2 text-neutral-600 hover:text-neutral-900 font-medium">
          Features
        </a>
        <a href="#how-it-works" class="block px-3 py-2 text-neutral-600 hover:text-neutral-900 font-medium">
          How it Works
        </a>
        <a href="#integrations" class="block px-3 py-2 text-neutral-600 hover:text-neutral-900 font-medium">
          Integrations
        </a>
        <a href="#pricing" class="block px-3 py-2 text-neutral-600 hover:text-neutral-900 font-medium">
          Pricing
        </a>
        <div class="pt-4 border-t border-neutral-100 space-y-3">
          <a href="/auth/login" class="block px-3 py-2 text-neutral-700 hover:text-neutral-900 font-medium">
            Sign In
          </a>
          <a href="/auth/signup" class="block px-3 py-2 bg-secondary-500 text-white text-center rounded-lg font-medium hover:bg-secondary-600">
            Get Started Free
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const mobileMenuOpen = ref(false)
</script>