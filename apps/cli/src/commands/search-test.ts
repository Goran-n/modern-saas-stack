import { Command } from 'commander'
import chalk from 'chalk'
import { getConfig } from '@figgy/config'
import * as searchOps from '@figgy/search'
import { createLogger } from '@figgy/utils'

const logger = createLogger('cli:search-test')

export const searchTestCommand = new Command('search-test')
  .description('Test search functionality')
  .option('-t, --tenant <id>', 'Tenant ID', 'test-tenant')
  .option('-q, --query <query>', 'Search query', 'invoice')
  .action(async (options) => {
    try {
      const config = getConfig()
      config.validate()

      console.log(chalk.cyan('\n🔍 Testing Search\n'))
      console.log(chalk.gray(`Tenant: ${options.tenant}`))
      console.log(chalk.gray(`Query: ${options.query}`))

      // Try searching
      console.log(chalk.yellow('\nSearching...'))
      const results = await searchOps.search(options.tenant, options.query)
      
      console.log(chalk.green(`\nFound ${results.length} results:`))
      results.forEach((result, index) => {
        console.log(chalk.cyan(`\n${index + 1}. ${result.id}`))
        console.log(chalk.gray(`   Score: ${result.score}`))
        console.log(chalk.gray(`   Metadata: ${JSON.stringify(result.metadata, null, 2)}`))
      })

      // Try searching with empty query
      console.log(chalk.yellow('\n\nTrying with empty query...'))
      const allResults = await searchOps.search(options.tenant, '')
      console.log(chalk.green(`Found ${allResults.length} results with empty query`))

      // Try searching with wildcard
      console.log(chalk.yellow('\n\nTrying with wildcard (*)...'))
      const wildcardResults = await searchOps.search(options.tenant, '*')
      console.log(chalk.green(`Found ${wildcardResults.length} results with wildcard`))

    } catch (error) {
      logger.error('Search test failed', { error })
      console.error(chalk.red('\n❌ Search test failed:'), error)
      process.exit(1)
    }
  })