#!/usr/bin/env bun
import { execSync } from 'child_process'
import path from 'path'
import log from '../config/logger'

/**
 * Validates TypeScript types before starting the application
 * This script ensures that the API will not start if there are any TypeScript errors
 */
export async function validateTypes(): Promise<void> {
  try {
    log.info('🔍 Validating TypeScript types...')
    
    // Get the project root directory
    const projectRoot = path.resolve(__dirname, '../..')
    
    // Run TypeScript compiler in check mode
    const command = 'doppler run -- bunx tsc --noEmit'
    
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      encoding: 'utf8'
    })
    
    log.info('✅ TypeScript validation passed - no type errors found')
  } catch (error) {
    log.error('❌ TypeScript validation failed - type errors detected')
    log.error('The API cannot start with TypeScript errors present')
    
    if (error instanceof Error) {
      log.error('Error details:', error.message)
    }
    
    process.exit(1)
  }
}

/**
 * Main function to run type validation
 */
async function main(): Promise<void> {
  await validateTypes()
}

// Run validation when script is executed directly with Bun
main().catch((error) => {
  console.error('Type validation failed:', error)
  process.exit(1)
})