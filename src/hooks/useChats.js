"use client";

import { useQuery } from "@tanstack/react-query";
import { getChats } from "@/services/api";

export function useChats() {
	// Chats list server-lendhu eduthu cache-la hold pannrom.
	return useQuery({
		queryKey: ["chats"],
		queryFn: async () => {
			try {
				// API fail aana app crash aagama empty list return panrom.
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
