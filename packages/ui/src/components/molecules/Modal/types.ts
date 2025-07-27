export interface ModalProps {
  /**
   * Whether the modal is open (v-model)
   */
  modelValue?: boolean;
  
  /**
   * Whether the modal is open (alternative to modelValue)
   */
  open?: boolean;

  /**
   * Modal size
   * @default 'md'
   */
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "full";

  /**
   * Modal title
   */
  title?: string;
  
  /**
   * Modal description (displayed below title)
   */
  description?: string;

  /**
   * Whether to show close button
   * @default true
   */
  closable?: boolean;

  /**
   * Whether clicking backdrop closes modal
   * @default true
   */
  closeOnBackdrop?: boolean;

  /**
   * Whether pressing escape closes modal
   * @default true
   */
  closeOnEscape?: boolean;

  /**
   * Whether to add padding to content areas
   * @default true
   */
  padding?: boolean;

  /**
   * Additional CSS classes
   */
  class?: string;
}
