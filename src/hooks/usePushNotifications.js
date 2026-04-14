"use client";

import { useEffect, useRef } from "react";
import { getToken, isSupported, onMessage } from "firebase/messaging";
import { firebaseApp } from "@/lib/firebase";
import { registerPushToken } from "@/services/api";
import { savePushToken } from "@/lib/session";

function extractChatIdFromPushPayload(payload) {
	const directChatId = payload?.data?.chatId;
	if (directChatId) {
		return String(directChatId);
	}

	const link = payload?.fcmOptions?.link || payload?.data?.link || "";
	if (!link) {
		return "";
	}

	try {
		const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
		const url = new URL(link, base);
		return String(url.searchParams.get("chatId") || "");
	} catch {
		return "";
	}
}

export function usePushNotifications(userId, activeChatId = null) {
	const currentTokenRef = useRef("");
	const activeUserIdRef = useRef(null);

	useEffect(() => {
		if (!userId || typeof window === "undefined" || typeof Notification === "undefined") {
			return;
		}

		let unsubscribeMessageListener = null;
		const normalizedActiveChatId = String(activeChatId || "");

		const setupPush = async () => {
			try {
				if (activeUserIdRef.current !== String(userId)) {
					activeUserIdRef.current = String(userId);
					currentTokenRef.current = "";
				}

				const supported = await isSupported();
				if (!supported) {
					return;
				}

				const { getMessaging } = await import("firebase/messaging");
				const messaging = getMessaging(firebaseApp);
				const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
				if (!vapidKey) {
					return;
				}

				const permission =
					Notification.permission === "granted"
						? "granted"
						: await Notification.requestPermission();

				if (permission !== "granted") {
					return;
				}

				const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
				const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
				if (!token) {
					return;
				}

				if (token !== currentTokenRef.current) {
					await registerPushToken(token);
					savePushToken(token);
					currentTokenRef.current = token;
					console.info("Push token registered for user:", String(userId));
				}

				unsubscribeMessageListener = onMessage(messaging, (payload) => {
					const incomingChatId = extractChatIdFromPushPayload(payload);
					if (incomingChatId && normalizedActiveChatId && incomingChatId === normalizedActiveChatId) {
						return;
					}

					const title = payload?.notification?.title || "New message";
					const body = payload?.notification?.body || "You received a new message";

					if (Notification.permission === "granted") {
						new Notification(title, { body });
					}
				});
			} catch (error) {
				console.warn("Push setup skipped:", error?.message || error);
			}
		};

		setupPush();

		return () => {
			if (unsubscribeMessageListener) {
				unsubscribeMessageListener();
			}
		};
	}, [userId, activeChatId]);
}
