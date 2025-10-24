import axios from "axios";
import type { PrayerTimes, MosqueData } from "./types";

// Create axios instance with base configuration
const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

console.log("🔗 Using API Base URL:", baseURL); // helpful for debugging

// ✅ Create Axios instance
const api = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
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
    // Handle timeout errors specifically
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      console.warn(
        "Request timed out, but may still be processing on server:",
        error.config?.url
      );
      // For login requests, show a more helpful message
      if (error.config?.url?.includes("/admin/login")) {
        const timeoutError = new Error(
          "Login request timed out. The server may still be processing your request. Please wait a moment and check if you were logged in successfully."
        );
        timeoutError.name = "TimeoutError";
        return Promise.reject(timeoutError);
      }
      // For other requests, show generic timeout message
      const timeoutError = new Error("Request timed out. Please try again.");
      timeoutError.name = "TimeoutError";
      return Promise.reject(timeoutError);
    }

    // Handle 401 unauthorized - but don't redirect for certain errors
    if (error.response?.status === 401) {
      const errorMessage =
        error.response?.data?.error || error.response?.data?.message || "";
      const errorCode = error.response?.data?.code;
      const requestUrl = error.config?.url || "";

      // Don't redirect for login/register form errors - let the component handle it
      if (
        errorMessage.includes("not approved") ||
        errorMessage.includes("24 hours") ||
        errorMessage.includes("Invalid credentials") ||
        errorMessage.includes("Invalid email or password") ||
        errorMessage.includes("Admin not found") ||
        requestUrl.includes("/admin/login") ||
        requestUrl.includes("/admin/register") ||
        requestUrl.includes("/superadmin/login") ||
        requestUrl.includes("/superadmin/register") ||
        requestUrl.includes("/admin/me")
      ) {
        // Just clean up tokens but stay on current page
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return Promise.reject(error);
      }

      // Handle user deleted/account no longer exists
      if (
        errorCode === "USER_DELETED" ||
        errorMessage.includes("no longer exists")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Show alert and redirect
        alert("Your account has been deleted. You have been logged out.");
        window.location.href = "/";
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
    phone: string;
    mosque_id: string;
    verification_code: string;
    application_notes?: string;
  }) => api.post("/admin/register", data),

  // Admin login
  loginAdmin: (data: { email: string; password: string }) =>
    api.post("/admin/login", data),

  // Get admin profile and status
  getAdminProfile: () => api.get("/admin/me"),

  // Request reapplication (for rejected admins)
  requestReapplication: (data: {
    mosque_verification_code: string;
    application_notes?: string;
  }) => api.post("/admin/reapply", data),

  // Super admin registration
  registerSuperAdmin: (data: {
    name: string;
    email: string;
    password: string;
  }) => api.post("/superadmin/register", data),

  // Create super admin (internal - requires existing super admin auth)
  createSuperAdmin: (data: { name: string; email: string; password: string }) =>
    api.post("/superadmin/create-superadmin", data),

  // Super admin login
  loginSuperAdmin: (data: { email: string; password: string }) =>
    api.post("/superadmin/login", data),

  // Password Reset APIs
  forgotPassword: (data: { email: string; userType: "admin" | "superadmin" }) =>
    api.post("/forgot-password", data),

  verifyResetCode: (data: {
    email: string;
    code: string;
    userType: "admin" | "superadmin";
  }) => api.post("/verify-reset-code", data),

  resetPassword: (data: {
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }) => api.post("/reset-password", data),

  // Logout
  logout: () => api.post("/logout"),
};

export const superAdminApi = {
  // Dashboard stats
  getDashboardStats: () =>
    api.get("/superadmin/dashboard/stats").catch(() => ({
      data: {
        stats: {
          total_mosques: 0,
          approved_mosques: 0,
          pending_requests: 0,
          rejected_requests: 0,
          total_super_admins: 0,
          total_audit_logs: 0,
        },
      },
    })),

  // Pending requests
  getPendingRequests: () =>
    api.get("/superadmin/pending").catch(() => ({
      data: { pending_admins: [] },
    })),

  // Approved requests
  getApprovedRequests: () =>
    api.get("/superadmin/approved").catch(() => ({
      data: { approved_admins: [] },
    })),

  // Request history with filtering
  getRequestHistory: (params?: {
    status?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get("/superadmin/requests/history", { params }).catch(() => ({
      data: { requests: [] },
    })),

  // Get all mosques with registration details
  getMosquesForManagement: () =>
    api.get("/superadmin/mosques/registration").catch(() => ({
      data: { mosques: [] },
    })),

  // Get all mosques with admin details (for deletion management)
  getAllMosques: (params?: {
    search?: string;
    status?: string;
    sort?: string;
    order?: string;
  }) =>
    api.get("/superadmin/mosques/all", { params }).catch(() => ({
      data: { mosques: [] },
    })),

  // Delete mosque
  deleteMosque: (id: string, reason: string) =>
    api.delete(`/superadmin/mosque/${id}`, {
      data: { reason },
    }),

  // Bulk delete mosques
  bulkDeleteMosques: (mosque_ids: string[], reason: string) =>
    api.post("/superadmin/mosques/bulk-delete", {
      mosque_ids,
      reason,
    }),

  // Mosque registrations
  getMosqueRegistrations: (params?: {
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => api.get("/superadmin/mosques/registration", { params }),

  // Approve admin
  approveAdmin: (id: string, data: { super_admin_notes?: string }) =>
    api.put(`/superadmin/${id}/approve`, data),

  // Reject admin
  rejectAdmin: (id: string, data: { reason: string }) =>
    api.put(`/superadmin/${id}/reject`, data),

  // Allow rejected admin to reapply
  allowReapplication: (id: string, data?: { notes?: string }) =>
    api.put(`/superadmin/${id}/allow-reapplication`, data),

  // Get rejected admins list
  getRejectedAdmins: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
  }) => api.get("/superadmin/rejected-admins", { params }),

  // Update mosque details
  updateMosque: (
    id: string,
    mosqueData: {
      name?: string;
      location?: string;
      description?: string;
      contact_phone?: string;
      contact_email?: string;
      admin_instructions?: string;
      prayer_times?: {
        fajr?: string;
        dhuhr?: string;
        asr?: string;
        maghrib?: string;
        isha?: string;
        jummah?: string;
      };
    }
  ) => api.put(`/superadmin/mosque/${id}`, mosqueData),

  // Regenerate mosque verification code
  regenerateMosqueCode: (id: string, data?: { expiry_days?: number }) =>
    api.put(`/superadmin/mosque/${id}/regenerate-code`, data),

  // Remove admin from mosque
  removeAdmin: (id: string, data: { removal_reason: string }) =>
    api.put(`/superadmin/admin/${id}/remove`, data),

  // Get mosque verification details
  getMosqueVerificationDetails: (id: string) =>
    api.get(`/superadmin/mosque/${id}/verification`),

  // Complete mosque registration with admin (new method)
  registerMosqueWithAdmin: (data: {
    mosque_name: string;
    location: string;
    description?: string;
    contact_phone?: string;
    contact_email?: string;
    admin_instructions?: string;
    admin_name: string;
    admin_email: string;
    admin_phone?: string;
    admin_password: string;
    registration_code?: string;
  }) => api.post("/superadmin/mosque-registration", data),

  // Simple mosque registration (mosque only)
  registerSimpleMosque: (data: {
    name: string;
    location: string;
    description?: string;
    contact_phone?: string;
    contact_email?: string;
    admin_instructions?: string;
  }) => api.post("/mosques", data),

  // Assign admin to existing mosque
  assignAdminToMosque: (
    mosqueId: string,
    data: {
      admin_name: string;
      admin_email: string;
      admin_phone: string;
      admin_password: string;
      super_admin_notes?: string;
    }
  ) => api.post(`/superadmin/mosques/${mosqueId}/assign-admin`, data),

  // Audit Logs
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    action_type?: string;
    user_type?: string;
    target_type?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }) => api.get("/superadmin/audit-logs", { params }),

  // Get audit log statistics
  getAuditStats: () => api.get("/superadmin/audit-stats"),

  // Get action types summary for dashboard cards
  getActionTypesSummary: () => api.get("/superadmin/action-types-summary"),

  // Get specific audit log details
  getAuditLogDetails: (id: string) => api.get(`/superadmin/audit-logs/${id}`),

  // Export audit logs as CSV
  exportAuditLogs: (params?: {
    action_type?: string;
    user_type?: string;
    target_type?: string;
    start_date?: string;
    end_date?: string;
    log_ids?: string[];
  }) =>
    api.get("/superadmin/audit-logs/export/csv", {
      params: params?.log_ids
        ? { ...params, log_ids: params.log_ids.join(",") }
        : params,
      responseType: "blob",
    }),

  // Cleanup old audit logs
  cleanupAuditLogs: (days_old: number = 90, reason: string) =>
    api.delete("/superadmin/audit-logs/cleanup", {
      params: { days_old, reason },
    }),

  // Bulk delete specific audit logs
  bulkDeleteAuditLogs: (log_ids: string[], reason: string) =>
    api.delete("/superadmin/audit-logs/bulk-delete", {
      data: { log_ids, reason },
    }),

  // Get all super admins
  getSuperAdmins: () =>
    api.get("/superadmin/super-admins").catch(() => ({
      data: { super_admins: [] },
    })),

  // Delete super admin
  deleteSuperAdmin: (id: string) => api.delete(`/superadmin/super-admin/${id}`),

  // Health check
  healthCheck: () => api.get("/health"),

  // Code regeneration methods
  getCodeRegenerationList: (params?: {
    search?: string;
    expiry_filter?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }) => api.get("/superadmin/mosque/code-regeneration", { params }),

  // Regenerate multiple mosque codes
  regenerateMultipleCodes: (data: {
    mosque_ids: string[];
    expiry_days?: number;
  }) => api.post("/superadmin/mosque/regenerate-multiple-codes", data),

  // Log frontend errors
  logFrontendError: (errorData: {
    action: string;
    error: string;
    component: string;
    timestamp: string;
    userAgent: string;
    url: string;
    statusCode?: number;
    [key: string]: unknown;
  }) => api.post("/logs/frontend-error", errorData),
};
