<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-slate-900">
          Create New Workspace
        </h3>
        <button
          class="text-slate-400 hover:text-slate-600"
          @click="handleClose"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label
            for="workspaceName"
            class="block text-sm font-medium text-slate-700 mb-2"
          >
            Workspace Name
          </label>
          <input
            id="workspaceName"
            v-model="workspaceName"
            type="text"
            required
            maxlength="255"
            class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            placeholder="Enter workspace name"
            :disabled="loading"
          >
          <p class="mt-1 text-xs text-slate-500">
            This will be the name of your new workspace
          </p>
        </div>

        <div
          v-if="error"
          class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
        >
          <p class="text-sm text-red-600">
            {{ error }}
          </p>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            :disabled="loading"
            @click="handleClose"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading || !workspaceName.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-slate-600 border border-transparent rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Creating...</span>
            <span v-else>Create Workspace</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable no-unused-vars */
import { ref, watch } from 'vue'
import { useTenantStore } from '../stores/tenant'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'created', workspace: { id: string; name: string; slug: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const tenantStore = useTenantStore()

const workspaceName = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    workspaceName.value = ''
    error.value = null
    loading.value = false
  }
})

const handleClose = () => {
  if (!loading.value) {
    emit('close')
  }
}

const handleSubmit = async () => {
  if (!workspaceName.value.trim() || loading.value) return

  loading.value = true
  error.value = null

  try {
    const newWorkspace = await tenantStore.createWorkspace(workspaceName.value)
    emit('created', newWorkspace)
    emit('close')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}
</script>