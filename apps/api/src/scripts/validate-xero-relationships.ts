#!/usr/bin/env tsx

import { Command } from 'commander'
import { eq, and, sql } from 'drizzle-orm'
import { writeFileSync } from 'fs'
import { connectDatabase, getDatabase } from '../database/connection'
import { integrations } from '../database/schema'
import { RelationshipValidatorService } from '../core/services/relationship-validator.service'
import chalk from 'chalk'

/**
 * Script to validate all Xero data relationships
 */

const program = new Command()

program
  .name('validate-xero-relationships')
  .description('Validate all relationships in Xero imported data')
  .version('1.0.0')

program
  .command('validate')
  .description('Validate relationships for a specific integration')
  .requiredOption('-i, --integration-id <id>', 'Integration ID')
  .requiredOption('-t, --tenant-id <id>', 'Tenant ID')
  .option('--fix', 'Fix orphaned references by setting them to null')
  .option('--dry-run', 'Show what would be fixed without making changes', true)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Starting Xero relationship validation...'))
      
      // Initialize database connection
      await connectDatabase()
      
      // Database is already connected, validator service doesn't need DI
      
      console.log(chalk.gray(`Integration: ${options.integrationId}`))
      console.log(chalk.gray(`Tenant: ${options.tenantId}`))
      
      // Get database instance
      const db = getDatabase()
      
      // Fetch integration
      const [integration] = await db
        .select()
        .from(integrations)
        .where(
          and(
            eq(integrations.id, options.integrationId),
            eq(integrations.tenantId, options.tenantId),
            eq(integrations.provider, 'xero')
          )
        )
        .limit(1)
      
      if (!integration) {
        throw new Error('Xero integration not found')
      }
      
      console.log(chalk.green(`✓ Found Xero integration`))
      
      // Create validator service
      const validator = new RelationshipValidatorService()
      
      // Run validation
      console.log(chalk.blue('\n📊 Validating relationships...'))
      const validationResult = await validator.validateTenant(options.tenantId)
      
      // Display results
      console.log(chalk.blue('\n📈 Validation Results:'))
      console.log(chalk.gray('─'.repeat(60)))
      
      validationResult.results.forEach(result => {
        const icon = result.orphanedRecords > 0 ? chalk.yellow('⚠️') : chalk.green('✓')
        console.log(`${icon} ${result.entity.padEnd(20)} ${result.totalRecords} records, ${result.orphanedRecords} orphaned`)
        
        // Show sample of missing references
        if (result.orphanedRecords > 0 && result.missingReferences.length > 0) {
          console.log(chalk.gray(`   Sample issues:`))
          result.missingReferences.slice(0, 3).forEach(ref => {
            console.log(chalk.gray(`   - ${ref.description}`))
          })
          if (result.missingReferences.length > 3) {
            console.log(chalk.gray(`   ... and ${result.missingReferences.length - 3} more`))
          }
        }
      })
      
      console.log(chalk.gray('─'.repeat(60)))
      console.log(chalk.bold(`Health Score: ${validationResult.healthScore}%`))
      console.log(chalk.bold(`Total Orphans: ${validationResult.totalOrphans}`))
      
      // Fix orphans if requested
      if (options.fix) {
        console.log(chalk.blue('\n🔧 Fixing orphaned references...'))
        
        const fixResults = await validator.fixOrphanedReferences(
          options.tenantId,
          options.dryRun
        )
        
        console.log(chalk.blue('\n📝 Fix Results:'))
        fixResults.forEach(result => {
          console.log(`${result.entity.padEnd(20)} ${result.fixed} references ${options.dryRun ? 'would be' : 'were'} fixed`)
        })
        
        if (options.dryRun) {
          console.log(chalk.yellow('\n⚠️  This was a dry run. Use --no-dry-run to apply fixes.'))
        }
      }
      
      // Re-validate after fixes
      if (options.fix && !options.dryRun) {
        console.log(chalk.blue('\n🔄 Re-validating after fixes...'))
        const revalidationResult = await validator.validateTenant(options.tenantId)
        console.log(chalk.bold(`New Health Score: ${revalidationResult.healthScore}%`))
        console.log(chalk.bold(`Remaining Orphans: ${revalidationResult.totalOrphans}`))
      }
      
      // Generate detailed report
      const reportPath = `/tmp/xero-validation-${options.tenantId}-${Date.now()}.json`
      writeFileSync(reportPath, JSON.stringify(validationResult, null, 2))
      console.log(chalk.gray(`\nDetailed report saved to: ${reportPath}`))
      
      console.log(chalk.green('\n✅ Validation complete!'))
      
    } catch (error) {
      console.error(chalk.red('\n❌ Validation failed:'), error)
      process.exit(1)
    }
    
    process.exit(0)
  })

program
  .command('summary')
  .description('Show a summary of all relationships')
  .requiredOption('-t, --tenant-id <id>', 'Tenant ID')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📊 Generating relationship summary...'))
      
      // Initialize database connection
      await connectDatabase()
      
      // Get database instance
      const db = getDatabase()
      
      // Get counts of linked vs unlinked records
      const stats = await db.execute(sql`
        WITH transaction_stats AS (
          SELECT 
            COUNT(*) as total,
            COUNT(supplier_id) as with_supplier,
            COUNT(account_id) as with_account,
            COUNT(source_invoice_id) as with_invoice
          FROM transactions
          WHERE tenant_id = ${options.tenantId}
        ),
        invoice_stats AS (
          SELECT 
            COUNT(*) as total,
            COUNT(supplier_id) as with_supplier
          FROM invoices
          WHERE tenant_id = ${options.tenantId}
        ),
        invoice_line_stats AS (
          SELECT 
            COUNT(*) as total_lines,
            SUM(
              CASE 
                WHEN jsonb_array_length(line_items) > 0 THEN
                  (SELECT COUNT(*) 
                   FROM jsonb_array_elements(line_items) item 
                   WHERE item->>'accountId' IS NOT NULL)
                ELSE 0
              END
            ) as with_account
          FROM invoices
          WHERE tenant_id = ${options.tenantId}
        )
        SELECT 
          t.total as transaction_count,
          t.with_supplier as transactions_with_supplier,
          t.with_account as transactions_with_account,
          t.with_invoice as transactions_with_invoice,
          i.total as invoice_count,
          i.with_supplier as invoices_with_supplier,
          il.total_lines as invoice_line_count,
          il.with_account as invoice_lines_with_account
        FROM transaction_stats t, invoice_stats i, invoice_line_stats il
      `)
      
      const summary = stats[0] as any
      
      console.log(chalk.blue('\n📈 Relationship Summary:'))
      console.log(chalk.gray('─'.repeat(60)))
      
      // Transaction stats
      console.log(chalk.bold('\nTransactions:'))
      console.log(`  Total: ${summary.transaction_count}`)
      console.log(`  With Supplier: ${summary.transactions_with_supplier} (${Math.round(summary.transactions_with_supplier / summary.transaction_count * 100)}%)`)
      console.log(`  With Account: ${summary.transactions_with_account} (${Math.round(summary.transactions_with_account / summary.transaction_count * 100)}%)`)
      console.log(`  With Invoice: ${summary.transactions_with_invoice} (${Math.round(summary.transactions_with_invoice / summary.transaction_count * 100)}%)`)
      
      // Invoice stats
      console.log(chalk.bold('\nInvoices:'))
      console.log(`  Total: ${summary.invoice_count}`)
      console.log(`  With Supplier: ${summary.invoices_with_supplier} (${Math.round(summary.invoices_with_supplier / summary.invoice_count * 100)}%)`)
      
      // Invoice line stats
      console.log(chalk.bold('\nInvoice Line Items:'))
      console.log(`  Total Lines: ${summary.invoice_line_count}`)
      console.log(`  With Account: ${summary.invoice_lines_with_account} (${Math.round(summary.invoice_lines_with_account / summary.invoice_line_count * 100)}%)`)
      
      console.log(chalk.gray('─'.repeat(60)))
      
    } catch (error) {
      console.error(chalk.red('\n❌ Summary generation failed:'), error)
      process.exit(1)
    }
    
    process.exit(0)
  })

program.parse(process.argv)