import type { AIFunction, FunctionDefinition } from '@kibly/shared-types'

export const businessFunctions: AIFunction[] = [
  {
    name: 'getVATDeadline',
    description: 'Get the next VAT submission deadline for the user',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    requiredPermission: 'view:vat_reports'
  },
  
  {
    name: 'searchTransactions',
    description: 'Search for transactions based on criteria',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        dateFrom: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
        minAmount: { type: 'number', description: 'Minimum amount' },
        maxAmount: { type: 'number', description: 'Maximum amount' },
        category: { type: 'string', description: 'Transaction category' }
      },
      required: []
    },
    requiredPermission: 'view:transactions'
  },
  
  {
    name: 'getMissingReceipts',
    description: 'Get list of transactions that are missing receipts',
    parameters: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
        dateTo: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
      },
      required: []
    },
    requiredPermission: 'view:transactions'
  },
  
  {
    name: 'getAccountSummary',
    description: 'Get summary of accounts and balances',
    parameters: {
      type: 'object',
      properties: {
        accountType: { type: 'string', enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] }
      },
      required: []
    },
    requiredPermission: 'view:accounts'
  },
  
  {
    name: 'requestDocument',
    description: 'Request a specific document (invoice, receipt, statement)',
    parameters: {
      type: 'object',
      properties: {
        documentType: { type: 'string', enum: ['invoice', 'receipt', 'statement'], description: 'Type of document' },
        documentId: { type: 'string', description: 'Document identifier' },
        period: { type: 'string', description: 'Period for statements (e.g., 2024-Q1)' }
      },
      required: ['documentType']
    },
    requiredPermission: 'view:documents'
  }
]

export class FunctionRegistry {
  private static instance: FunctionRegistry
  private functions: Map<string, AIFunction> = new Map()
  
  private constructor() {
    // Register all business functions
    businessFunctions.forEach(func => {
      this.functions.set(func.name, func)
    })
  }
  
  static getInstance(): FunctionRegistry {
    if (!FunctionRegistry.instance) {
      FunctionRegistry.instance = new FunctionRegistry()
    }
    return FunctionRegistry.instance
  }
  
  getFunction(name: string): AIFunction | undefined {
    return this.functions.get(name)
  }
  
  getAllFunctions(): AIFunction[] {
    return Array.from(this.functions.values())
  }
  
  getFunctionDefinitions(): FunctionDefinition[] {
    return this.getAllFunctions().map(func => ({
      name: func.name,
      description: func.description,
      parameters: func.parameters as { type: 'object'; properties: Record<string, any>; required?: string[] }
    }))
  }
  
  getFunctionsForPermissions(permissions: Set<string>): AIFunction[] {
    return this.getAllFunctions().filter(func => 
      !func.requiredPermission || permissions.has(func.requiredPermission)
    )
  }
  
  async executeFunction(
    functionName: string,
    parameters: Record<string, any>,
    context: {
      userId: string
      tenantId: string
      permissions: Set<string>
    }
  ): Promise<any> {
    const func = this.getFunction(functionName)
    if (!func) {
      throw new Error(`Function ${functionName} not found`)
    }
    
    // Check permissions
    if (func.requiredPermission && !context.permissions.has(func.requiredPermission)) {
      throw new Error(`Missing required permission: ${func.requiredPermission}`)
    }
    
    // TODO: Implement actual function execution
    // This would call the appropriate handler based on the function
    return {
      success: true,
      data: `Mock result for ${functionName}`,
      parameters
    }
  }
}