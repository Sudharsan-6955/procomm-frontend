const REMOTE_API_BASE_URL = "https://procomm-backend.onrender.com";

function normalizeUrl(url) {
	return String(url || "").trim().replace(/\/$/, "");
}

export function getApiBaseUrl() {
	const configuredUrl =
		process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
	const normalizedConfiguredUrl = normalizeUrl(configuredUrl);

	if (normalizedConfiguredUrl) {
		return normalizedConfiguredUrl;
	}

	if (typeof window !== "undefined") {
		const hostname = String(window.location.hostname || "").toLowerCase();
		if (hostname === "localhost" || hostname === "127.0.0.1") {
			return "http://localhost:5000";
		}
	}

	return REMOTE_API_BASE_URL;
}
