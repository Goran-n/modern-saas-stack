import type { PromptTemplate } from '@kibly/shared-types'

export const defaultPromptTemplates: PromptTemplate[] = [
  {
    id: 'intent_classification',
    name: 'intent_classification',
    description: 'Classify user intent from messages',
    systemPrompt: `You are an AI assistant for a financial management system. Your task is to classify user intents and extract entities.

Available intent types:
- question: User is asking for information
- document_submission: User is submitting or mentioning documents
- command: User wants you to perform an action
- clarification: User is responding to a previous request
- greeting: User is greeting or starting conversation
- unknown: Cannot determine intent`,
    userPromptTemplate: `Classify this message and extract entities. Return JSON only.

Context: {context}
Message: {message}

Return format:
{
  "type": "intent_type",
  "subType": "intent_subtype or null",
  "confidence": 0.0-1.0,
  "entities": [],
  "rawText": "original message"
}`,
    variables: ['context', 'message'],
    examples: [
      {
        input: {
          context: 'User just started conversation',
          message: 'What receipts am I missing for last month?'
        },
        output: JSON.stringify({
          type: 'question',
          subType: 'receipt_status',
          confidence: 0.95,
          entities: [
            { type: 'time_period', value: 'last month', confidence: 0.9 }
          ],
          rawText: 'What receipts am I missing for last month?'
        })
      }
    ]
  },
  
  {
    id: 'vat_query_response',
    name: 'vat_query_response',
    description: 'Respond to VAT-related queries',
    systemPrompt: `You are a helpful AI assistant for a financial management system specializing in VAT queries. Provide accurate, concise information about VAT deadlines, requirements, and status.`,
    userPromptTemplate: `User is asking about VAT. Provide a helpful response.

Query: {query}
VAT Deadline: {vatDeadline}
Outstanding Items: {outstandingItems}
Current Date: {currentDate}

Generate a natural, helpful response.`,
    variables: ['query', 'vatDeadline', 'outstandingItems', 'currentDate'],
    examples: []
  },
  
  {
    id: 'transaction_search_response',
    name: 'transaction_search_response',
    description: 'Respond to transaction search queries',
    systemPrompt: `You are a helpful AI assistant. Help users find and understand their financial transactions.`,
    userPromptTemplate: `User is searching for transactions. Provide a summary of results.

Query: {query}
Results: {results}
Total Found: {totalFound}

Format the response clearly, highlighting key information.`,
    variables: ['query', 'results', 'totalFound'],
    examples: []
  },
  
  {
    id: 'document_request',
    name: 'document_request',
    description: 'Request missing documents from user',
    systemPrompt: `You are a helpful AI assistant. Politely request missing documents or information from users.`,
    userPromptTemplate: `Request the following documents/information from the user:

Missing Items: {missingItems}
Context: {context}
Deadline: {deadline}

Be polite, clear about what's needed, and mention any deadlines.`,
    variables: ['missingItems', 'context', 'deadline'],
    examples: []
  },
  
  {
    id: 'permission_denied',
    name: 'permission_denied',
    description: 'Explain permission denial politely',
    systemPrompt: `You are a helpful AI assistant. Explain permission restrictions politely and suggest alternatives when possible.`,
    userPromptTemplate: `The user requested an action that requires permissions they don't have.

Requested Action: {requestedAction}
Required Permission: {requiredPermission}
Alternative: {alternative}

Explain politely and suggest alternatives if available.`,
    variables: ['requestedAction', 'requiredPermission', 'alternative'],
    examples: []
  }
]

export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate>

  constructor(templates: PromptTemplate[] = defaultPromptTemplates) {
    this.templates = new Map()
    templates.forEach(template => {
      this.templates.set(template.name, template)
    })
  }

  get(name: string): PromptTemplate | undefined {
    return this.templates.get(name)
  }

  add(template: PromptTemplate): void {
    this.templates.set(template.name, template)
  }

  remove(name: string): boolean {
    return this.templates.delete(name)
  }

  list(): PromptTemplate[] {
    return Array.from(this.templates.values())
  }

  render(name: string, variables: Record<string, any>): { system: string; user: string } | null {
    const template = this.templates.get(name)
    if (!template) {
      return null
    }

    let userPrompt = template.userPromptTemplate
    
    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`
      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return {
      system: template.systemPrompt || '',
      user: userPrompt
    }
  }
}