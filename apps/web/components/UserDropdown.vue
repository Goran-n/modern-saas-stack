<template>
  <div ref="dropdownRef" class="relative">
    <FigButton
      color="neutral"
      variant="ghost"
      class="w-full justify-start"
      @click="isOpen = !isOpen"
    >
      <FigAvatar
        :alt="user?.email || 'User'"
        size="xs"
        class="flex-shrink-0"
      >
        <span class="text-xs font-medium">{{ userInitials }}</span>
      </FigAvatar>

      <div class="flex-1 text-left min-w-0">
        <p class="text-sm font-medium truncate">
          {{ userName }}
        </p>
        <p class="text-xs text-neutral-500 truncate">
          {{ user?.email || 'Guest' }}
        </p>
      </div>

      <FigIcon
        name="i-heroicons-chevron-up-down-20-solid"
        class="w-4 h-4 text-neutral-500 flex-shrink-0"
      />
    </FigButton>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 divide-y divide-neutral-100 z-50"
      >
        <!-- Account Section -->
        <div class="px-3 py-3">
          <p class="text-sm font-medium text-neutral-900">
            {{ user?.email || 'Guest' }}
          </p>
          <p class="text-xs text-neutral-500 mt-1">
            Free Plan
          </p>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <button
            v-for="item in items"
            :key="item.label"
            @click="handleItemClick(item)"
            class="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 transition-colors flex items-center gap-2"
            :class="[
              item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              item.iconClass
            ]"
            :disabled="item.disabled"
          >
            <FigIcon
              v-if="item.icon"
              :name="item.icon"
              class="w-4 h-4"
            />
            <span class="flex-1">{{ item.label }}</span>
            <span v-if="item.shortcuts?.length" class="text-xs text-neutral-400">
              {{ item.shortcuts.join(' ') }}
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { FigButton, FigAvatar, FigIcon } from '@figgy/ui'
import { ref, computed, watch, onUnmounted } from 'vue'

interface MenuItem {
  label: string
  icon?: string
  click?: () => void
  disabled?: boolean
  shortcuts?: string[]
  iconClass?: string
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()

// Handle click outside - use event handler approach
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

// Setup and cleanup click outside listener
watch(isOpen, (newValue) => {
  if (newValue) {
    document.addEventListener('click', handleClickOutside, true)
  } else {
    document.removeEventListener('click', handleClickOutside, true)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})

const userName = computed(() => {
  if (user.value?.user_metadata?.full_name) {
    return user.value.user_metadata.full_name
  }
  return user.value?.email?.split('@')[0] || 'User'
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

const items = computed<MenuItem[]>(() => [
  {
    label: 'View account',
    icon: 'i-heroicons-user-circle',
    click: () => console.log('View account'),
  },
  {
    label: 'Settings',
    icon: 'i-heroicons-cog-6-tooth',
    shortcuts: ['⌘', ','],
    click: () => console.log('Settings'),
  },
  {
    label: 'Sign out',
    icon: 'i-heroicons-arrow-left-on-rectangle',
    iconClass: 'text-red-500',
    click: async () => {
      await supabase.auth.signOut()
      await router.push('/auth/login')
    },
  },
])

const handleItemClick = (item: MenuItem) => {
  if (item.click && !item.disabled) {
    item.click()
  }
  isOpen.value = false
}
</script>