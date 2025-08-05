#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { TEST_INVOICES, TestReporter } from './helpers/test-utils';

console.log('🚀 Running Comprehensive Invoice Processing Test Suite\n');

const reporter = new TestReporter();

// Test categories
const testSuites = [
  {
    name: 'Invoice Format Tests',
    command: 'vitest run test/unit/invoice-format.test.ts',
    critical: true
  },
  {
    name: 'Vendor Matching Tests',
    command: 'vitest run test/unit/vendor-matching.test.ts',
    critical: true
  },
  {
    name: 'Extraction Accuracy Tests',
    command: 'vitest run test/integration/extraction-accuracy.test.ts',
    critical: true
  },
  {
    name: 'Edge Case Tests',
    command: 'vitest run test/integration/edge-cases.test.ts',
    critical: false
  }
];

// Validate test fixtures exist
console.log('📁 Validating test fixtures...');
let fixturesValid = true;

TEST_INVOICES.forEach(invoice => {
  try {
    readFileSync(invoice.pdfPath);
    readFileSync(invoice.expectedPath);
    console.log(`✅ ${invoice.name} fixtures found`);
  } catch (error) {
    console.error(`❌ Missing fixture for ${invoice.name}`);
    fixturesValid = false;
  }
});

if (!fixturesValid) {
  console.error('\n❌ Some test fixtures are missing. Please ensure all invoices are copied.');
  process.exit(1);
}

console.log('\n🧪 Running test suites...\n');

let allTestsPassed = true;
const results: any[] = [];

for (const suite of testSuites) {
  console.log(`Running ${suite.name}...`);
  const startTime = Date.now();
  
  try {
    const output = execSync(suite.command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: {
        ...process.env,
        TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/figgy_test'
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${suite.name} passed (${duration}ms)`);
    
    reporter.recordTest(suite.name, 'pass', duration);
    results.push({
      suite: suite.name,
      status: 'passed',
      duration,
      output
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${suite.name} failed (${duration}ms)`);
    
    if (suite.critical) {
      allTestsPassed = false;
    }
    
    reporter.recordTest(suite.name, 'fail', duration, [error.message]);
    results.push({
      suite: suite.name,
      status: 'failed',
      duration,
      error: error.message,
      output: error.stdout || ''
    });
  }
}

// Generate detailed report
console.log(reporter.generateReport());

// Save results to file
const reportPath = path.join(__dirname, 'test-results.json');
writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  success: allTestsPassed,
  successRate: reporter.getSuccessRate(),
  results,
  invoicesTested: TEST_INVOICES.map(i => i.name)
}, null, 2));

console.log(`\n📊 Detailed results saved to: ${reportPath}`);

// Exit with appropriate code
if (!allTestsPassed) {
  console.error('\n❌ Critical tests failed. Invoice processing system needs fixes.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed! Invoice processing system is ready for production.');
  process.exit(0);
}