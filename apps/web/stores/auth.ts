export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();

  // State
  const isLoading = ref(false);
  const user = ref<User | null>(null);

  // Actions
  async function signIn(email: string, password: string) {
    try {
      isLoading.value = true;
      // TODO: Implement actual sign in logic
      console.log("Signing in:", email);
    } finally {
      isLoading.value = false;
    }
  }

  async function signUp(email: string, password: string) {
    try {
      isLoading.value = true;
      // TODO: Implement actual sign up logic
      console.log("Signing up:", email);
    } finally {
      isLoading.value = false;
    }
  }

  async function signOut() {
    try {
      isLoading.value = true;
      user.value = null;
      await router.push("/");
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading: readonly(isLoading),
    user: readonly(user),
    signIn,
    signUp,
    signOut,
  };
});