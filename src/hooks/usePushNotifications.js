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
	const unsubscribeMessageListenerRef = useRef(null);
	const lastForegroundMessageKeyRef = useRef("");
	const activeChatIdRef = useRef("");

	useEffect(() => {
		activeChatIdRef.current = String(activeChatId || "");
	}, [activeChatId]);

	useEffect(() => {
		if (!userId || typeof window === "undefined" || typeof Notification === "undefined") {
			return;
		}

		let isCancelled = false;

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

				const syncTokenWithRetry = async (nextToken, retriesLeft = 2) => {
					try {
						await registerPushToken(nextToken);
						savePushToken(nextToken);
						currentTokenRef.current = nextToken;
						console.info("Push token registered for user:", String(userId));
					} catch (registerError) {
						console.warn("Push token register failed:", registerError?.message || registerError);
						if (retriesLeft > 0 && !isCancelled) {
							setTimeout(() => {
								if (!isCancelled && currentTokenRef.current !== nextToken) {
									void syncTokenWithRetry(nextToken, retriesLeft - 1);
								}
							}, 4000);
						}
					}
				};

				if (!token) {
					console.warn("Push token unavailable");
				} else {
					if (token !== currentTokenRef.current) {
						void syncTokenWithRetry(token, 2);
					}
				}

				if (isCancelled) {
					return;
				}

				if (unsubscribeMessageListenerRef.current) {
					unsubscribeMessageListenerRef.current();
					unsubscribeMessageListenerRef.current = null;
				}

				unsubscribeMessageListenerRef.current = onMessage(messaging, (payload) => {
					const incomingChatId = extractChatIdFromPushPayload(payload);
					const currentActiveChatId = activeChatIdRef.current;
					if (incomingChatId && currentActiveChatId && incomingChatId === currentActiveChatId) {
						return;
					}

					const messageKey = String(
						payload?.data?.messageId ||
						payload?.messageId ||
						`${payload?.notification?.title || ""}|${payload?.notification?.body || ""}|${Date.now()}`
					);
					if (lastForegroundMessageKeyRef.current === messageKey) {
						return;
					}
					lastForegroundMessageKeyRef.current = messageKey;
					setTimeout(() => {
						if (lastForegroundMessageKeyRef.current === messageKey) {
							lastForegroundMessageKeyRef.current = "";
						}
					}, 4000);

					const title = payload?.notification?.title || payload?.data?.title || "New message";
					const body = payload?.notification?.body || payload?.data?.body || "You received a new message";

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
			isCancelled = true;
			if (unsubscribeMessageListenerRef.current) {
				unsubscribeMessageListenerRef.current();
				unsubscribeMessageListenerRef.current = null;
			}
		};
	}, [userId]);
}
