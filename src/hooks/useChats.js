"use client";

import { useQuery } from "@tanstack/react-query";
import { getChats } from "@/services/api";

export function useChats() {
	return useQuery({
		queryKey: ["chats"],
		queryFn: async () => {
			try {
				const apiData = await getChats();
				return Array.isArray(apiData) ? apiData : [];
			} catch {
				return [];
			}
		},
		staleTime: 30_000,
		refetchInterval: 5000,
	});
}
