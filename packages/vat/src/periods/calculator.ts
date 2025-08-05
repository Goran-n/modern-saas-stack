import { 
  addMonths, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  getMonth,
  getYear,
  isAfter,
  isBefore
} from 'date-fns';
import type { 
  VatPeriod, 
  VatPeriodConfig, 
  VatPeriodSource,
  VatPeriodStatus
} from '../types';
import { STAGGER_GROUP_MONTHS } from '../types';
import { nanoid } from 'nanoid';

export class VatPeriodCalculator {
  /**
   * Generate VAT periods based on configuration
   */
  static generatePeriods(
    config: VatPeriodConfig,
    numberOfPeriods: number = 12,
    startFrom?: Date
  ): Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] {
    const startDate = startFrom || new Date();
    
    switch (config.frequency) {
      case 'monthly':
        return this.generateMonthlyPeriods(config, startDate, numberOfPeriods);
      case 'quarterly':
        return this.generateQuarterlyPeriods(config, startDate, numberOfPeriods);
      case 'annual':
        return this.generateAnnualPeriods(config, startDate, numberOfPeriods);
      default:
        throw new Error(`Unsupported frequency: ${config.frequency}`);
    }
  }

  /**
   * Generate monthly VAT periods
   */
  private static generateMonthlyPeriods(
    config: VatPeriodConfig,
    startDate: Date,
    count: number
  ): Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] {
    const periods: Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] = [];
    let currentDate = startOfMonth(startDate);

    for (let i = 0; i < count; i++) {
      const periodStart = currentDate;
      const periodEnd = endOfMonth(currentDate);
      const submissionDeadline = addDays(addMonths(periodEnd, 1), 7); // 1 month + 7 days
      const paymentDeadline = submissionDeadline; // Same as submission for monthly

      periods.push({
        id: nanoid(),
        tenantId: config.tenantId,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        submissionDeadline,
        paymentDeadline,
        frequency: 'monthly',
        source: 'system_generated' as VatPeriodSource,
        status: this.determinePeriodStatus(periodStart, periodEnd, submissionDeadline),
        isTransitional: false,
      });

      currentDate = addMonths(currentDate, 1);
    }

    return periods;
  }

  /**
   * Generate quarterly VAT periods based on stagger group
   */
  private static generateQuarterlyPeriods(
    config: VatPeriodConfig,
    startDate: Date,
    count: number
  ): Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] {
    if (!config.staggerGroup) {
      throw new Error('Stagger group is required for quarterly periods');
    }

    const periods: Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] = [];
    const staggerMonths = STAGGER_GROUP_MONTHS[config.staggerGroup];
    
    // Find the next quarter end month from start date
    let currentDate = this.findNextQuarterStart(startDate, staggerMonths);

    for (let i = 0; i < count; i++) {
      const periodStart = currentDate;
      const periodEnd = endOfMonth(addMonths(currentDate, 2)); // 3-month period
      const submissionDeadline = addDays(addMonths(periodEnd, 1), 7); // 1 month + 7 days
      
      let paymentDeadline = submissionDeadline;
      
      // Payment on account dates (for businesses > £2.3m)
      if (config.paymentOnAccountRequired) {
        // Payments due on last working day of 2nd and 3rd months
        // This is simplified - real implementation would consider working days
        paymentDeadline = endOfMonth(addMonths(periodStart, 1));
      }

      periods.push({
        id: nanoid(),
        tenantId: config.tenantId,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        submissionDeadline,
        paymentDeadline,
        frequency: 'quarterly',
        staggerGroup: config.staggerGroup,
        source: 'system_generated' as VatPeriodSource,
        status: this.determinePeriodStatus(periodStart, periodEnd, submissionDeadline),
        isTransitional: false,
      });

      currentDate = addMonths(currentDate, 3);
    }

    return periods;
  }

  /**
   * Generate annual VAT periods
   */
  private static generateAnnualPeriods(
    config: VatPeriodConfig,
    startDate: Date,
    count: number
  ): Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] {
    const periods: Omit<VatPeriod, 'createdAt' | 'updatedAt'>[] = [];
    
    // Determine the annual accounting year start
    let yearStartMonth = config.annualAccountingStartMonth || getMonth(config.registrationDate) + 1;
    let currentYear = getYear(startDate);
    
    // Find the next annual period start
    let periodStart = new Date(currentYear, yearStartMonth - 1, 1);
    if (isBefore(periodStart, startDate)) {
      periodStart = new Date(currentYear + 1, yearStartMonth - 1, 1);
    }

    for (let i = 0; i < count; i++) {
      const periodEnd = endOfMonth(addMonths(periodStart, 11)); // 12-month period
      const submissionDeadline = addDays(addMonths(periodEnd, 2), 0); // 2 months after year end
      const paymentDeadline = submissionDeadline;

      periods.push({
        id: nanoid(),
        tenantId: config.tenantId,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        submissionDeadline,
        paymentDeadline,
        frequency: 'annual',
        source: 'system_generated' as VatPeriodSource,
        status: this.determinePeriodStatus(periodStart, periodEnd, submissionDeadline),
        isTransitional: false,
      });

      periodStart = addMonths(periodStart, 12);
    }

    return periods;
  }

  /**
   * Find the next quarter start date based on stagger group
   */
  private static findNextQuarterStart(fromDate: Date, staggerMonths: number[]): Date {
    const currentMonth = getMonth(fromDate) + 1; // getMonth is 0-based
    const currentYear = getYear(fromDate);
    
    // Find quarter start months (3 months before end months)
    const quarterStartMonths = staggerMonths.map(m => {
      const startMonth = m - 2;
      return startMonth <= 0 ? startMonth + 12 : startMonth;
    }).sort((a, b) => a - b);

    // Find the next quarter start
    for (const startMonth of quarterStartMonths) {
      if (startMonth >= currentMonth) {
        return new Date(currentYear, startMonth - 1, 1);
      }
    }

    // If no future quarter in current year, use first quarter of next year
    return new Date(currentYear + 1, (quarterStartMonths[0] ?? 1) - 1, 1);
  }

  /**
   * Determine the status of a VAT period
   */
  private static determinePeriodStatus(
    periodStart: Date,
    periodEnd: Date,
    submissionDeadline: Date
  ): VatPeriodStatus {
    const now = new Date();
    
    if (isAfter(periodStart, now)) {
      return 'upcoming';
    } else if (isBefore(periodEnd, now) && isAfter(submissionDeadline, now)) {
      return 'current';
    } else if (isBefore(submissionDeadline, now)) {
      return 'overdue';
    } else {
      return 'current';
    }
  }

  /**
   * Create a transitional period for frequency changes
   */
  static createTransitionalPeriod(
    config: VatPeriodConfig,
    lastPeriodEnd: Date,
    targetAlignmentDate: Date
  ): Omit<VatPeriod, 'createdAt' | 'updatedAt'> {
    const periodStart = addDays(lastPeriodEnd, 1);
    const periodEnd = targetAlignmentDate;
    const monthsDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const submissionDeadline = addDays(addMonths(periodEnd, 1), 7);

    return {
      id: nanoid(),
      tenantId: config.tenantId,
      periodStartDate: periodStart,
      periodEndDate: periodEnd,
      submissionDeadline,
      paymentDeadline: submissionDeadline,
      frequency: config.frequency,
      staggerGroup: config.staggerGroup,
      source: 'system_generated' as VatPeriodSource,
      status: this.determinePeriodStatus(periodStart, periodEnd, submissionDeadline),
      isTransitional: true,
      transitionalMonths: monthsDiff,
    };
  }
}