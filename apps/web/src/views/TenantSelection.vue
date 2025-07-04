<template>
  <div class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto">
      <div class="text-center">
        <h2 class="text-3xl font-extrabold text-slate-900">
          Select a workspace
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          Choose which workspace you'd like to access
        </p>
      </div>

      <div
        v-if="loading"
        class="mt-8 text-center"
      >
        <div class="text-slate-600">
          Loading workspaces...
        </div>
      </div>

      <div
        v-else-if="error"
        class="mt-8 text-center"
      >
        <div class="text-red-600">
          {{ error }}
        </div>
      </div>

      <div
        v-else-if="!hasTenantsAccess"
        class="mt-8 text-center"
      >
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-slate-900 mb-2">
            No workspaces found
          </h3>
          <p class="text-slate-600 mb-4">
            You don't have access to any workspaces yet. Create your first workspace to get started.
          </p>
          <button
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            @click="showCreateModal = true"
          >
            Create workspace
          </button>
        </div>
      </div>

      <div
        v-else
        class="mt-8 space-y-4"
      >
        <div
          v-for="workspace in tenantMemberships"
          :key="workspace.workspace.id"
          class="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-slate-200"
          @click="selectTenant(workspace.workspace.id)"
        >
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-slate-900">
                  {{ workspace.workspace.name }}
                </h3>
                <p class="text-sm text-slate-600">
                  {{ workspace.workspace.email }}
                </p>
                <div class="mt-2">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getRoleBadgeClass(workspace.membership.role)"
                  >
                    {{ workspace.membership.role }}
                  </span>
                </div>
              </div>
              <div class="text-slate-400">
                <svg
                  class="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Workspace Creation Modal -->
    <WorkspaceCreateModal
      :is-open="showCreateModal"
      @close="showCreateModal = false"
      @created="handleWorkspaceCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspace'
import WorkspaceCreateModal from '../components/WorkspaceCreateModal.vue'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const showCreateModal = ref(false)

const tenantMemberships = computed(() => workspaceStore.workspaces)
const loading = computed(() => workspaceStore.loading)
const error = computed(() => workspaceStore.error)
const hasTenantsAccess = computed(() => workspaceStore.hasWorkspaces)

onMounted(async () => {
  await workspaceStore.loadWorkspaces()
})

const selectTenant = (tenantId: string) => {
  if (workspaceStore.selectWorkspace(tenantId)) {
    router.push('/')
  }
}

const handleWorkspaceCreated = (workspace: { id: string; name: string; slug: string }) => {
  console.log('Workspace created:', workspace)
  // The tenant store will auto-select the new workspace
  // Navigate to home after successful creation
  router.push('/')
}

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-800'
    case 'admin':
      return 'bg-blue-100 text-blue-800'
    case 'member':
      return 'bg-green-100 text-green-800'
    case 'viewer':
      return 'bg-slate-100 text-slate-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}
</script>