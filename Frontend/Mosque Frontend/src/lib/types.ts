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
