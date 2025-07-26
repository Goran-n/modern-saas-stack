#!/usr/bin/env bun

import { Command } from 'commander'
import chalk from 'chalk'
import { getConfig } from '@figgy/config'
import { resyncCommand } from './commands/resync'
import { healthCommand } from './commands/health'
import { searchTestCommand } from './commands/search-test'

const program = new Command()

// Basic config check (full validation happens in commands)
try {
  getConfig()
} catch (error) {
  console.error(chalk.red('Failed to load configuration:'), error)
  process.exit(1)
}

program
  .name('figgy')
  .description('Figgy CLI - Manage your Figgy instance')
  .version('1.0.0')

// Add commands
program.addCommand(healthCommand)
program.addCommand(resyncCommand)
program.addCommand(searchTestCommand)

// Parse command line arguments
program.parse(process.argv)

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
