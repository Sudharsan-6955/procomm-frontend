import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

let recaptchaVerifier = null;

export const getFriendlyPhoneAuthError = (error) => {
	const code = error?.code || "";

	switch (code) {
		case "auth/invalid-phone-number":
			return "Invalid phone number. Use full country code and a valid number.";
		case "auth/invalid-verification-code":
			return "Wrong OTP code. Please try again.";
		case "auth/code-expired":
			return "OTP expired. Request a new code.";
		case "auth/too-many-requests":
			return "Too many attempts. Please wait and try again later.";
		case "auth/quota-exceeded":
			return "SMS quota exceeded. Try again later.";
		case "auth/captcha-check-failed":
			return "reCAPTCHA check failed. Please retry.";
		default:
			return error?.message || "Something went wrong. Please try again.";
	}
};

export const setupRecaptcha = (containerId = "recaptcha-container") => {
	if (typeof window === "undefined") {
		throw new Error("Phone auth requires a browser environment.");
	}

	if (recaptchaVerifier) {
		return recaptchaVerifier;
	}

	// Firebase v12 expects (auth, containerId, parameters) in modular SDK.
	recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
		size: "invisible",
	});

	return recaptchaVerifier;
};

const safeResetRecaptchaWidget = async () => {
	if (!recaptchaVerifier || typeof window === "undefined") {
		return;
	}

	try {
		const widgetId = await recaptchaVerifier.render();
		if (window.grecaptcha && typeof window.grecaptcha.reset === "function") {
			window.grecaptcha.reset(widgetId);
		}
	} catch {
		// Ignore reset errors and allow retry flow.
	}
};

export const sendOtp = async (phoneNumber, containerId = "recaptcha-container") => {
	const verifier = setupRecaptcha(containerId);

	try {
		await verifier.render();
		return await signInWithPhoneNumber(auth, phoneNumber, verifier);
	} catch (error) {
		await safeResetRecaptchaWidget();
		throw error;
	}
};

export const verifyOtp = async (confirmationResult, otpCode) => {
	return confirmationResult.confirm(otpCode);
};

export const sendIdTokenToBackend = async (idToken, userProfile = {}, options = {}) => {
	const { timeoutMs = 20000 } = options;
	const baseUrl = getApiBaseUrl();
	const endpoint = process.env.NEXT_PUBLIC_AUTH_VERIFY_ENDPOINT || `${baseUrl}/api/auth/firebase-phone`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	let response;

	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${idToken}`,
			},
			body: JSON.stringify({ token: idToken, ...userProfile }),
			signal: controller.signal,
		});
	} catch (error) {
		if (error?.name === "AbortError") {
			throw new Error("Backend verification timed out. Please try again.");
		}

		throw new Error("Could not reach backend verification API.");
	} finally {
		clearTimeout(timeoutId);
	}

	if (!response.ok) {
		let message = "Backend verification failed.";

		try {
			const data = await response.json();
			message = data?.message || message;
		} catch {
			// Leave fallback message when body is not JSON.
		}

		throw new Error(message);
	}

	try {
		return await response.json();
	} catch {
		return { success: true };
	}
};

export const clearRecaptcha = () => {
	if (recaptchaVerifier) {
		recaptchaVerifier.clear();
		recaptchaVerifier = null;
	}
};
