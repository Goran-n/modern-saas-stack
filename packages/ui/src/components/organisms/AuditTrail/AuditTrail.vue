<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="border-b border-gray-200 pb-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">
            {{ title }}
          </h2>
          <p class="text-sm text-gray-600" v-if="subtitle">
            {{ subtitle }}
          </p>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Search -->
          <div class="relative" v-if="searchable">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search decisions..."
              class="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <FigIcon 
              name="heroicons:magnifying-glass" 
              class="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" 
            />
          </div>
          
          <!-- Filters -->
          <FigDropdown v-if="showFilters" :items="[]">
            <template #trigger>
              <FigButton variant="outline" size="sm">
                <FigIcon name="heroicons:funnel" class="h-4 w-4" />
                Filters
                <span 
                  v-if="activeFiltersCount > 0"
                  class="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full"
                >
                  {{ activeFiltersCount }}
                </span>
              </FigButton>
            </template>
            
            <div class="p-4 space-y-4 min-w-64">
              <!-- Event Type Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select 
                  v-model="filters.eventType"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Events</option>
                  <option v-for="type in eventTypes" :key="type" :value="type">
                    {{ formatEventType(type) }}
                  </option>
                </select>
              </div>
              
              <!-- Outcome Filter -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Outcome
                </label>
                <select 
                  v-model="filters.outcome"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Outcomes</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="partial">Partial</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
              
              <!-- Date Range -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div class="space-y-2">
                  <input
                    v-model="filters.startDate"
                    type="datetime-local"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    v-model="filters.endDate"
                    type="datetime-local" 
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <!-- Clear Filters -->
              <div class="pt-2 border-t">
                <FigButton 
                  variant="outline" 
                  size="sm" 
                  @click="clearFilters"
                  class="w-full"
                >
                  Clear Filters
                </FigButton>
              </div>
            </div>
          </FigDropdown>
          
          <!-- Export -->
          <FigButton variant="outline" size="sm" @click="exportAuditTrail" v-if="exportable">
            <FigIcon name="heroicons:arrow-down-tray" class="h-4 w-4" />
            Export
          </FigButton>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4 py-4">
      <FigSkeleton class="h-16 w-full" v-for="i in 5" :key="i" />
    </div>

    <!-- Empty State -->
    <FigEmptyState
      v-else-if="!filteredEvents.length"
      type="empty"
      :description="searchQuery ? `No audit events found for '${searchQuery}'` : 'No audit events found'"
    />

    <!-- Timeline -->
    <div v-else class="relative">
      <div class="relative">
        <!-- Timeline line -->
        <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <!-- Events -->
        <div class="space-y-6">
          <div
            v-for="event in paginatedEvents"
            :key="event.id"
            class="relative flex items-start space-x-4"
          >
            <!-- Timeline node -->
            <div class="flex-shrink-0">
              <div 
                :class="[
                  'w-3 h-3 rounded-full border-2 bg-white',
                  getOutcomeColor(event.outcome).border
                ]"
              ></div>
            </div>
            
            <!-- Event content -->
            <div class="flex-1 min-w-0">
              <AuditEventCard 
                :event="event"
                :show-correlation="showCorrelation"
                @view-correlation="$emit('view-correlation', event.correlationId)"
                @view-children="$emit('view-children', event.id)"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Load More -->
      <div v-if="hasMore" class="mt-6 text-center">
        <FigButton 
          variant="outline" 
          @click="loadMore"
          :loading="loadingMore"
        >
          Load More Events
        </FigButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FigButton, FigDropdown, FigIcon, FigSkeleton, FigEmptyState } from '../../index'
import AuditEventCard from './AuditEventCard.vue'

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
  title?: string
  subtitle?: string
  events: AuditEvent[]
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  searchable?: boolean
  showFilters?: boolean
  exportable?: boolean
  showCorrelation?: boolean
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Audit Trail',
  searchable: true,
  showFilters: true,
  exportable: true,
  showCorrelation: true,
  pageSize: 20,
})

// Emits
const emit = defineEmits<{
  'load-more': []
  'view-correlation': [correlationId: string]
  'view-children': [parentEventId: string]
  'export': [filters: any]
}>()

// State
const searchQuery = ref('')
const currentPage = ref(1)
const filters = ref({
  eventType: '',
  outcome: '',
  startDate: '',
  endDate: '',
})

// Computed
const eventTypes = computed(() => {
  const types = [...new Set(props.events.map(e => e.eventType))]
  return types.sort()
})

const activeFiltersCount = computed(() => {
  return Object.values(filters.value).filter(v => v !== '').length
})

const filteredEvents = computed(() => {
  let result = props.events

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(event => 
      event.decision.toLowerCase().includes(query) ||
      event.eventType.toLowerCase().includes(query) ||
      event.entityType.toLowerCase().includes(query)
    )
  }

  // Event type filter
  if (filters.value.eventType) {
    result = result.filter(event => event.eventType === filters.value.eventType)
  }

  // Outcome filter
  if (filters.value.outcome) {
    result = result.filter(event => event.outcome === filters.value.outcome)
  }

  // Date filters
  if (filters.value.startDate) {
    const startDate = new Date(filters.value.startDate)
    result = result.filter(event => new Date(event.timestamp) >= startDate)
  }

  if (filters.value.endDate) {
    const endDate = new Date(filters.value.endDate)
    result = result.filter(event => new Date(event.timestamp) <= endDate)
  }

  return result
})

const paginatedEvents = computed(() => {
  const endIndex = currentPage.value * props.pageSize
  return filteredEvents.value.slice(0, endIndex)
})

// Methods
const getOutcomeColor = (outcome: string) => {
  const colors = {
    success: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
    failure: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
    partial: { border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
    skipped: { border: 'border-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
  }
  return colors[outcome as keyof typeof colors] || colors.success
}

const formatEventType = (eventType: string) => {
  return eventType
    .split('.')
    .map(part => part.replace(/_/g, ' '))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' → ')
}

const clearFilters = () => {
  filters.value = {
    eventType: '',
    outcome: '',
    startDate: '',
    endDate: '',
  }
  searchQuery.value = ''
}

const loadMore = () => {
  if (paginatedEvents.value.length >= filteredEvents.value.length) {
    emit('load-more')
  } else {
    currentPage.value++
  }
}

const exportAuditTrail = () => {
  emit('export', {
    search: searchQuery.value,
    filters: filters.value,
    events: filteredEvents.value,
  })
}

// Watchers
watch([searchQuery, filters], () => {
  currentPage.value = 1
}, { deep: true })
</script>