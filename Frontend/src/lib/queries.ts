import { useQuery } from "@tanstack/react-query";
import { mosqueApi } from "./api";

// Query keys
export const mosqueQueryKeys = {
  all: ["mosques"] as const,
  lists: () => [...mosqueQueryKeys.all, "list"] as const,
  list: (params: { search?: string; page?: number; limit?: number }) =>
    [...mosqueQueryKeys.lists(), params] as const,
  details: () => [...mosqueQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...mosqueQueryKeys.details(), id] as const,
  prayerTimes: (id: string) =>
    [...mosqueQueryKeys.all, "prayer-times", id] as const,
};

// Mosque queries
export const useMosques = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: mosqueQueryKeys.list(params || {}),
    queryFn: async () => {
      const response = await mosqueApi.getMosques(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMosque = (id: string) => {
  return useQuery({
    queryKey: mosqueQueryKeys.detail(id),
    queryFn: async () => {
      const response = await mosqueApi.getMosque(id);
      // Ensure consistent structure - return the mosque object directly
      return response.data.mosque || response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePrayerTimes = (id: string) => {
  return useQuery({
    queryKey: mosqueQueryKeys.prayerTimes(id),
    queryFn: async () => {
      const response = await mosqueApi.getPrayerTimes(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes for prayer times
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Admin-specific queries
export const useAdminMosque = (mosqueId: string) => {
  return useQuery({
    queryKey: mosqueQueryKeys.detail(mosqueId), // Use the same key as useMosque
    queryFn: async () => {
      const response = await mosqueApi.getMosque(mosqueId);
      // Ensure we return the mosque data in the expected format
      return response.data.mosque || response.data; // Handle both possible response structures
    },
    enabled: !!mosqueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
