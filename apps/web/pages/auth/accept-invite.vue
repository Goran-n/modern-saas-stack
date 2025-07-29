<template>
  <div class="min-h-screen flex items-center justify-center bg-canvas px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-flex items-center gap-2">
          <div class="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <span class="text-white font-bold text-xl">F</span>
          </div>
          <span class="text-2xl font-bold text-primary-900">Figgy</span>
        </NuxtLink>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <FigSpinner size="lg" />
          <p class="mt-4 text-sm text-neutral-600">Loading invitation...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-100">
            <span class="text-2xl">❌</span>
          </div>
          <h2 class="mt-4 text-lg font-semibold text-neutral-900">Invalid Invitation</h2>
          <p class="mt-2 text-sm text-neutral-600">{{ error }}</p>
          <FigButton @click="navigateTo('/auth/login')" class="mt-6" variant="solid">
            Go to Login
          </FigButton>
        </div>

        <!-- Invitation Details -->
        <div v-else-if="invitation" class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <span class="text-2xl">👤</span>
          </div>
          
          <h2 class="mt-4 text-lg font-semibold text-neutral-900">
            You're invited to join {{ invitation.tenantName }}
          </h2>
          
          <p class="mt-2 text-sm text-neutral-600">
            {{ invitation.inviterName }} has invited you to join their team as 
            <span class="font-medium">{{ formatRole(invitation.role) }}</span>.
          </p>

          <!-- User is not logged in -->
          <div v-if="!user" class="mt-6 space-y-3">
            <p class="text-sm text-neutral-500">
              Please sign in or create an account to accept this invitation.
            </p>
            <FigButton 
              @click="signInWithInvite" 
              class="w-full"
              variant="solid"
            >
              Sign In to Accept
            </FigButton>
            <p class="text-xs text-neutral-500">
              This invitation will expire {{ formatDate(invitation.expiresAt) }}
            </p>
          </div>

          <!-- User is logged in but wrong email -->
          <div v-else-if="user.email !== invitation.email" class="mt-6 space-y-3">
            <div class="rounded-lg border border-warning-200 bg-warning-50 p-4">
              <p class="text-sm text-warning-800">
                This invitation was sent to <strong>{{ invitation.email }}</strong>, 
                but you're signed in as <strong>{{ user.email }}</strong>.
              </p>
            </div>
            <div class="flex gap-3">
              <FigButton 
                @click="signOut" 
                variant="outline"
                class="flex-1"
              >
                Sign Out
              </FigButton>
              <FigButton 
                @click="navigateTo('/dashboard')" 
                variant="solid"
                class="flex-1"
              >
                Go to Dashboard
              </FigButton>
            </div>
          </div>

          <!-- User can accept -->
          <div v-else class="mt-6 space-y-3">
            <FigButton 
              @click="acceptInvitation" 
              :loading="accepting"
              class="w-full"
              variant="solid"
            >
              Accept & Join Team
            </FigButton>
            <FigButton 
              @click="navigateTo('/dashboard')" 
              variant="ghost"
              class="w-full"
            >
              Cancel
            </FigButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  FigButton, 
  FigSpinner 
} from '@figgy/ui';
import { formatDistanceToNow } from 'date-fns';

// Get token from route
const route = useRoute();
const token = computed(() => route.query.token as string);

// Auth
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const $trpc = useTrpc();
const toast = useToast();

// State
const loading = ref(true);
const accepting = ref(false);
const error = ref('');
const invitation = ref<{
  email: string;
  tenantName: string;
  inviterName: string;
  role: string;
  expiresAt: Date;
} | null>(null);

// Load invitation details
async function loadInvitation() {
  if (!token.value) {
    error.value = 'No invitation token provided';
    loading.value = false;
    return;
  }

  try {
    const data = await $trpc.invitations.getByToken.query({ 
      token: token.value 
    });
    
    invitation.value = {
      email: data.email,
      tenantName: data.tenantName || '',
      inviterName: data.inviterName || '',
      role: data.role,
      expiresAt: data.expiresAt
    };
  } catch (err: any) {
    if (err.message?.includes('expired')) {
      error.value = 'This invitation has expired';
    } else if (err.message?.includes('already been accepted')) {
      error.value = 'This invitation has already been accepted';
    } else {
      error.value = 'This invitation is invalid or no longer available';
    }
  } finally {
    loading.value = false;
  }
}

// Sign in with redirect back to this page
async function signInWithInvite() {
  // Store the invitation token in session storage
  sessionStorage.setItem('pendingInvitationToken', token.value);
  
  // Redirect to sign in with return URL
  await navigateTo({
    path: '/auth/login',
    query: {
      redirectTo: `/auth/accept-invite?token=${token.value}`,
    },
  });
}

// Accept the invitation
async function acceptInvitation() {
  accepting.value = true;
  
  try {
    const result = await $trpc.invitations.accept.mutate({
      token: token.value,
      name: user.value?.user_metadata?.name,
    });
    
    if (result.success) {
      // Show success message
      toast.add({
        title: 'Success',
        description: 'Successfully joined the team!',
        color: 'success'
      });
      
      // Clear any stored invitation token
      sessionStorage.removeItem('pendingInvitationToken');
      
      // Redirect to dashboard with the new tenant selected
      await navigateTo({
        path: '/',
        query: {
          tenantId: result.tenantId,
        },
      });
    }
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to accept invitation',
      color: 'error'
    });
  } finally {
    accepting.value = false;
  }
}

// Sign out
async function signOut() {
  await supabase.auth.signOut();
  await navigateTo('/auth/login');
}

// Utilities
function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// Load invitation on mount
onMounted(() => {
  loadInvitation();
});

// Page meta
definePageMeta({
  layout: 'auth',
});
</script>