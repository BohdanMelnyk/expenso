import axios from 'axios';

// Use different base URLs for web and mobile
const getBaseURL = () => {
  // For mobile development with Expo, we need to use your computer's IP
  // For web, we can use localhost
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
    return 'http://localhost:8080/api/v1'; // Web
  }
  return 'http://192.168.178.137:8080/api/v1'; // Mobile (replace with your actual IP)
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
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
  paid_by_card: boolean;
  added_by: 'he' | 'she';
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

export interface CreateExpenseRequest {
  comment: string;
  amount: number;
  vendor_id: number;
  date: string;
  category: string;
  type: string;
  paid_by_card?: boolean;
  added_by?: 'he' | 'she';
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

// Utility function for formatting currency
export const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};