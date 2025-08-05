<template>
  <FigDropdown
    :items="dropdownItems"
    class="inline-flex"
    content-class="w-56"
  >
    <template #trigger>
      <button
        class="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        :aria-label="`User menu for ${userName}`"
      >
        <FigAvatar
          :alt="user?.email || 'User'"
          size="sm"
          class="w-8 h-8"
        >
          <span class="text-xs font-medium">{{ userInitials }}</span>
        </FigAvatar>
      </button>
    </template>
    
    <template #header>
      <div class="px-3 py-3 border-b border-gray-200">
        <p class="text-sm font-medium text-gray-900">
          {{ user?.email || 'Guest' }}
        </p>
        <p class="text-xs text-gray-500 mt-1">
          Free Plan
        </p>
      </div>
    </template>
  </FigDropdown>
</template>

<script setup lang="ts">
import { FigAvatar, FigDropdown } from '@figgy/ui'
import type { DropdownMenuItem } from '@figgy/ui'
import { computed } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

// User info computed properties

const userName = computed(() => {
  if (user.value?.user_metadata?.full_name) {
    return user.value.user_metadata.full_name
  }
  if (user.value?.email) {
    return user.value.email.split('@')[0]
  }
  return 'User'
})

const userInitials = computed(() => {
  const name = userName.value
  return name
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

// Dropdown items
const dropdownItems = computed(() => [
  {
    id: 'view-account',
    label: 'View account',
    icon: 'heroicons:user-circle',
    onClick: () => router.push('/settings/account'),
  } as DropdownMenuItem,
  {
    id: 'settings',
    label: 'Settings',
    icon: 'heroicons:cog-6-tooth',
    shortcuts: ['⌘', ','],
    onClick: () => router.push('/settings'),
  } as DropdownMenuItem,
  {
    id: 'divider',
    divider: true,
  } as DropdownMenuItem,
  {
    id: 'sign-out',
    label: 'Sign out',
    icon: 'heroicons:arrow-left-on-rectangle',
    variant: 'destructive' as const,
    onClick: async () => {
      await supabase.auth.signOut()
      await router.push('/auth/login')
    },
  } as DropdownMenuItem,
])
</script>