<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <Icon 
          name="i-heroicons-envelope" 
          class="mx-auto h-12 w-12 text-gray-400" 
        />
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
          Connecting Email Account
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          {{ statusMessage }}
        </p>
      </div>

      <div v-if="loading" class="flex justify-center">
        <USpinner size="lg" />
      </div>

      <UAlert
        v-else-if="error"
        color="red"
        variant="subtle"
        :title="error"
      />

      <div v-else-if="success" class="text-center space-y-4">
        <Icon 
          name="i-heroicons-check-circle" 
          class="mx-auto h-16 w-16 text-green-500" 
        />
        <p class="text-lg font-medium text-gray-900">
          Email account connected successfully!
        </p>
        <UButton
          @click="navigateTo('/settings/email')"
          icon="i-heroicons-arrow-left"
        >
          Back to Settings
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { $trpc } = useNuxtApp();

// State
const loading = ref(true);
const error = ref<string | null>(null);
const success = ref(false);
const statusMessage = ref('Processing authorization...');

// Process OAuth callback
onMounted(async () => {
  try {
    const provider = route.query.provider as string;
    const code = route.query.code as string;
    const state = route.query.state as string;
    const errorParam = route.query.error as string;

    if (errorParam) {
      throw new Error(errorParam === 'access_denied' 
        ? 'Authorization was denied' 
        : `OAuth error: ${errorParam}`
      );
    }

    if (!provider || !code || !state) {
      throw new Error('Missing required parameters');
    }

    statusMessage.value = 'Completing authorization...';

    // Handle OAuth callback
    await $trpc.email.handleOAuthCallback.mutate({
      provider: provider as 'gmail' | 'outlook',
      code,
      state,
    });

    success.value = true;
    statusMessage.value = 'Success!';

    // Auto-redirect after 2 seconds
    setTimeout(() => {
      navigateTo('/settings/email');
    }, 2000);

  } catch (err) {
    console.error('OAuth callback error:', err);
    error.value = err instanceof Error ? err.message : 'Failed to connect email account';
    statusMessage.value = 'An error occurred';
  } finally {
    loading.value = false;
  }
});
</script>