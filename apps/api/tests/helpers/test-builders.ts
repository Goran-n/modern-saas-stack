/**
 * Test data builders for creating domain entities
 */

import { UserEntity } from '../../src/core/domain/user'
import { TenantEntity } from '../../src/core/domain/tenant'
import { ConversationEntity } from '../../src/core/domain/conversation/conversation.entity'
import { InvoiceEntity } from '../../src/core/domain/invoice'
import { EntityId } from '../../src/core/domain/base/entity-id.value-object'
import { Money } from '../../src/core/domain/money.value-object'
import { Slug } from '../../src/core/domain/slug.value-object'
import type { 
  UserStatus, TenantStatus, ConversationStatus, 
  InvoiceType, InvoiceStatus 
} from '@kibly/shared-types'

export class UserBuilder {
  private props: any = {
    id: EntityId.generate().value,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    status: 'active' as UserStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0
  }

  withId(id: string): this {
    this.props.id = id
    return this
  }

  withEmail(email: string): this {
    this.props.email = email
    return this
  }

  withName(firstName: string, lastName: string): this {
    this.props.firstName = firstName
    this.props.lastName = lastName
    return this
  }

  withStatus(status: UserStatus): this {
    this.props.status = status
    return this
  }

  suspended(): this {
    this.props.status = 'suspended' as UserStatus
    return this
  }

  build(): UserEntity {
    return UserEntity.reconstitute(this.props)
  }
}

export class TenantBuilder {
  private props: any = {
    id: EntityId.generate().value,
    name: 'Test Tenant',
    slug: 'test-tenant',
    email: 'tenant@example.com',
    status: 'active' as TenantStatus,
    plan: 'trial',
    settings: {},
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0
  }

  withId(id: string): this {
    this.props.id = id
    return this
  }

  withName(name: string): this {
    this.props.name = name
    this.props.slug = Slug.generate(name).value
    return this
  }

  withSlug(slug: string): this {
    this.props.slug = slug
    return this
  }

  withPlan(plan: string): this {
    this.props.plan = plan
    return this
  }

  suspended(): this {
    this.props.status = 'suspended' as TenantStatus
    return this
  }

  build(): TenantEntity {
    return TenantEntity.reconstitute(this.props)
  }
}

export class ConversationBuilder {
  private props: any = {
    id: EntityId.generate().value,
    channelId: EntityId.generate().value,
    externalThreadId: 'thread-123',
    status: 'active' as ConversationStatus,
    metadata: {},
    messageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0
  }

  withId(id: string): this {
    this.props.id = id
    return this
  }

  withChannelId(channelId: string): this {
    this.props.channelId = channelId
    return this
  }

  withExternalThreadId(threadId: string): this {
    this.props.externalThreadId = threadId
    return this
  }

  withStatus(status: ConversationStatus): this {
    this.props.status = status
    return this
  }

  archived(): this {
    this.props.status = 'archived' as ConversationStatus
    return this
  }

  withMessageCount(count: number): this {
    this.props.messageCount = count
    this.props.lastMessageAt = new Date()
    return this
  }

  build(): ConversationEntity {
    return ConversationEntity.reconstitute(this.props)
  }
}

export class InvoiceBuilder {
  private props: any = {
    id: EntityId.generate().value,
    tenantId: EntityId.generate().value,
    invoiceNumber: 'INV-001',
    invoiceType: 'invoice' as InvoiceType,
    status: 'draft' as InvoiceStatus,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    totalAmount: new Money(100, 'USD'),
    lineItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 0
  }

  withId(id: string): this {
    this.props.id = id
    return this
  }

  withTenantId(tenantId: string): this {
    this.props.tenantId = tenantId
    return this
  }

  withInvoiceNumber(number: string): this {
    this.props.invoiceNumber = number
    return this
  }

  withAmount(amount: number, currency = 'USD'): this {
    this.props.totalAmount = new Money(amount, currency)
    return this
  }

  withStatus(status: InvoiceStatus): this {
    this.props.status = status
    return this
  }

  withLineItem(description: string, quantity: number, unitPrice: number): this {
    this.props.lineItems.push({
      lineNumber: this.props.lineItems.length + 1,
      description,
      quantity,
      unitPrice: new Money(unitPrice, this.props.totalAmount.getCurrency()),
      totalAmount: new Money(quantity * unitPrice, this.props.totalAmount.getCurrency())
    })
    
    // Recalculate total
    const total = this.props.lineItems.reduce(
      (sum: number, item: any) => sum + item.totalAmount.getAmount(),
      0
    )
    this.props.totalAmount = new Money(total, this.props.totalAmount.getCurrency())
    
    return this
  }

  build(): InvoiceEntity {
    return InvoiceEntity.reconstitute(this.props)
  }
}

// Convenience functions
export const aUser = () => new UserBuilder()
export const aTenant = () => new TenantBuilder()
export const aConversation = () => new ConversationBuilder()
export const anInvoice = () => new InvoiceBuilder()