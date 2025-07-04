<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 transform scale-95"
    enter-to-class="opacity-100 transform scale-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100 transform scale-100"
    leave-to-class="opacity-0 transform scale-95"
  >
    <div
      v-if="show && (error || $slots.default)"
      :class="[
        'rounded-lg p-4',
        variantClasses[variant].background,
        variantClasses[variant].border,
        className
      ]"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <component
            :is="icon"
            :class="[
              'h-5 w-5',
              variantClasses[variant].icon
            ]"
            aria-hidden="true"
          />
        </div>
        <div class="ml-3 flex-1">
          <h3
            v-if="title"
            :class="[
              'text-sm font-medium',
              variantClasses[variant].title
            ]"
          >
            {{ title }}
          </h3>
          <div
            :class="[
              'text-sm',
              variantClasses[variant].text,
              { 'mt-2': title }
            ]"
          >
            <slot>
              <p>{{ formattedError }}</p>
            </slot>
          </div>
          <div v-if="actions.length > 0" class="mt-4">
            <div class="-mx-2 -my-1.5 flex">
              <button
                v-for="action in actions"
                :key="action.label"
                type="button"
                @click="action.handler"
                :class="[
                  'rounded-md px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
                  variantClasses[variant].button,
                  variantClasses[variant].buttonHover,
                  variantClasses[variant].buttonFocus
                ]"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="dismissible" class="ml-auto pl-3">
          <div class="-mx-1.5 -my-1.5">
            <button
              type="button"
              @click="handleDismiss"
              :class="[
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                variantClasses[variant].closeButton,
                variantClasses[variant].closeButtonHover,
                variantClasses[variant].closeButtonFocus
              ]"
            >
              <span class="sr-only">Dismiss</span>
              <XMarkIcon class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  XMarkIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/vue/20/solid'

export interface ErrorAlertAction {
  label: string
  handler: () => void
}

export interface ErrorAlertProps {
  error?: string | Error | null
  variant?: 'error' | 'warning' | 'info' | 'success'
  title?: string
  dismissible?: boolean
  actions?: ErrorAlertAction[]
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<ErrorAlertProps>(), {
  variant: 'error',
  dismissible: true,
  actions: () => []
})

const emit = defineEmits<{
  dismiss: []
}>()

const show = computed(() => Boolean(props.error) || Boolean(props.title))

const formattedError = computed(() => {
  if (!props.error) return ''
  if (typeof props.error === 'string') return props.error
  if (props.error instanceof Error) return props.error.message
  return String(props.error)
})

const icon = computed(() => {
  switch (props.variant) {
    case 'error':
      return XCircleIcon
    case 'warning':
      return ExclamationTriangleIcon
    case 'info':
      return InformationCircleIcon
    case 'success':
      return CheckCircleIcon
  }
})

const variantClasses = {
  error: {
    background: 'bg-error-50',
    border: 'border border-error-200',
    icon: 'text-error-400',
    title: 'text-error-800',
    text: 'text-error-700',
    button: 'bg-error-50 text-error-800',
    buttonHover: 'hover:bg-error-100',
    buttonFocus: 'focus:ring-error-600 focus:ring-offset-error-50',
    closeButton: 'bg-error-50 text-error-500',
    closeButtonHover: 'hover:bg-error-100',
    closeButtonFocus: 'focus:ring-error-600 focus:ring-offset-error-50'
  },
  warning: {
    background: 'bg-warning-50',
    border: 'border border-warning-200',
    icon: 'text-warning-400',
    title: 'text-warning-800',
    text: 'text-warning-700',
    button: 'bg-warning-50 text-warning-800',
    buttonHover: 'hover:bg-warning-100',
    buttonFocus: 'focus:ring-warning-600 focus:ring-offset-warning-50',
    closeButton: 'bg-warning-50 text-warning-500',
    closeButtonHover: 'hover:bg-warning-100',
    closeButtonFocus: 'focus:ring-warning-600 focus:ring-offset-warning-50'
  },
  info: {
    background: 'bg-info-50',
    border: 'border border-info-200',
    icon: 'text-info-400',
    title: 'text-info-800',
    text: 'text-info-700',
    button: 'bg-info-50 text-info-800',
    buttonHover: 'hover:bg-info-100',
    buttonFocus: 'focus:ring-info-600 focus:ring-offset-info-50',
    closeButton: 'bg-info-50 text-info-500',
    closeButtonHover: 'hover:bg-info-100',
    closeButtonFocus: 'focus:ring-info-600 focus:ring-offset-info-50'
  },
  success: {
    background: 'bg-success-50',
    border: 'border border-success-200',
    icon: 'text-success-400',
    title: 'text-success-800',
    text: 'text-success-700',
    button: 'bg-success-50 text-success-800',
    buttonHover: 'hover:bg-success-100',
    buttonFocus: 'focus:ring-success-600 focus:ring-offset-success-50',
    closeButton: 'bg-success-50 text-success-500',
    closeButtonHover: 'hover:bg-success-100',
    closeButtonFocus: 'focus:ring-success-600 focus:ring-offset-success-50'
  }
}

const className = computed(() => props.class)

const handleDismiss = () => {
  emit('dismiss')
}
</script>