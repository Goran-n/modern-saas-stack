import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import prompts from 'prompts'
import { getConfig } from '@figgy/config'
import { getDatabaseConnection, files, suppliers, documentExtractions } from '@figgy/shared-db'
import { reprocessFile } from '@figgy/file-manager'
import * as searchOps from '@figgy/search'
import { createLogger } from '@figgy/utils'
import { eq, and, isNull, ne, sql } from 'drizzle-orm'

const logger = createLogger('cli:resync')

export const resyncCommand = new Command('resync')
  .description('Resync and reprocess all data for a tenant')
  .option('-t, --tenant <id>', 'Tenant ID to resync')
  .option('-f, --files', 'Resync files only', false)
  .option('-s, --suppliers', 'Resync suppliers only', false)
  .option('-i, --index', 'Rebuild search index only', false)
  .option('--search-only', 'Only rebuild search index without triggering processing', false)
  .option('--skip-processing', 'Skip triggering new AI jobs, only update search', false)
  .option('--dry-run', 'Show what would be resynced without actually doing it', false)
  .option('--batch-size <size>', 'Number of records to process at once', '50')
  .action(async (options) => {
    try {
      const config = getConfig()
      config.validate() // Validate configuration first
      const db = getDatabaseConnection(config.getCore().DATABASE_URL)

      // Get tenant ID
      let tenantId = options.tenant
      if (!tenantId) {
        const response = await prompts({
          type: 'text',
          name: 'tenantId',
          message: 'Enter the tenant ID to resync:',
          validate: (value) => value.length > 0 || 'Tenant ID is required'
        })
        
        if (!response.tenantId) {
          console.log(chalk.yellow('Resync cancelled'))
          return
        }
        
        tenantId = response.tenantId
      }

      // Determine what to resync
      const resyncFiles = options.files || (!options.suppliers && !options.index && !options.searchOnly)
      const resyncSuppliers = options.suppliers || (!options.files && !options.index && !options.searchOnly)
      const rebuildIndex = options.index || options.searchOnly || (!options.files && !options.suppliers)
      const isDryRun = options.dryRun
      const batchSize = parseInt(options.batchSize, 10)
      const skipProcessing = options.skipProcessing || options.searchOnly

      console.log(chalk.cyan('\n🔄 Resync Configuration:'))
      console.log(chalk.gray(`   Tenant ID: ${tenantId}`))
      console.log(chalk.gray(`   Resync files: ${resyncFiles}`))
      console.log(chalk.gray(`   Resync suppliers: ${resyncSuppliers}`))
      console.log(chalk.gray(`   Rebuild search index: ${rebuildIndex}`))
      console.log(chalk.gray(`   Skip AI processing: ${skipProcessing}`))
      console.log(chalk.gray(`   Batch size: ${batchSize}`))
      console.log(chalk.gray(`   Dry run: ${isDryRun}`))

      if (!isDryRun) {
        const confirm = await prompts({
          type: 'confirm',
          name: 'value',
          message: 'Are you sure you want to proceed?',
          initial: false
        })

        if (!confirm.value) {
          console.log(chalk.yellow('\nResync cancelled'))
          return
        }
      }

      console.log(chalk.cyan('\n🚀 Starting resync process...\n'))

      // Resync files
      if (resyncFiles) {
        await resyncFilesForTenant(db, tenantId, isDryRun, batchSize, skipProcessing)
      }

      // Resync suppliers
      if (resyncSuppliers) {
        await resyncSuppliersForTenant(db, tenantId, isDryRun, batchSize)
      }

      // Rebuild search index
      if (rebuildIndex) {
        await rebuildSearchIndex(db, tenantId, isDryRun, batchSize)
      }

      console.log(chalk.green('\n✅ Resync completed successfully!'))

    } catch (error) {
      logger.error('Resync failed', { error })
      console.error(chalk.red('\n❌ Resync failed:'), error)
      process.exit(1)
    }
  })

async function resyncFilesForTenant(
  db: any,
  tenantId: string,
  isDryRun: boolean,
  batchSize: number,
  skipProcessing: boolean = false
) {
  const spinner = ora('Counting files to resync...').start()

  try {
    // Count total files
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.tenantId, tenantId))

    spinner.succeed(`Found ${chalk.bold(count)} files to resync`)

    if (count === 0) {
      console.log(chalk.gray('No files to resync'))
      return
    }

    if (isDryRun) {
      console.log(chalk.yellow('\n[DRY RUN] Would reprocess the following:'))
      
      // Show sample of files
      const sampleFiles = await db
        .select({
          id: files.id,
          fileName: files.fileName,
          processingStatus: files.processingStatus,
          createdAt: files.createdAt
        })
        .from(files)
        .where(eq(files.tenantId, tenantId))
        .limit(10)

      sampleFiles.forEach((file: any) => {
        console.log(chalk.gray(`  - ${file.fileName} (${file.processingStatus || 'pending'})`))
      })

      if (count > 10) {
        console.log(chalk.gray(`  ... and ${count - 10} more files`))
      }

      return
    }

    // Process files in batches
    let processed = 0
    let offset = 0
    const progressBar = ora(skipProcessing ? 'Updating search index for files...' : 'Processing files...').start()

    if (skipProcessing) {
      // Just rebuild search index without triggering new jobs
      while (offset < count) {
        const batch = await db
          .select({
            file: files,
            extraction: documentExtractions
          })
          .from(files)
          .leftJoin(
            documentExtractions,
            eq(files.id, documentExtractions.fileId)
          )
          .where(eq(files.tenantId, tenantId))
          .limit(batchSize)
          .offset(offset)

        for (const { file, extraction } of batch) {
          try {
            // Just update search index
            await searchOps.indexFile({
              id: file.id,
              tenantId: file.tenantId,
              fileName: file.fileName,
              mimeType: file.mimeType,
              supplierName: (file.metadata as any)?.supplierName,
              category: (file.metadata as any)?.category || extraction?.documentType,
              size: file.fileSize || undefined,
              createdAt: file.createdAt
            })

            if (extraction) {
              const updateData: any = {
                category: extraction.documentType,
                extractedText: (extraction.extractedFields as any)?.description || '',
                documentType: extraction.documentType,
              }
              
              if ((extraction.extractedFields as any)?.invoiceNumber) {
                updateData.invoiceNumber = (extraction.extractedFields as any).invoiceNumber
              }
              
              if ((extraction.extractedFields as any)?.amount) {
                updateData.amount = parseFloat((extraction.extractedFields as any).amount)
              }
              
              await searchOps.updateFile(file.id, file.tenantId, updateData)
            }

            processed++
            progressBar.text = `Updating search index for files... ${processed}/${count}`
          } catch (error) {
            logger.error('Failed to update search index for file', { fileId: file.id, error })
            // Continue with next file
          }
        }

        offset += batchSize
      }
    } else {
      // Original behavior - trigger reprocessing
      while (offset < count) {
        const batch = await db
          .select({ id: files.id })
          .from(files)
          .where(eq(files.tenantId, tenantId))
          .limit(batchSize)
          .offset(offset)

        for (const file of batch) {
          try {
            await reprocessFile(file.id, tenantId)
            processed++
            progressBar.text = `Processing files... ${processed}/${count}`
          } catch (error) {
            logger.error('Failed to reprocess file', { fileId: file.id, error })
            // Continue with next file
          }
        }

        offset += batchSize
      }
    }

    progressBar.succeed(skipProcessing ? 
      `Updated search index for ${chalk.bold(processed)} files` : 
      `Reprocessed ${chalk.bold(processed)} files`)

  } catch (error) {
    spinner.fail('Failed to resync files')
    throw error
  }
}

async function resyncSuppliersForTenant(
  db: any,
  tenantId: string,
  isDryRun: boolean,
  batchSize: number
) {
  const spinner = ora('Counting suppliers to resync...').start()

  try {
    // Count total suppliers
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          isNull(suppliers.deletedAt)
        )
      )

    spinner.succeed(`Found ${chalk.bold(count)} suppliers to resync`)

    if (count === 0) {
      console.log(chalk.gray('No suppliers to resync'))
      return
    }

    if (isDryRun) {
      console.log(chalk.yellow('\n[DRY RUN] Would reindex the following suppliers:'))
      
      // Show sample of suppliers
      const sampleSuppliers = await db
        .select({
          id: suppliers.id,
          displayName: suppliers.displayName,
          legalName: suppliers.legalName
        })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.tenantId, tenantId),
            isNull(suppliers.deletedAt)
          )
        )
        .limit(10)

      sampleSuppliers.forEach((supplier: any) => {
        console.log(chalk.gray(`  - ${supplier.displayName} (${supplier.legalName})`))
      })

      if (count > 10) {
        console.log(chalk.gray(`  ... and ${count - 10} more suppliers`))
      }

      return
    }

    // Process suppliers in batches
    let processed = 0
    let offset = 0
    const progressBar = ora('Reindexing suppliers...').start()

    while (offset < count) {
      const batch = await db
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.tenantId, tenantId),
            isNull(suppliers.deletedAt)
          )
        )
        .limit(batchSize)
        .offset(offset)

      for (const supplier of batch) {
        try {
          const supplierData: any = {
            id: supplier.id,
            tenantId: supplier.tenantId,
            displayName: supplier.displayName,
            legalName: supplier.legalName,
            createdAt: supplier.createdAt
          }
          
          if (supplier.companyNumber) {
            supplierData.companyNumber = supplier.companyNumber
          }
          
          if (supplier.vatNumber) {
            supplierData.vatNumber = supplier.vatNumber
          }
          
          await searchOps.indexSupplier(supplierData)
          processed++
          progressBar.text = `Reindexing suppliers... ${processed}/${count}`
        } catch (error) {
          logger.error('Failed to reindex supplier', { supplierId: supplier.id, error })
          // Continue with next supplier
        }
      }

      offset += batchSize
    }

    progressBar.succeed(`Reindexed ${chalk.bold(processed)} suppliers`)

  } catch (error) {
    spinner.fail('Failed to resync suppliers')
    throw error
  }
}

async function rebuildSearchIndex(
  db: any,
  tenantId: string,
  isDryRun: boolean,
  batchSize: number
) {
  const spinner = ora('Preparing to rebuild search index...').start()

  try {
    // Count files with extractions
    const countResult = await db
      .select({ fileCount: sql<number>`count(distinct ${files.id})` })
      .from(files)
      .leftJoin(
        documentExtractions,
        eq(files.id, documentExtractions.fileId)
      )
      .where(
        and(
          eq(files.tenantId, tenantId),
          ne(files.processingStatus, 'failed')
        )
      )
    
    const fileCount = countResult[0]?.fileCount || 0

    spinner.succeed(`Found ${chalk.bold(fileCount)} files to index`)

    if (isDryRun) {
      console.log(chalk.yellow('\n[DRY RUN] Would rebuild search index for all files and suppliers'))
      return
    }

    // Reindex all files with their extractions
    let processedFiles = 0
    let offset = 0
    const fileProgress = ora('Rebuilding file search index...').start()

    while (offset < fileCount) {
      const batch = await db
        .select({
          file: files,
          extraction: documentExtractions
        })
        .from(files)
        .leftJoin(
          documentExtractions,
          eq(files.id, documentExtractions.fileId)
        )
        .where(
          and(
            eq(files.tenantId, tenantId),
            ne(files.processingStatus, 'failed')
          )
        )
        .limit(batchSize)
        .offset(offset)

      for (const { file, extraction } of batch) {
        try {
          // Index the file
          await searchOps.indexFile({
            id: file.id,
            tenantId: file.tenantId,
            fileName: file.fileName,
            mimeType: file.mimeType,
            supplierName: (file.metadata as any)?.supplierName,
            category: (file.metadata as any)?.category || extraction?.documentType,
            size: file.fileSize || undefined,
            createdAt: file.createdAt
          })

          // Update with extraction data if available
          if (extraction) {
            const updateData: any = {
              category: extraction.documentType,
              extractedText: (extraction.extractedFields as any)?.description || '',
              documentType: extraction.documentType,
            }
            
            if ((extraction.extractedFields as any)?.invoiceNumber) {
              updateData.invoiceNumber = (extraction.extractedFields as any).invoiceNumber
            }
            
            if ((extraction.extractedFields as any)?.amount) {
              updateData.amount = parseFloat((extraction.extractedFields as any).amount)
            }
            
            await searchOps.updateFile(file.id, file.tenantId, updateData)
          }

          processedFiles++
          fileProgress.text = `Rebuilding file search index... ${processedFiles}/${fileCount}`
        } catch (error) {
          logger.error('Failed to reindex file', { fileId: file.id, error })
          // Continue with next file
        }
      }

      offset += batchSize
    }

    fileProgress.succeed(`Reindexed ${chalk.bold(processedFiles)} files`)

    // Also resync suppliers for complete index
    await resyncSuppliersForTenant(db, tenantId, false, batchSize)

  } catch (error) {
    spinner.fail('Failed to rebuild search index')
    throw error
  }
}
