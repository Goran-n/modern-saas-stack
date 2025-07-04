import { getDatabase } from '../database/connection'
import { TenantService } from '../services/tenant.service'
import { TenantMemberService } from '../services/tenant-member.service'
import log from '../config/logger'

async function seed() {
  const db = getDatabase()
  
  if (!db) {
    log.error('Database not available - check DATABASE_URL')
    process.exit(1)
  }

  try {
    log.info('Seeding database...')

    const tenantService = new TenantService()
    const memberService = new TenantMemberService()

    // Create sample tenant
    const tenant = await tenantService.createTenant({
      name: 'Demo Company Ltd',
      email: 'admin@democompany.com',
      slug: 'demo-company',
      settings: {
        features: {
          autoMatching: true,
          llmDecisionMaking: true,
          multiCurrency: false,
          advancedAnalytics: true,
        },
        notifications: {
          email: true,
          processingSummary: true,
          errorAlerts: true,
        },
        ui: {
          theme: 'light',
          currency: 'GBP',
          dateFormat: 'DD/MM/YYYY',
          timezone: 'Europe/London',
        }
      },
      subscription: {
        plan: 'professional',
        status: 'active',
        billingCycle: 'monthly',
      },
      metadata: {
        company: {
          industry: 'Technology',
          size: '10-50',
        },
        onboarding: {
          completed: false,
          currentStep: 'setup_integrations',
          completedSteps: ['create_account', 'basic_setup'],
        }
      },
      // Note: In real app, this would be a real user ID from auth system
      ownerId: 'demo-user-id-12345',
    })

    log.info(`Created demo tenant: ${tenant.name} (${tenant.slug})`)

    // Create a sample member invitation
    await memberService.inviteMember({
      tenantId: tenant.id,
      invitedEmail: 'member@democompany.com',
      invitedBy: 'demo-user-id-12345',
      role: 'admin',
    })

    log.info('Created sample member invitation')

    log.info('✅ Database seeded successfully')
    log.info('🏢 Demo tenant created with slug: demo-company')
    log.info('👤 Demo user ID: demo-user-id-12345')
    log.info('📧 Member invitation sent to: member@democompany.com')
    
  } catch (error) {
    log.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()