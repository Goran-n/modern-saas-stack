<template>
  <div class="p-6 hover:bg-neutral-50 transition-colors">
    <div class="flex items-start justify-between">
      <!-- Connection Info -->
      <div class="flex items-start gap-4">
        <div class="flex-shrink-0">
          <div 
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="providerStyles.background"
          >
            <Icon 
              :name="providerStyles.icon" 
              class="w-6 h-6"
              :class="providerStyles.iconColor"
            />
          </div>
        </div>
        
        <div class="flex-1">
          <h4 class="text-sm font-medium text-neutral-900">
            {{ connection.emailAddress }}
          </h4>
          <p class="text-sm text-neutral-500 mt-1">
            {{ providerStyles.label }}
          </p>
          
          <!-- Status and Last Sync -->
          <div class="flex items-center gap-4 mt-2">
            <FigBadge 
              :color="connection.status === 'active' ? 'success' : connection.status === 'error' ? 'error' : 'neutral'"
              variant="soft"
              size="sm"
            >
              {{ connection.status }}
            </FigBadge>
            
            <span v-if="connection.lastSyncAt" class="text-xs text-neutral-500">
              Last sync: {{ formatRelativeTime(connection.lastSyncAt) }}
            </span>
          </div>
          
          <!-- Filters -->
          <div v-if="hasFilters" class="mt-3 space-y-1">
            <div v-if="connection.folderFilter && connection.folderFilter.length > 0" class="text-xs text-neutral-600">
              <span class="font-medium">Folders:</span> {{ connection.folderFilter.join(', ') }}
            </div>
            <div v-if="connection.senderFilter && connection.senderFilter.length > 0" class="text-xs text-neutral-600">
              <span class="font-medium">Senders:</span> {{ connection.senderFilter.join(', ') }}
            </div>
          </div>
          
          <!-- Error Message -->
          <FigAlert
            v-if="connection.lastError"
            color="error"
            variant="subtle"
            size="sm"
            class="mt-3"
            :title="connection.lastError"
          />
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center gap-2">
        <FigButton
          v-if="connection.status === 'active'"
          @click="$emit('sync', connection.id)"
          variant="ghost"
          size="sm"
          color="neutral"
          :loading="syncing"
        >
          <Icon name="heroicons:arrow-path" class="h-4 w-4" />
          <span class="ml-1">Sync</span>
        </FigButton>
        
        <div class="relative">
          <FigButton
            @click="showMenu = !showMenu"
            variant="ghost"
            size="sm"
            color="neutral"
          >
            <Icon name="heroicons:ellipsis-vertical" class="h-4 w-4" />
          </FigButton>
          
          <!-- Dropdown Menu -->
          <div
            v-if="showMenu"
            class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
          >
            <div class="py-1">
              <button
                @click="handleEdit"
                class="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                <Icon name="heroicons:pencil" class="h-4 w-4 inline mr-2" />
                Edit Settings
              </button>
              <button
                disabled
                class="block w-full text-left px-4 py-2 text-sm text-neutral-400 cursor-not-allowed"
              >
                <Icon name="heroicons:chart-bar" class="h-4 w-4 inline mr-2" />
                View Activity
              </button>
              <hr class="my-1" />
              <button
                @click="handleDelete"
                class="block w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50"
              >
                <Icon name="heroicons:trash" class="h-4 w-4 inline mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { FigBadge, FigButton, FigAlert } from '@figgy/ui'

// Props
interface EmailConnection {
  id: string
  provider: 'gmail' | 'outlook' | 'imap'
  emailAddress: string
  status: 'active' | 'inactive' | 'error'
  lastSyncAt?: string
  lastError?: string
  folderFilter?: string[]
  senderFilter?: string[]
  subjectFilter?: string[]
}

interface Props {
  connection: EmailConnection
  syncing?: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  sync: [connectionId: string]
  edit: [connection: EmailConnection]
  delete: [connectionId: string]
}>()

// State
const showMenu = ref(false)

// Computed
const providerStyles = computed(() => {
  switch (props.connection.provider) {
    case 'gmail':
      return {
        icon: 'logos:google-gmail',
        label: 'Gmail',
        background: 'bg-red-100',
        iconColor: 'text-red-600'
      }
    case 'outlook':
      return {
        icon: 'logos:microsoft-icon',
        label: 'Outlook / Office 365',
        background: 'bg-blue-100',
        iconColor: 'text-blue-600'
      }
    default:
      return {
        icon: 'heroicons:envelope',
        label: 'IMAP',
        background: 'bg-neutral-100',
        iconColor: 'text-neutral-600'
      }
  }
})

const hasFilters = computed(() => {
  return (props.connection.folderFilter?.length || 0) > 0 || 
         (props.connection.senderFilter?.length || 0) > 0
})

// Methods
function handleEdit() {
  showMenu.value = false
  emit('edit', props.connection)
}

function handleDelete() {
  showMenu.value = false
  emit('delete', props.connection.id)
}
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

// Click outside handler
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  const dropdown = target.closest('.relative')
  if (!dropdown || !dropdown.contains(target)) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>