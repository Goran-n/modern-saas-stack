import type { 
  HmrcApiOptions, 
  HmrcDateRange,
  HmrcObligationsResponse,
  HmrcVatReturn,
  HmrcVatReturnResponse,
  HmrcVatLiability,
  HmrcVatPayment,
  HmrcFraudPreventionHeaders,
  HmrcErrorResponse
} from './types';
import { 
  hmrcObligationsResponseSchema,
  hmrcVatReturnResponseSchema,
  hmrcErrorResponseSchema
} from './types';

export class HmrcApiClient {
  private baseUrl: string;
  private accessToken: string;
  private vrn: string; // VAT Registration Number

  constructor(
    accessToken: string,
    vrn: string,
    options: HmrcApiOptions = {}
  ) {
    this.accessToken = accessToken;
    this.vrn = vrn;
    
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    } else {
      this.baseUrl = options.sandbox || process.env.NODE_ENV !== 'production'
        ? 'https://test-api.service.hmrc.gov.uk'
        : 'https://api.service.hmrc.gov.uk';
    }
  }

  /**
   * Get VAT obligations for a date range
   */
  async getObligations(
    dateRange?: HmrcDateRange,
    status?: 'O' | 'F' // Open or Fulfilled
  ): Promise<HmrcObligationsResponse> {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('from', dateRange.from);
      params.append('to', dateRange.to);
    }
    
    if (status) {
      params.append('status', status);
    }

    const url = `${this.baseUrl}/organisations/vat/${this.vrn}/obligations`;
    const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

    const response = await this.makeRequest(fullUrl, {
      method: 'GET',
    });

    return hmrcObligationsResponseSchema.parse(await response.json());
  }

  /**
   * Submit a VAT return
   */
  async submitVatReturn(vatReturn: HmrcVatReturn): Promise<HmrcVatReturnResponse> {
    const url = `${this.baseUrl}/organisations/vat/${this.vrn}/returns`;

    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vatReturn),
    });

    return hmrcVatReturnResponseSchema.parse(await response.json());
  }

  /**
   * Get a specific VAT return
   */
  async getVatReturn(periodKey: string): Promise<HmrcVatReturn> {
    const url = `${this.baseUrl}/organisations/vat/${this.vrn}/returns/${periodKey}`;

    const response = await this.makeRequest(url, {
      method: 'GET',
    });

    return response.json();
  }

  /**
   * Get VAT liabilities
   */
  async getVatLiabilities(
    dateRange?: HmrcDateRange
  ): Promise<{ liabilities: HmrcVatLiability[] }> {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('from', dateRange.from);
      params.append('to', dateRange.to);
    }

    const url = `${this.baseUrl}/organisations/vat/${this.vrn}/liabilities`;
    const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

    const response = await this.makeRequest(fullUrl, {
      method: 'GET',
    });

    return response.json();
  }

  /**
   * Get VAT payments
   */
  async getVatPayments(
    dateRange?: HmrcDateRange
  ): Promise<{ payments: HmrcVatPayment[] }> {
    const params = new URLSearchParams();
    
    if (dateRange) {
      params.append('from', dateRange.from);
      params.append('to', dateRange.to);
    }

    const url = `${this.baseUrl}/organisations/vat/${this.vrn}/payments`;
    const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

    const response = await this.makeRequest(fullUrl, {
      method: 'GET',
    });

    return response.json();
  }

  /**
   * Make an authenticated request to HMRC API
   */
  private async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/vnd.hmrc.1.0+json',
      ...this.generateFraudPreventionHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let error: HmrcErrorResponse;
      
      try {
        error = hmrcErrorResponseSchema.parse(JSON.parse(errorText));
      } catch {
        throw new Error(`HMRC API error: ${response.status} - ${errorText}`);
      }

      throw new HmrcApiError(error, response.status);
    }

    return response;
  }

  /**
   * Generate fraud prevention headers required by HMRC
   * This is a simplified version - production implementations need real values
   */
  private generateFraudPreventionHeaders(): Partial<HmrcFraudPreventionHeaders> {
    return {
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
      'Gov-Client-Device-ID': 'figgy-server',
      'Gov-Client-User-IDs': `figgy-user=${this.vrn}`,
      'Gov-Client-Timezone': 'UTC+00:00',
      'Gov-Vendor-Version': 'figgy=1.0.0',
    };
  }
}

/**
 * Custom error class for HMRC API errors
 */
export class HmrcApiError extends Error {
  constructor(
    public readonly hmrcError: HmrcErrorResponse,
    public readonly statusCode: number
  ) {
    super(hmrcError.message);
    this.name = 'HmrcApiError';
  }
}