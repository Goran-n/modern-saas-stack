<template>
  <div class="space-y-6">
    <div>
      <h4 class="text-lg font-medium text-neutral-900 mb-2">
        Select Organisation
      </h4>
      <p class="text-sm text-neutral-500 mb-6">
        Choose which Xero organisation you'd like to connect to this workspace.
      </p>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="space-y-4"
    >
      <div class="animate-pulse">
        <div class="h-4 bg-neutral-200 rounded w-1/4 mb-2" />
        <div class="space-y-3">
          <div
            v-for="i in 3"
            :key="i"
            class="border border-neutral-200 rounded-lg p-4"
          >
            <div class="h-6 bg-neutral-200 rounded w-3/4 mb-2" />
            <div class="h-4 bg-neutral-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>

    <!-- Organisation list -->
    <div
      v-else-if="organisations && organisations.length > 0"
      class="space-y-3"
    >
      <div
        v-for="organisation in organisations"
        :key="organisation.id"
        :class="[
          'border rounded-lg p-4 cursor-pointer transition-all duration-200',
          selectedOrganisationId === organisation.id
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-50'
            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
        ]"
        @click="selectOrganisation(organisation.id)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center">
              <h5 class="text-sm font-medium text-neutral-900">
                {{ organisation.name }}
              </h5>
              <span
                v-if="organisation.type"
                class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-800"
              >
                {{ formatOrganisationType(organisation.type) }}
              </span>
            </div>
            <p
              v-if="organisation.currency"
              class="text-xs text-neutral-500 mt-1"
            >
              Currency: {{ organisation.currency }}
            </p>
          </div>
          <div class="flex-shrink-0 ml-4">
            <div
              :class="[
                'w-4 h-4 rounded-full border-2 transition-colors',
                selectedOrganisationId === organisation.id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-neutral-300'
              ]"
            >
              <div
                v-if="selectedOrganisationId === organisation.id"
                class="w-1.5 h-1.5 bg-white rounded-full m-0.5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="error && !loading"
      class="text-center py-8"
    >
      <div class="mx-auto h-12 w-12 text-red-400 mb-4">
        <ExclamationTriangleIcon class="w-full h-full" />
      </div>
      <h5 class="text-sm font-medium text-neutral-900 mb-2">
        Error loading organisations
      </h5>
      <p class="text-sm text-neutral-500">
        {{ error }}
      </p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!loading && (!organisations || organisations.length === 0)"
      class="text-center py-8"
    >
      <div class="mx-auto h-12 w-12 text-neutral-400 mb-4">
        <ExclamationTriangleIcon class="w-full h-full" />
      </div>
      <h5 class="text-sm font-medium text-neutral-900 mb-2">
        No organisations found
      </h5>
      <p class="text-sm text-neutral-500">
        We couldn't find any Xero organisations associated with your account.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { XeroOrganisation } from '../../stores/integration'

interface Props {
  organisations?: XeroOrganisation[]
  loading?: boolean
  modelValue?: string
  error?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'selection-changed', organisationId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const selectedOrganisationId = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit('update:modelValue', value)
    }
  }
})

// Methods
const selectOrganisation = (organisationId: string) => {
  selectedOrganisationId.value = organisationId
  emit('selection-changed', organisationId)
}

const formatOrganisationType = (type: string): string => {
  switch (type?.toLowerCase()) {
    case 'company':
      return 'Company'
    case 'charity':
      return 'Charity'
    case 'club':
      return 'Club'
    case 'partnership':
      return 'Partnership'
    case 'practice':
      return 'Practice'
    case 'person':
      return 'Personal'
    case 'trust':
      return 'Trust'
    default:
      return type || 'Organisation'
  }
}
</script>