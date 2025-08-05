import { HmrcApiClient } from './client';
import type { HmrcObligation, HmrcDateRange } from './types';
import type { VatPeriod, VatPeriodConflict, HmrcVatObligation } from '../types';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { nanoid } from 'nanoid';

export interface ObligationsSyncResult {
  hmrcObligations: HmrcVatObligation[];
  conflicts: VatPeriodConflict[];
  newPeriods: Omit<VatPeriod, 'createdAt' | 'updatedAt'>[];
  updatedPeriods: Array<{
    periodId: string;
    updates: Partial<VatPeriod>;
  }>;
}

export class HmrcObligationsSync {
  constructor(
    private client: HmrcApiClient,
    private tenantId: string
  ) {}

  /**
   * Sync VAT obligations from HMRC
   */
  async syncObligations(
    existingPeriods: VatPeriod[],
    dateRange?: HmrcDateRange
  ): Promise<ObligationsSyncResult> {
    // Fetch obligations from HMRC
    const response = await this.client.getObligations(dateRange);
    
    // Extract obligations for this VRN
    const hmrcObligations = response.obligations
      .flatMap(o => o.obligationDetails)
      .map(this.convertHmrcObligation);

    // Compare with existing periods
    const result = this.compareObligations(hmrcObligations, existingPeriods);
    
    return result;
  }

  /**
   * Convert HMRC obligation to our format
   */
  private convertHmrcObligation(obligation: HmrcObligation): HmrcVatObligation {
    return {
      start: obligation.start,
      end: obligation.end,
      due: obligation.due,
      status: obligation.status,
      periodKey: obligation.periodKey,
      received: obligation.received,
    };
  }

  /**
   * Compare HMRC obligations with existing periods
   */
  private compareObligations(
    hmrcObligations: HmrcVatObligation[],
    existingPeriods: VatPeriod[]
  ): ObligationsSyncResult {
    const conflicts: VatPeriodConflict[] = [];
    const newPeriods: Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] = [];
    const updatedPeriods: Array<{
      periodId: string;
      updates: Partial<VatPeriod>;
    }> = [];

    // Create maps for easier lookup
    const existingByDateRange = new Map<string, VatPeriod>();
    const existingByHmrcId = new Map<string, VatPeriod>();
    
    existingPeriods.forEach(period => {
      const key = `${period.periodStartDate.toISOString()}_${period.periodEndDate.toISOString()}`;
      existingByDateRange.set(key, period);
      
      if (period.hmrcObligationId) {
        existingByHmrcId.set(period.hmrcObligationId, period);
      }
    });

    const processedExisting = new Set<string>();

    // Process each HMRC obligation
    for (const hmrcObligation of hmrcObligations) {
      const periodStart = startOfDay(parseISO(hmrcObligation.start));
      const periodEnd = endOfDay(parseISO(hmrcObligation.end));
      const submissionDeadline = endOfDay(parseISO(hmrcObligation.due));
      const dateRangeKey = `${periodStart.toISOString()}_${periodEnd.toISOString()}`;

      // Check if we have a period with this HMRC ID
      const existingByHmrc = existingByHmrcId.get(hmrcObligation.periodKey);
      const existingByDate = existingByDateRange.get(dateRangeKey);

      if (existingByHmrc) {
        processedExisting.add(existingByHmrc.id);
        
        // Check for date mismatches
        if (
          existingByHmrc.periodStartDate.getTime() !== periodStart.getTime() ||
          existingByHmrc.periodEndDate.getTime() !== periodEnd.getTime() ||
          existingByHmrc.submissionDeadline.getTime() !== submissionDeadline.getTime()
        ) {
          conflicts.push({
            type: 'date_mismatch',
            manualPeriod: existingByHmrc,
            hmrcPeriod: hmrcObligation,
            description: 'Period dates differ between manual entry and HMRC',
          });
        }

        // Update status if different
        const newStatus = hmrcObligation.status === 'F' ? 'submitted' : 
                         submissionDeadline < new Date() ? 'overdue' : 'current';
        
        if (existingByHmrc.status !== newStatus) {
          updatedPeriods.push({
            periodId: existingByHmrc.id,
            updates: {
              status: newStatus,
              lastSyncDate: new Date(),
            },
          });
        }
      } else if (existingByDate) {
        processedExisting.add(existingByDate.id);
        
        // Period exists with same dates but no HMRC ID
        updatedPeriods.push({
          periodId: existingByDate.id,
          updates: {
            hmrcObligationId: hmrcObligation.periodKey,
            source: 'hmrc_connected',
            lastSyncDate: new Date(),
            status: hmrcObligation.status === 'F' ? 'submitted' : 
                   submissionDeadline < new Date() ? 'overdue' : 'current',
          },
        });
      } else {
        // New period from HMRC
        newPeriods.push({
          id: nanoid(),
          tenantId: this.tenantId,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          submissionDeadline: submissionDeadline,
          paymentDeadline: submissionDeadline, // Same as submission for most cases
          frequency: this.inferFrequency(periodStart, periodEnd),
          source: 'hmrc_connected',
          status: hmrcObligation.status === 'F' ? 'submitted' : 
                 submissionDeadline < new Date() ? 'overdue' : 'current',
          isTransitional: false,
          hmrcObligationId: hmrcObligation.periodKey,
          lastSyncDate: new Date(),
        });
      }
    }

    // Check for extra manual periods not in HMRC
    existingPeriods.forEach(period => {
      if (!processedExisting.has(period.id) && period.source === 'manual') {
        conflicts.push({
          type: 'extra_period',
          manualPeriod: period,
          description: 'Manual period not found in HMRC obligations',
        });
      }
    });

    return {
      hmrcObligations,
      conflicts,
      newPeriods,
      updatedPeriods,
    };
  }

  /**
   * Infer frequency from period dates
   */
  private inferFrequency(startDate: Date, endDate: Date): 'monthly' | 'quarterly' | 'annual' {
    const days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days >= 360) return 'annual';
    if (days >= 85 && days <= 95) return 'quarterly';
    return 'monthly';
  }
}