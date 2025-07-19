export const useNotification = () => {
  const toast = useToast();

  return {
    success: (title: string, description?: string) => {
      toast.add({
        title,
        description,
        color: "success" as const,
        icon: "i-heroicons-check-circle",
      });
    },

    error: (title: string, description?: string) => {
      toast.add({
        title,
        description,
        color: "error" as const,
        icon: "i-heroicons-x-circle",
      });
    },

    info: (title: string, description?: string) => {
      toast.add({
        title,
        description,
        color: "info" as const,
        icon: "i-heroicons-information-circle",
      });
    },

    warning: (title: string, description?: string) => {
      toast.add({
        title,
        description,
        color: "warning" as const,
        icon: "i-heroicons-exclamation-triangle",
      });
    },
  };
};
