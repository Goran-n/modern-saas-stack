#!/usr/bin/env bun

import { getConfig, getRedisConfig } from '../config/config'

console.log('🔍 Environment Configuration Check\n')

try {
  const config = getConfig()
  const redisConfig = getRedisConfig()
  
  console.log('📋 Application Config:')
  console.log(`   NODE_ENV: ${config.NODE_ENV}`)
  console.log(`   PORT: ${config.PORT}`)
  console.log(`   DATABASE_URL: ${config.DATABASE_URL ? '✅ Set' : '❌ Not set'}`)
  console.log(`   JWT_KEY: ${config.JWT_KEY ? '✅ Set' : '❌ Not set'}`)
  
  console.log('\n📊 Redis Config:')
  console.log(`   REDIS_HOST: ${redisConfig.host}`)
  console.log(`   REDIS_PORT: ${redisConfig.port}`)
  console.log(`   REDIS_USER: ${redisConfig.username ? '✅ Set' : '❌ Not set'}`)
  console.log(`   REDIS_PASSWORD: ${redisConfig.password ? '✅ Set' : '❌ Not set'}`)
  console.log(`   REDIS_TLS: ${redisConfig.tls ? '✅ Enabled' : '❌ Disabled'}`)
  
  console.log('\n🎯 Recommendations:')
  
  if (redisConfig.host === 'localhost') {
    console.log('   📝 For Upstash, set REDIS_HOST to your Upstash host')
    console.log('   📝 Set REDIS_USER=default')
    console.log('   📝 Set REDIS_PASSWORD to your Upstash password')
    console.log('   📝 Set REDIS_TLS=true for Upstash')
  }
  
  if (redisConfig.host !== 'localhost' && !redisConfig.tls) {
    console.log('   📝 Consider setting REDIS_TLS=true for cloud Redis')
  }
  
  console.log('\n✅ Configuration check complete!')
  
} catch (error) {
  console.error('❌ Configuration error:', error)
  process.exit(1)
}