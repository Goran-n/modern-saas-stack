<template>
  <TransitionRoot
    as="template"
    :show="isOpen"
  >
    <Dialog
      as="div"
      class="relative z-10"
      @close="$emit('close')"
    >
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div class="sm:flex sm:items-start">
                <!-- Icon -->
                <div :class="iconContainerClasses">
                  <ExclamationTriangleIcon
                    v-if="variant === 'warning'"
                    :class="iconClasses"
                  />
                  <XCircleIcon
                    v-else-if="variant === 'danger'"
                    :class="iconClasses"
                  />
                  <CheckCircleIcon
                    v-else-if="variant === 'success'"
                    :class="iconClasses"
                  />
                  <InformationCircleIcon
                    v-else
                    :class="iconClasses"
                  />
                </div>
                
                <!-- Content -->
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <DialogTitle
                    as="h3"
                    class="text-base font-semibold leading-6 text-neutral-900"
                  >
                    {{ title }}
                  </DialogTitle>
                  <div class="mt-2">
                    <p class="text-sm text-neutral-500">
                      {{ message }}
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Actions -->
              <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  :disabled="loading"
                  :class="[
                    'inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm sm:ml-3 sm:w-auto',
                    confirmButtonClasses,
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  ]"
                  @click="$emit('confirm')"
                >
                  <span
                    v-if="loading"
                    class="mr-2"
                  >
                    <div class="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                  </span>
                  {{ confirmText }}
                </button>
                <button
                  :disabled="loading"
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="$emit('close')"
                >
                  {{ cancelText }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'info' | 'warning' | 'danger' | 'success'
  loading?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'info',
  loading: false
})

const emit = defineEmits<Emits>()

const iconContainerClasses = computed(() => {
  const baseClasses = 'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10'
  
  const variantClasses = {
    info: 'bg-blue-100',
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
    success: 'bg-green-100'
  }
  
  return `${baseClasses} ${variantClasses[props.variant]}`
})

const iconClasses = computed(() => {
  const baseClasses = 'h-6 w-6'
  
  const variantClasses = {
    info: 'text-blue-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    success: 'text-green-600'
  }
  
  return `${baseClasses} ${variantClasses[props.variant]}`
})

const confirmButtonClasses = computed(() => {
  const baseClasses = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
  
  const variantClasses = {
    info: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-500 focus-visible:outline-yellow-600',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
    success: 'bg-green-600 text-white hover:bg-green-500 focus-visible:outline-green-600'
  }
  
  return `${baseClasses} ${variantClasses[props.variant]}`
})
</script>