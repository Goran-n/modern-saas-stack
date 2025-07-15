#!/usr/bin/env node

import { program } from 'commander';
import { logger } from '@kibly/utils';
import { DocumentExtractor } from './extractor';
import { SupabaseStorageClient } from '@kibly/supabase-storage';
import { getConfig } from '@kibly/config';
import { createDrizzleClient, files as filesTable, documentExtractions, eq } from '@kibly/shared-db';

program
  .name('extract-document')
  .description('Extract structured data from documents')
  .version('1.0.0');

program
  .command('file')
  .description('Extract data from a file by ID')
  .argument('<fileId>', 'File ID in the database')
  .option('-t, --tenant <tenantId>', 'Tenant ID (required if not in file)')
  .option('-s, --save', 'Save extraction results to database')
  .option('-v, --verbose', 'Verbose output')
  .action(async (fileId: string, options) => {
    try {
      // Log environment variables for debugging
      console.log('Raw env vars:', {
        TRIGGER_PROJECT_ID: process.env.TRIGGER_PROJECT_ID,
        TRIGGER_API_KEY: process.env.TRIGGER_API_KEY?.substring(0, 10) + '...',
        PORTKEY_API_KEY: process.env.PORTKEY_API_KEY?.substring(0, 10) + '...',
      });
      
      // Validate and get config inside the action
      getConfig().validate();
      logger.info('Config validated successfully');
      
      const config = getConfig().getCore();
      logger.info('Config loaded successfully');
      
      const db = createDrizzleClient(config.DATABASE_URL);
      
      // Fetch file details
      const [file] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, fileId))
        .limit(1);
      
      if (!file) {
        logger.error('File not found', { fileId });
        process.exit(1);
      }
      
      logger.info('Processing file', {
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        tenantId: file.tenantId,
      });
      
      // Get signed URL for file
      const storage = new SupabaseStorageClient({
        url: config.SUPABASE_URL,
        serviceRoleKey: config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
        bucket: file.bucket,
      });
      
      const { data: signedUrl, error: urlError } = await storage.signedUrl(
        file.pathTokens.join('/'),
        3600 // 1 hour expiry
      );
      
      if (urlError || !signedUrl) {
        logger.error('Failed to generate signed URL', { error: urlError });
        process.exit(1);
      }
      
      // Extract document
      const extractor = new DocumentExtractor();
      const result = await extractor.extractDocument(signedUrl.signedUrl, file.mimeType);
      
      if (options.verbose) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.info('Extraction completed', {
          documentType: result.documentType,
          confidence: result.overallConfidence,
          completeness: result.dataCompleteness,
          status: result.validationStatus,
          duration: result.processingDuration,
        });
      }
      
      // Save to database if requested
      if (options.save) {
        try {
          logger.info('About to save to database');
          
          await db.insert(documentExtractions).values({
            fileId: file.id,
            documentType: result.documentType,
            documentTypeConfidence: result.documentTypeConfidence.toString(),
            extractedFields: result.fields as any, // Type cast due to Drizzle ORM limitation
            companyProfile: result.companyProfile,
            lineItems: result.lineItems,
            overallConfidence: result.overallConfidence.toString(),
            dataCompleteness: result.dataCompleteness.toString(),
            validationStatus: result.validationStatus,
            annotations: result.annotations,
            extractionMethod: result.extractionMethod,
            processingDurationMs: result.processingDuration,
            modelVersion: result.processingVersion,
            errors: result.errors,
          });
          
          logger.info('Extraction saved to database');
        } catch (dbError) {
          logger.error('Failed to save extraction to database', { 
            error: dbError instanceof Error ? dbError.message : dbError,
            stack: dbError instanceof Error ? dbError.stack : undefined
          });
          throw dbError;
        }
      }
      
      process.exit(0);
    } catch (error) {
      logger.error('Extraction failed', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined 
      });
      if (options.verbose && error instanceof Error) {
        console.error('Full error:', error);
      }
      process.exit(1);
    }
  });

program
  .command('url')
  .description('Extract data from a URL')
  .argument('<url>', 'Document URL')
  .option('-m, --mime-type <type>', 'MIME type', 'application/pdf')
  .option('-v, --verbose', 'Verbose output')
  .action(async (url: string, options) => {
    try {
      // Validate config for Portkey access
      getConfig().validate();
      
      logger.info('Processing URL', { url, mimeType: options.mimeType });
      
      const extractor = new DocumentExtractor();
      const result = await extractor.extractDocument(url, options.mimeType);
      
      if (options.verbose) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        logger.info('Extraction completed', {
          documentType: result.documentType,
          confidence: result.overallConfidence,
          completeness: result.dataCompleteness,
          status: result.validationStatus,
          duration: result.processingDuration,
        });
      }
      
      process.exit(0);
    } catch (error) {
      logger.error('Extraction failed', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined 
      });
      if (options.verbose && error instanceof Error) {
        console.error('Full error:', error);
      }
      process.exit(1);
    }
  });

program.parse();