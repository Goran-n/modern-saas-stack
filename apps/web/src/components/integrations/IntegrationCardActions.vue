<template>
  <Menu as="div" class="relative">
    <MenuButton class="p-2 text-neutral-400 hover:text-neutral-600 transition-colors">
      <EllipsisHorizontalIcon class="w-5 h-5" />
    </MenuButton>
    
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <MenuItems class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
        <MenuItem v-if="canManage" v-slot="{ active }">
          <button
            @click="$emit('test-connection')"
            :class="[active ? 'bg-neutral-50' : '', 'flex w-full items-center px-4 py-2 text-sm text-neutral-700']"
            :disabled="loading"
          >
            <SignalIcon class="mr-3 h-4 w-4" />
            Test Connection
          </button>
        </MenuItem>
        
        <MenuItem v-if="canManage" v-slot="{ active }">
          <button
            @click="$emit('sync', 'incremental')"
            :class="[active ? 'bg-neutral-50' : '', 'flex w-full items-center px-4 py-2 text-sm text-neutral-700']"
            :disabled="loading || !isActive"
          >
            <ArrowPathIcon class="mr-3 h-4 w-4" />
            Quick Sync
          </button>
        </MenuItem>
        
        <MenuItem v-if="canManage" v-slot="{ active }">
          <button
            @click="$emit('sync', 'full')"
            :class="[active ? 'bg-neutral-50' : '', 'flex w-full items-center px-4 py-2 text-sm text-neutral-700']"
            :disabled="loading || !isActive"
          >
            <ArrowPathIcon class="mr-3 h-4 w-4" />
            Full Sync
          </button>
        </MenuItem>
        
        <MenuItem v-if="canManage" v-slot="{ active }">
          <button
            @click="$emit('view-sync-jobs')"
            :class="[active ? 'bg-neutral-50' : '', 'flex w-full items-center px-4 py-2 text-sm text-neutral-700']"
          >
            <ClockIcon class="mr-3 h-4 w-4" />
            View Sync History
          </button>
        </MenuItem>
        
        <MenuItem v-if="canUpdate" v-slot="{ active }">
          <button
            @click="$emit('edit')"
            :class="[active ? 'bg-neutral-50' : '', 'flex w-full items-center px-4 py-2 text-sm text-neutral-700']"
          >
            <PencilIcon class="mr-3 h-4 w-4" />
            Edit Settings
          </button>
        </MenuItem>
        
        <div v-if="canUpdate" class="border-t border-neutral-100">
          <MenuItem v-slot="{ active }">
            <button
              @click="$emit('delete')"
              :class="[active ? 'bg-red-50' : '', 'flex w-full items-center px-4 py-2 text-sm text-red-700']"
            >
              <TrashIcon class="mr-3 h-4 w-4" />
              Remove Integration
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import {
  EllipsisHorizontalIcon,
  SignalIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

interface Props {
  canManage: boolean
  canUpdate: boolean
  isActive: boolean
  loading?: boolean
}

interface Emits {
  (e: 'test-connection'): void
  (e: 'sync', type: 'full' | 'incremental'): void
  (e: 'view-sync-jobs'): void
  (e: 'edit'): void
  (e: 'delete'): void
}

withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<Emits>()
</script>