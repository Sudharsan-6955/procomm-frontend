"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getSessionToken } from "@/lib/session";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushProvider({ children }) {
	const [sessionToken, setSessionToken] = useState(() => getSessionToken());
	const [activeChatFromEvent, setActiveChatFromEvent] = useState(null);
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { data: me } = useCurrentUser({
		enabled: Boolean(sessionToken),
		retry: 0,
		queryKey: ["me", sessionToken],
	});

	const routeActiveChatId = useMemo(() => {
		const route = String(pathname || "");
		if (route.startsWith("/chat/")) {
			const routeChatId = route.split("/")[2] || "";
			return routeChatId || null;
		}

		if (route === "/chat") {
			const fromQuery = searchParams?.get("chatId") || "";
			return fromQuery || null;
		}

		return null;
	}, [pathname, searchParams]);

	const isChatRoute = String(pathname || "").startsWith("/chat");
	const activeChatId = routeActiveChatId || (isChatRoute ? activeChatFromEvent : null);

	usePushNotifications(me?._id || null, activeChatId);

	useEffect(() => {
		const handleActiveChatChange = (event) => {
			const nextChatId = String(event?.detail?.chatId || "");
			setActiveChatFromEvent(nextChatId || null);
		};

		const syncSession = () => {
			setSessionToken(getSessionToken());
		};

		syncSession();
		window.addEventListener("storage", syncSession);
		window.addEventListener("procomm-session-change", syncSession);
		window.addEventListener("procomm-active-chat-change", handleActiveChatChange);

		return () => {
			window.removeEventListener("storage", syncSession);
			window.removeEventListener("procomm-session-change", syncSession);
			window.removeEventListener("procomm-active-chat-change", handleActiveChatChange);
		};
	}, []);

	useEffect(() => {
		if (!isChatRoute && activeChatFromEvent) {
			setActiveChatFromEvent(null);
		}
	}, [isChatRoute, activeChatFromEvent]);

	return children;
}
