/**
 * AI service integration types
 */

// AI Provider types
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  COHERE = 'cohere',
  CUSTOM = 'custom'
}

// Chat message types (OpenAI compatible)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string // For function messages
  function_call?: {
    name: string
    arguments: string
  }
}

// Function calling
export interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface FunctionCall {
  name: string
  arguments: string
}

// AI Service responses
export interface AIResponse {
  id: string
  model: string
  choices: AIChoice[]
  usage?: TokenUsage
  created: number
}

export interface AIChoice {
  index: number
  message: ChatMessage
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

// Embedding types
export interface EmbeddingRequest {
  input: string | string[]
  model: string
}

export interface EmbeddingResponse {
  data: Embedding[]
  model: string
  usage: TokenUsage
}

export interface Embedding {
  embedding: number[]
  index: number
}

// Streaming types
export interface StreamOptions {
  onToken?: (token: string) => void
  onFunctionCall?: (functionCall: FunctionCall) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

// AI Service configuration
export interface AIServiceConfig {
  provider: AIProvider
  apiUrl: string
  apiKey: string
  defaultModel: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  timeout?: number
}

// Error types
export interface AIError {
  code: string
  message: string
  type: 'rate_limit' | 'invalid_request' | 'authentication' | 'server_error'
  statusCode?: number
}

// Model information
export interface AIModel {
  id: string
  provider: AIProvider
  contextWindow: number
  maxOutputTokens: number
  supportsFunctions: boolean
  supportsVision: boolean
  costPer1kTokens: {
    input: number
    output: number
  }
}