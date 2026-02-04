// Bank Import Types
export interface ParsedExpense {
  amount: number;
  currency: string;
  category: string;
  vendor_name?: string;
  vendor_type?: string;
  vendor_type_id?: number;
  date: string;
  payment_method: string;
  added_by: string;
  description: string;
  confidence_score: number;
  matched_vendor_id?: number;
  matched_vendor_name?: string;
}

export interface BankTransaction {
  raw_data: Record<string, string>;
  parsed_expense: ParsedExpense;
  original_amount: number;
  original_currency: string;
  booking_amount: number;
  booking_currency: string;
  transaction_date: string;
  merchant: string;
  location: string;
  confidence_score: number;
  booking_reference: string;
}

export interface BankImportPreview {
  transactions: BankTransaction[];
  total_count: number;
  format: string;
}

export interface BankImportState {
  transactions: BankTransaction[];
  currentIndex: number;
  skipped: number[];
  added: Record<number, number>; // transaction index -> expense ID
  format: string;
  isLoading: boolean;
  error?: string;
}

export interface CreateExpenseRequest {
  amount: number;
  date: string;
  type: string;
  category: string;
  comment: string;
  vendor_id?: number;
  payment_method?: string;
  added_by?: string;
  tag_ids?: number[];
}

export interface CreateExpenseFromBankRequest {
  transaction_data: BankTransaction;
  expense_data: CreateExpenseRequest;
}

export type BankImportFormat = 'haspa_credit' | 'n26' | 'monobank'; // Extensible for future formats
