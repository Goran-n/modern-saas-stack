<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-gray-900">Email Integration</h2>
        <p class="mt-1 text-sm text-gray-500">
          Connect your email accounts to automatically import invoices and receipts
        </p>
      </div>
      <UButton
        v-if="hasAdminAccess"
        @click="showAddConnection = true"
        icon="i-heroicons-plus"
        size="lg"
      >
        Connect Email
      </UButton>
    </div>

    <!-- Connection List -->
    <div v-if="connections.length > 0" class="space-y-4">
      <UCard
        v-for="connection in connections"
        :key="connection.id"
        class="p-6"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <Icon
                :name="getProviderIcon(connection.provider)"
                class="h-10 w-10"
                :class="getProviderColor(connection.provider)"
              />
            </div>
            <div>
              <h3 class="text-lg font-medium text-gray-900">
                {{ connection.emailAddress }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ getProviderName(connection.provider) }}
              </p>
              <div class="mt-2 flex items-center space-x-4 text-sm">
                <UBadge
                  :color="connection.status === 'active' ? 'green' : 'red'"
                  variant="subtle"
                >
                  {{ connection.status }}
                </UBadge>
                <span v-if="connection.lastSyncAt" class="text-gray-500">
                  Last sync: {{ formatDate(connection.lastSyncAt) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <UButton
              v-if="connection.status === 'active'"
              @click="syncConnection(connection.id)"
              icon="i-heroicons-arrow-path"
              variant="ghost"
              :loading="syncing === connection.id"
            >
              Sync
            </UButton>
            <UDropdown
              :items="[
                [{
                  label: 'Settings',
                  icon: 'i-heroicons-cog-6-tooth',
                  click: () => editConnection(connection),
                }],
                [{
                  label: 'View Activity',
                  icon: 'i-heroicons-chart-bar',
                  click: () => viewStats(connection.id),
                }],
                [{
                  label: 'Disconnect',
                  icon: 'i-heroicons-trash',
                  click: () => confirmDelete(connection),
                }],
              ]"
            >
              <UButton
                icon="i-heroicons-ellipsis-horizontal"
                variant="ghost"
                color="gray"
              />
            </UDropdown>
          </div>
        </div>

        <!-- Connection Details -->
        <div v-if="connection.folderFilter.length > 0 || connection.senderFilter.length > 0" class="mt-4 border-t pt-4">
          <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 text-sm">
            <div v-if="connection.folderFilter.length > 0">
              <dt class="text-gray-500">Folders:</dt>
              <dd class="text-gray-900">{{ connection.folderFilter.join(', ') }}</dd>
            </div>
            <div v-if="connection.senderFilter.length > 0">
              <dt class="text-gray-500">Senders:</dt>
              <dd class="text-gray-900">{{ connection.senderFilter.join(', ') }}</dd>
            </div>
          </dl>
        </div>

        <!-- Error Message -->
        <UAlert
          v-if="connection.lastError"
          color="red"
          variant="subtle"
          class="mt-4"
          :title="connection.lastError"
        />
      </UCard>
    </div>

    <!-- Empty State -->
    <UCard v-else class="p-12 text-center">
      <Icon name="i-heroicons-envelope" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-semibold text-gray-900">No email connections</h3>
      <p class="mt-1 text-sm text-gray-500">
        Connect your email accounts to automatically import invoices and receipts.
      </p>
      <UButton
        v-if="hasAdminAccess"
        @click="showAddConnection = true"
        icon="i-heroicons-plus"
        class="mt-5"
      >
        Connect Email Account
      </UButton>
    </UCard>

    <!-- Add Connection Modal -->
    <UModal v-model="showAddConnection" :ui="{ width: 'sm:max-w-md' }">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Connect Email Account</h3>
        </template>

        <div class="space-y-4">
          <UFormGroup label="Email Provider" required>
            <USelectMenu
              v-model="newConnection.provider"
              :options="providers"
              option-attribute="label"
              value-attribute="value"
            />
          </UFormGroup>

          <UFormGroup label="Email Address" required>
            <UInput
              v-model="newConnection.emailAddress"
              type="email"
              placeholder="receipts@company.com"
            />
          </UFormGroup>

          <UFormGroup label="Folders to Monitor" help="Leave empty to monitor all folders">
            <USelectMenu
              v-model="newConnection.folderFilter"
              :options="['INBOX', 'Receipts', 'Invoices', 'Purchases']"
              multiple
              placeholder="Select folders..."
            />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end space-x-3">
            <UButton
              @click="showAddConnection = false"
              variant="ghost"
              color="gray"
            >
              Cancel
            </UButton>
            <UButton
              @click="createConnection"
              :loading="creating"
              :disabled="!newConnection.provider || !newConnection.emailAddress"
            >
              Continue
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- IMAP Credentials Modal -->
    <UModal v-model="showIMAPModal" :ui="{ width: 'sm:max-w-md' }">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">IMAP Configuration</h3>
        </template>

        <div class="space-y-4">
          <UAlert
            title="App-specific password required"
            description="For Gmail and Outlook, you'll need to generate an app-specific password instead of using your regular password."
            color="blue"
            variant="subtle"
          />

          <UFormGroup label="IMAP Server" required>
            <UInput
              v-model="imapCredentials.host"
              placeholder="imap.gmail.com"
            />
          </UFormGroup>

          <UFormGroup label="Port" required>
            <UInput
              v-model.number="imapCredentials.port"
              type="number"
              placeholder="993"
            />
          </UFormGroup>

          <UFormGroup label="Username" required>
            <UInput
              v-model="imapCredentials.username"
              placeholder="user@example.com"
            />
          </UFormGroup>

          <UFormGroup label="Password" required>
            <UInput
              v-model="imapCredentials.password"
              type="password"
              placeholder="App-specific password"
            />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end space-x-3">
            <UButton
              @click="showIMAPModal = false"
              variant="ghost"
              color="gray"
            >
              Cancel
            </UButton>
            <UButton
              @click="saveIMAPCredentials"
              :loading="savingIMAP"
            >
              Connect
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from "~/utils/date";

// Auth composables
const user = useSupabaseUser();
const tenantStore = useTenantStore();
const hasAdminAccess = computed(() => {
  const userTenants = tenantStore.userTenants;
  const selectedTenantId = tenantStore.selectedTenantId;
  const currentUserTenant = userTenants.find(ut => ut.tenantId === selectedTenantId);
  return currentUserTenant?.role === 'admin' || currentUserTenant?.role === 'owner';
});

// Data
interface EmailConnection {
  id: string;
  provider: 'gmail' | 'outlook' | 'imap';
  emailAddress: string;
  status: 'active' | 'inactive' | 'error';
  lastSyncAt?: string;
  lastError?: string;
  folderFilter: string[];
  senderFilter: string[];
}

const connections = ref<EmailConnection[]>([]);
const showAddConnection = ref(false);
const showIMAPModal = ref(false);
const creating = ref(false);
const syncing = ref<string | null>(null);
const savingIMAP = ref(false);

const providers = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook / Office 365' },
  { value: 'imap', label: 'Other (IMAP)' },
];

const newConnection = ref({
  provider: '',
  emailAddress: '',
  folderFilter: [],
  senderFilter: [],
  subjectFilter: [],
});

const imapCredentials = ref({
  connectionId: '',
  host: '',
  port: 993,
  username: '',
  password: '',
});

// Fetch connections
const { data, refresh } = await useTrpc().email.listConnections.useQuery();
watch(data, (newData) => {
  if (newData) {
    connections.value = newData;
  }
});

// Create connection
async function createConnection() {
  creating.value = true;
  try {
    const result = await $fetch('/api/trpc/email.createConnection', {
      method: 'POST',
      body: {
        ...newConnection.value,
      },
    });

    if (newConnection.value.provider === 'imap') {
      // Show IMAP credentials modal
      imapCredentials.value.connectionId = result.connectionId;
      imapCredentials.value.username = newConnection.value.emailAddress;
      showAddConnection.value = false;
      showIMAPModal.value = true;
    } else {
      // Redirect to OAuth
      const { authUrl } = await $fetch('/api/trpc/email.getOAuthUrl', {
        method: 'POST',
        body: {
          connectionId: result.connectionId,
          redirectUri: `${window.location.origin}/settings/email/callback`,
        },
      });
      
      window.location.href = authUrl;
    }
  } catch (error) {
    useToast().add({
      title: 'Error',
      description: 'Failed to create email connection',
      color: 'red',
    });
  } finally {
    creating.value = false;
  }
}

// Save IMAP credentials
async function saveIMAPCredentials() {
  savingIMAP.value = true;
  try {
    await $fetch('/api/trpc/email.setIMAPCredentials', {
      method: 'POST',
      body: imapCredentials.value,
    });
    
    showIMAPModal.value = false;
    await refresh();
    
    useToast().add({
      title: 'Success',
      description: 'Email account connected successfully',
      color: 'green',
    });
  } catch (error) {
    useToast().add({
      title: 'Error',
      description: 'Failed to connect to IMAP server',
      color: 'red',
    });
  } finally {
    savingIMAP.value = false;
  }
}

// Sync connection
async function syncConnection(connectionId: string) {
  syncing.value = connectionId;
  try {
    await $fetch('/api/trpc/email.syncConnection', {
      method: 'POST',
      body: { connectionId },
    });
    
    useToast().add({
      title: 'Success',
      description: 'Email sync started',
      color: 'green',
    });
  } catch (error) {
    useToast().add({
      title: 'Error',
      description: 'Failed to start sync',
      color: 'red',
    });
  } finally {
    syncing.value = null;
  }
}

// Helper functions
function getProviderIcon(provider: string) {
  switch (provider) {
    case 'gmail':
      return 'i-logos-google-gmail';
    case 'outlook':
      return 'i-logos-microsoft-icon';
    default:
      return 'i-heroicons-envelope';
  }
}

function getProviderName(provider: string) {
  switch (provider) {
    case 'gmail':
      return 'Gmail';
    case 'outlook':
      return 'Outlook / Office 365';
    default:
      return 'IMAP';
  }
}

function getProviderColor(provider: string) {
  switch (provider) {
    case 'gmail':
      return 'text-red-500';
    case 'outlook':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
}

function editConnection(connection: any) {
  // TODO: Implement edit modal
  console.log('Edit connection', connection);
}

function viewStats(connectionId: string) {
  // TODO: Navigate to stats page
  navigateTo(`/settings/email/${connectionId}/stats`);
}

function confirmDelete(connection: any) {
  // TODO: Implement delete confirmation
  console.log('Delete connection', connection);
}
</script>