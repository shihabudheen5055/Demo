import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5163/api';

// Add auth token to all requests automatically
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ForecastDay {
  date: string;
  balance: number;
  billsDue: { title: string; amount: number }[];
}

export interface ForecastResponse {
  currentBalance: number;
  forecast: ForecastDay[];
}

export const login = async (username: string, passwordHash: string) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, passwordHash });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const register = async (username: string, passwordHash: string) => {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, { username, passwordHash });
  return response.data;
};

export const verifyEmail = async (email: string, code: string) => {
  const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, { email, code });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getForecast = async (): Promise<ForecastResponse> => {
  const response = await axios.get(`${API_BASE_URL}/forecast/14-days`);
  return response.data;
};

export const addTransaction = async (transaction: { title: string; amount: number; isExpense: boolean }) => {
  const response = await axios.post(`${API_BASE_URL}/transactions`, transaction);
  return response.data;
};

export const deleteTransaction = async (id: number) => {
  const response = await axios.delete(`${API_BASE_URL}/transactions/${id}`);
  return response.data;
};

export const clearTransactions = async () => {
  const response = await axios.delete(`${API_BASE_URL}/transactions`);
  return response.data;
};

export const updateTransaction = async (id: number, transaction: { title: string; amount: number; isExpense: boolean; date: string }) => {
  const response = await axios.put(`${API_BASE_URL}/transactions/${id}`, transaction);
  return response.data;
};

export const getRecurringBills = async () => {
  const response = await axios.get(`${API_BASE_URL}/recurring-bills`);
  return response.data;
};

export const addRecurringBill = async (bill: { title: string; amount: number; dueDayOfMonth: number }) => {
  const response = await axios.post(`${API_BASE_URL}/recurring-bills`, bill);
  return response.data;
};

export const deleteRecurringBill = async (id: number) => {
  const response = await axios.delete(`${API_BASE_URL}/recurring-bills/${id}`);
  return response.data;
};

export const getAnalytics = async (period: string) => {
  const response = await axios.get(`${API_BASE_URL}/analytics/expense-income?period=${period}`);
  return response.data;
};

export const getCategoryAnalytics = async () => {
  const response = await axios.get(`${API_BASE_URL}/analytics/categories`);
  return response.data;
};

export const getGoogleAuthUrl = async () => {
  const response = await axios.get(`${API_BASE_URL}/auth/google-url`);
  return response.data.url;
};

export const syncEmail = async () => {
  const response = await axios.post(`${API_BASE_URL}/import/email-sync`);
  return response.data;
};

export const getInsights = async () => {
  const response = await axios.get(`${API_BASE_URL}/insights`);
  return response.data;
};

export const getTelegramLinkToken = async () => {
  const response = await axios.post(`${API_BASE_URL}/telegram/link-token`);
  return response.data;
};
