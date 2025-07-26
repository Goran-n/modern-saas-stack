export type ResourceType = 'file' | 'supplier' | 'document';

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchFilters {
  type?: ResourceType;
  category?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}