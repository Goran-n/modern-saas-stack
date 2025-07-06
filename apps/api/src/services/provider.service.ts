export class ProviderService {
  constructor() {}

  getSupportedProviders(): Array<{ id: string; name: string; type: string }> {
    return [
      { id: 'xero', name: 'Xero', type: 'accounting' },
      { id: 'quickbooks', name: 'QuickBooks', type: 'accounting' },
      { id: 'sage', name: 'Sage', type: 'accounting' },
    ]
  }

  getProviderCapabilities(_providerId: string): any {
    // Stub implementation
    return {
      read: ['contacts', 'invoices', 'payments'],
      write: ['contacts', 'invoices'],
      webhook: true,
      realtime: false,
    }
  }

  async testConnection(_providerId: string, _authData: any): Promise<boolean> {
    // Stub implementation
    return true
  }

  async validateProviderConnection(_providerId: string, _authData: any): Promise<boolean> {
    // Stub implementation  
    return this.testConnection(_providerId, _authData)
  }
}