const TOKEN_KEY = "procomm_auth_token";
const USER_KEY = "procomm_auth_user";
const PUSH_TOKEN_KEY = "procomm_push_token";

function canUseStorage() {
	return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitSessionChange() {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(new Event("procomm-session-change"));
}

export function saveSession({ token, user }) {
	if (!canUseStorage()) {
		return;
	}
	if (token) {
		window.localStorage.setItem(TOKEN_KEY, token);
	}
	if (user) {
		window.localStorage.setItem(USER_KEY, JSON.stringify(user));
	}
	emitSessionChange();
}

export function getSessionToken() {
	if (!canUseStorage()) {
		return null;
	}
	return window.localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser() {
	if (!canUseStorage()) {
		return null;
	}
	const raw = window.localStorage.getItem(USER_KEY);
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function clearSession() {
	if (!canUseStorage()) {
		return;
	}
	window.localStorage.removeItem(TOKEN_KEY);
	window.localStorage.removeItem(USER_KEY);
	window.localStorage.removeItem(PUSH_TOKEN_KEY);
	emitSessionChange();
}

export function savePushToken(token) {
	if (!canUseStorage()) {
		return;
	}
	if (token) {
		window.localStorage.setItem(PUSH_TOKEN_KEY, token);
	}
}

export function getPushToken() {
	if (!canUseStorage()) {
		return null;
	}
	return window.localStorage.getItem(PUSH_TOKEN_KEY);
}

export function clearPushToken() {
	if (!canUseStorage()) {
		return;
	}
	window.localStorage.removeItem(PUSH_TOKEN_KEY);
}
