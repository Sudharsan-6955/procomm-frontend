import io from "socket.io-client";
import { getSessionToken } from "@/lib/session";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL ||
	process.env.NEXT_PUBLIC_API_BASE_URL ||
	"http://127.0.0.1:5000";

let socket = null;

export function initSocket() {
	if (socket) {
		return socket;
	}

	const token = getSessionToken();
	if (!token) {
		return null;
	}

	socket = io(API_BASE_URL, {
		auth: {
			token,
		},
		transports: ["websocket", "polling"],
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		reconnectionAttempts: 5,
	});

	socket.on("connect", () => {
		console.log("Socket connected:", socket.id);
	});

	socket.on("disconnect", () => {
		console.log("Socket disconnected");
	});

	socket.on("connect_error", (error) => {
		const message = String(error?.message || "");
		if (message.toLowerCase().includes("unauthorized socket")) {
			return;
		}

		console.error("Socket connection error:", error);
	});

	return socket;
}

export function getSocket() {
	return socket || initSocket();
}

export function disconnectSocket() {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
}
