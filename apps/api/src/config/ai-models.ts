import type { IntentType, IntentSubType } from '@kibly/shared-types'

export interface ModelConfig {
  model: string
  maxTokens: number
  temperature?: number
  costPer1kTokens?: {
    input: number
    output: number
  }
  provider?: 'anthropic' | 'openai' | 'mistral' | 'together'
}

export interface AIModelsConfig {
  chat: {
    primary: ModelConfig
    fallback: ModelConfig
    fast: ModelConfig
  }
  embedding: ModelConfig
  taskSpecific: {
    intentClassification: ModelConfig
    decisionMaking: ModelConfig
    responseGeneration: ModelConfig
  }
}

// Model priority system for different contexts
export enum ModelPriority {
  QUALITY = 'quality',    // Best quality, higher cost
  BALANCED = 'balanced',  // Good quality, moderate cost
  FAST = 'fast',         // Fastest response, lowest cost
  REALTIME = 'realtime'  // For streaming/real-time needs
}

export const AI_MODELS: AIModelsConfig = {
  chat: {
    primary: {
      model: 'claude-3-5-sonnet-20240620',
      maxTokens: 4096,
      temperature: 0.7,
      costPer1kTokens: {
        input: 0.003,
        output: 0.015
      },
      provider: 'anthropic'
    },
    fallback: {
      model: 'claude-3-haiku-20240307',
      maxTokens: 4096,
      temperature: 0.7,
      costPer1kTokens: {
        input: 0.00025,
        output: 0.00125
      },
      provider: 'anthropic'
    },
    fast: {
      model: 'claude-3-haiku-20240307',
      maxTokens: 2048,
      temperature: 0.5,
      costPer1kTokens: {
        input: 0.00025,
        output: 0.00125
      },
      provider: 'anthropic'
    }
  },
  embedding: {
    model: 'text-embedding-3-small',
    maxTokens: 8191,
    costPer1kTokens: {
      input: 0.00002,
      output: 0
    },
    provider: 'openai'
  },
  taskSpecific: {
    intentClassification: {
      model: 'claude-3-haiku-20240307',
      maxTokens: 500,
      temperature: 0.3,
      provider: 'anthropic'
    },
    decisionMaking: {
      model: 'claude-3-5-sonnet-20240620',
      maxTokens: 1000,
      temperature: 0.5,
      provider: 'anthropic'
    },
    responseGeneration: {
      model: 'claude-3-5-sonnet-20240620',
      maxTokens: 1000,
      temperature: 0.7,
      provider: 'anthropic'
    }
  }
}

// Model selection strategies
export const MODEL_STRATEGIES = {
  // For different conversation types
  conversation: {
    customerSupport: AI_MODELS.chat.fast,
    technicalQuery: AI_MODELS.chat.primary,
    generalChat: AI_MODELS.chat.fallback
  },
  // For different document types
  documentProcessing: {
    invoice: AI_MODELS.chat.primary,
    receipt: AI_MODELS.chat.fallback,
    statement: AI_MODELS.chat.primary
  },
  // For different urgency levels
  urgency: {
    immediate: AI_MODELS.chat.fast,
    normal: AI_MODELS.chat.fallback,
    detailed: AI_MODELS.chat.primary
  }
}

// Helper function to get model for specific task
export function getModelForTask(
  task: 'intent' | 'decision' | 'response' | 'chat' | 'embedding',
  priority: 'fast' | 'balanced' | 'quality' | ModelPriority = 'balanced'
): ModelConfig {
  switch (task) {
    case 'intent':
      return AI_MODELS.taskSpecific.intentClassification
    case 'decision':
      return AI_MODELS.taskSpecific.decisionMaking
    case 'response':
      return AI_MODELS.taskSpecific.responseGeneration
    case 'embedding':
      return AI_MODELS.embedding
    case 'chat':
      switch (priority) {
        case 'fast':
        case ModelPriority.FAST:
        case ModelPriority.REALTIME:
          return AI_MODELS.chat.fast
        case 'quality':
        case ModelPriority.QUALITY:
          return AI_MODELS.chat.primary
        default:
          return AI_MODELS.chat.fallback
      }
  }
}

// Model selection based on intent type
export function getModelForIntent(
  intentType: IntentType,
  _subType?: IntentSubType
): ModelConfig {
  // Use faster models for simple intents
  if (intentType === 'greeting' || intentType === 'unknown') {
    return AI_MODELS.chat.fast
  }
  
  // Use primary model for complex queries
  if (intentType === 'question' || intentType === 'command') {
    return AI_MODELS.chat.primary
  }
  
  // Default to balanced model
  return AI_MODELS.chat.fallback
}

// Get model by context (for advanced use cases)
export function getModelByContext(context: {
  userTier?: 'free' | 'premium' | 'enterprise'
  conversationType?: keyof typeof MODEL_STRATEGIES.conversation
  urgency?: keyof typeof MODEL_STRATEGIES.urgency
  documentType?: keyof typeof MODEL_STRATEGIES.documentProcessing
}): ModelConfig {
  // Enterprise users always get the best model
  if (context.userTier === 'enterprise') {
    return AI_MODELS.chat.primary
  }
  
  // Free users get the fast model
  if (context.userTier === 'free') {
    return AI_MODELS.chat.fast
  }
  
  // Check specific contexts
  if (context.conversationType) {
    return MODEL_STRATEGIES.conversation[context.conversationType]
  }
  
  if (context.urgency) {
    return MODEL_STRATEGIES.urgency[context.urgency]
  }
  
  if (context.documentType) {
    return MODEL_STRATEGIES.documentProcessing[context.documentType]
  }
  
  // Default to balanced
  return AI_MODELS.chat.fallback
}