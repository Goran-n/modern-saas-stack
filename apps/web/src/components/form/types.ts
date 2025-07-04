/**
 * Form component types and injection keys
 */

import type { ComputedRef } from 'vue'

// Form field injection key
export const FormFieldKey = Symbol('FormField')

// Form field context type
export interface FormFieldContext {
  fieldId: ComputedRef<string>
  hasError: ComputedRef<boolean>
  errorMessage: ComputedRef<string | undefined>
  required: ComputedRef<boolean>
}