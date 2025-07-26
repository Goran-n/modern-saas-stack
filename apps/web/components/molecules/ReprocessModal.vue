<template>
  <FigModal :modelValue="isOpen" @update:modelValue="(val) => isOpen = val">
    <template #header>
      <h3 class="text-lg font-semibold">Confirm Reprocess</h3>
    </template>
    
    <template #default>
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Are you sure you want to reprocess this file?
        </p>
        
        <FigAlert variant="subtle">
          <template #icon>
            <Icon name="heroicons:exclamation-triangle" />
          </template>
          <template #title>Warning</template>
          <template #default>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li>All extracted data will be deleted</li>
              <li>Supplier links will be removed</li>
              <li>The file will be processed from scratch</li>
            </ul>
          </template>
        </FigAlert>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <FigButton
          variant="outline"
          @click="close"
        >
          Cancel
        </FigButton>
        <FigButton
          variant="solid"
          @click="handleConfirm"
          :loading="loading"
        >
          Reprocess File
        </FigButton>
      </div>
    </template>
  </FigModal>
</template>

<script setup lang="ts">
import { FigModal, FigButton, FigAlert } from '@figgy/ui'
import { computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const close = () => {
  isOpen.value = false
}

const handleConfirm = () => {
  emit('confirm')
}

// Auto-close on successful processing
watch(() => props.loading, (newVal, oldVal) => {
  if (oldVal && !newVal) {
    // Loading finished
    close()
  }
})
</script>