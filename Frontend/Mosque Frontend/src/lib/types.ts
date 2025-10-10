// Type definitions for API responses
export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export interface MosqueApiResponse {
  data: {
    mosques: Array<{
      id: string;
      name: string;
      location: string;
      description?: string;
      prayer_times?: {
        fajr: string | null;
        dhuhr: string | null;
        asr: string | null;
        maghrib: string | null;
        isha: string | null;
        jummah: string | null;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

// Prayer times interface
export interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: string;
}

// Mosque data interface
export interface MosqueData {
  name?: string;
  location?: string;
  description?: string;
}

export interface MosqueDetailResponse {
  data: {
    mosque: {
      id: string;
      name: string;
      location: string;
      description: string;
      prayer_times: {
        fajr: string | null;
        dhuhr: string | null;
        asr: string | null;
        maghrib: string | null;
        isha: string | null;
        jummah: string | null;
      };
      verification_code?: string;
    };
  };
}

// Utility function to extract error message
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Check if it's an axios error
    const axiosError = error as ApiError;
    if (axiosError.response?.data?.error) {
      return String(axiosError.response.data.error);
    }
    return error.message;
  }
  return "An unexpected error occurred";
};

// Admin status types
export type AdminStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "mosque_deleted"
  | "admin_removed"
  | "code_regenerated";

// Admin profile interface
export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AdminStatus;
  mosque: {
    id: string;
    name: string;
    location: string;
  } | null;
  rejection_info?: {
    rejection_reason: string;
    rejection_date: string;
    rejection_count: number;
    can_reapply: boolean;
  };
  mosque_deletion_info?: {
    mosque_deletion_reason: string;
    mosque_deletion_date: string;
    deleted_mosque_name: string;
    deleted_mosque_location: string;
    can_reapply: boolean;
  };
  admin_removal_info?: {
    admin_removal_reason: string;
    admin_removal_date: string;
    removed_from_mosque_name: string;
    removed_from_mosque_location: string;
    can_reapply: boolean;
  };
  code_regeneration_info?: {
    code_regeneration_reason: string;
    code_regeneration_date: string;
    code_regenerated_mosque_name: string;
    code_regenerated_mosque_location: string;
    can_reapply: boolean;
  };
  created_at: string;
}

// Rejected admin interface
export interface RejectedAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AdminStatus;
  rejection_reason: string;
  rejection_date: string;
  rejection_count: number;
  can_reapply: boolean;
  rejected_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  previous_mosques: Array<{
    mosque: {
      id: string;
      name: string;
      location: string;
    } | null;
    rejected_at: string;
    rejection_reason: string;
  }>;
  created_at: string;
}
