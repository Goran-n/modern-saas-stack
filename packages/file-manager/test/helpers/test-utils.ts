import { readFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface TestInvoice {
  name: string;
  file: string;
  expectedFile: string;
  pdfPath: string;
  expectedPath: string;
}

export const TEST_INVOICES: TestInvoice[] = [
  {
    name: 'Adobe',
    file: 'adobe_subscription.pdf',
    expectedFile: 'adobe_subscription.json',
    pdfPath: '',
    expectedPath: ''
  },
  {
    name: 'Microsoft',
    file: 'microsoft_invoice.pdf',
    expectedFile: 'microsoft_invoice.json',
    pdfPath: '',
    expectedPath: ''
  },
  {
    name: 'ChatGPT',
    file: 'chatgpt_invoice.pdf',
    expectedFile: 'chatgpt_invoice.json',
    pdfPath: '',
    expectedPath: ''
  },
  {
    name: 'Xero',
    file: 'xero_monthly.pdf',
    expectedFile: 'xero_monthly.json',
    pdfPath: '',
    expectedPath: ''
  },
  {
    name: 'Notion',
    file: 'notion_invoice.pdf',
    expectedFile: 'notion_invoice.json',
    pdfPath: '',
    expectedPath: ''
  },
  {
    name: 'Figma',
    file: 'figma_invoice.pdf',
    expectedFile: 'figma_invoice.json',
    pdfPath: '',
    expectedPath: ''
  }
];

// Initialize paths
TEST_INVOICES.forEach(invoice => {
  invoice.pdfPath = path.join(__dirname, '../fixtures/invoices', invoice.file);
  invoice.expectedPath = path.join(__dirname, '../fixtures/expected-results', invoice.expectedFile);
});

export function loadTestInvoice(name: string): { pdf: Buffer; expected: any } {
  const invoice = TEST_INVOICES.find(inv => inv.name === name);
  if (!invoice) {
    throw new Error(`Test invoice ${name} not found`);
  }

  return {
    pdf: readFileSync(invoice.pdfPath),
    expected: JSON.parse(readFileSync(invoice.expectedPath, 'utf-8'))
  };
}

export function createMockFile(content: Buffer | string, fileName: string, mimeType: string = 'application/pdf'): File {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

export function calculateFileHash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function generateTestMetadata(invoice: string): Record<string, any> {
  return {
    testInvoice: invoice,
    testRun: new Date().toISOString(),
    testEnvironment: 'vitest',
    source: 'test-suite'
  };
}

export async function simulateProcessingDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function validateInvoiceStructure(data: any): string[] {
  const errors: string[] = [];

  // Required fields
  if (!data.supplier?.name) errors.push('Missing supplier name');
  if (!data.invoice?.number && !data.invoice?.date) errors.push('Missing invoice number or date');
  if (!data.totals && !data.total) errors.push('Missing totals information');
  
  // Validate amounts
  if (data.totals) {
    const total = data.totals.total || data.totals.grand_total;
    if (typeof total !== 'number' || total <= 0) {
      errors.push('Invalid total amount');
    }
  }

  // Validate currency
  if (data.invoice?.currency && !['USD', 'EUR', 'GBP'].includes(data.invoice.currency)) {
    errors.push(`Unsupported currency: ${data.invoice.currency}`);
  }

  return errors;
}

export function compareExtractedData(extracted: any, expected: any): {
  matches: string[];
  mismatches: string[];
  missing: string[];
} {
  const result = {
    matches: [] as string[],
    mismatches: [] as string[],
    missing: [] as string[]
  };

  function compare(extractedObj: any, expectedObj: any, path: string = '') {
    for (const key in expectedObj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in extractedObj)) {
        result.missing.push(currentPath);
        continue;
      }

      const extractedVal = extractedObj[key];
      const expectedVal = expectedObj[key];

      if (typeof expectedVal === 'object' && expectedVal !== null) {
        compare(extractedVal, expectedVal, currentPath);
      } else if (extractedVal === expectedVal) {
        result.matches.push(currentPath);
      } else {
        result.mismatches.push(`${currentPath}: expected ${expectedVal}, got ${extractedVal}`);
      }
    }
  }

  compare(extracted, expected);
  return result;
}

export class TestReporter {
  private results: Array<{
    test: string;
    status: 'pass' | 'fail';
    duration: number;
    errors?: string[];
  }> = [];

  recordTest(test: string, status: 'pass' | 'fail', duration: number, errors?: string[]) {
    this.results.push({ test, status, duration, errors });
  }

  generateReport(): string {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = total - passed;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    let report = `\nTest Summary:\n`;
    report += `Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`;
    report += `Total Duration: ${totalDuration.toFixed(2)}ms\n\n`;

    if (failed > 0) {
      report += `Failed Tests:\n`;
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          report += `- ${r.test} (${r.duration.toFixed(2)}ms)\n`;
          if (r.errors) {
            r.errors.forEach(err => report += `  • ${err}\n`);
          }
        });
    }

    return report;
  }

  getSuccessRate(): number {
    if (this.results.length === 0) return 0;
    return (this.results.filter(r => r.status === 'pass').length / this.results.length) * 100;
  }
}