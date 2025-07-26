import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { getConfig } from '@figgy/config'
import { getDatabaseConnection, sql } from '@figgy/shared-db'

export const healthCommand = new Command('health')
  .description('Check the health of your Figgy instance')
  .action(async () => {
    console.log(chalk.cyan('\n🏥 Figgy Health Check\n'))

    // Check configuration
    const configSpinner = ora('Checking configuration...').start()
    try {
      const config = getConfig()
      if (config.isValid()) {
        configSpinner.succeed('Configuration is valid')
      } else {
        configSpinner.fail('Configuration is invalid')
        config.validate() // This will throw with details
      }
    } catch (error) {
      configSpinner.fail('Configuration check failed')
      console.error(chalk.red(error))
      process.exit(1)
    }

    // Check database connection
    const dbSpinner = ora('Checking database connection...').start()
    try {
      const config = getConfig()
      config.validate() // Ensure config is validated
      const db = getDatabaseConnection(config.getCore().DATABASE_URL)
      
      // Simple query to test connection
      const result = await db.select({ now: sql`NOW()` }).from(sql`dual`)
      const now = result[0]?.now
      dbSpinner.succeed(`Database connected (server time: ${now ? new Date(now as string).toLocaleString() : 'unknown'})`)
    } catch (error) {
      dbSpinner.fail('Database connection failed')
      console.error(chalk.red(error))
      process.exit(1)
    }

    // Check Upstash configuration
    const upstashSpinner = ora('Checking Upstash configuration...').start()
    const upstashSearchUrl = process.env.UPSTASH_SEARCH_REST_URL
    const upstashSearchToken = process.env.UPSTASH_SEARCH_REST_TOKEN
    const upstashVectorUrl = process.env.UPSTASH_VECTOR_REST_URL
    const upstashVectorToken = process.env.UPSTASH_VECTOR_REST_TOKEN
    
    if ((upstashSearchUrl && upstashSearchToken) || (upstashVectorUrl && upstashVectorToken)) {
      const type = upstashSearchUrl ? 'Search' : 'Vector'
      upstashSpinner.succeed(`Upstash ${type} configured`)
    } else {
      upstashSpinner.warn('Upstash not configured (search functionality will be disabled)')
    }

    // Summary
    console.log(chalk.green('\n✅ Health check completed\n'))
  })
