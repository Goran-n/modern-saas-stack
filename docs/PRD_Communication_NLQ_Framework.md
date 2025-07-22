# Product Requirements Document (PRD)
# Communication System Natural Language Query Framework

## Document Information
- **Product Name**: Figgy Communication NLQ Framework
- **Version**: 1.0
- **Date**: January 2025
- **Author**: Product Team
- **Status**: Draft

## Executive Summary

The Communication System Natural Language Query (NLQ) Framework enables users to interact with the Figgy platform using natural language queries through WhatsApp, Slack, and other communication channels. This framework will transform how users access information about their files, documents, and system data by allowing conversational queries instead of navigating through traditional UI interfaces.

## Problem Statement

### Current Challenges
1. **Limited Query Capabilities**: Users can only access basic file information through predefined filters
2. **No Conversational Interface**: Text messages in WhatsApp/Slack are ignored; only files are processed
3. **Platform Silos**: Each communication platform has its own response format with no unified approach
4. **Manual Navigation Required**: Users must log into the web interface to check file statuses and statistics
5. **No Intelligent Insights**: System cannot provide proactive information or answer complex queries

### User Pain Points
- "I need to check how many unprocessed invoices I have, but I have to log into the web app"
- "I want to know which files failed processing today via WhatsApp"
- "I can't quickly find all documents from a specific vendor without complex filtering"
- "The system doesn't understand my questions - it only processes files"

## Goals and Objectives

### Primary Goals
1. Enable natural language queries across all communication platforms
2. Provide instant access to file and document information via conversational interface
3. Create a unified response framework that works consistently across platforms
4. Reduce time to information from minutes to seconds

### Success Metrics
- Query understanding accuracy: >90%
- Average response time: <2 seconds
- User adoption rate: 60% of active users within 3 months
- Query volume: 1000+ queries per day by month 3
- User satisfaction: >4.5/5 rating

## User Stories

### Core User Stories

1. **As a business owner**, I want to ask "How many unprocessed files do I have?" via WhatsApp, so I can quickly check my inbox without logging into the web app.

2. **As an accountant**, I want to query "Show me all invoices from Notion Labs in 2024" via Slack, so I can quickly find specific documents for reconciliation.

3. **As a team member**, I want to ask "Which files failed processing today?" so I can address issues immediately.

4. **As a finance manager**, I want to query "What's the total amount of invoices received this month?" so I can track cash flow in real-time.

5. **As a user**, I want to receive formatted, easy-to-read responses with actionable next steps, so I know what to do with the information.

## Functional Requirements

### 1. Natural Language Understanding (NLU)

#### 1.1 Query Types Support
- **Count Queries**: "How many...", "Count of...", "Number of..."
- **List Queries**: "Show me...", "List all...", "Which files..."
- **Search Queries**: "Find...", "Search for...", "Look for..."
- **Aggregation Queries**: "Total amount...", "Sum of...", "Average..."
- **Status Queries**: "Failed files", "Pending documents", "Completed today"
- **Time-based Queries**: "Today", "This week", "Last month", "In January 2025"

#### 1.2 Entity Recognition
- File statuses: pending, processing, completed, failed
- Sources: WhatsApp, Slack, manual upload
- Document types: invoice, receipt, purchase order
- Confidence levels: high (>80%), medium (50-80%), low (<50%)
- Vendor names (fuzzy matching supported)
- Date ranges and relative dates

#### 1.3 Query Understanding Pipeline
1. Intent classification
2. Entity extraction
3. Query validation
4. SQL query generation
5. Result formatting

### 2. Unified Response Framework

#### 2.1 Response Structure
```typescript
{
  query: string,              // Original user query
  intent: {
    type: string,            // count|list|search|aggregate
    confidence: number       // 0-1 confidence score
  },
  results: {
    type: string,           // Type of results
    count?: number,         // For count queries
    items?: Array<>,        // For list queries
    summary?: object,       // For aggregations
    visualization?: {       // Optional chart hints
      type: string,
      data: object
    }
  },
  metadata: {
    processingTime: number,
    filtersApplied: Array<>,
    totalAvailable: number,
    queryId: string
  },
  suggestions?: string[],    // Related queries
  actions?: Array<{         // Next steps
    label: string,
    action: string,
    data: object
  }>
}
```

#### 2.2 Platform-Specific Formatting
- **WhatsApp**: Markdown-style formatting with emojis
- **Slack**: Rich blocks with interactive buttons
- **API**: Raw JSON response
- **Web**: HTML/React components

### 3. Query Processing Engine

#### 3.1 Supported Operations
- Full-text search across file names and content
- Filtering by multiple criteria (AND/OR logic)
- Date range queries with natural language parsing
- Aggregations (COUNT, SUM, AVG, MIN, MAX)
- Grouping (by status, source, date, vendor)
- Sorting (newest, oldest, largest, confidence)
- Pagination for large result sets

#### 3.2 Performance Requirements
- Query parsing: <100ms
- Simple queries: <500ms total
- Complex queries: <2s total
- Concurrent queries: Support 100+ simultaneous

### 4. Data Storage Enhancements

#### 4.1 New Message Storage
- Store all incoming text messages
- Full-text indexing for search
- Link messages to processed files
- Audit trail for all queries

#### 4.2 Query Analytics
- Track all queries and intents
- Monitor query success/failure rates
- Identify common query patterns
- Generate insights for improvement

### 5. Integration Requirements

#### 5.1 Communication Platforms
- WhatsApp Business API via Twilio
- Slack Events API
- Future: Microsoft Teams, Email

#### 5.2 Internal Systems
- File manager for document data
- Document extraction for content search
- User authentication and tenant isolation
- Activity logging and monitoring

## Non-Functional Requirements

### Security
- All queries must respect tenant boundaries
- User authentication required for all queries
- Sensitive data masking in responses
- Query audit logging for compliance
- Rate limiting to prevent abuse

### Performance
- 99.9% uptime for query service
- <2 second response time for 95% of queries
- Support 10,000 queries per hour
- Horizontal scaling capability

### Usability
- Natural language understanding without training
- Helpful error messages for unsupported queries
- Query suggestions and autocomplete
- Multi-language support (Phase 2)

### Scalability
- Microservice architecture for independent scaling
- Caching layer for frequent queries
- Database query optimization
- CDN for static response elements

## Technical Architecture

### Component Overview
1. **NLQ Service** (New Package: `packages/nlq`)
   - Query parser and intent classifier
   - Entity extractor
   - Query builder
   - Response formatter

2. **Communication Service** (Enhanced)
   - Message handler updates
   - Unified response generator
   - Platform-specific formatters

3. **Database Layer**
   - New `communication_messages` table
   - Full-text search indexes
   - Query analytics tables

4. **API Layer**
   - New TRPC endpoints
   - WebSocket support (future)
   - Rate limiting middleware

### Technology Stack
- **NLU**: OpenAI/Anthropic API for understanding
- **Search**: PostgreSQL full-text search
- **Cache**: Redis for query results
- **Queue**: Bull for async processing
- **Monitoring**: OpenTelemetry

## Implementation Phases

### Phase 1: MVP (Weeks 1-4)
- Basic query understanding (5-10 patterns)
- Count and list queries
- WhatsApp and Slack integration
- Simple response formatting

### Phase 2: Enhanced Queries (Weeks 5-8)
- Complex aggregations
- Advanced filtering
- Query suggestions
- Performance optimization

### Phase 3: Intelligence (Weeks 9-12)
- Proactive insights
- Query learning and improvement
- Voice query support
- Multi-language support

## Risks and Mitigation

### Technical Risks
1. **LLM API Reliability**
   - Mitigation: Fallback to pattern matching
   - Local model option for critical queries

2. **Query Complexity**
   - Mitigation: Start with simple patterns
   - Gradual enhancement based on usage

3. **Performance at Scale**
   - Mitigation: Aggressive caching
   - Query optimization and monitoring

### Business Risks
1. **User Adoption**
   - Mitigation: User education and onboarding
   - Progressive rollout with feedback

2. **Cost of LLM APIs**
   - Mitigation: Usage-based pricing tiers
   - Efficient prompt engineering

## Success Criteria

### Launch Criteria
- [ ] Support for 10 core query patterns
- [ ] <2 second response time
- [ ] 95% query success rate in testing
- [ ] Integration with WhatsApp and Slack
- [ ] Security audit passed

### Post-Launch Success Metrics
- 500+ daily active query users within 1 month
- 90% query understanding accuracy
- 4.5+ user satisfaction rating
- 50% reduction in web app usage for status checks
- <1% error rate in production

## Appendix

### Example Queries and Responses

#### Example 1: Count Query
**User**: "How many unprocessed files do I have?"

**Response**:
```
📊 Unprocessed Files Summary

You have **23 unprocessed files**:
• 15 pending review
• 8 currently processing

💡 Tip: Reply "show pending" to see the list
```

#### Example 2: Search Query
**User**: "Show me all invoices from Notion Labs this month"

**Response**:
```
🔍 Found 4 invoices from Notion Labs (Dec 2024)

1. 📄 INV-2024-1234 - $1,250.00 (Dec 3)
2. 📄 INV-2024-1235 - $2,500.00 (Dec 10)
3. 📄 INV-2024-1236 - $1,750.00 (Dec 17)
4. 📄 INV-2024-1237 - $3,000.00 (Dec 24)

💰 Total: $8,500.00

Actions:
• Reply "download 1" to get INV-2024-1234
• Reply "email all" to send list to your email
```

#### Example 3: Status Query
**User**: "Which files failed processing today?"

**Response**:
```
⚠️ 3 files failed processing today

1. 🔴 receipt_20241219.pdf
   Error: Could not extract text
   Uploaded: 2 hours ago via WhatsApp

2. 🔴 invoice_scan.jpg
   Error: Image quality too low
   Uploaded: 4 hours ago via Slack

3. 🔴 po_12345.pdf
   Error: Unsupported file format
   Uploaded: 6 hours ago via WhatsApp

💡 Reply "retry 1" to reprocess the first file
```

### Glossary
- **NLQ**: Natural Language Query
- **Intent**: The purpose or goal of a user's query
- **Entity**: Specific information extracted from a query (dates, names, etc.)
- **Confidence Score**: Measure of certainty in query understanding
- **Unified Response**: Consistent response format across all platforms