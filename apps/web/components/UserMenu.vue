<template>
  <UDropdown :items="items" :ui="{ width: 'w-48' }">
    <template #default>
      <UButton
        color="neutral"
        variant="ghost"
        class="flex items-center space-x-2"
      >
        <UAvatar
          :alt="user?.email || 'User'"
          size="xs"
        >
          <span class="text-xs font-medium">{{ userInitials }}</span>
        </UAvatar>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ userName }}
        </span>
      </UButton>
    </template>

    <template #account>
      <div class="px-3 py-2">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ user?.email || 'Guest' }}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Signed in
        </p>
      </div>
    </template>

    <template #item="{ item }">
      <div class="flex items-center space-x-2 w-full">
        <UIcon
          v-if="item.icon"
          :name="item.icon"
          class="w-4 h-4 flex-shrink-0"
          :class="item.iconClass"
        />
        <span class="flex-1 truncate">{{ item.label }}</span>
      </div>
    </template>
  </UDropdown>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const { auth } = useNotifications()

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
  [{
    label: 'Sign out',
    icon: 'i-heroicons-arrow-left-on-rectangle',
    iconClass: 'text-red-500',
    click: async () => await signOut()
  }]
])

async function signOut() {
  try {
    await authStore.signOut()
    await navigateTo('/auth/login')
    
    auth.signOutSuccess()
  } catch (error) {
    auth.signOutFailed(error instanceof Error ? error.message : undefined)
  }
}
</script>