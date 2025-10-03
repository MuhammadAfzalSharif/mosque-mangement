import axios from "axios";
import type { PrayerTimes, MosqueData } from "./types";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:3000/api",
  timeout: 10000,
  withCredentials: true, // Include cookies for JWT authentication
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle common errors
api.interceptors.response.use(
  (response) => {
    // Save token if provided in response
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response;
  },
  (error) => {
    // Handle 401 unauthorized - but don't redirect for certain errors
    if (error.response?.status === 401) {
      const errorMessage =
        error.response?.data?.error || error.response?.data?.message || "";
      const requestUrl = error.config?.url || "";

      // Don't redirect for login/register form errors - let the component handle it
      if (
        errorMessage.includes("not approved") ||
        errorMessage.includes("24 hours") ||
        errorMessage.includes("Invalid credentials") ||
        errorMessage.includes("Invalid email or password") ||
        errorMessage.includes("Admin not found") ||
        requestUrl.includes("/admin/login") ||
        requestUrl.includes("/admin/register")
      ) {
        // Just clean up tokens but stay on current page
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return Promise.reject(error);
      }

      // For other 401 errors, redirect to home
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// API functions
export const mosqueApi = {
  // Get all mosques with search and pagination
  getMosques: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/mosques", { params }),

  // Get specific mosque details
  getMosque: (id: string) => api.get(`/mosques/${id}`),

  // Get mosque prayer times
  getPrayerTimes: (id: string) => api.get(`/mosques/${id}/prayer-times`),

  // Update prayer times (admin only)
  updatePrayerTimes: (id: string, prayerTimes: PrayerTimes) =>
    api.put(`/mosques/${id}/prayer-times`, prayerTimes),

  // Update mosque details (admin only)
  updateMosque: (id: string, mosqueData: MosqueData) =>
    api.put(`/mosques/${id}`, mosqueData),

  // Get mosque verification info
  getMosqueVerificationInfo: (id: string) =>
    api.get(`/mosque/${id}/verification-info`),
};

export const authApi = {
  // Admin registration
  registerAdmin: (data: {
    name: string;
    email: string;
    password: string;
    mosque_id: string;
    verification_code: string;
    application_notes?: string;
  }) => api.post("/admin/register", data),

  // Admin login
  loginAdmin: (data: { email: string; password: string }) =>
    api.post("/admin/login", data),

  // Super admin login
  loginSuperAdmin: (data: { email: string; password: string }) =>
    api.post("/superadmin/login", data),

  // Logout
  logout: () => api.post("/logout"),
};

export default api;
