<template>
  <div class="px-4 py-6 sm:px-0">
    <div class="space-y-6">
      <!-- Welcome Section -->
      <div class="text-center py-12">
        <h2 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Welcome to Kibly
        </h2>
        <p class="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
          Your multi-tenant accounting integration platform
        </p>
        
        <!-- Action buttons -->
        <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            @click="navigateToIntegrations"
          >
            <svg
              class="-ml-0.5 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
              />
            </svg>
            Manage Integrations
          </button>
          
          <button
            class="inline-flex items-center rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors"
            @click="navigateToAccounts"
          >
            <svg
              class="-ml-0.5 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
            View Accounts
          </button>
          
          <button
            class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
            @click="navigateToContacts"
          >
            <svg
              class="-ml-0.5 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            View Contacts
          </button>
          
          <button
            class="inline-flex items-center rounded-md bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 transition-colors"
            @click="toggleDebugInfo"
          >
            <svg
              class="-ml-0.5 mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l3.5-1.75a.75.75 0 000-1.342l-3.5-1.75a.75.75 0 00-1.063.853l.708 2.836z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {{ showDebugInfo ? 'Hide' : 'Show' }} App State
          </button>
        </div>
      </div>

      <!-- Debug Info Section -->
      <div
        v-if="showDebugInfo && debugInfo"
        class="max-w-4xl mx-auto"
      >
        <div class="bg-white shadow-lg rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              Application State
            </h3>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- App Status -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">
                  App Status
                </h4>
                <dl class="space-y-2">
                  <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">
                      Phase:
                    </dt>
                    <dd class="text-sm font-medium">
                      <span :class="getPhaseClass(debugInfo.phase)">
                        {{ debugInfo.phase }}
                      </span>
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">
                      Ready:
                    </dt>
                    <dd class="text-sm font-medium">
                      <span :class="debugInfo.isReady ? 'text-green-600' : 'text-red-600'">
                        {{ debugInfo.isReady ? 'Yes' : 'No' }}
                      </span>
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">
                      Authenticated:
                    </dt>
                    <dd class="text-sm font-medium">
                      <span :class="debugInfo.isAuthenticated ? 'text-green-600' : 'text-red-600'">
                        {{ debugInfo.isAuthenticated ? 'Yes' : 'No' }}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">
                  Workspace Info
                </h4>
                <dl class="space-y-2">
                  <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">
                      Workspace:
                    </dt>
                    <dd class="text-sm font-medium text-gray-900">
                      {{ debugInfo.workspaceName || 'None' }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">
                      Workspace ID:
                    </dt>
                    <dd class="text-sm font-mono text-gray-600 text-xs">
                      {{ debugInfo.workspaceId || 'None' }}
                    </dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">
                      Integrations:
                    </dt>
                    <dd class="text-sm font-medium text-gray-900">
                      {{ debugInfo.integrationCount }}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Initialization Log -->
            <div v-if="debugInfo.initializationLog && debugInfo.initializationLog.length > 0">
              <h4 class="text-sm font-medium text-gray-700 mb-2">
                Initialization Timeline
              </h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="space-y-2">
                  <div
                    v-for="(log, index) in debugInfo.initializationLog"
                    :key="index" 
                    class="flex items-center space-x-3 text-sm"
                  >
                    <span :class="log.success ? 'text-green-500' : 'text-red-500'">
                      {{ log.success ? '✓' : '✗' }}
                    </span>
                    <span class="text-gray-700 font-medium">{{ log.phase }}</span>
                    <span class="text-gray-500 text-xs">
                      {{ formatTimestamp(log.timestamp) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Errors -->
            <div v-if="debugInfo.errors && debugInfo.errors.length > 0">
              <h4 class="text-sm font-medium text-gray-700 mb-2">
                Errors
              </h4>
              <div class="bg-red-50 rounded-lg p-4">
                <ul class="space-y-1">
                  <li
                    v-for="(error, index) in debugInfo.errors"
                    :key="index" 
                    class="text-sm text-red-700"
                  >
                    • {{ error }}
                  </li>
                </ul>
              </div>
            </div>

            <!-- Raw Data Toggle -->
            <div>
              <button
                class="text-sm text-gray-500 hover:text-gray-700"
                @click="showRawData = !showRawData"
              >
                {{ showRawData ? 'Hide' : 'Show' }} Raw Data
              </button>
              <div
                v-if="showRawData"
                class="mt-2"
              >
                <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">{{ JSON.stringify(debugInfo, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApp } from '../composables/useApp'

const router = useRouter()
const app = useApp()
const showDebugInfo = ref(false)
const showRawData = ref(false)
const debugInfo = ref<any>(null)

const navigateToIntegrations = () => {
  router.push({ name: 'Integrations' })
}

const navigateToAccounts = () => {
  router.push({ name: 'Accounts' })
}

const navigateToContacts = () => {
  router.push({ name: 'Contacts' })
}

const toggleDebugInfo = () => {
  if (!showDebugInfo.value) {
    debugInfo.value = app.getDebugInfo()
  }
  showDebugInfo.value = !showDebugInfo.value
}

const getPhaseClass = (phase: string) => {
  const classes: Record<string, string> = {
    'completed': 'text-green-600 font-medium',
    'ready': 'text-green-600 font-medium',
    'loading': 'text-blue-600 font-medium',
    'initializing': 'text-blue-600 font-medium',
    'error': 'text-red-600 font-medium',
    'failed': 'text-red-600 font-medium'
  }
  return classes[phase.toLowerCase()] || 'text-gray-600'
}

const formatTimestamp = (timestamp: string | Date) => {
  if (!timestamp) return ''
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleTimeString()
}
</script>