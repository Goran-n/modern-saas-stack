import { Portkey } from 'portkey-ai'
import type { ChatMessage, FunctionDefinition } from '@kibly/shared-types'
import type { ModelConfig } from '../../config/ai-models'

/**
 * Wrapper class for Portkey AI operations
 * Provides a clean interface for common AI operations
 */
export class PortkeyWrapper {
  constructor(private portkey: Portkey) {}

  /**
   * Create a chat completion with simplified interface
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      functions?: FunctionDefinition[]
      metadata?: Record<string, any>
    }
  ) {
    const requestParams: any = {
      messages: messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      model: options?.model || 'claude-3-5-sonnet-20240620',
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7
    }

    if (options?.functions) {
      requestParams.functions = options.functions
      requestParams.function_call = 'auto'
    }

    if (options?.metadata) {
      requestParams.metadata = options.metadata
    }

    return this.portkey.chat.completions.create(requestParams)
  }

  /**
   * Create a streaming chat completion
   */
  async chatStream(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      functions?: FunctionDefinition[]
      onComplete?: () => void
      onError?: (error: Error) => void
    }
  ) {
    const requestParams: any = {
      messages: messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      model: options?.model || 'claude-3-5-sonnet-20240620',
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
      stream: true
    }

    if (options?.functions) {
      requestParams.functions = options.functions
      requestParams.function_call = 'auto'
    }

    try {
      const stream = await this.portkey.chat.completions.create(requestParams) as any
      
      if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        for await (const chunk of stream) {
          const choice = chunk.choices[0]
          if (choice?.delta?.content && typeof choice.delta.content === 'string') {
            onToken(choice.delta.content)
          }
          if (choice?.finish_reason) {
            options?.onComplete?.()
          }
        }
      }
    } catch (error) {
      options?.onError?.(error as Error)
      throw error
    }
  }

  /**
   * Quick completion for simple queries
   */
  async quickComplete(
    prompt: string,
    model: string = 'claude-3-haiku-20240307',
    maxTokens: number = 500
  ): Promise<string> {
    const response = await this.chat(
      [{ role: 'user', content: prompt }],
      { model, maxTokens, temperature: 0.5 }
    )
    
    const content = response.choices[0]?.message?.content
    return typeof content === 'string' ? content : ''
  }

  /**
   * System-prompted completion
   */
  async completeWithSystem(
    systemPrompt: string,
    userPrompt: string,
    modelConfig: ModelConfig
  ): Promise<string> {
    const response = await this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      {
        model: modelConfig.model,
        maxTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature ?? 0.7
      }
    )
    
    const content = response.choices[0]?.message?.content
    return typeof content === 'string' ? content : ''
  }

  /**
   * JSON-formatted response
   */
  async getJsonResponse<T = any>(
    messages: ChatMessage[],
    model?: string
  ): Promise<T> {
    const response = await this.chat(messages, {
      model: model || 'claude-3-5-sonnet-20240620',
      temperature: 0.3 // Lower temperature for structured output
    })
    
    const content = response.choices[0]?.message?.content
    const contentStr = typeof content === 'string' ? content : '{}'
    return JSON.parse(contentStr)
  }
}

/**
 * Create a configured Portkey wrapper instance
 */
export function createPortkeyWrapper(config: {
  apiKey: string
  virtualKey: string
  metadata?: Record<string, any>
}): PortkeyWrapper {
  const portkey = new Portkey({
    apiKey: config.apiKey,
    virtualKey: config.virtualKey
  })
  
  return new PortkeyWrapper(portkey)
}