"use client";

import { useEffect, useState } from "react";
import { getSessionToken } from "@/lib/session";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushProvider({ children }) {
	const [sessionToken, setSessionToken] = useState(() => getSessionToken());
	const { data: me } = useCurrentUser({
		enabled: Boolean(sessionToken),
		retry: 0,
		queryKey: ["me", sessionToken],
	});

	usePushNotifications(me?._id || null);

	useEffect(() => {
		const syncSession = () => {
			setSessionToken(getSessionToken());
		};

		syncSession();
		window.addEventListener("storage", syncSession);
		window.addEventListener("procomm-session-change", syncSession);

		return () => {
			window.removeEventListener("storage", syncSession);
			window.removeEventListener("procomm-session-change", syncSession);
		};
	}, []);

	return children;
}
