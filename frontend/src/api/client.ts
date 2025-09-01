import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types matching your backend
export interface Expense {
  id: number;
  comment: string;
  amount: number;
  vendor_id: number;
  vendor?: Vendor;
  date: string;
  type: string;
  category: string;
  paid_by_card: boolean;
  added_by: 'he' | 'she';
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: number;
  name: string;
  type: 'care' | 'clothing' | 'eating_out' | 'else' | 'food_store' | 'household' | 'living' | 'salary' | 'subscriptions' | 'transport' | 'tourism' | 'car';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseRequest {
  comment: string;
  amount: number;
  vendor_id: number;
  date: string;
  category: string;
  type: string;
  paid_by_card?: boolean;
  added_by?: 'he' | 'she';
  tag_ids?: number[];
}

// CSV Import interfaces
export interface CSVImportPreview {
  rows: CSVRowPreview[];
}

export interface CSVRowPreview {
  row_number: number;
  date: string;
  expenses: Record<string, number>;
  issues?: string[];
  parsed_expenses: ParsedExpense[];
}

export interface ParsedExpense {
  comment: string;
  amount: number;
  date: string;
  vendor_type: string;
  category: string;
  issues?: string[];
}

export interface Income {
  id: number;
  amount: number;
  date: string;
  source: string;
  comment: string;
  vendor_id?: number;
  vendor?: Vendor;
  added_by: 'he' | 'she';
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface CreateIncomeRequest {
  amount: number;
  date: string;
  source: string;
  comment: string;
  vendor_id?: number;
  added_by?: 'he' | 'she';
  tag_ids?: number[];
}

export interface IncomeSummary {
  total_income: number;
  income_count: number;
}

// API functions
export const expenseAPI = {
  getExpenses: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return apiClient.get<Expense[]>(`/expenses${queryString ? `?${queryString}` : ''}`);
  },
  createExpense: (expense: CreateExpenseRequest) => apiClient.post<Expense>('/expenses', expense),
  getExpense: (id: number) => apiClient.get<Expense>(`/expenses/${id}`),
  updateExpense: (id: number, expense: CreateExpenseRequest) => apiClient.put<Expense>(`/expenses/${id}`, expense),
  deleteExpense: (id: number) => apiClient.delete(`/expenses/${id}`),
  exportCSV: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return apiClient.get(`/expenses/export/csv${queryString ? `?${queryString}` : ''}`, {
      responseType: 'blob',
    });
  },
  importCSVPreview: (csvData: string) => apiClient.post<CSVImportPreview>('/expenses/import/csv/preview', { csv_data: csvData }),
  importCSVConfirm: (rowNumber: number, expenses: CreateExpenseRequest[]) => apiClient.post<Expense[]>('/expenses/import/csv/confirm', { row_number: rowNumber, expenses }),
  getBalanceSummary: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return apiClient.get<{
      total_earnings: number;
      total_expenses: number;
      balance: number;
      earnings_count: number;
      expenses_count: number;
    }>(`/expenses/balance${queryString ? `?${queryString}` : ''}`);
  },
  getEarnings: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return apiClient.get<Expense[]>(`/expenses/earnings${queryString ? `?${queryString}` : ''}`);
  },
  getActualExpenses: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return apiClient.get<Expense[]>(`/expenses/actual${queryString ? `?${queryString}` : ''}`);
  },
};

export const vendorAPI = {
  getVendors: () => apiClient.get<Vendor[]>('/vendors'),
  createVendor: (vendor: { name: string; type: string }) => apiClient.post<Vendor>('/vendors', vendor),
  getVendor: (id: number) => apiClient.get<Vendor>(`/vendors/${id}`),
  getVendorsByType: (type: string) => apiClient.get<Vendor[]>(`/vendors/type/${type}`),
};

export const categoryAPI = {
  getCategories: () => apiClient.get<Category[]>('/categories'),
  createCategory: (category: { name: string; color: string; icon: string }) => apiClient.post<Category>('/categories', category),
  getCategory: (id: number) => apiClient.get<Category>(`/categories/${id}`),
  updateCategory: (id: number, category: { name?: string; color?: string; icon?: string }) => apiClient.put<Category>(`/categories/${id}`, category),
  deleteCategory: (id: number) => apiClient.delete(`/categories/${id}`),
};

export const tagAPI = {
  getTags: () => apiClient.get<Tag[]>('/tags'),
  createTag: (tag: { name: string; color: string }) => apiClient.post<Tag>('/tags', tag),
  getTag: (id: number) => apiClient.get<Tag>(`/tags/${id}`),
  updateTag: (id: number, tag: { name?: string; color?: string }) => apiClient.put<Tag>(`/tags/${id}`, tag),
  deleteTag: (id: number) => apiClient.delete(`/tags/${id}`),
  getTagsByExpense: (expenseId: number) => apiClient.get<Tag[]>(`/expenses/${expenseId}/tags`),
  addTagToExpense: (expenseId: number, tagId: number) => apiClient.post(`/expenses/${expenseId}/tags/${tagId}`),
  removeTagFromExpense: (expenseId: number, tagId: number) => apiClient.delete(`/expenses/${expenseId}/tags/${tagId}`),
};

export const incomeAPI = {
  getIncomes: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return apiClient.get<Income[]>(`/incomes${queryString ? `?${queryString}` : ''}`);
  },
  createIncome: (income: CreateIncomeRequest) => apiClient.post<Income>('/incomes', income),
  getIncome: (id: number) => apiClient.get<Income>(`/incomes/${id}`),
  updateIncome: (id: number, income: Partial<CreateIncomeRequest>) => apiClient.put<Income>(`/incomes/${id}`, income),
  deleteIncome: (id: number) => apiClient.delete(`/incomes/${id}`),
  getIncomesBySource: (source: string) => apiClient.get<Income[]>(`/incomes/source/${source}`),
  getIncomesSummary: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString();
    return apiClient.get<IncomeSummary>(`/incomes/summary${queryString ? `?${queryString}` : ''}`);
  },
};

// Utility function for formatting currency
export const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};