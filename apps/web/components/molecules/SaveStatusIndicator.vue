<template>
  <div class="fixed bottom-4 right-4 z-50">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div v-if="status !== 'idle'" class="bg-white rounded-lg border border-neutral-200 p-3">
        <div v-if="status === 'saving'" class="flex items-center gap-2 text-warning-600">
          <Icon name="heroicons:arrow-path" class="h-5 w-5 animate-spin" />
          <span class="font-medium">Saving changes...</span>
        </div>
        <div v-else-if="status === 'saved'" class="flex items-center gap-2 text-success-600">
          <Icon name="heroicons:check-circle" class="h-5 w-5" />
          <span class="font-medium">Changes saved</span>
        </div>
        <div v-else-if="status === 'error'" class="flex items-center gap-2 text-error-600">
          <Icon name="heroicons:exclamation-circle" class="h-5 w-5" />
          <span class="font-medium">Error saving changes</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface Props {
  status: 'idle' | 'saving' | 'saved' | 'error';
}

defineProps<Props>();
</script>