<template>
  <FigAlert v-if="errorMessage" variant="solid" color="error" class="mb-4">
    <template #icon>
      <Icon name="heroicons:exclamation-circle" />
    </template>
    <template #title>Processing Failed</template>
    <template #default>
      <div class="space-y-2">
        <p class="text-sm">{{ errorMessage }}</p>
        <div v-if="showDetails && errorDetails" class="mt-2">
          <details class="text-xs">
            <summary class="cursor-pointer font-medium text-error-700 hover:text-error-800">
              View error details
            </summary>
            <pre class="mt-2 overflow-x-auto rounded bg-error-50 p-2 text-error-900">{{ errorDetails }}</pre>
          </details>
        </div>
      </div>
    </template>
    <template v-if="showRetryAction" #actions>
      <FigButton
        size="xs"
        variant="outline"
        color="error"
        icon="heroicons:arrow-path"
        @click="$emit('retry')"
      >
        Retry Processing
      </FigButton>
    </template>
  </FigAlert>
</template>

<script setup lang="ts">
import { FigAlert, FigButton } from '@figgy/ui'

interface Props {
  errorMessage?: string | null
  errorDetails?: string | null
  showDetails?: boolean
  showRetryAction?: boolean
}

interface Emits {
  (e: 'retry'): void
}

withDefaults(defineProps<Props>(), {
  showDetails: true,
  showRetryAction: true
})

defineEmits<Emits>()
</script>