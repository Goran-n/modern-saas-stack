import type { VatStaggerGroup } from '../types';
import { STAGGER_GROUP_MONTHS } from '../types';
import { getMonth, format } from 'date-fns';

export class StaggerGroupHelper {
  /**
   * Get the quarter end months for a stagger group
   */
  static getQuarterEndMonths(staggerGroup: VatStaggerGroup): number[] {
    return STAGGER_GROUP_MONTHS[staggerGroup];
  }

  /**
   * Get the quarter start months for a stagger group
   */
  static getQuarterStartMonths(staggerGroup: VatStaggerGroup): number[] {
    return STAGGER_GROUP_MONTHS[staggerGroup].map(month => {
      const startMonth = month - 2;
      return startMonth <= 0 ? startMonth + 12 : startMonth;
    });
  }

  /**
   * Get quarter end month names for display
   */
  static getQuarterEndMonthNames(staggerGroup: VatStaggerGroup): string[] {
    return STAGGER_GROUP_MONTHS[staggerGroup].map(month => {
      const date = new Date(2024, month - 1, 1); // Year doesn't matter for month name
      return format(date, 'MMMM');
    });
  }

  /**
   * Determine which stagger group a date falls into based on month
   */
  static getStaggerGroupFromMonth(month: number): VatStaggerGroup | null {
    for (const [group, months] of Object.entries(STAGGER_GROUP_MONTHS)) {
      if (months.includes(month)) {
        return group as VatStaggerGroup;
      }
    }
    return null;
  }

  /**
   * Get stagger group from a VAT registration date
   * This is a simplified version - HMRC has specific rules for assignment
   */
  static suggestStaggerGroup(registrationDate: Date): VatStaggerGroup {
    const month = getMonth(registrationDate) + 1; // getMonth is 0-based
    
    // Simple distribution logic - in reality HMRC balances the groups
    // This just assigns based on registration month
    if ([1, 4, 7, 10].includes(month)) return '2';
    if ([2, 5, 8, 11].includes(month)) return '3';
    return '1'; // Default to group 1
  }

  /**
   * Get description for a stagger group
   */
  static getStaggerGroupDescription(staggerGroup: VatStaggerGroup): string {
    const monthNames = this.getQuarterEndMonthNames(staggerGroup);
    return `Quarters ending ${monthNames.join(', ')}`;
  }

  /**
   * Check if a month is a quarter end for any stagger group
   */
  static isQuarterEndMonth(month: number): boolean {
    return Object.values(STAGGER_GROUP_MONTHS).some(months => months.includes(month));
  }

  /**
   * Get all stagger groups with descriptions for UI selection
   */
  static getAllStaggerGroups(): Array<{ value: VatStaggerGroup; label: string; description: string }> {
    return [
      {
        value: '1',
        label: 'Stagger Group 1',
        description: this.getStaggerGroupDescription('1')
      },
      {
        value: '2', 
        label: 'Stagger Group 2',
        description: this.getStaggerGroupDescription('2')
      },
      {
        value: '3',
        label: 'Stagger Group 3', 
        description: this.getStaggerGroupDescription('3')
      }
    ];
  }
}