import type { 
  VatPeriod, 
  VatPeriodConfig, 
  VatPeriodChangeRequest
} from '../types';
import { VatPeriodCalculator } from './calculator';
import { StaggerGroupHelper } from './stagger-groups';
import { 
  addMonths, 
  startOfMonth,
  addDays,
  isAfter,
  differenceInDays,
  getMonth,
  getYear
} from 'date-fns';

export interface FrequencyChangeResult {
  transitionalPeriod: Omit<VatPeriod, 'createdAt' | 'updatedAt'> | null;
  newPeriods: Omit<VatPeriod, 'createdAt' | 'updatedAt'>[];
  warnings: string[];
}

export class FrequencyChangeHandler {
  /**
   * Handle VAT frequency change request
   */
  static handleFrequencyChange(
    changeRequest: VatPeriodChangeRequest,
    currentConfig: VatPeriodConfig,
    lastCompletedPeriod: VatPeriod | null,
    upcomingPeriods: VatPeriod[]
  ): FrequencyChangeResult {
    const warnings: string[] = [];

    // Validate the change request
    const validation = this.validateChangeRequest(changeRequest, currentConfig);
    warnings.push(...validation.warnings);

    if (validation.errors.length > 0) {
      throw new Error(`Invalid frequency change: ${validation.errors.join(', ')}`);
    }

    // Determine the transition date
    const transitionDate = this.calculateTransitionDate(
      changeRequest,
      lastCompletedPeriod,
      upcomingPeriods
    );

    // Create transitional period if needed
    const transitionalPeriod = this.createTransitionalPeriod(
      changeRequest,
      currentConfig,
      lastCompletedPeriod,
      transitionDate
    );

    if (transitionalPeriod) {
      warnings.push(`Transitional period created: ${transitionalPeriod.transitionalMonths} months`);
    }

    // Create new config with updated frequency
    const newConfig: VatPeriodConfig = {
      ...currentConfig,
      frequency: changeRequest.newFrequency,
      staggerGroup: changeRequest.newStaggerGroup || currentConfig.staggerGroup,
      lastFrequencyChange: changeRequest.effectiveDate
    };

    // Generate new periods
    const startFrom = transitionalPeriod 
      ? addDays(transitionalPeriod.periodEndDate, 1)
      : transitionDate;

    const newPeriods = VatPeriodCalculator.generatePeriods(
      newConfig,
      12, // Generate next 12 periods
      startFrom
    );

    return {
      transitionalPeriod,
      newPeriods,
      warnings
    };
  }

  /**
   * Validate frequency change request
   */
  private static validateChangeRequest(
    request: VatPeriodChangeRequest,
    currentConfig: VatPeriodConfig
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if changing from current frequency
    if (request.currentFrequency !== currentConfig.frequency) {
      errors.push(`Current frequency mismatch. Expected ${currentConfig.frequency}, got ${request.currentFrequency}`);
    }

    // Validate quarterly requirements
    if (request.newFrequency === 'quarterly' && !request.newStaggerGroup) {
      errors.push('Stagger group required for quarterly frequency');
    }

    // Validate annual accounting eligibility
    if (request.newFrequency === 'annual' && !currentConfig.isAnnualAccounting) {
      warnings.push('Annual accounting scheme must be approved by HMRC');
    }

    // Check timing constraints
    const daysSinceLastChange = currentConfig.lastFrequencyChange
      ? differenceInDays(request.effectiveDate, currentConfig.lastFrequencyChange)
      : Infinity;

    if (daysSinceLastChange < 365) {
      warnings.push('Frequency changes within 12 months may require HMRC approval');
    }

    return { errors, warnings };
  }

  /**
   * Calculate the appropriate transition date
   */
  private static calculateTransitionDate(
    request: VatPeriodChangeRequest,
    lastCompletedPeriod: VatPeriod | null,
    upcomingPeriods: VatPeriod[]
  ): Date {
    // If no periods exist, use effective date
    if (!lastCompletedPeriod && upcomingPeriods.length === 0) {
      return startOfMonth(request.effectiveDate);
    }

    // Find the first period that hasn't started yet
    const now = new Date();
    const firstFuturePeriod = upcomingPeriods.find(p => isAfter(p.periodStartDate, now));

    if (firstFuturePeriod) {
      return firstFuturePeriod.periodStartDate;
    }

    // If all periods have started, use the end of the last upcoming period
    const lastUpcomingPeriod = upcomingPeriods[upcomingPeriods.length - 1];
    if (lastUpcomingPeriod) {
      return addDays(lastUpcomingPeriod.periodEndDate, 1);
    }

    // Default to end of last completed period
    return lastCompletedPeriod 
      ? addDays(lastCompletedPeriod.periodEndDate, 1)
      : startOfMonth(request.effectiveDate);
  }

  /**
   * Create transitional period if needed
   */
  private static createTransitionalPeriod(
    request: VatPeriodChangeRequest,
    currentConfig: VatPeriodConfig,
    lastCompletedPeriod: VatPeriod | null,
    transitionDate: Date
  ): Omit<VatPeriod, 'createdAt' | 'updatedAt'> | null {
    // No transitional period needed for same-type changes
    if (request.currentFrequency === request.newFrequency) {
      return null;
    }

    const lastPeriodEnd = lastCompletedPeriod?.periodEndDate || addDays(transitionDate, -1);
    
    // Calculate alignment date based on new frequency
    let alignmentDate: Date;

    switch (request.newFrequency) {
      case 'quarterly':
        // Align to next quarter start for the stagger group
        const staggerMonths = StaggerGroupHelper.getQuarterStartMonths(request.newStaggerGroup!);
        alignmentDate = this.findNextAlignment(transitionDate, staggerMonths);
        break;
      
      case 'monthly':
        // Align to next month start
        alignmentDate = startOfMonth(addMonths(transitionDate, 1));
        break;
      
      case 'annual':
        // Align to annual accounting year
        const yearStartMonth = currentConfig.annualAccountingStartMonth || 4; // Default April
        alignmentDate = this.findNextAnnualStart(transitionDate, yearStartMonth);
        break;
    }

    // Only create transitional period if there's a gap
    const daysDiff = differenceInDays(alignmentDate, addDays(lastPeriodEnd, 1));
    if (daysDiff <= 0) {
      return null;
    }

    return VatPeriodCalculator.createTransitionalPeriod(
      currentConfig,
      lastPeriodEnd,
      addDays(alignmentDate, -1)
    );
  }

  /**
   * Find next alignment date for given months
   */
  private static findNextAlignment(fromDate: Date, alignmentMonths: number[]): Date {
    const currentMonth = getMonth(fromDate) + 1;
    const currentYear = getYear(fromDate);

    // Find next alignment month
    for (const month of alignmentMonths.sort((a, b) => a - b)) {
      if (month > currentMonth) {
        return new Date(currentYear, month - 1, 1);
      }
    }

    // If no alignment in current year, use first alignment of next year
    return new Date(currentYear + 1, (alignmentMonths[0] ?? 1) - 1, 1);
  }

  /**
   * Find next annual accounting start date
   */
  private static findNextAnnualStart(fromDate: Date, yearStartMonth: number): Date {
    const currentMonth = getMonth(fromDate) + 1;
    const currentYear = getYear(fromDate);

    if (yearStartMonth > currentMonth) {
      return new Date(currentYear, yearStartMonth - 1, 1);
    }

    return new Date(currentYear + 1, yearStartMonth - 1, 1);
  }
}