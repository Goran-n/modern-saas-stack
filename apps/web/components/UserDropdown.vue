<template>
  <UDropdown
    :items="items"
    :ui="{ item: { disabled: 'cursor-text select-text' }, width: 'w-64' }"
    :popper="{ placement: 'right-start' }"
  >
    <template #default="slotProps">
      <UButton
        color="neutral"
        variant="ghost"
        class="w-full justify-start"
        :class="[slotProps?.open ? 'bg-gray-100 dark:bg-gray-800' : '']"
      >
        <UAvatar
          :alt="user?.email || 'User'"
          size="xs"
        >
          <span class="text-xs font-medium">{{ userInitials }}</span>
        </UAvatar>

        <div class="flex-1 text-left min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
            {{ userName }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ user?.email || 'Guest' }}
          </p>
        </div>

        <UIcon
          name="i-heroicons-chevron-up-down-20-solid"
          class="w-4 h-4 text-gray-400 flex-shrink-0"
        />
      </UButton>
    </template>

    <template #account>
      <div class="px-2 py-2">
        <p class="text-xs font-medium text-gray-900 dark:text-white">
          {{ user?.email || 'Guest' }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Free Plan
        </p>
      </div>
    </template>

    <template #item="{ item }">
      <div class="flex items-center gap-2 w-full">
        <UIcon
          v-if="item.icon"
          :name="item.icon"
          class="w-4 h-4 flex-shrink-0"
          :class="item.iconClass"
        />

        <span class="flex-1 truncate">{{ item.label }}</span>

        <span 
          v-if="item.shortcuts?.length"
          class="flex items-center gap-0.5"
        >
          <kbd 
            v-for="(shortcut, index) in item.shortcuts" 
            :key="index"
            class="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded"
          >
            {{ shortcut }}
          </kbd>
        </span>
      </div>
    </template>
  </UDropdown>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const colorMode = useColorMode()
const { auth, general } = useNotifications()

// Use Supabase user composable directly
const user = useSupabaseUser()

const userName = computed(() => {
  const email = user.value?.email || 'Guest'
  return email.split('@')[0]
})

const userInitials = computed(() => {
  const name = userName.value
  return name.substring(0, 2).toUpperCase()
})

const items = computed(() => [
  [{
    slot: 'account',
    disabled: true
  }],
  // User section
  [{
    label: 'View profile',
    icon: 'i-heroicons-user-circle',
    click: () => navigateTo('/profile')
  }, {
    label: 'Account settings',
    icon: 'i-heroicons-cog-6-tooth',
    shortcuts: ['⌘', 'S'],
    click: () => navigateTo('/settings/account')
  }, {
    label: 'Billing',
    icon: 'i-heroicons-credit-card',
    click: () => navigateTo('/settings/billing')
  }],
  // Theme section
  [{
    label: colorMode.value === 'dark' ? 'Light mode' : 'Dark mode',
    icon: colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon',
    iconClass: 'text-yellow-500 dark:text-yellow-400',
    shortcuts: ['⌘', 'T'],
    click: () => toggleColorMode()
  }],
  // Support section
  [{
    label: 'Documentation',
    icon: 'i-heroicons-book-open',
    click: () => window.open('https://docs.kibly.com', '_blank')
  }, {
    label: 'Support',
    icon: 'i-heroicons-lifebuoy',
    click: () => window.open('https://support.kibly.com', '_blank')
  }, {
    label: 'Changelog',
    icon: 'i-heroicons-megaphone',
    click: () => window.open('https://changelog.kibly.com', '_blank')
  }],
  // Actions section
  [{
    label: 'Sign out',
    icon: 'i-heroicons-arrow-left-on-rectangle',
    iconClass: 'text-red-500',
    shortcuts: ['⌘', 'Q'],
    click: async () => await signOut()
  }]
])

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  
  general.info(`Switched to ${colorMode.value} mode`, undefined)
}

async function signOut() {
  try {
    await authStore.signOut()
    await navigateTo('/auth/login')
    
    auth.signOutSuccess()
  } catch (error) {
    auth.signOutFailed(error instanceof Error ? error.message : undefined)
  }
}

// Keyboard shortcuts
defineShortcuts({
  'cmd-s': () => navigateTo('/settings/account'),
  'cmd-t': () => toggleColorMode(),
  'cmd-q': async () => await signOut()
})
</script>