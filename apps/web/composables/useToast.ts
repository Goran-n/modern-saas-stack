export interface Toast {
  id?: string;
  title: string;
  description?: string;
  icon?: string;
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "neutral"
    | "info";
  timeout?: number;
}

interface ToastStore {
  toasts: Ref<Toast[]>;
  add: (toast: Toast) => void;
  remove: (id: string) => void;
}

const toastStore: ToastStore = {
  toasts: ref<Toast[]>([]),
  add(toast: Toast) {
    const id = toast.id || Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    this.toasts.value.push(newToast);

    if (toast.timeout !== 0) {
      setTimeout(() => {
        this.remove(id);
      }, toast.timeout || 5000);
    }
  },
  remove(id: string) {
    const index = this.toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      this.toasts.value.splice(index, 1);
    }
  },
};

export const useToast = () => {
  return {
    toasts: readonly(toastStore.toasts),
    add: toastStore.add.bind(toastStore),
    remove: toastStore.remove.bind(toastStore),
  };
};
