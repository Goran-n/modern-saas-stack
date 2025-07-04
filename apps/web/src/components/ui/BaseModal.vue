<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog
      as="div"
      class="relative z-50"
      @close="handleClose"
    >
      <!-- Backdrop -->
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-neutral-950/75 transition-opacity" />
      </TransitionChild>

      <!-- Modal -->
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
            <DialogPanel
              :class="[
                'relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all',
                sizeClasses[size]
              ]"
            >
              <!-- Header -->
              <div v-if="$slots.header || title" class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="flex items-start">
                  <div
                    v-if="icon"
                    :class="[
                      'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10',
                      iconBackgroundClasses[iconType]
                    ]"
                  >
                    <component
                      :is="icon"
                      :class="[
                        'h-6 w-6',
                        iconColorClasses[iconType]
                      ]"
                      aria-hidden="true"
                    />
                  </div>
                  <div class="mt-3 text-center sm:mt-0 sm:text-left" :class="{ 'sm:ml-4': icon }">
                    <DialogTitle
                      v-if="title"
                      as="h3"
                      class="text-base font-semibold leading-6 text-neutral-900"
                    >
                      {{ title }}
                    </DialogTitle>
                    <slot name="header" />
                  </div>
                </div>
              </div>

              <!-- Body -->
              <div
                v-if="$slots.default"
                :class="[
                  'px-4 pt-5 pb-4 sm:p-6',
                  { 'border-t border-neutral-200': $slots.header || title }
                ]"
              >
                <slot />
              </div>

              <!-- Footer -->
              <div
                v-if="$slots.footer || showDefaultFooter"
                class="bg-neutral-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6"
              >
                <slot name="footer">
                  <BaseButton
                    v-if="showDefaultFooter"
                    :variant="primaryButtonVariant"
                    :disabled="primaryButtonDisabled"
                    :loading="primaryButtonLoading"
                    @click="$emit('primary-action')"
                    class="w-full sm:ml-3 sm:w-auto"
                  >
                    {{ primaryButtonText }}
                  </BaseButton>
                  <BaseButton
                    v-if="showDefaultFooter && showCancelButton"
                    variant="secondary"
                    @click="handleClose"
                    class="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    {{ cancelButtonText }}
                  </BaseButton>
                </slot>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import BaseButton from './BaseButton.vue'

export interface BaseModalProps {
  isOpen: boolean
  title?: string
  icon?: any
  iconType?: 'info' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showDefaultFooter?: boolean
  primaryButtonText?: string
  primaryButtonVariant?: 'primary' | 'error'
  primaryButtonDisabled?: boolean
  primaryButtonLoading?: boolean
  cancelButtonText?: string
  showCancelButton?: boolean
  preventClose?: boolean
}

const props = withDefaults(defineProps<BaseModalProps>(), {
  iconType: 'info',
  size: 'md',
  showDefaultFooter: false,
  primaryButtonText: 'Confirm',
  primaryButtonVariant: 'primary',
  primaryButtonDisabled: false,
  primaryButtonLoading: false,
  cancelButtonText: 'Cancel',
  showCancelButton: true,
  preventClose: false
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'close': []
  'primary-action': []
}>()

const sizeClasses = {
  sm: 'sm:max-w-sm sm:w-full',
  md: 'sm:max-w-md sm:w-full',
  lg: 'sm:max-w-lg sm:w-full',
  xl: 'sm:max-w-xl sm:w-full',
  full: 'sm:max-w-7xl sm:w-full'
}

const iconBackgroundClasses = {
  info: 'bg-primary-100',
  success: 'bg-success-100',
  warning: 'bg-warning-100',
  error: 'bg-error-100'
}

const iconColorClasses = {
  info: 'text-primary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  error: 'text-error-600'
}

const handleClose = () => {
  if (!props.preventClose) {
    emit('update:isOpen', false)
    emit('close')
  }
}
</script>