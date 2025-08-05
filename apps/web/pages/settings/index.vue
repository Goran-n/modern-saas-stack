<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
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
            <FigCard class="cursor-pointer hover:border-primary-300 transition-colors">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-primary-100 rounded-lg">
                  <Icon name="heroicons:building-office" class="h-6 w-6 text-primary-600" />
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

          <NuxtLink to="/settings/team" class="block">
            <FigCard class="cursor-pointer hover:border-primary-300 transition-colors">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-indigo-100 rounded-lg">
                  <Icon name="heroicons:user-group" class="h-6 w-6 text-indigo-600" />
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1">Team Management</h3>
                  <p class="text-sm text-gray-600">
                    Manage team members, roles, and send invitations
                  </p>
                </div>
              </div>
            </FigCard>
          </NuxtLink>

          <NuxtLink to="/settings/account" class="block">
            <FigCard class="cursor-pointer hover:border-primary-300 transition-colors">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-blue-100 rounded-lg">
                  <Icon name="heroicons:user-circle" class="h-6 w-6 text-blue-600" />
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
            <FigCard class="cursor-pointer hover:border-primary-300 transition-colors">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-green-100 rounded-lg">
                  <Icon name="heroicons:credit-card" class="h-6 w-6 text-green-600" />
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
            <FigCard class="cursor-pointer hover:border-primary-300 transition-colors">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-purple-100 rounded-lg">
                  <Icon name="heroicons:puzzle-piece" class="h-6 w-6 text-purple-600" />
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

          <NuxtLink to="/settings/vat" class="block">
            <FigCard class="cursor-pointer hover:border-primary-300 transition-colors">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-amber-100 rounded-lg">
                  <Icon name="heroicons:calculator" class="h-6 w-6 text-amber-600" />
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1">VAT Management</h3>
                  <p class="text-sm text-gray-600">
                    Manage VAT periods, submissions, and HMRC compliance
                  </p>
                </div>
              </div>
            </FigCard>
          </NuxtLink>
        </div>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { FigContainer, FigCard } from '@figgy/ui';

// Page metadata
definePageMeta({
  middleware: ['auth']
});
</script>