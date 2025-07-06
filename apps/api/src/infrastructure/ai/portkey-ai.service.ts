import type { Logger } from 'pino'
import { Portkey } from 'portkey-ai'
import type {
  ChatMessage,
  FunctionDefinition,
  AIResponse,
  EmbeddingResponse,
  StreamOptions,
  Intent,
  Decision,
  OrchestrationContext,
  AIPermissionSet,
  IntentType,
  IntentSubType,
  DecisionAction
} from '@kibly/shared-types'
import type { AIService } from '../../core/ports/orchestration'
import { getAIConfig } from '../../config/config'
import { AI_MODELS, getModelForTask, getModelByContext } from '../../config/ai-models'

interface PortkeyConfig {
  apiKey: string
  virtualKey: string
  baseURL?: string
  mode?: 'single' | 'loadbalance' | 'fallback'
  metadata?: Record<string, any>
}

export class PortkeyAIService implements AIService {
  private portkey: Portkey
  private config: ReturnType<typeof getAIConfig>
  private portkeyConfig: PortkeyConfig

  constructor(private logger: Logger) {
    this.config = getAIConfig()
    
    if (!this.config.isConfigured) {
      this.logger.warn('Portkey AI service not configured')
    }
    
    // Initialize Portkey configuration
    this.portkeyConfig = {
      apiKey: this.config.portkeyApiKey || 'J72HF+PznENJaQA6xqkaB4zsa51u',
      virtualKey: this.config.portkeyVirtualKey || 'anthropic-virtu-de63f7',
      mode: 'single', // Using single virtual key for all models
      metadata: {
        environment: process.env.NODE_ENV,
        service: 'kibly-ai'
      }
    }
    
    // Initialize Portkey client
    this.portkey = new Portkey(this.portkeyConfig)
  }

  async complete(params: {
    messages: ChatMessage[]
    model?: string
    functions?: FunctionDefinition[]
    temperature?: number
    maxTokens?: number
    context?: {
      userTier?: 'free' | 'premium' | 'enterprise'
      conversationType?: string
      urgency?: string
    }
  }): Promise<AIResponse> {
    if (!this.config.isConfigured) {
      throw new Error('AI service not configured')
    }

    try {
      // Smart model selection based on context
      let modelConfig = params.model 
        ? { model: params.model, maxTokens: params.maxTokens || AI_MODELS.chat.primary.maxTokens }
        : params.context 
          ? getModelByContext(params.context as any)
          : getModelForTask('chat', 'balanced')
      
      const requestParams: any = {
        messages: params.messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        })),
        model: params.model || modelConfig.model,
        max_tokens: params.maxTokens ?? modelConfig.maxTokens,
        temperature: params.temperature ?? modelConfig.temperature ?? 0.7,
        // Add metadata for tracking
        metadata: {
          ...this.portkeyConfig.metadata,
          modelStrategy: params.context ? 'contextual' : 'default',
          requestedModel: params.model || 'auto'
        }
      }
      
      if (params.functions) {
        requestParams.functions = this.convertFunctions(params.functions)
        requestParams.function_call = 'auto'
      }
      
      const completion = await this.portkey.chat.completions.create(requestParams)
      
      this.logger.debug({ 
        model: params.model || modelConfig.model,
        messageCount: params.messages.length,
        hasFunction: !!params.functions,
        tokensUsed: completion.usage?.total_tokens,
        context: params.context,
        actualModel: completion.model
      }, 'AI completion successful')

      // Convert Portkey response to AIResponse format
      return {
        id: completion.id,
        created: Math.floor(Date.now() / 1000),
        model: completion.model,
        choices: completion.choices.map(choice => ({
          index: choice.index || 0,
          message: {
            role: 'assistant',
            content: typeof choice.message?.content === 'string' ? choice.message.content : '',
            function_call: choice.message?.function_call
          },
          finish_reason: (choice.finish_reason || 'stop') as 'stop' | 'length' | 'function_call' | 'content_filter' | null
        })),
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'AI completion failed')
      throw error
    }
  }

  async completeStream(params: {
    messages: ChatMessage[]
    model?: string
    functions?: FunctionDefinition[]
    options: StreamOptions
  }): Promise<void> {
    if (!this.config.isConfigured) {
      throw new Error('AI service not configured')
    }

    try {
      const modelConfig = params.model 
        ? AI_MODELS.chat.primary
        : getModelForTask('chat', 'balanced')
      
      const requestParams: any = {
        messages: params.messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        })),
        model: params.model || modelConfig.model,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature ?? 0.7,
        stream: true
      }
      
      if (params.functions) {
        requestParams.functions = this.convertFunctions(params.functions)
        requestParams.function_call = 'auto'
      }
      
      const stream = await this.portkey.chat.completions.create(requestParams) as any

      // Process the stream
      if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        for await (const chunk of stream) {
          const choice = chunk.choices[0]
          
          if (choice?.delta?.content && typeof choice.delta.content === 'string') {
            params.options.onToken?.(choice.delta.content)
          }
          
          if (choice?.delta?.function_call) {
            params.options.onFunctionCall?.(choice.delta.function_call)
          }
          
          if (choice?.finish_reason) {
            params.options.onComplete?.()
          }
        }
      } else {
        // Handle non-streaming response
        this.logger.warn('Expected stream but got regular response')
        if (stream.choices?.[0]?.message?.content) {
          params.options.onToken?.(stream.choices[0].message.content)
          params.options.onComplete?.()
        }
      }
    } catch (error) {
      params.options.onError?.(error as Error)
      throw error
    }
  }

  async createEmbedding(text: string | string[], model?: string): Promise<EmbeddingResponse> {
    if (!this.config.isConfigured) {
      throw new Error('AI service not configured')
    }

    try {
      const embeddingModel = model || AI_MODELS.embedding.model
      
      // Note: Portkey doesn't have a direct embedding method in the SDK
      // We'll use the OpenAI-compatible endpoint through Portkey
      const response = await fetch('https://api.portkey.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          'x-portkey-api-key': this.config.portkeyApiKey || '',
          'x-portkey-virtual-key': this.config.portkeyVirtualKey || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: text
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Embedding error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      
      this.logger.debug({ 
        model: embeddingModel,
        inputCount: Array.isArray(text) ? text.length : 1
      }, 'Embeddings created successfully')

      return data as EmbeddingResponse
    } catch (error) {
      this.logger.error({ error }, 'Failed to create embeddings')
      throw error
    }
  }

  async classifyIntent(message: string, context: OrchestrationContext): Promise<Intent> {
    const systemPrompt = `You are an AI assistant for a financial management system. Your task is to classify user intents and extract entities.

Available intent types:
- question: User is asking for information
- document_submission: User is submitting or mentioning documents
- command: User wants you to perform an action
- clarification: User is responding to a previous request
- greeting: User is greeting or starting conversation
- unknown: Cannot determine intent

Available subtypes for questions:
- vat_query: Questions about VAT
- transaction_query: Questions about transactions
- receipt_status: Questions about receipt status
- deadline_query: Questions about deadlines

Available subtypes for documents:
- receipt_upload: Receipt submission
- invoice_upload: Invoice submission
- statement_upload: Bank statement submission

Available subtypes for commands:
- generate_report: Generate a report
- export_data: Export data
- reconcile: Reconcile transactions

Extract entities like dates, amounts, document types, etc.`

    const userPrompt = `Classify this message and extract entities. Return JSON only.

Recent context:
${context.recentMessages.slice(-3).map(m => `${m.direction}: ${m.content}`).join('\n')}

Current message: ${message}

Return format:
{
  "type": "intent_type",
  "subType": "intent_subtype or null",
  "confidence": 0.0-1.0,
  "entities": [
    {
      "type": "entity_type",
      "value": "entity_value",
      "confidence": 0.0-1.0
    }
  ],
  "rawText": "original message"
}`

    try {
      const modelConfig = getModelForTask('intent')
      
      const response = await this.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: modelConfig.model,
        temperature: modelConfig.temperature ?? 0.3,
        maxTokens: modelConfig.maxTokens
      })

      const content = response.choices[0].message.content
      const parsed = JSON.parse(content)
      
      const result: Intent = {
        type: parsed.type as IntentType,
        confidence: parsed.confidence,
        entities: parsed.entities,
        rawText: message
      }
      
      if (parsed.subType !== undefined) {
        result.subType = parsed.subType as IntentSubType
      }
      
      return result
    } catch (error) {
      this.logger.error({ error, message }, 'Failed to classify intent')
      
      // Fallback
      return {
        type: 'unknown' as IntentType,
        confidence: 0,
        entities: [],
        rawText: message
      }
    }
  }

  async makeDecision(params: {
    intent: Intent
    context: OrchestrationContext
    permissions: AIPermissionSet
    allowedFunctions: FunctionDefinition[]
  }): Promise<Decision> {
    const systemPrompt = `You are an AI assistant for a financial management system. Make decisions based on user intent and permissions.

User permissions:
${JSON.stringify(params.permissions, null, 2)}

Available actions:
- respond: Provide information or answer
- request_info: Ask for more information
- execute_function: Call a function
- escalate: Escalate to human
- clarify: Ask for clarification

Consider the user's permissions when deciding actions.`

    const userPrompt = `Based on this intent and context, decide what action to take.

Intent: ${JSON.stringify(params.intent)}
Recent messages: ${params.context.recentMessages.slice(-3).map(m => `${m.direction}: ${m.content}`).join('\n')}

Return JSON:
{
  "action": "action_type",
  "reasoning": "why this action",
  "confidence": 0.0-1.0,
  "suggestedResponse": "response text if action is respond",
  "requiredData": ["data needed if action is request_info"],
  "functions": [function calls if action is execute_function]
}`

    try {
      const modelConfig = getModelForTask('decision')
      
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const response = await this.complete({
        messages,
        functions: params.allowedFunctions,
        model: modelConfig.model,
        temperature: modelConfig.temperature ?? 0.5,
        maxTokens: modelConfig.maxTokens
      })

      const message = response.choices[0].message
      
      // Check if function was called
      if (message.function_call) {
        return {
          action: 'execute_function' as DecisionAction,
          reasoning: 'Function call requested',
          confidence: 0.9,
          functions: [{
            name: message.function_call.name,
            description: '',
            parameters: JSON.parse(message.function_call.arguments)
          }]
        }
      }

      // Parse regular response
      const parsed = JSON.parse(message.content)
      return {
        action: parsed.action as DecisionAction,
        reasoning: parsed.reasoning,
        confidence: parsed.confidence,
        suggestedResponse: parsed.suggestedResponse,
        requiredData: parsed.requiredData,
        functions: parsed.functions
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to make decision')
      
      // Fallback decision
      return {
        action: 'clarify' as DecisionAction,
        reasoning: 'Error in decision making',
        confidence: 0.5,
        suggestedResponse: "I'm having trouble understanding. Could you please rephrase your request?"
      }
    }
  }

  async generateResponse(params: {
    decision: Decision
    actionResults: any[]
    context: OrchestrationContext
    deniedActions?: string[]
  }): Promise<string> {
    const systemPrompt = `You are a helpful AI assistant for a financial management system. Generate natural, conversational responses based on decisions and results.

Guidelines:
- Be concise and clear
- Use British English
- Be professional but friendly
- If permissions were denied, explain politely
- Format numbers and dates appropriately`

    let userPrompt = `Generate a response based on this decision and results.

Decision: ${JSON.stringify(params.decision)}
Action results: ${JSON.stringify(params.actionResults)}`

    if (params.deniedActions && params.deniedActions.length > 0) {
      userPrompt += `\n\nNote: The following actions were denied due to permissions: ${params.deniedActions.join(', ')}`
    }

    try {
      const modelConfig = getModelForTask('response')
      
      const response = await this.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: modelConfig.model,
        temperature: modelConfig.temperature ?? 0.7,
        maxTokens: modelConfig.maxTokens
      })

      return response.choices[0].message.content
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate response')
      return "I apologise, but I'm having trouble generating a response. Please try again."
    }
  }

  private convertFunctions(functions: FunctionDefinition[]): any[] {
    return functions.map(func => ({
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }))
  }
}