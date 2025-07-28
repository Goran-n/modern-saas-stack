export interface CheckboxProps {
  modelValue?: boolean;
  label?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  indeterminate?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'primary' | 'neutral' | 'error';
  class?: string;
  ariaLabel?: string;
}