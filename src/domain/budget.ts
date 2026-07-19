import { Category, Transaction } from '../services/database';

export interface CategoryBudget {
  id: number;
  name: string;
  spent: number;
  budget: number;
  color: string;
  percentage: number;
}

export const computeCategoryBudgets = (
  categories: Category[],
  transactions: Transaction[],
): CategoryBudget[] =>
  categories
    .filter(cat => cat.type === 'expense' && cat.budgetLimit)
    .map(category => {
      const spent = transactions
        .filter(t => t.category === category.name && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const percentage = category.budgetLimit ? (spent / category.budgetLimit) * 100 : 0;
      return {
        id: category.id!,
        name: category.name,
        spent,
        budget: category.budgetLimit ?? 0,
        color: category.color,
        percentage: Math.min(percentage, 100),
      };
    });
