// Common types for the UI library
export type Size = "xs" | "sm" | "md" | "lg" | "xl";
export type Variant = "solid" | "outline" | "ghost" | "soft";
export type InputVariant = "outline" | "filled" | "underline";
export type Color =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "info";

// Vue class prop type that supports string, object, and array formats
export type ClassProp = string | Record<string, boolean> | (string | Record<string, boolean>)[];

// Component prop types will be exported from their respective files
