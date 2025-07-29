import type { InjectionKey, Ref } from 'vue';

export interface DialogContext {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
}

export const dialogInjectionKey: InjectionKey<DialogContext> = Symbol('fig-dialog');