/**
 * Payment Method Utilities
 * Helper functions for handling payment method display and logic
 */

export type PaymentMethod =
  | 'cash'
  | 'b_haspa_credit'
  | 'b_haspa_debit'
  | 'b_dkb_credit'
  | 'b_dkb_debit'
  | 's_haspa_credit'
  | 's_haspa_debit'
  | 's_dkb_credit'
  | 's_dkb_debit';

/**
 * Mapping of payment method codes to display labels
 */
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '💵 Cash',
  b_haspa_credit: '💳 B Haspa Credit',
  b_haspa_debit: '💳 B Haspa Debit',
  b_dkb_credit: '💳 B DKB Credit',
  b_dkb_debit: '💳 B DKB Debit',
  s_haspa_credit: '💳 S Haspa Credit',
  s_haspa_debit: '💳 S Haspa Debit',
  s_dkb_credit: '💳 S DKB Credit',
  s_dkb_debit: '💳 S DKB Debit',
};

/**
 * Get the display label for a payment method
 * @param paymentMethod - The payment method code
 * @returns The formatted display label with emoji
 */
export const getPaymentMethodLabel = (paymentMethod: string): string => {
  return PAYMENT_METHOD_LABELS[paymentMethod as PaymentMethod] || '❓ Unknown';
};

/**
 * Check if a payment method is a card payment (not cash)
 * @param paymentMethod - The payment method code
 * @returns true if it's a card payment, false if cash
 */
export const isCardPayment = (paymentMethod: string): boolean => {
  return paymentMethod !== 'cash';
};

/**
 * Get payment method from expense (handles backward compatibility)
 * @param expense - Expense object with payment_method and/or paid_by_card
 * @returns The payment method string
 */
export const getExpensePaymentMethod = (expense: { payment_method?: string; paid_by_card?: boolean }): string => {
  // Use new payment_method field if available
  if (expense.payment_method) {
    return expense.payment_method;
  }

  // Fall back to old paid_by_card for backward compatibility
  if (expense.paid_by_card !== undefined) {
    return expense.paid_by_card ? 'card' : 'cash';
  }

  // Default to unknown
  return 'unknown';
};
