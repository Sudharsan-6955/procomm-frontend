importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
	apiKey: "AIzaSyC2tbyz1FePMfDlyT6Behoe1ustg6JMZbU",
	authDomain: "procomm-a1cdc.firebaseapp.com",
	projectId: "procomm-a1cdc",
	storageBucket: "procomm-a1cdc.firebasestorage.app",
	messagingSenderId: "538381294070",
	appId: "1:538381294070:web:34bcd9257aa166932d0fd7",
});

const messaging = firebase.messaging();
let lastBackgroundMessageId = "";

messaging.onBackgroundMessage((payload) => {
	const messageId = String(payload?.data?.messageId || payload?.messageId || "");
	if (messageId && messageId === lastBackgroundMessageId) {
		return;
	}
	lastBackgroundMessageId = messageId;

	const notificationTitle = payload?.notification?.title || payload?.data?.title || "ProComm";
	const notificationOptions = {
		body: payload?.notification?.body || payload?.data?.body || "New message received",
		icon: "/icons/icon-192x192.png",
		badge: "/icons/icon-192x192.png",
		tag: payload?.data?.chatId ? `chat-${String(payload.data.chatId)}` : undefined,
		data: {
			link: payload?.data?.link || payload?.fcmOptions?.link || "/chat",
			messageId,
		},
	};

	self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const clickLink = event.notification?.data?.link || "/chat";

	event.waitUntil(
		clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
			for (const client of windowClients) {
				if ("focus" in client) {
					client.navigate(clickLink);
					return client.focus();
				}
			}
			if (clients.openWindow) {
				return clients.openWindow(clickLink);
			}
			return undefined;
		})
	);
});
