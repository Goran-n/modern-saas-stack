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
        <h1 class="text-3xl font-bold text-neutral-900">Team Members</h1>
        <p class="mt-2 text-neutral-600">
          Manage your team members and their permissions
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading || tenantLoading" class="space-y-4">
        <FigSkeleton height="xl" />
        <FigSkeleton height="h-96" />
      </div>

      <!-- No Tenant Selected -->
      <FigAlert 
        v-else-if="!selectedTenantId"
        color="warning"
        variant="subtle"
        title="No workspace selected"
        description="Please select a workspace to manage team members"
      >
        <template #action>
          <FigButton 
            size="sm"
            @click="router.push('/')"
          >
            Select Workspace
          </FigButton>
        </template>
      </FigAlert>

      <!-- Error State -->
      <FigAlert 
        v-else-if="error"
        color="error"
        variant="subtle"
        title="Error loading team members"
        :description="error?.message || 'Failed to load team data'"
      />

      <!-- Team Members Card -->
      <FigCard v-else class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold">Members</h3>
              <p class="text-sm text-neutral-500 mt-1">Current team members and their roles</p>
            </div>
        <FigButton 
          v-if="canInvite"
          @click="handleInviteClick"
          size="sm"
          variant="solid"
          color="primary"
        >
          <Icon name="heroicons:plus" class="h-4 w-4 mr-1" />
          Invite Member
        </FigButton>
          </div>
        </template>
        
        <!-- Members List -->
        <div class="divide-y divide-neutral-200">
        <div 
          v-for="member in members" 
          :key="member.id"
          class="flex items-center justify-between px-6 py-4"
        >
          <div class="flex items-center gap-3">
            <FigAvatar size="md" :alt="member.user?.name || member.user?.email || 'User'">
              <span class="text-sm font-medium text-primary-700">
                {{ getInitials(member.user?.name || member.user?.email || '') }}
              </span>
            </FigAvatar>
            <div>
              <p class="text-sm font-medium text-neutral-900">
                {{ member.user?.name || 'Unknown' }}
              </p>
              <p class="text-sm text-neutral-500">
                {{ member.user?.email || 'No email' }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <FigBadge :variant="getRoleVariant(member.role) as any" size="sm">
              {{ formatRole(member.role) }}
            </FigBadge>
            
            <FigButton 
              v-if="canManageMembers && member.id !== currentUser?.id && member.role !== 'owner'"
              variant="ghost" 
              size="sm" 
              color="error"
              @click="removeMember(member)"
            >
              Remove
            </FigButton>
          </div>
        </div>
          
          <!-- Empty State -->
          <FigEmptyState
            v-if="members.length === 0"
            type="empty"
            title="No team members yet"
            description="Invite team members to collaborate on your workspace"
            :primary-action="canInvite ? {
              label: 'Invite Member',
              onClick: () => showInviteModal = true
            } : undefined"
          />
        </div>
      </FigCard>

      <!-- Pending Invitations -->
      <FigCard v-if="invitations.length > 0 && !loading">
        <template #header>
          <div>
            <h3 class="text-lg font-semibold">Pending Invitations</h3>
            <p class="text-sm text-neutral-500 mt-1">Invitations awaiting acceptance</p>
          </div>
        </template>
        
        <div class="divide-y divide-neutral-200">
          <div 
            v-for="invitation in invitations" 
            :key="invitation.id"
            class="flex items-center justify-between px-6 py-4"
          >
          <div>
            <p class="text-sm font-medium text-neutral-900">
              {{ invitation.email }}
            </p>
            <p class="text-sm text-neutral-500">
              Invited by {{ invitation.inviterName }} • Expires {{ formatDate(invitation.expiresAt) }}
            </p>
          </div>
          
          <div class="flex items-center gap-3">
            <FigBadge variant="soft" size="sm">
              {{ formatRole(invitation.role) }}
            </FigBadge>
            
            <FigButton
              variant="ghost"
              size="sm"
              @click="resendInvitation(invitation.id)"
              :loading="resendingId === invitation.id"
            >
              Resend
            </FigButton>
            
            <FigButton
              variant="ghost"
              size="sm"
              color="error"
              @click="cancelInvitation(invitation.id)"
              :loading="cancellingId === invitation.id"
            >
              Cancel
            </FigButton>
            </div>
          </div>
        </div>
      </FigCard>

    <!-- Invite Member Modal -->
    <FigModal v-model="showInviteModal" size="md">
      <template #header>
        <h3 class="text-lg font-semibold text-neutral-900">Invite Team Member</h3>
        <p class="mt-1 text-sm text-neutral-500">
          Send an invitation to join your team
        </p>
      </template>
      
      <form @submit.prevent="sendInvitation" class="space-y-4">
        <FigFormField 
          label="Email address" 
          :error="inviteErrors.email"
          required
        >
          <FigInput 
            v-model="inviteForm.email"
            type="email"
            placeholder="colleague@company.com"
            :disabled="sendingInvite"
          />
        </FigFormField>
        
        <FigFormField 
          label="Role"
          description="Choose the level of access for this team member"
        >
          <FigSelect
            v-model="inviteForm.role"
            :options="roleOptions"
            :disabled="sendingInvite"
          />
        </FigFormField>
        
        <div class="flex justify-end gap-3 pt-4">
          <FigButton 
            variant="ghost" 
            @click="showInviteModal = false"
            :disabled="sendingInvite"
          >
            Cancel
          </FigButton>
          <FigButton 
            type="submit" 
            :loading="sendingInvite"
          >
            Send Invitation
          </FigButton>
        </div>
      </form>
    </FigModal>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import {
  FigAlert,
  FigAvatar,
  FigBadge,
  FigButton,
  FigCard,
  FigContainer,
  FigEmptyState,
  FigFormField,
  FigInput,
  FigModal,
  FigSelect,
  FigSkeleton,
} from '@figgy/ui';
import { formatDistanceToNow } from 'date-fns';

// Router
const router = useRouter();

// Auth and permissions
const currentUser = useSupabaseUser();
const tenantStore = useTenantStore();
const currentTenant = computed(() => tenantStore.selectedTenant);
const selectedTenantId = computed(() => tenantStore.selectedTenantId);
const tenantLoading = computed(() => tenantStore.isLoading);
const $trpc = useTrpc();
const { can, permissions, currentMember } = usePermissions();
const toast = useToast();

// Data
const members = ref<any[]>([]);
const invitations = ref<any[]>([]);
const loading = ref(false);
const error = ref<Error | null>(null);
const sendingInvite = ref(false);
const resendingId = ref<string | null>(null);
const cancellingId = ref<string | null>(null);

// Modal state
const showInviteModal = ref(false);

// Form data
const inviteForm = reactive({
  email: '',
  role: 'member' as 'viewer' | 'member' | 'admin',
});

const inviteErrors = reactive({
  email: '',
});

// Role options for select
const roleOptions = [
  { value: 'viewer', label: 'Viewer - Can view data' },
  { value: 'member', label: 'Member - Can view and edit data' },
  { value: 'admin', label: 'Admin - Can manage team and settings' },
];

// Computed
const canInvite = computed(() => can.inviteMembers.value);
const canManageMembers = computed(() => can.updateMembers.value);

// Methods
function handleInviteClick() {
  console.log('Invite button clicked');
  console.log('canInvite:', canInvite.value);
  console.log('currentMember:', currentMember.value);
  console.log('currentMember role:', currentMember.value?.role);
  console.log('permissions:', permissions.value);
  console.log('can object:', can);
  showInviteModal.value = true;
  console.log('showInviteModal:', showInviteModal.value);
}

async function loadTeamData() {
  console.log('loadTeamData - currentTenant:', currentTenant.value);
  console.log('loadTeamData - selectedTenantId:', selectedTenantId.value);
  
  if (!currentTenant.value || !selectedTenantId.value) {
    console.log('No current tenant selected, skipping load');
    return;
  }
  
  loading.value = true;
  error.value = null;
  try {
    // Load team members
    const [membersData, invitationsData] = await Promise.all([
      $trpc.users.list.query(),
      $trpc.invitations.list.query(),
    ]);
    
    // For now, map users to a member structure
    // In future, this should come from a proper members endpoint
    members.value = membersData.map((user: any) => {
      // Check if this user is in userTenants to get their actual role
      const userTenant = tenantStore.userTenants.find(
        ut => ut.userId === user.id && ut.tenantId === selectedTenantId.value
      );
      
      return {
        id: user.id,
        userId: user.id,
        role: userTenant?.role || (user.id === currentUser.value?.id ? 'owner' : 'member'),
        user,
      };
    });
    
    invitations.value = invitationsData;
  } catch (err) {
    error.value = err as Error;
    toast.add({
      title: 'Error',
      description: 'Failed to load team data',
      color: 'error'
    });
  } finally {
    loading.value = false;
  }
}

async function sendInvitation() {
  // Reset errors
  inviteErrors.email = '';
  
  // Validate
  if (!inviteForm.email) {
    inviteErrors.email = 'Email is required';
    return;
  }
  
  if (!isValidEmail(inviteForm.email)) {
    inviteErrors.email = 'Please enter a valid email address';
    return;
  }
  
  sendingInvite.value = true;
  try {
    await $trpc.invitations.send.mutate({
      email: inviteForm.email,
      role: inviteForm.role,
    });
    
    toast.add({
      title: 'Success',
      description: 'Invitation sent successfully',
      color: 'success'
    });
    
    // Reset form
    inviteForm.email = '';
    inviteForm.role = 'member';
    showInviteModal.value = false;
    
    // Reload invitations
    await loadTeamData();
  } catch (error: any) {
    if (error.message?.includes('already been sent')) {
      inviteErrors.email = 'An invitation has already been sent to this email';
    } else {
      toast.add({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        color: 'error'
      });
    }
  } finally {
    sendingInvite.value = false;
  }
}

async function resendInvitation(invitationId: string) {
  resendingId.value = invitationId;
  try {
    await $trpc.invitations.resend.mutate({ invitationId });
    toast.add({
      title: 'Success',
      description: 'Invitation resent',
      color: 'success'
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to resend invitation',
      color: 'error'
    });
  } finally {
    resendingId.value = null;
  }
}

async function cancelInvitation(invitationId: string) {
  cancellingId.value = invitationId;
  try {
    await $trpc.invitations.cancel.mutate({ invitationId });
    toast.add({
      title: 'Success',
      description: 'Invitation cancelled',
      color: 'success'
    });
    await loadTeamData();
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to cancel invitation',
      color: 'error'
    });
  } finally {
    cancellingId.value = null;
  }
}

function removeMember(_member: any) {
  // TODO: Implement member removal
  toast.add({
    title: 'Info',
    description: 'Member removal coming soon',
    color: 'primary'
  });
}

// Utility functions
function getInitials(name: string): string {
  const parts = name.split(/[\s@]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.substring(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleVariant(role: string): string {
  switch (role) {
    case 'owner':
      return 'solid';
    case 'admin':
      return 'soft';
    default:
      return 'outline';
  }
}

function formatDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Watch for tenant changes
watch(selectedTenantId, (newTenantId) => {
  console.log('Tenant changed:', newTenantId);
  if (newTenantId) {
    loadTeamData();
  }
});

// Load data on mount if tenant is already selected
onMounted(async () => {
  console.log('Team page mounted');
  console.log('Current tenant on mount:', currentTenant.value);
  console.log('Selected tenant ID:', selectedTenantId.value);
  console.log('Tenant loading:', tenantLoading.value);
  // console.log('User tenants:', tenantStore.userTenants);
  // console.log('Current user:', currentUser.value);
  // console.log('Initial canInvite:', canInvite.value);
  
  // If tenants are still loading, wait for them
  if (tenantLoading.value) {
    console.log('Waiting for tenants to load...');
    // Wait for tenants to finish loading
    const unwatch = watch(tenantLoading, (loading) => {
      if (!loading) {
        console.log('Tenants loaded, checking selection');
        unwatch();
        if (selectedTenantId.value) {
          loadTeamData();
        } else {
          console.warn('No tenant selected after loading');
          // Try to fetch tenants if not already done
          tenantStore.fetchUserTenants();
        }
      }
    });
  } else if (selectedTenantId.value) {
    loadTeamData();
  } else {
    console.log('No tenant selected on mount, fetching tenants...');
    // Try to fetch tenants if not already done
    await tenantStore.fetchUserTenants();
  }
});

// Page meta
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});
</script>