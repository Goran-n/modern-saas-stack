<template>
  <div class="min-h-screen bg-gray-50">
    <FigContainer class="py-6">
      <div class="max-w-4xl mx-auto">
        <!-- Page Header -->
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
          <p class="mt-2 text-gray-600">
            Manage your account and company settings
          </p>
        </div>

        <!-- Settings Navigation -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NuxtLink to="/settings/company" class="block">
            <FigCard class="hover:shadow-lg transition-shadow cursor-pointer">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-primary-100 rounded-lg">
                  <FigIcon name="i-heroicons-building-office" size="lg" class="text-primary-600">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </FigIcon>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1">Company Configuration</h3>
                  <p class="text-sm text-gray-600">
                    Configure company details, addresses, VAT settings, and matching rules
                  </p>
                </div>
              </div>
            </FigCard>
          </NuxtLink>

          <NuxtLink to="/settings/account" class="block">
            <FigCard class="hover:shadow-lg transition-shadow cursor-pointer">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-blue-100 rounded-lg">
                  <FigIcon name="i-heroicons-user-circle" size="lg" class="text-blue-600">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </FigIcon>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1">Account Settings</h3>
                  <p class="text-sm text-gray-600">
                    Manage your personal account, profile, and preferences
                  </p>
                </div>
              </div>
            </FigCard>
          </NuxtLink>

          <NuxtLink to="/settings/billing" class="block">
            <FigCard class="hover:shadow-lg transition-shadow cursor-pointer">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-green-100 rounded-lg">
                  <FigIcon name="i-heroicons-credit-card" size="lg" class="text-green-600">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </FigIcon>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1">Billing & Subscription</h3>
                  <p class="text-sm text-gray-600">
                    View billing history, manage subscription and payment methods
                  </p>
                </div>
              </div>
            </FigCard>
          </NuxtLink>

          <NuxtLink to="/settings/integrations" class="block">
            <FigCard class="hover:shadow-lg transition-shadow cursor-pointer">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-purple-100 rounded-lg">
                  <FigIcon name="i-heroicons-puzzle-piece" size="lg" class="text-purple-600">
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  </FigIcon>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1">Integrations</h3>
                  <p class="text-sm text-gray-600">
                    Connect external services and manage API access
                  </p>
                </div>
              </div>
            </FigCard>
          </NuxtLink>
        </div>
      </div>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { FigContainer, FigCard, FigIcon } from '@figgy/ui';

// Page metadata
definePageMeta({
  middleware: ['auth']
});
</script>