<template>
  <div class="min-h-screen bg-neutral-50">
    <FigContainer max-width="6xl" class="py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <FigButton 
          variant="ghost" 
          color="neutral"
          size="sm"
          @click="router.push('/settings')"
          class="mb-4"
        >
          <span class="flex items-center gap-2">
            <Icon name="heroicons:arrow-left" class="h-4 w-4" />
            Back to Settings
          </span>
        </FigButton>
        <h1 class="text-3xl font-bold text-neutral-900">VAT Management</h1>
        <p class="mt-2 text-neutral-600">
          Manage your VAT periods, submissions, and compliance
        </p>
      </div>

      <!-- No Tenant Selected Warning -->
      <div v-if="!hasTenantSelected" class="mb-6">
        <FigAlert type="warning">
          <template #title>No Organisation Selected</template>
          Please select an organisation from the dropdown above to manage VAT.
        </FigAlert>
      </div>

      <!-- VAT Not Enabled Warning -->
      <div v-else-if="!companyVatEnabled" class="mb-6">
        <FigAlert type="info">
          <template #title>VAT Not Enabled</template>
          <div class="flex items-center justify-between">
            <span>Enable VAT registration in company settings to access VAT management.</span>
            <FigButton 
              size="sm" 
              variant="soft"
              @click="router.push('/settings/company')"
            >
              Go to Settings
            </FigButton>
          </div>
        </FigAlert>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-6">
        <!-- HMRC Connection Prompt -->
        <div v-if="!hmrcConnected && !manualSetupComplete" class="mb-8">
          <FigCard>
            <div class="p-12 text-center">
              <Icon name="noto:flag-united-kingdom" class="mx-auto h-16 w-16 mb-6" />
              <h2 class="text-xl font-semibold text-neutral-900 mb-3">Connect to HMRC for Automated VAT Management</h2>
              <p class="text-neutral-600 mb-8 max-w-2xl mx-auto">
                Connect your HMRC account to automatically sync VAT obligations, submit returns, and stay compliant with Making Tax Digital requirements.
              </p>
              <div class="flex items-center justify-center gap-4">
                <FigButton
                  size="lg"
                  color="primary"
                  @click="router.push('/settings/integrations')"
                >
                  <Icon name="heroicons:link" class="h-5 w-5 mr-2" />
                  Connect HMRC Account
                </FigButton>
                <FigButton
                  size="lg"
                  variant="soft"
                  @click="startManualSetup"
                >
                  Set Up Manually
                </FigButton>
              </div>
            </div>
          </FigCard>
        </div>

        <!-- VAT Configuration Section -->
        <FigCard v-if="hmrcConnected || manualSetupComplete">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">VAT Configuration</h3>
                <p class="text-sm text-neutral-500 mt-1">
                  {{ hmrcConnected ? 'Connected to HMRC' : 'Manual configuration' }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <FigBadge v-if="hmrcConnected" color="success">
                  <Icon name="heroicons:check-circle" class="h-4 w-4 mr-1" />
                  HMRC Connected
                </FigBadge>
                <FigButton 
                  v-if="!hmrcConnected"
                  size="sm"
                  variant="soft"
                  @click="router.push('/settings/integrations')"
                >
                  Connect HMRC
                </FigButton>
              </div>
            </div>
          </template>

          <div class="p-6 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p class="text-sm text-neutral-500">Frequency</p>
                <p class="font-medium">{{ vatConfig?.frequency || 'Not set' }}</p>
              </div>
              <div v-if="vatConfig?.frequency === 'quarterly'">
                <p class="text-sm text-neutral-500">Stagger Group</p>
                <p class="font-medium">Group {{ vatConfig?.staggerGroup || 'Not set' }}</p>
              </div>
              <div>
                <p class="text-sm text-neutral-500">Registration Date</p>
                <p class="font-medium">{{ formatDate(vatConfig?.registrationDate) || 'Not set' }}</p>
              </div>
            </div>
            
            <div v-if="hmrcConnected" class="pt-4 border-t">
              <div class="flex items-center justify-between text-sm">
                <span class="text-neutral-500">Last synced: {{ hmrcLastSync || 'Never' }}</span>
                <button 
                  @click="syncHmrc" 
                  class="text-primary-600 hover:text-primary-700 font-medium"
                  :disabled="syncing"
                >
                  {{ syncing ? 'Syncing...' : 'Sync now' }}
                </button>
              </div>
            </div>
          </div>
        </FigCard>

        <!-- VAT Periods Table -->
        <FigCard v-if="hmrcConnected || manualSetupComplete">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold">VAT Periods</h3>
                <p class="text-sm text-neutral-500 mt-1">Your VAT return periods and submission status</p>
              </div>
              <FigButton 
                v-if="!hmrcConnected"
                size="sm"
                variant="solid"
                color="primary"
                @click="showAddPeriodModal = true"
              >
                <Icon name="heroicons:plus" class="h-4 w-4 mr-1" />
                Add Period
              </FigButton>
            </div>
          </template>

          <!-- Loading State -->
          <div v-if="loading" class="space-y-4 p-6">
            <FigSkeleton height="h-12" />
            <FigSkeleton height="h-12" />
            <FigSkeleton height="h-12" />
          </div>

          <!-- Periods Table -->
          <div v-else-if="periods.length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-neutral-50 border-y">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th class="relative px-6 py-3">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                <tr v-for="period in periods" :key="period.id" class="hover:bg-neutral-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {{ formatPeriod(period) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                    {{ formatDate(period.submissionDeadline) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <VatPeriodStatusBadge :status="period.status" />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {{ period.source === 'hmrc_connected' ? 'HMRC' : 'Manual' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <FigButton 
                      size="sm"
                      variant="ghost"
                      @click="viewPeriod(period)"
                    >
                      View
                    </FigButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div v-else class="p-12 text-center">
            <Icon name="heroicons:calendar" class="mx-auto h-12 w-12 text-neutral-400 mb-4" />
            <h3 class="text-sm font-semibold text-neutral-900 mb-1">No VAT periods</h3>
            <p class="text-sm text-neutral-500 mb-4">
              {{ hmrcConnected ? 'No VAT periods found. Try syncing with HMRC.' : 'Add your first VAT period to get started.' }}
            </p>
            <FigButton
              v-if="!hmrcConnected"
              size="sm"
              color="primary"
              @click="showAddPeriodModal = true"
            >
              Add First Period
            </FigButton>
          </div>
        </FigCard>
      </div>

      <!-- Manual Setup Wizard -->
      <!-- <VatSetupWizard 
        v-model="showSetupWizard"
        @complete="handleSetupComplete"
      /> -->

      <!-- Add Period Modal -->
      <!-- <AddVatPeriodModal 
        v-model="showAddPeriodModal"
        @success="fetchPeriods"
      /> -->
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FigContainer, FigCard, FigButton, FigAlert, FigBadge, FigSkeleton } from '@figgy/ui'
import { format } from 'date-fns'
import type { VatPeriod } from '@figgy/vat'

// Page metadata
definePageMeta({
  middleware: ['auth']
})

// Composables
const router = useRouter()
const toast = useToast()
const $trpc = useTrpc()
const tenantStore = useTenantStore()

// State
const loading = ref(true)
const syncing = ref(false)
const companyVatEnabled = ref(false)
const hmrcConnected = ref(false)
const hmrcLastSync = ref<string | null>(null)
const manualSetupComplete = ref(false)
const showSetupWizard = ref(false)
const showAddPeriodModal = ref(false)
const periods = ref<VatPeriod[]>([])
const vatConfig = ref<any>(null)

// Computed
const hasTenantSelected = computed(() => {
  return !!tenantStore.selectedTenantId
})

// Methods
async function checkVatStatus() {
  if (!hasTenantSelected.value) return
  
  try {
    const company = await $trpc.tenant.getCompanyConfig.query()
    companyVatEnabled.value = company?.vat?.isRegistered || false
    
    // Check if manual setup is complete
    const vatConfiguration = await $trpc.vat.getConfiguration.query()
    manualSetupComplete.value = !!vatConfiguration
    vatConfig.value = vatConfiguration
  } catch (error) {
    console.error('Failed to check VAT status:', error)
  }
}

async function checkHmrcConnection() {
  if (!hasTenantSelected.value) return
  
  try {
    // TODO: Implement HMRC connection check
    // const connection = await $trpc.oauth.getConnection.query({ provider: 'hmrc' })
    // hmrcConnected.value = !!connection
    // hmrcLastSync.value = connection?.lastSync || null
  } catch (error) {
    console.error('Failed to check HMRC connection:', error)
  }
}

async function fetchPeriods() {
  if (!hasTenantSelected.value) return
  
  try {
    loading.value = true
    // TODO: Implement period fetching
    // const result = await $trpc.vat.listPeriods.query()
    // periods.value = result
  } catch (error) {
    console.error('Failed to fetch VAT periods:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to load VAT periods',
      color: 'error' as const,
    })
  } finally {
    loading.value = false
  }
}

async function syncHmrc() {
  try {
    syncing.value = true
    // TODO: Implement HMRC sync
    // await $trpc.vat.syncWithHmrc.mutate()
    toast.add({
      title: 'Sync Started',
      description: 'HMRC VAT sync has been initiated',
      color: 'success' as const,
    })
    await fetchPeriods()
  } catch (error) {
    toast.add({
      title: 'Sync Failed',
      description: 'Failed to sync with HMRC',
      color: 'error' as const,
    })
  } finally {
    syncing.value = false
  }
}

function startManualSetup() {
  showSetupWizard.value = true
}

function handleSetupComplete() {
  showSetupWizard.value = false
  manualSetupComplete.value = true
  fetchPeriods()
}

function viewPeriod(period: VatPeriod) {
  // TODO: Implement period view/edit
  toast.add({
    title: 'Coming Soon',
    description: 'Period details view will be available soon',
    color: 'primary' as const,
  })
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy')
}

function formatPeriod(period: VatPeriod): string {
  const start = format(new Date(period.periodStartDate), 'dd MMM')
  const end = format(new Date(period.periodEndDate), 'dd MMM yyyy')
  return `${start} - ${end}`
}

// Lifecycle
onMounted(async () => {
  if (hasTenantSelected.value) {
    await checkVatStatus()
    await checkHmrcConnection()
    if (companyVatEnabled.value && (hmrcConnected.value || manualSetupComplete.value)) {
      await fetchPeriods()
    }
  }
})

// Watch for tenant changes
watch(() => tenantStore.selectedTenantId, async (newTenantId) => {
  if (newTenantId) {
    await checkVatStatus()
    await checkHmrcConnection()
    if (companyVatEnabled.value && (hmrcConnected.value || manualSetupComplete.value)) {
      await fetchPeriods()
    }
  } else {
    companyVatEnabled.value = false
    hmrcConnected.value = false
    periods.value = []
  }
})
</script>