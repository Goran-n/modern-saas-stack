export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();

  // State
  const isLoading = ref(false);

  // Use Supabase composables directly in components/pages instead of storing in Pinia
  // This avoids SSR serialization issues

  async function signIn(email: string, password: string) {
    try {
      isLoading.value = true;
      const client = useSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function signUp(email: string, password: string) {
    try {
      isLoading.value = true;
      const client = useSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function signOut() {
    try {
      isLoading.value = true;
      const client = useSupabaseClient();
      const { error } = await client.auth.signOut();
      if (error) throw error;

      // Redirect to login after sign out
      await router.push("/auth/login");
    } finally {
      isLoading.value = false;
    }
  }

  async function resetPassword(email: string) {
    try {
      isLoading.value = true;
      const client = useSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
    } finally {
      isLoading.value = false;
    }
  }

  async function updatePassword(newPassword: string) {
    try {
      isLoading.value = true;
      const client = useSupabaseClient();
      const { error } = await client.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading: readonly(isLoading),
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };
});
