import type { ClassProp } from "../../../types";

export type DropdownMenuItem = 
  | {
      id: string;
      label: string;
      icon?: string;
      onClick?: () => void | Promise<void>;
      disabled?: boolean;
      shortcuts?: string[];
      variant?: 'default' | 'destructive';
      divider?: never;
    }
  | {
      id: string;
      divider: true;
      label?: never;
      icon?: never;
      onClick?: never;
      disabled?: never;
      shortcuts?: never;
      variant?: never;
    };

// Helper functions to create menu items with proper typing
export const createMenuItem = (item: {
  id: string;
  label: string;
  icon?: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  shortcuts?: string[];
  variant?: 'default' | 'destructive';
}): DropdownMenuItem => item;

export const createDivider = (id: string): DropdownMenuItem => ({
  id,
  divider: true as const,
});

export interface DropdownProps {
  /**
   * Array of menu items to display
   */
  items: DropdownMenuItem[];
  
  /**
   * Alignment of the dropdown relative to the trigger
   * @default 'end'
   */
  align?: 'start' | 'center' | 'end';
  
  /**
   * Side of the trigger to place the dropdown
   * @default 'bottom'
   */
  side?: 'top' | 'right' | 'bottom' | 'left';
  
  /**
   * Offset from the trigger in pixels
   * @default 4
   */
  sideOffset?: number;
  
  /**
   * Additional CSS classes for the root element
   */
  class?: ClassProp;
  
  /**
   * Additional CSS classes for the content element
   */
  contentClass?: ClassProp;
  
  /**
   * Additional CSS classes for the trigger element
   */
  triggerClass?: ClassProp;
  
  /**
   * Whether the dropdown is open (v-model support)
   */
  modelValue?: boolean;
}