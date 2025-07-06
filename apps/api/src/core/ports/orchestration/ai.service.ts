import type { 
  ChatMessage, 
  FunctionDefinition, 
  AIResponse,
  EmbeddingResponse,
  StreamOptions,
  Intent,
  Decision,
  OrchestrationContext,
  AIPermissionSet
} from '@kibly/shared-types'

export interface AIService {
  // Chat completions
  complete(params: {
    messages: ChatMessage[]
    model?: string
    functions?: FunctionDefinition[]
    temperature?: number
    maxTokens?: number
  }): Promise<AIResponse>
  
  // Streaming completions
  completeStream(params: {
    messages: ChatMessage[]
    model?: string
    functions?: FunctionDefinition[]
    options: StreamOptions
  }): Promise<void>
  
  // Embeddings
  createEmbedding(text: string | string[], model?: string): Promise<EmbeddingResponse>
  
  // High-level orchestration methods
  classifyIntent(message: string, context: OrchestrationContext): Promise<Intent>
  
  makeDecision(params: {
    intent: Intent
    context: OrchestrationContext
    permissions: AIPermissionSet
    allowedFunctions: FunctionDefinition[]
  }): Promise<Decision>
  
  generateResponse(params: {
    decision: Decision
    actionResults: any[]
    context: OrchestrationContext
    deniedActions?: string[]
  }): Promise<string>
}