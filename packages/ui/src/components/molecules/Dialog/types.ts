import type { ModalProps } from '../Modal/types';

export interface DialogProps extends Omit<ModalProps, 'modelValue'> {
  /**
   * Whether the dialog is open
   */
  open?: boolean;
  
  /**
   * Description text below the title
   */
  description?: string;
  
  /**
   * Type of dialog for styling
   * @default 'default'
   */
  type?: 'default' | 'danger' | 'warning' | 'success';
  
  /**
   * Loading state
   */
  loading?: boolean;
}

export interface DialogTriggerProps {
  /**
   * Additional CSS classes
   */
  class?: string;
  
  /**
   * Disable the trigger
   */
  disabled?: boolean;
}

export interface DialogContentProps {
  /**
   * Additional CSS classes
   */
  class?: string;
}

export interface DialogHeaderProps {
  /**
   * Additional CSS classes
   */
  class?: string;
}

export interface DialogFooterProps {
  /**
   * Additional CSS classes
   */
  class?: string;
}

export interface DialogTitleProps {
  /**
   * Additional CSS classes
   */
  class?: string;
}

export interface DialogDescriptionProps {
  /**
   * Additional CSS classes
   */
  class?: string;
}