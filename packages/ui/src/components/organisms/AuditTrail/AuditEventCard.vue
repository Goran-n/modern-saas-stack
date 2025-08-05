<template>
  <div 
    :class="[
      'border-l-4 border rounded-lg p-4 bg-white hover:shadow-md transition-shadow',
      getOutcomeColor(event.outcome).border
    ]"
  >
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div class="flex items-start space-x-3">
        <!-- Outcome indicator -->
        <div 
          :class="[
            'flex-shrink-0 w-2 h-2 rounded-full mt-2',
            getOutcomeColor(event.outcome).bg
          ]"
        ></div>
        
        <div class="flex-1 min-w-0">
          <!-- Event type and entity -->
          <div class="flex items-center space-x-2 mb-1">
            <span class="text-sm font-medium text-gray-900">
              {{ formatEventType(event.eventType) }}
            </span>
            <span class="text-xs text-gray-500">•</span>
            <span class="text-xs text-gray-600">
              {{ event.entityType }}:{{ truncateId(event.entityId) }}
            </span>
          </div>
          
          <!-- Decision -->
          <p class="text-sm text-gray-800 mb-2">
            {{ event.decision }}
          </p>
          
          <!-- Metadata row -->
          <div class="flex items-center space-x-4 text-xs text-gray-500">
            <span>{{ formatTimestamp(event.timestamp) }}</span>
            
            <span v-if="event.duration">
              {{ formatDuration(event.duration) }}
            </span>
            
            <span v-if="event.confidence !== null && event.confidence !== undefined">
              {{ Math.round(event.confidence * 100) }}% confidence
            </span>
            
            <span v-if="event.userId">
              User: {{ truncateId(event.userId) }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex items-center space-x-1">
        <!-- Confidence badge -->
        <FigBadge 
          v-if="event.confidence !== null && event.confidence !== undefined"
          :variant="getConfidenceBadgeVariant(event.confidence)"
          size="sm"
        >
          {{ Math.round(event.confidence * 100) }}%
        </FigBadge>
        
        <!-- Outcome badge -->
        <FigBadge 
          :variant="getOutcomeBadgeVariant(event.outcome)"
          size="sm"
        >
          {{ capitalizeFirst(event.outcome) }}
        </FigBadge>
        
        <!-- More actions -->
        <FigDropdown :items="dropdownItems">
          <template #trigger>
            <button class="p-1 text-gray-400 hover:text-gray-600 rounded">
              <FigIcon name="heroicons:ellipsis-horizontal" class="h-4 w-4" />
            </button>
          </template>
          
          <div class="py-1">
            <button 
              v-if="showCorrelation"
              @click="$emit('view-correlation', event.correlationId)"
              class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <FigIcon name="heroicons:link" class="h-4 w-4 mr-2" />
              View Correlation Chain
            </button>
            
            <button 
              v-if="event.parentEventId"
              @click="$emit('view-children', event.id)"
              class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <FigIcon name="heroicons:arrow-right" class="h-4 w-4 mr-2" />
              View Child Events
            </button>
            
            <button 
              @click="showDetails = !showDetails"
              class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <FigIcon 
                :name="showDetails ? 'heroicons:eye-slash' : 'heroicons:eye'" 
                class="h-4 w-4 mr-2" 
              />
              {{ showDetails ? 'Hide' : 'Show' }} Details
            </button>
            
            <button 
              @click="copyToClipboard"
              class="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <FigIcon name="heroicons:clipboard" class="h-4 w-4 mr-2" />
              Copy Event ID
            </button>
          </div>
        </FigDropdown>
      </div>
    </div>
    
    <!-- Expandable details -->
    <div v-if="showDetails" class="mt-4 pt-4 border-t border-gray-100">
      <div class="space-y-3">
        <!-- Context -->
        <div v-if="event.context" class="space-y-2">
          <h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Context
          </h4>
          <div class="bg-gray-50 rounded p-3">
            <pre class="text-xs text-gray-600 whitespace-pre-wrap">{{ JSON.stringify(event.context, null, 2) }}</pre>
          </div>
        </div>
        
        <!-- Metadata -->
        <div v-if="event.metadata" class="space-y-2">
          <h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Metadata
          </h4>
          <div class="bg-gray-50 rounded p-3">
            <pre class="text-xs text-gray-600 whitespace-pre-wrap">{{ JSON.stringify(event.metadata, null, 2) }}</pre>
          </div>
        </div>
        
        <!-- Technical details -->
        <div class="space-y-2">
          <h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Technical Details
          </h4>
          <div class="bg-gray-50 rounded p-3 space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">Event ID:</span>
              <span class="text-gray-800 font-mono">{{ event.id }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">Correlation ID:</span>
              <span class="text-gray-800 font-mono">{{ event.correlationId }}</span>
            </div>
            <div v-if="event.parentEventId" class="flex justify-between text-xs">
              <span class="text-gray-500">Parent ID:</span>
              <span class="text-gray-800 font-mono">{{ event.parentEventId }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">Timestamp:</span>
              <span class="text-gray-800">{{ new Date(event.timestamp).toISOString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FigBadge, FigDropdown, FigIcon } from '../../index'
import type { BadgeVariant } from '../../atoms/Badge/types'
import type { DropdownMenuItem } from '../../molecules/Dropdown/types'

// Props
interface AuditEvent {
  id: string
  entityType: string
  entityId: string
  eventType: string
  decision: string
  outcome: 'success' | 'failure' | 'partial' | 'skipped'
  confidence?: number
  timestamp: string
  duration?: number
  correlationId: string
  parentEventId?: string
  userId?: string
  context?: any
  metadata?: any
}

interface Props {
  event: AuditEvent
  showCorrelation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showCorrelation: true,
})

// Emits - Not used in this component
const emit = defineEmits<{
  'view-correlation': [correlationId: string]
  'view-children': [parentEventId: string]
}>()

// State
const showDetails = ref(false)

// Computed
const dropdownItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = []
  
  if (props.showCorrelation) {
    items.push({
      id: 'view-correlation',
      label: 'View Correlation Chain',
      icon: 'heroicons:link',
      onClick: () => emit('view-correlation', props.event.correlationId)
    })
  }
  
  if (props.event.parentEventId) {
    items.push({
      id: 'view-children',
      label: 'View Child Events', 
      icon: 'heroicons:arrow-right',
      onClick: () => emit('view-children', props.event.id)
    })
  }
  
  items.push({
    id: 'toggle-details',
    label: showDetails.value ? 'Hide Details' : 'Show Details',
    icon: showDetails.value ? 'heroicons:eye-slash' : 'heroicons:eye',
    onClick: () => { showDetails.value = !showDetails.value }
  })
  
  items.push({
    id: 'copy',
    label: 'Copy Event ID',
    icon: 'heroicons:clipboard-document',
    onClick: copyToClipboard
  })
  
  return items
})

// Methods
const getOutcomeColor = (outcome: string) => {
  const colors = {
    success: { border: 'border-l-green-500', bg: 'bg-green-500', text: 'text-green-700' },
    failure: { border: 'border-l-red-500', bg: 'bg-red-500', text: 'text-red-700' },
    partial: { border: 'border-l-yellow-500', bg: 'bg-yellow-500', text: 'text-yellow-700' },
    skipped: { border: 'border-l-gray-500', bg: 'bg-gray-500', text: 'text-gray-700' },
  }
  return colors[outcome as keyof typeof colors] || colors.success
}

const getOutcomeBadgeVariant = (outcome: string): BadgeVariant => {
  // Map outcomes to badge variants
  // Since BadgeVariant only has 'solid' | 'soft' | 'outline', we'll use these
  const variants: Record<string, BadgeVariant> = {
    success: 'soft',
    failure: 'solid',
    partial: 'outline',
    skipped: 'soft',
  }
  return variants[outcome] || 'soft'
}

const getConfidenceBadgeVariant = (confidence: number): BadgeVariant => {
  if (confidence >= 0.9) return 'soft'
  if (confidence >= 0.7) return 'outline'
  return 'solid'
}

const formatEventType = (eventType: string) => {
  return eventType
    .split('.')
    .map(part => part.replace(/_/g, ' '))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' → ')
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

const formatDuration = (duration: number) => {
  if (duration < 1000) return `${Math.round(duration)}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

const truncateId = (id: string, length: number = 8) => {
  return id.length > length ? `${id.substring(0, length)}...` : id
}

const capitalizeFirst = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.event.id)
    // Could emit a toast notification here
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}
</script>