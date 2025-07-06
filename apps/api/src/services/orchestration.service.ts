import type { Logger } from 'pino'
import type {
  OrchestrationRequest,
  OrchestrationResponse,
  OrchestrationJobData,
  Intent,
  Decision,
  ActionResult,
  AIPermissionSet,
  ContextMessage
} from '@kibly/shared-types'
import type {
  OrchestrationService as IOrchestrationService,
  OrchestrationContextRepository,
  AIDecisionRepository,
  AIService
} from '../core/ports/orchestration'
import type { ConversationService } from './conversation.service'
import type { UserChannelService } from './user-channel.service'
import type { MessagingService } from '../core/ports/messaging/messaging.service'
import { OrchestrationContextEntity, AIDecisionEntity } from '../core/domain/orchestration'
import { FunctionRegistry } from '../infrastructure/ai/function-registry'
import { PostCommitManager } from '../core/application/base/post-commit-manager'
import { getOrchestrationConfig } from '../config/config'

export class OrchestrationService implements IOrchestrationService {
  private functionRegistry: FunctionRegistry
  private config: ReturnType<typeof getOrchestrationConfig>

  constructor(
    private contextRepository: OrchestrationContextRepository,
    private decisionRepository: AIDecisionRepository,
    private aiService: AIService,
    private conversationService: ConversationService,
    private userChannelService: UserChannelService,
    private messagingService: MessagingService,
    private logger: Logger
  ) {
    this.functionRegistry = FunctionRegistry.getInstance()
    this.config = getOrchestrationConfig()
    this.registerDefaultHandlers()
  }

  async processMessage(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const startTime = Date.now()
    const postCommit = new PostCommitManager(this.logger)

    try {
      // Get or create context
      const context = await this.getOrCreateContextEntity(
        request.conversationId || '',
        request.userId,
        request.channelId,
        request.tenantId
      )

      // Add incoming message to context
      if (request.message.content) {
        const contextMessage: ContextMessage = {
          id: request.message.messageId as any,
          content: request.message.content,
          direction: 'inbound',
          timestamp: new Date(),
          metadata: { source: request.source }
        }
        context.addMessage(contextMessage, this.config.maxContextMessages)
      }

      // Classify intent
      const intent = await this.aiService.classifyIntent(
        request.message.content || '',
        context.toPublic()
      )
      context.setIntent(intent)

      // Check permissions
      const permissions = await this.checkPermissions(
        request.userId,
        request.tenantId,
        this.getRequiredPermissions(intent)
      )

      // Get allowed functions based on permissions
      const permissionSet = new Set(this.permissionsToArray(permissions))
      this.functionRegistry.getFunctionsForPermissions(permissionSet)
      const functionDefinitions = this.functionRegistry.getFunctionDefinitions()

      // Make AI decision
      const decision = await this.aiService.makeDecision({
        intent,
        context: context.toPublic(),
        permissions,
        allowedFunctions: functionDefinitions
      })

      // Execute actions
      const actionResults = await this.executeActions(decision, context, permissions)

      // Generate response
      const responseText = await this.aiService.generateResponse({
        decision,
        actionResults: actionResults.map(a => a.result),
        context: context.toPublic(),
        deniedActions: this.getDeniedActions(decision, permissions)
      })

      // Add response to context
      const responseMessage: ContextMessage = {
        id: `resp_${Date.now()}` as any,
        content: responseText,
        direction: 'outbound',
        timestamp: new Date(),
        metadata: { intent: intent.type, decision: decision.action }
      }
      context.addMessage(responseMessage, this.config.maxContextMessages)

      // Save context
      await this.contextRepository.save(context)

      // Record decision asynchronously
      const processingTime = Date.now() - startTime
      postCommit.addHook(async () => {
        await this.recordDecision({
          contextId: context.id.toString(),
          conversationId: request.conversationId || context.conversationId,
          intent,
          decision,
          executedActions: actionResults,
          responseText,
          tokensUsed: 0, // TODO: Get from AI response
          modelUsed: 'gpt-4-turbo-preview', // TODO: Get from config
          processingTime,
          permissionsDenied: this.getDeniedActions(decision, permissions)
        })
      })

      // Execute post-commit hooks
      await postCommit.execute()

      return {
        conversationId: context.conversationId,
        responseText,
        actions: actionResults.map(ar => ({
          action: ar.functionName,
          result: ar.result,
          timestamp: new Date()
        })),
        metadata: {
          intent: intent.type,
          confidence: intent.confidence,
          processingTime,
          tokensUsed: 0,
          modelUsed: 'gpt-4-turbo-preview'
        }
      }
    } catch (error) {
      this.logger.error({ error, request }, 'Failed to process orchestration message')
      throw error
    }
  }

  async processAsync(jobData: OrchestrationJobData): Promise<void> {
    if (jobData.type === 'process_message') {
      const request = jobData.payload as OrchestrationRequest
      
      this.logger.info('Processing async orchestration request', {
        from: request.message.from,
        source: request.source,
        hasContent: !!request.message.content,
        contentLength: request.message.content?.length
      })
      
      // Find user channel
      const channel = await this.userChannelService.findByWhatsAppNumber(request.message.from)
      if (!channel) {
        this.logger.warn('Message from unknown WhatsApp number', { 
          from: request.message.from,
          phoneFormat: request.message.from.includes('whatsapp:') ? 'with-prefix' : 'without-prefix'
        })
        
        // Remove whatsapp: prefix if present, as the messaging service will add it
        const phoneNumber = request.message.from.replace('whatsapp:', '')
        
        await this.messagingService.sendRegistrationPrompt(phoneNumber)
        return
      }

      // Check verification
      if (!channel.isVerified) {
        this.logger.info('Channel not verified', {
          channelId: channel.id.toString(),
          channelIdentifier: channel.channelIdentifier
        })
        
        try {
          await this.messagingService.sendMessage(channel.channelIdentifier, {
            text: 'Please verify your phone number first.'
          })
        } catch (error) {
          this.logger.error('Failed to send verification prompt', { error })
        }
        return
      }

      // Get or create conversation
      this.logger.info('Getting or creating conversation', {
        userId: channel.userId,
        channelId: channel.id.toString(),
        tenantId: channel.tenantId,
        hasConversationId: !!request.conversationId
      })
      
      let conversation: any = null
      
      // Only try to get existing conversation if we have a valid conversationId
      if (request.conversationId && request.conversationId.trim() !== '') {
        try {
          conversation = await this.conversationService.getConversation({
            conversationId: request.conversationId,
            userId: channel.userId
          })
        } catch (error) {
          this.logger.warn('Failed to get conversation, will create new one', {
            conversationId: request.conversationId,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
      
      if (!conversation) {
        conversation = await this.conversationService.getOrCreateConversation({
          userId: channel.userId,
          channelId: channel.id.toString(),
          tenantId: channel.tenantId
        })
        
        this.logger.info('Created new conversation', {
          conversationId: conversation.id.toString()
        })
      }

      // Process message
      const fullRequest: OrchestrationRequest = {
        ...request,
        userId: channel.userId,
        tenantId: channel.tenantId,
        channelId: channel.id.toString(),
        conversationId: conversation.id.toString()
      }

      this.logger.info('Processing orchestration message', {
        conversationId: fullRequest.conversationId,
        userId: fullRequest.userId
      })
      
      const response = await this.processMessage(fullRequest)

      // Send response
      try {
        // Remove whatsapp: prefix if present, as the messaging service will add it
        const phoneNumber = channel.channelIdentifier.replace('whatsapp:', '')
        
        await this.messagingService.sendMessage(phoneNumber, {
          text: response.responseText
        })
        
        this.logger.info('Sent orchestration response', {
          to: phoneNumber,
          responseLength: response.responseText.length
        })
      } catch (error) {
        this.logger.error('Failed to send orchestration response', { 
          error,
          channelIdentifier: channel.channelIdentifier
        })
        throw error
      }

      // Save messages to conversation
      await this.conversationService.createMessage({
        conversationId: conversation.id.toString(),
        direction: 'inbound',
        content: request.message.content || '',
        externalMessageId: request.message.messageId,
        messageType: 'text',
        tenantId: request.tenantId,
        metadata: { source: request.source }
      })

      await this.conversationService.createMessage({
        conversationId: conversation.id.toString(),
        direction: 'outbound',
        content: response.responseText,
        messageType: 'text',
        tenantId: request.tenantId,
        metadata: response.metadata
      })
    }
  }

  async processSync(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    // For sync processing, we handle conversation creation here
    if (!request.conversationId) {
      const conversation = await this.conversationService.createConversation({
        userId: request.userId,
        channelId: request.channelId,
        tenantId: request.tenantId
      })
      request.conversationId = conversation.id.toString()
    }

    const response = await this.processMessage(request)

    // Save messages synchronously for API calls
    await Promise.all([
      this.conversationService.createMessage({
        conversationId: request.conversationId || '',
        direction: 'inbound',
        content: request.message.content || '',
        messageType: 'text',
        tenantId: request.tenantId,
        metadata: { source: request.source }
      }),
      this.conversationService.createMessage({
        conversationId: request.conversationId || '',
        direction: 'outbound',
        content: response.responseText,
        messageType: 'text',
        tenantId: request.tenantId,
        metadata: response.metadata
      })
    ])

    return response
  }

  async getOrCreateContext(
    conversationId: string,
    userId: string,
    channelId: string
  ): Promise<string> {
    const context = await this.getOrCreateContextEntity(
      conversationId,
      userId,
      channelId,
      '' // tenantId will be fetched if needed
    )
    return context.id.toString()
  }

  async updateContext(contextId: string, updates: Partial<any>): Promise<void> {
    const context = await this.contextRepository.findById(contextId)
    if (!context) {
      throw new Error(`Context not found: ${contextId}`)
    }

    if (updates.sessionData) {
      context.updateSessionData(updates.sessionData)
    }

    if (updates.intent) {
      context.setIntent(updates.intent)
    }

    await this.contextRepository.save(context)
  }

  async recordDecision(params: {
    contextId: string
    conversationId: string
    intent: Intent
    decision: Decision
    executedActions: ActionResult[]
    responseText: string
    tokensUsed: number
    modelUsed: string
    processingTime: number
    permissionsDenied?: string[]
  }): Promise<void> {
    try {
      const decision = AIDecisionEntity.create(params)
      await this.decisionRepository.save(decision)
      
      this.logger.info({
        decisionId: decision.id.toString(),
        intent: params.intent.type,
        action: params.decision.action
      }, 'AI decision recorded')
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to record AI decision')
      // Don't throw - this is a non-critical operation
    }
  }

  async checkPermissions(
    _userId: string,
    _tenantId: string,
    _requiredPermissions: string[]
  ): Promise<AIPermissionSet> {
    // TODO: Integrate with actual permission system
    // For now, return default permissions
    return {
      canViewTransactions: true,
      canViewVATReports: true,
      canViewReceipts: true,
      canUploadDocuments: true,
      canGenerateReports: false,
      canModifyData: false
    }
  }

  private async getOrCreateContextEntity(
    conversationId: string,
    userId: string,
    channelId: string,
    tenantId: string
  ): Promise<OrchestrationContextEntity> {
    if (conversationId) {
      const existing = await this.contextRepository.findByConversationId(conversationId)
      if (existing) {
        return existing
      }
    }

    const context = OrchestrationContextEntity.create({
      conversationId: conversationId || `temp_${Date.now()}`,
      userId,
      channelId,
      tenantId
    })

    return this.contextRepository.save(context)
  }

  private async executeActions(
    decision: Decision,
    context: OrchestrationContextEntity,
    permissions: AIPermissionSet
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = []

    if (decision.functions) {
      for (const func of decision.functions) {
        try {
          const startTime = Date.now()
          const permissionSet = new Set(this.permissionsToArray(permissions))
          const result = await this.functionRegistry.executeFunction(
            func.name,
            func.parameters,
            {
              userId: context.userId,
              tenantId: context.tenantId,
              permissions: permissionSet
            }
          )
          
          results.push({
            functionName: func.name,
            success: true,
            result,
            executionTime: Date.now() - startTime
          })
        } catch (error) {
          this.logger.error({ error, function: func.name }, 'Function execution failed')
          
          results.push({
            functionName: func.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: 0
          })
        }
      }
    }

    return results
  }

  private getRequiredPermissions(intent: Intent): string[] {
    const permissions: string[] = []

    switch (intent.subType) {
      case 'vat_query':
        permissions.push('view:vat_reports')
        break
      case 'transaction_query':
        permissions.push('view:transactions')
        break
      case 'receipt_status':
        permissions.push('view:receipts')
        break
      case 'generate_report':
        permissions.push('generate:reports')
        break
    }

    return permissions
  }

  private permissionsToArray(permissions: AIPermissionSet): string[] {
    const perms: string[] = []
    
    if (permissions.canViewTransactions) perms.push('view:transactions')
    if (permissions.canViewVATReports) perms.push('view:vat_reports')
    if (permissions.canViewReceipts) perms.push('view:receipts')
    if (permissions.canUploadDocuments) perms.push('upload:documents')
    if (permissions.canGenerateReports) perms.push('generate:reports')
    if (permissions.canModifyData) perms.push('modify:data')
    
    return perms
  }

  private getDeniedActions(decision: Decision, permissions: AIPermissionSet): string[] {
    const denied: string[] = []
    
    if (decision.functions) {
      for (const func of decision.functions) {
        const aiFunc = this.functionRegistry.getFunction(func.name)
        if (aiFunc?.requiredPermission && !this.hasPermission(permissions, aiFunc.requiredPermission)) {
          denied.push(func.name)
        }
      }
    }
    
    return denied
  }

  private hasPermission(permissions: AIPermissionSet, required: string): boolean {
    const permArray = this.permissionsToArray(permissions)
    return permArray.includes(required)
  }

  private registerDefaultHandlers(): void {
    // TODO: Implement function handlers when needed
    // Function execution is currently handled by the FunctionRegistry.executeFunction method
  }
}