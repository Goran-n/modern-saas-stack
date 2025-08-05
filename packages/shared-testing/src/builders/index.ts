import { InvoiceBuilder, InvoicePresets, type InvoiceData } from './invoice.builder';
import { FileBuilder, FilePresets, type FileData } from './file.builder';
import { SupplierBuilder, SupplierPresets, type SupplierData } from './supplier.builder';

export { InvoiceBuilder, InvoicePresets, type InvoiceData } from './invoice.builder';
export { FileBuilder, FilePresets, type FileData } from './file.builder';
export { SupplierBuilder, SupplierPresets, type SupplierData } from './supplier.builder';

// Re-export commonly used combinations
export const TestDataBuilders = {
  invoice: {
    create: () => InvoiceBuilder.create(),
    presets: InvoicePresets,
  },
  file: {
    create: () => FileBuilder.create(),
    presets: FilePresets,
  },
  supplier: {
    create: () => SupplierBuilder.create(),
    presets: SupplierPresets,
  },
};