import { getSessionToken } from "@/lib/session";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
	const token = getSessionToken();
	const withAuth = options.withAuth !== false;
	const headers = {
		"Content-Type": "application/json",
		...(options.headers || {}),
	};

	if (withAuth && token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const res = await fetch(`${API_BASE_URL}${path}`, {
		headers,
		...options,
	});

	if (!res.ok) {
		let errorMessage = `API request failed: ${res.status}`;
		try {
			const data = await res.json();
			if (data?.message) {
				errorMessage = data.message;
			}
		} catch {
			// Keep fallback message when response body is not JSON.
		}

		throw new Error(errorMessage);
	}

	return res.json();
}

export function verifyPhoneToken(token) {
	return request("/api/auth/firebase-phone", {
		method: "POST",
		body: JSON.stringify({ token }),
		withAuth: true,
	});
}

export function sendEmailOtp(email) {
	return request("/api/auth/email-otp/send", {
		method: "POST",
		body: JSON.stringify({ email }),
		withAuth: false,
	});
}

export function verifyEmailOtp({ email, otp, name }) {
	return request("/api/auth/email-otp/verify", {
		method: "POST",
		body: JSON.stringify({ email, otp, name }),
		withAuth: false,
	});
}

export function verifyFirebaseLogin({ token, name, profilePic, email }) {
	return request("/api/auth/firebase-login", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ token, name, profilePic, email }),
		withAuth: false,
	});
}

export function getMyProfile() {
	return request("/api/users/me");
}

export function updateMyProfile(payload) {
	return request("/api/users/me", {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
}

export function searchProfiles(q) {
	return request(`/api/users/search?q=${encodeURIComponent(q)}`);
}

export function getAllUsers(limit = 10, skip = 0) {
	return request(`/api/users/list/all?limit=${limit}&skip=${skip}`);
}

export function registerPushToken(token) {
	return request("/api/users/push-token", {
		method: "POST",
		body: JSON.stringify({ token }),
	});
}

export function unregisterPushToken(token) {
	return request("/api/users/push-token", {
		method: "DELETE",
		body: JSON.stringify({ token }),
	});
}

export function getChats() {
	return request("/api/chats");
}

export function createDirectChat(targetUserId) {
	return request("/api/chats/direct", {
		method: "POST",
		body: JSON.stringify({ targetUserId }),
	});
}

export function getMessages(chatId, limit = 50) {
	return request(`/api/messages/${chatId}?limit=${limit}`);
}

export function sendMessage(chatId, payload) {
	return request(`/api/messages/${chatId}`, {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function editMessage(chatId, messageId, payload) {
	return request(`/api/messages/${chatId}/${messageId}/edit`, {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
}

export function toggleFavoriteMessage(chatId, messageId) {
	return request(`/api/messages/${chatId}/${messageId}/favorite`, {
		method: "PATCH",
	});
}

export function togglePinMessage(chatId, messageId) {
	return request(`/api/messages/${chatId}/${messageId}/pin`, {
		method: "PATCH",
	});
}

export function deleteMessage(chatId, messageId, scope) {
	return request(`/api/messages/${chatId}/${messageId}/delete`, {
		method: "PATCH",
		body: JSON.stringify({ scope }),
	});
}
