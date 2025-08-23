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
  description: string;
  amount: number;
  vendor_id: number;
  vendor?: Vendor;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: number;
  name: string;
  type: 'food_store' | 'shop' | 'eating_out' | 'subscriptions' | 'else';
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  vendor_id: number;
  date: string;
}

// API functions
export const expenseAPI = {
  getExpenses: () => apiClient.get<Expense[]>('/expenses'),
  createExpense: (expense: CreateExpenseRequest) => apiClient.post<Expense>('/expenses', expense),
  getExpense: (id: number) => apiClient.get<Expense>(`/expenses/${id}`),
  updateExpense: (id: number, expense: CreateExpenseRequest) => apiClient.put<Expense>(`/expenses/${id}`, expense),
  deleteExpense: (id: number) => apiClient.delete(`/expenses/${id}`),
};

export const vendorAPI = {
  getVendors: () => apiClient.get<Vendor[]>('/vendors'),
  createVendor: (vendor: { name: string; type: string }) => apiClient.post<Vendor>('/vendors', vendor),
  getVendor: (id: number) => apiClient.get<Vendor>(`/vendors/${id}`),
  getVendorsByType: (type: string) => apiClient.get<Vendor[]>(`/vendors/type/${type}`),
};