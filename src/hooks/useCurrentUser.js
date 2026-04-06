"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/services/api";

export function useCurrentUser(options = {}) {
	// Current user profile cache key "me" use pannrom.
	return useQuery({
		queryKey: ["me"],
		// Profile fetch direct-ah getMyProfile call la irundhu varum.
		queryFn: getMyProfile,
		retry: 1,
		...options,
	});
}
