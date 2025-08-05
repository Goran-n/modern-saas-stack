<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <FigSkeleton class="h-24 w-full" v-for="i in 4" :key="i" />
    </div>

    <!-- Metrics Grid -->
    <div v-else class="space-y-6">
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Events -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FigIcon name="heroicons:document-text" class="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Events</p>
              <p class="text-2xl font-semibold text-gray-900">
                {{ formatNumber(metrics.totalEvents) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Success Rate -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <FigIcon name="heroicons:check-circle" class="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Success Rate</p>
              <p class="text-2xl font-semibold text-gray-900">
                {{ formatPercentage(metrics.successRate) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Average Confidence -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <FigIcon name="heroicons:star" class="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Avg Confidence</p>
              <p class="text-2xl font-semibold text-gray-900">
                {{ formatPercentage(metrics.averageConfidence) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <FigIcon name="heroicons:clock" class="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Recent Events</p>
              <p class="text-2xl font-semibold text-gray-900">
                {{ metrics.recentActivity?.length || 0 }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Event Types Chart -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Events by Type</h3>
            <FigButton variant="outline" size="sm" @click="$emit('view-event-types')">
              View All
            </FigButton>
          </div>
          
          <div v-if="Object.keys(metrics.eventsByType).length === 0" class="text-center py-8 text-gray-500">
            No event data available
          </div>
          
          <div v-else class="space-y-3">
            <div 
              v-for="[type, count] in sortedEventTypes" 
              :key="type"
              class="flex items-center justify-between"
            >
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="text-sm text-gray-700">{{ formatEventTypeName(type) }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-900">{{ count }}</span>
                <span class="text-xs text-gray-500">
                  ({{ formatPercentage(count / metrics.totalEvents) }})
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Outcomes Chart -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Events by Outcome</h3>
          </div>
          
          <div v-if="Object.keys(metrics.eventsByOutcome).length === 0" class="text-center py-8 text-gray-500">
            No outcome data available
          </div>
          
          <div v-else class="space-y-3">
            <div 
              v-for="[outcome, count] in sortedOutcomes" 
              :key="outcome"
              class="flex items-center justify-between"
            >
              <div class="flex items-center space-x-3">
                <div 
                  :class="[
                    'w-3 h-3 rounded-full',
                    getOutcomeColor(outcome)
                  ]"
                ></div>
                <span class="text-sm text-gray-700 capitalize">{{ outcome }}</span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-900">{{ count }}</span>
                <span class="text-xs text-gray-500">
                  ({{ formatPercentage(count / metrics.totalEvents) }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div v-if="showRecentActivity && metrics.recentActivity?.length" class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Recent Activity</h3>
          <FigButton variant="outline" size="sm" @click="$emit('view-all-events')">
            View All
          </FigButton>
        </div>
        
        <div class="space-y-3">
          <div 
            v-for="event in metrics.recentActivity.slice(0, 5)" 
            :key="event.id"
            class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
          >
            <div class="flex items-center space-x-3">
              <div 
                :class="[
                  'w-2 h-2 rounded-full',
                  getOutcomeColor(event.outcome)
                ]"
              ></div>
              <div>
                <p class="text-sm text-gray-900">{{ event.decision }}</p>
                <p class="text-xs text-gray-500">
                  {{ formatEventTypeName(event.eventType) }} • {{ formatRelativeTime(event.timestamp) }}
                </p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <FigBadge 
                v-if="event.confidence !== null && event.confidence !== undefined"
                :variant="getConfidenceBadgeVariant(event.confidence)"
                size="sm"
              >
                {{ Math.round(event.confidence * 100) }}%
              </FigBadge>
              
              <FigBadge 
                :variant="getOutcomeBadgeVariant(event.outcome)"
                size="sm"
              >
                {{ event.outcome }}
              </FigBadge>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FigButton, FigIcon, FigSkeleton, FigBadge } from '../../index'
import type { BadgeVariant } from '../../atoms/Badge/types'

// Props
interface AuditEvent {
  id: string
  eventType: string
  decision: string
  outcome: 'success' | 'failure' | 'partial' | 'skipped'
  confidence?: number
  timestamp: string
}

interface AuditMetrics {
  totalEvents: number
  successRate: number
  averageConfidence: number
  eventsByType: Record<string, number>
  eventsByOutcome: Record<string, number>
  recentActivity?: AuditEvent[]
}

interface Props {
  metrics: AuditMetrics
  loading?: boolean
  showRecentActivity?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showRecentActivity: true,
})

// Emits - Not used in this component
// const emit = defineEmits<{
//   'view-event-types': []
//   'view-all-events': []
// }>()

// Computed
const sortedEventTypes = computed(() => {
  return Object.entries(props.metrics.eventsByType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5) // Show top 5
})

const sortedOutcomes = computed(() => {
  return Object.entries(props.metrics.eventsByOutcome)
    .sort(([,a], [,b]) => b - a)
})

// Methods
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const formatPercentage = (value: number) => {
  return `${Math.round(value * 100)}%`
}

const formatEventTypeName = (eventType: string) => {
  return eventType
    .split('.')
    .map(part => part.replace(/_/g, ' '))
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' → ')
}

const formatRelativeTime = (timestamp: string) => {
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

const getOutcomeColor = (outcome: string) => {
  const colors = {
    success: 'bg-green-500',
    failure: 'bg-red-500',
    partial: 'bg-yellow-500',
    skipped: 'bg-gray-500',
  }
  return colors[outcome as keyof typeof colors] || 'bg-gray-500'
}

const getOutcomeBadgeVariant = (outcome: string): BadgeVariant => {
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
</script>