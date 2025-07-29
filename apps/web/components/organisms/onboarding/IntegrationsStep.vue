<template>
  <div class="space-y-6">
    <div class="text-center mb-6">
      <Icon name="heroicons:puzzle-piece" class="w-12 h-12 text-primary-500 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-neutral-900">Connect Your Tools</h3>
      <p class="mt-2 text-sm text-neutral-600">
        Connect your communication channels and accounting software
      </p>
    </div>

    <FigAlert
      color="primary"
      variant="subtle"
      title="You can connect these later"
      description="Skip this step if you want to explore Figgy first"
    />

    <div class="space-y-4">
      <!-- Communication Channels -->
      <div>
        <h4 class="text-base font-medium text-neutral-900 mb-3">Communication Channels</h4>
        <p class="text-sm text-neutral-600 mb-4">
          Send invoices and receipts through your preferred channels
        </p>
        
        <div class="space-y-3">
          <!-- Slack -->
          <div class="border rounded-lg p-4 hover:border-primary-300 transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
                  <Icon name="simple-icons:slack" class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 class="font-medium text-neutral-900">Slack</h5>
                  <p class="text-sm text-neutral-600">Send documents via Slack messages</p>
                </div>
              </div>
              <FigButton
                v-if="!localData.slackConnected"
                variant="outline"
                size="sm"
                @click="connectSlack"
              >
                Connect
              </FigButton>
              <FigBadge v-else color="success" variant="soft">
                <Icon name="heroicons:check-circle" class="w-4 h-4 mr-1" />
                Connected
              </FigBadge>
            </div>
          </div>

          <!-- WhatsApp -->
          <div class="border rounded-lg p-4 opacity-75">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#25D366] flex items-center justify-center">
                  <Icon name="simple-icons:whatsapp" class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 class="font-medium text-neutral-900">WhatsApp</h5>
                  <p class="text-sm text-neutral-600">Send documents via WhatsApp</p>
                </div>
              </div>
              <FigBadge color="neutral" variant="soft">
                Coming Soon
              </FigBadge>
            </div>
          </div>

          <!-- Email -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
                  <Icon name="heroicons:envelope" class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 class="font-medium text-neutral-900">Email</h5>
                  <p class="text-sm text-neutral-600">Forward invoices to your unique email</p>
                </div>
              </div>
              <FigBadge color="success" variant="soft">
                <Icon name="heroicons:check-circle" class="w-4 h-4 mr-1" />
                Auto-enabled
              </FigBadge>
            </div>
          </div>
        </div>
      </div>

      <!-- Accounting Software -->
      <div class="border-t pt-4">
        <h4 class="text-base font-medium text-neutral-900 mb-3">Accounting Software</h4>
        <p class="text-sm text-neutral-600 mb-4">
          Automatically sync processed documents to your accounting system
        </p>
        
        <div class="space-y-3">
          <!-- Xero -->
          <div class="border rounded-lg p-4 hover:border-primary-300 transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#13B5EA] flex items-center justify-center">
                  <Icon name="simple-icons:xero" class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 class="font-medium text-neutral-900">Xero</h5>
                  <p class="text-sm text-neutral-600">Sync invoices and expenses to Xero</p>
                </div>
              </div>
              <FigButton
                v-if="!localData.xeroConnected"
                variant="outline"
                size="sm"
                @click="connectXero"
              >
                Connect
              </FigButton>
              <FigBadge v-else color="success" variant="soft">
                <Icon name="heroicons:check-circle" class="w-4 h-4 mr-1" />
                Connected
              </FigBadge>
            </div>
          </div>

          <!-- QuickBooks -->
          <div class="border rounded-lg p-4 opacity-75">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#2CA01C] flex items-center justify-center">
                  <Icon name="simple-icons:quickbooks" class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 class="font-medium text-neutral-900">QuickBooks</h5>
                  <p class="text-sm text-neutral-600">Sync to QuickBooks Online</p>
                </div>
              </div>
              <FigBadge color="neutral" variant="soft">
                Coming Soon
              </FigBadge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-neutral-50 rounded-lg p-4 mt-6">
      <h4 class="text-sm font-medium text-neutral-900 mb-2">What happens next?</h4>
      <ul class="text-sm text-neutral-600 space-y-1">
        <li class="flex items-start">
          <Icon name="heroicons:sparkles" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Send invoices through any connected channel</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:cpu-chip" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Our AI extracts and categorises all data</span>
        </li>
        <li class="flex items-start">
          <Icon name="heroicons:cloud-arrow-up" class="w-4 h-4 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
          <span>Documents sync automatically to your accounting software</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { FigButton, FigBadge, FigAlert } from '@figgy/ui'

// Props & Emits
interface Props {
  data: {
    slackConnected?: boolean
    xeroConnected?: boolean
  }
  errors?: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:data': [data: Props['data']]
  'validate': [isValid: boolean]
}>()

// Composables
const toast = useToast()

// State
const localData = ref({
  slackConnected: props.data?.slackConnected || false,
  xeroConnected: props.data?.xeroConnected || false,
})

// Methods
async function connectSlack() {
  // In a real implementation, this would open the Slack OAuth flow
  toast.add({
    title: 'Slack Integration',
    description: 'This will open Slack authorization in the next implementation',
    color: 'info' as const,
  })
  
  // For demo purposes, just mark as connected
  localData.value.slackConnected = true
}

async function connectXero() {
  // In a real implementation, this would open the Xero OAuth flow
  toast.add({
    title: 'Xero Integration',
    description: 'This will open Xero authorization in the next implementation',
    color: 'info' as const,
  })
  
  // For demo purposes, just mark as connected
  localData.value.xeroConnected = true
}

// Watch for changes and emit
watch(localData, (newData) => {
  emit('update:data', newData)
  // This step is always valid since all integrations are optional
  emit('validate', true)
}, { deep: true })

// Initial emit
emit('validate', true)
</script>