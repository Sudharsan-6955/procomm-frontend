"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/services/api";

export function useCurrentUser(options = {}) {
	return useQuery({
		queryKey: ["me"],
		queryFn: getMyProfile,
		retry: 1,
		...options,
	});
}
