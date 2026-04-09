"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getCountryCallingCode, isValidPhoneNumber } from "react-phone-number-input";
import CountryPicker from "@/components/CountryPicker";
import {
	clearRecaptcha,
	getFriendlyPhoneAuthError,
	sendIdTokenToBackend,
	sendOtp,
	verifyOtp,
} from "@/lib/phoneAuth";
import { auth } from "@/lib/firebase";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { saveSession } from "@/lib/session";
import { getMyProfile, sendEmailOtp, verifyEmailOtp as verifyEmailOtpApi, verifyFirebaseLogin } from "@/services/api";

const otpLength = 6;

export default function LoginPage() {
	const router = useRouter();
	const [step, setStep] = useState("method");
	const [countryCode, setCountryCode] = useState("IN");
	const [phone, setPhone] = useState("");
	const [quickPhone, setQuickPhone] = useState("+10000000001");
	const [email, setEmail] = useState("");
	const [emailName, setEmailName] = useState("");
	const [otp, setOtp] = useState(Array.from({ length: otpLength }, () => ""));
	const [emailOtp, setEmailOtp] = useState(Array.from({ length: otpLength }, () => ""));
	const [status, setStatus] = useState({ type: "", message: "" });
	const [confirmationResult, setConfirmationResult] = useState(null);
	const [isContinuing, setIsContinuing] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
	const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
	const otpInputRefs = useRef([]);
	const emailOtpInputRefs = useRef([]);
	const apiBaseUrl = getApiBaseUrl();

	useEffect(() => {
		return () => {
			clearRecaptcha();
		};
	}, []);

	const selectedDialCode = `+${getCountryCallingCode(countryCode)}`;
	const fullPhoneNumber = `${selectedDialCode}${phone}`;
	const phoneValid = isValidPhoneNumber(fullPhoneNumber);
	const otpValid = otp.join("").length === otpLength;
	const otpCode = otp.join("");
	const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
	const emailOtpValid = emailOtp.join("").length === otpLength;
	const emailOtpCode = emailOtp.join("");

	const setStatusMessage = (type, message) => {
		setStatus({ type, message });
	};

	const getFriendlyGoogleAuthError = (error) => {
		const code = String(error?.code || "").toLowerCase();

		if (code.includes("popup-closed-by-user")) {
			return "Google sign-in popup was closed. Please try again.";
		}
		if (code.includes("popup-blocked")) {
			return "Popup was blocked by browser. Allow popups and try again.";
		}
		if (code.includes("unauthorized-domain")) {
			return "This domain is not authorized in Firebase. Add your app domain in Firebase Authentication settings.";
		}
		if (code.includes("operation-not-allowed")) {
			return "Google provider is disabled in Firebase. Enable Google sign-in in Firebase Console.";
		}
		if (code.includes("invalid-api-key")) {
			return "Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY.";
		}

		return error?.message || "Google login failed";
	};

	const syncUserFromDb = async (token, fallbackUser = null) => {
		saveSession({ token, user: fallbackUser });
		try {
			const profile = await getMyProfile();
			saveSession({ token, user: profile || fallbackUser });
			return profile || fallbackUser;
		} catch {
			return fallbackUser;
		}
	};

	const handleQuickLogin = async () => {
		if (!quickPhone.trim()) {
			setStatusMessage("error", "Enter a phone number");
			return;
		}

		setIsContinuing(true);
		setStatusMessage("info", "Logging in...");

		try {
			const res = await fetch(`${apiBaseUrl}/api/auth/phone-login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phoneNumber: quickPhone.trim() }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || "Login failed");
			}

			const data = await res.json();
			saveSession({ token: data.token, user: data });
			router.push("/chat");
		} catch (error) {
			setStatusMessage("error", error.message || "Login failed");
		} finally {
			setIsContinuing(false);
		}
	};

	const handleGoogleLogin = async () => {
		setIsContinuing(true);
		setStatusMessage("info", "Signing in with Google...");

		try {
			const provider = new GoogleAuthProvider();
			provider.setCustomParameters({ prompt: "select_account" });
			const credential = await signInWithPopup(auth, provider);
			const firebaseUser = credential.user;
			const idToken = await firebaseUser.getIdToken();

			const data = await verifyFirebaseLogin({
				token: idToken,
				email: firebaseUser.email || "",
				name: firebaseUser.displayName || "",
				profilePic: firebaseUser.photoURL || "",
			});

			const sessionToken = data?.token || idToken;
			await syncUserFromDb(sessionToken, data?.user || null);
			router.push("/chat");
		} catch (error) {
			setStatusMessage("error", getFriendlyGoogleAuthError(error));
			try {
				await signOut(auth);
			} catch {
				// Ignore sign out errors in failed login flow.
			}
		} finally {
			setIsContinuing(false);
		}
	};

	const handleSendEmailOtp = async () => {
		if (!emailValid) {
			setStatusMessage("error", "Enter a valid email address.");
			return;
		}

		setIsSendingEmailOtp(true);
		setStatusMessage("info", `Sending OTP to ${email.trim().toLowerCase()}...`);

		try {
			await sendEmailOtp(email.trim().toLowerCase());
			setEmailOtp(Array.from({ length: otpLength }, () => ""));
			setStep("emailOtp");
			setStatusMessage("success", "OTP sent to your email. Enter the 6-digit code.");
		} catch (error) {
			setStatusMessage("error", error.message || "Failed to send OTP.");
		} finally {
			setIsSendingEmailOtp(false);
		}
	};

	const handleEmailOtpChange = (index, value) => {
		if (!/^\d?$/.test(value)) {
			return;
		}

		const next = [...emailOtp];
		next[index] = value;
		setEmailOtp(next);

		if (value && index < otpLength - 1) {
			emailOtpInputRefs.current[index + 1]?.focus();
		}
	};

	const handleEmailOtpKeyDown = (index, event) => {
		if (event.key === "Backspace" && !emailOtp[index] && index > 0) {
			emailOtpInputRefs.current[index - 1]?.focus();
		}
	};

	const handleEmailOtpPaste = (event) => {
		const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, otpLength);
		if (!pasted) {
			return;
		}

		event.preventDefault();
		const next = Array.from({ length: otpLength }, (_, idx) => pasted[idx] || "");
		setEmailOtp(next);

		const focusIndex = Math.min(pasted.length, otpLength - 1);
		emailOtpInputRefs.current[focusIndex]?.focus();
	};

	const handleVerifyEmailOtp = useCallback(async () => {
		if (isVerifyingEmailOtp) {
			return;
		}

		if (!emailValid) {
			setStatusMessage("error", "Enter a valid email address.");
			return;
		}

		if (!emailOtpValid) {
			setStatusMessage("error", "Enter all 6 digits.");
			return;
		}

		setIsVerifyingEmailOtp(true);
		setStatusMessage("info", "Verifying email OTP...");

		try {
			const data = await verifyEmailOtpApi({
				email: email.trim().toLowerCase(),
				otp: emailOtpCode,
				name: emailName.trim(),
			});
			await syncUserFromDb(data?.token, data?.user || null);
			router.push("/chat");
		} catch (error) {
			setStatusMessage("error", error.message || "Email OTP verification failed.");
		} finally {
			setIsVerifyingEmailOtp(false);
		}
	}, [emailOtpCode, emailOtpValid, emailName, emailValid, isVerifyingEmailOtp, email, router]);

	const handleContinue = async () => {
		if (!phoneValid) {
			setStatusMessage("error", "Invalid phone number. Please check country and number.");
			return;
		}

		setIsContinuing(true);
		setStatusMessage("info", `Sending code to ${fullPhoneNumber}...`);

		try {
			const result = await sendOtp(fullPhoneNumber);
			setConfirmationResult(result);
			setOtp(Array.from({ length: otpLength }, () => ""));
			setStep("otp");
			setStatusMessage("success", `OTP sent to ${fullPhoneNumber}. Enter the 6-digit code.`);
		} catch (error) {
			setStatusMessage("error", getFriendlyPhoneAuthError(error));
		} finally {
			setIsContinuing(false);
		}
	};

	const handleOtpChange = (index, value) => {
		if (!/^\d?$/.test(value)) {
			return;
		}

		const next = [...otp];
		next[index] = value;
		setOtp(next);

		if (value && index < otpLength - 1) {
			otpInputRefs.current[index + 1]?.focus();
		}
	};

	const handleOtpPaste = (event) => {
		const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, otpLength);
		if (!pasted) {
			return;
		}

		event.preventDefault();
		const next = Array.from({ length: otpLength }, (_, idx) => pasted[idx] || "");
		setOtp(next);

		const focusIndex = Math.min(pasted.length, otpLength - 1);
		otpInputRefs.current[focusIndex]?.focus();
	};

	const handleOtpKeyDown = (index, event) => {
		if (event.key === "Backspace" && !otp[index] && index > 0) {
			otpInputRefs.current[index - 1]?.focus();
		}
	};

	const handleVerify = useCallback(async () => {
		if (isVerifying) {
			return;
		}

		if (!otpValid) {
			setStatusMessage("error", "Enter all 6 digits.");
			return;
		}

		if (!confirmationResult) {
			setStatusMessage("error", "Please request a new OTP and try again.");
			return;
		}

		setIsVerifying(true);
		setStatusMessage("info", "Verifying OTP...");

		try {
			const credential = await verifyOtp(confirmationResult, otpCode);
			const firebaseUser = credential.user;
			const idToken = await firebaseUser.getIdToken();

			const backend = await sendIdTokenToBackend(
				idToken,
				{},
				{ timeoutMs: 10000 }
			);
			saveSession({ token: idToken, user: backend || null });
			router.push("/chat");
		} catch (error) {
			setStatusMessage("error", getFriendlyPhoneAuthError(error));
		} finally {
			setIsVerifying(false);
		}
	}, [confirmationResult, isVerifying, otpCode, otpValid, router]);

	useEffect(() => {
		if (step !== "otp") {
			return;
		}

		const firstEmptyIndex = otp.findIndex((digit) => !digit);
		const focusIndex = firstEmptyIndex === -1 ? otpLength - 1 : firstEmptyIndex;
		otpInputRefs.current[focusIndex]?.focus();
	}, [step, otp]);

	useEffect(() => {
		if (step !== "otp" || !otpValid || isVerifying || !confirmationResult) {
			return;
		}

		handleVerify();
	}, [step, otpValid, isVerifying, confirmationResult, handleVerify]);

		useEffect(() => {
			if (step !== "emailOtp") {
				return;
			}

			const firstEmptyIndex = emailOtp.findIndex((digit) => !digit);
			const focusIndex = firstEmptyIndex === -1 ? otpLength - 1 : firstEmptyIndex;
			emailOtpInputRefs.current[focusIndex]?.focus();
		}, [step, emailOtp]);

		useEffect(() => {
			if (step !== "emailOtp" || !emailOtpValid || isVerifyingEmailOtp) {
				return;
			}

			handleVerifyEmailOtp();
		}, [step, emailOtpValid, isVerifyingEmailOtp, handleVerifyEmailOtp]);

	const handleEditNumber = () => {
		setStep("phone");
		setOtp(Array.from({ length: otpLength }, () => ""));
		setConfirmationResult(null);
		setStatusMessage("", "");
	};

	const handleEditEmail = () => {
		setStep("email");
		setEmailOtp(Array.from({ length: otpLength }, () => ""));
		setStatusMessage("", "");
	};

	const handleResend = async () => {
		if (!phoneValid) {
			setStatusMessage("error", "Invalid phone number. Please edit and try again.");
			return;
		}

		clearRecaptcha();
		setIsResending(true);
		setOtp(Array.from({ length: otpLength }, () => ""));
		setStatusMessage("info", `Resending code to ${fullPhoneNumber}...`);

		try {
			const result = await sendOtp(fullPhoneNumber);
			setConfirmationResult(result);
			setStatusMessage("success", `New OTP sent to ${fullPhoneNumber}.`);
		} catch (error) {
			setStatusMessage("error", getFriendlyPhoneAuthError(error));
		} finally {
			setIsResending(false);
		}
	};

	const statusTextClassName =
		status.type === "error"
			? "text-red-600"
			: status.type === "success"
				? "text-green-700"
				: "text-[#111b21]/80";

	return (
		<main className="flex min-h-screen flex-col items-center bg-[#FCF5EB] px-6 py-10 text-black sm:px-10 lg:px-32">
			<section className="w-full max-w-6xl rounded-4xl border border-black bg-[#ffffff] px-6 py-12 sm:px-10 sm:py-14">
				<div className="mx-auto w-full max-w-xl text-center">
					{step === "method" && (
						<>
							<h1 className="text-4xl tracking-tight">Login to Procomm Web</h1>
							<p className="mt-3 text-sm text-[#111b21]/90">Choose how you want to log in</p>

							<div className="mt-9 flex flex-col space-y-3">
								<button
									type="button"
									onClick={() => {
										setStep("quick");
										setStatusMessage("", "");
									}}
									className="mx-auto inline-flex h-12 w-full max-w-md items-center justify-center rounded-full bg-[#25d366] px-7 text-lg font-medium text-[#111b21] transition hover:bg-[#20bf5d]"
								>
									Quick Test Login
								</button>
								<button
									type="button"
									onClick={() => {
										setStep("phone");
										setStatusMessage("", "");
									}}
									className="mx-auto inline-flex h-12 w-full max-w-md items-center justify-center rounded-full border-2 border-[#25d366] bg-white px-7 text-lg font-medium text-[#111b21] transition hover:bg-[#f0f2f5]"
								>
									Phone with OTP
								</button>
								<button
									type="button"
									onClick={() => {
										setStep("email");
										setStatusMessage("", "");
									}}
									className="mx-auto inline-flex h-12 w-full max-w-md items-center justify-center rounded-full border-2 border-[#111b21] bg-white px-7 text-lg font-medium text-[#111b21] transition hover:bg-[#f0f2f5]"
								>
									Email with OTP
								</button>
								<button
									type="button"
									onClick={handleGoogleLogin}
									disabled={isContinuing}
									className="mx-auto inline-flex h-12 w-full max-w-md items-center justify-center rounded-full border border-black/20 bg-white px-7 text-lg font-medium text-[#111b21] transition hover:bg-[#f0f2f5] disabled:cursor-not-allowed disabled:opacity-70"
								>
									{isContinuing ? "Please wait..." : "Continue with Google"}
								</button>
							</div>
						</>
					)}

					{step === "email" && (
						<>
							<h1 className="text-4xl tracking-tight">Email login with OTP</h1>
							<p className="mt-3 text-sm text-[#111b21]/90">Enter your email and we will send a 6-digit code.</p>

							<div className="mx-auto mt-9 w-full max-w-md space-y-4 text-left">
								<div>
									<label className="mb-2 block text-sm font-semibold text-[#111b21]">Email</label>
									<input
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										placeholder="name@example.com"
										type="email"
										className="h-14 w-full rounded-2xl border border-black/45 bg-[#ffffff] px-5 text-lg outline-none focus:border-[#25d366]"
									/>
								</div>
								<div>
									<label className="mb-2 block text-sm font-semibold text-[#111b21]">Name (optional)</label>
									<input
										value={emailName}
										onChange={(event) => setEmailName(event.target.value)}
										placeholder="Your name"
										className="h-14 w-full rounded-2xl border border-black/45 bg-[#ffffff] px-5 text-lg outline-none focus:border-[#25d366]"
									/>
								</div>
							</div>

							<div className="mt-10 flex flex-col gap-3">
								<button
									type="button"
									onClick={handleSendEmailOtp}
									disabled={!emailValid || isSendingEmailOtp}
									className="mx-auto inline-flex h-12 items-center justify-center rounded-full bg-[#25d366] px-8 text-lg font-medium text-[#111b21] transition hover:bg-[#20bf5d] disabled:cursor-not-allowed disabled:bg-[#98e7bb]"
								>
									{isSendingEmailOtp ? "Sending OTP..." : "Send OTP"}
								</button>
								<button
									type="button"
									onClick={() => setStep("method")}
									className="mx-auto text-[1rem] text-[#111b21]/80 underline underline-offset-4"
								>
									Back
								</button>
							</div>
						</>
					)}

					{step === "emailOtp" && (
						<>
							<h1 className="text-4xl tracking-tight">Enter email verification code</h1>
							<p className="mt-3 text-sm text-[#111b21]/90">Code sent to {email.trim().toLowerCase()}</p>

							<div className="mt-8 flex justify-center gap-2 sm:gap-3">
								{emailOtp.map((digit, index) => (
									<input
										key={index}
										ref={(element) => {
											emailOtpInputRefs.current[index] = element;
										}}
										value={digit}
										onChange={(event) => handleEmailOtpChange(index, event.target.value)}
										onKeyDown={(event) => handleEmailOtpKeyDown(index, event)}
										onPaste={handleEmailOtpPaste}
										inputMode="numeric"
										autoComplete={index === 0 ? "one-time-code" : "off"}
										maxLength={1}
										className="h-14 w-12 rounded-2xl border border-black/40 bg-[#f0f2f5] text-center text-3xl outline-none focus:border-[#25d366] sm:h-16 sm:w-14"
									/>
								))}
							</div>

							<button
								type="button"
								onClick={handleVerifyEmailOtp}
								disabled={!emailOtpValid || isVerifyingEmailOtp}
								className="mx-auto mt-10 inline-flex h-12 items-center justify-center rounded-full bg-[#25d366] px-8 text-lg font-medium text-[#111b21] transition hover:bg-[#20bf5d] disabled:cursor-not-allowed disabled:bg-[#98e7bb]"
							>
								{isVerifyingEmailOtp ? "Verifying..." : "Verify"}
							</button>

							<div className="mt-6 flex justify-center gap-6">
								<button
									type="button"
									onClick={handleEditEmail}
									className="text-[1rem] text-[#111b21]/80 underline underline-offset-4"
								>
									Edit email
								</button>
								<button
									type="button"
									onClick={handleSendEmailOtp}
									disabled={isSendingEmailOtp || isVerifyingEmailOtp}
									className="text-[1rem] text-[#111b21]/80 underline underline-offset-4"
								>
									{isSendingEmailOtp ? "Resending..." : "Resend code"}
								</button>
							</div>
						</>
					)}

					{step === "quick" && (
						<>
							<h1 className="text-4xl tracking-tight">Test Login</h1>
							<p className="mt-3 text-sm text-[#111b21]/90">Use a test phone number</p>

							<div className="mt-9 space-y-4 text-left">
								<div className="mx-auto w-full max-w-md">
									<label className="mb-2 block text-sm font-semibold text-[#111b21]">Phone Number</label>
									<input
										value={quickPhone}
										onChange={(event) => setQuickPhone(event.target.value)}
										placeholder="+10000000001"
										className="h-14 w-full rounded-2xl border border-black/45 bg-[#ffffff] px-5 text-2xl outline-none focus:border-[#25d366]"
									/>
									<p className="mt-2 text-xs text-[#111b21]/65">
										Try: <strong>+10000000001</strong> (Ava) or <strong>+10000000002</strong> (Jordan)
									</p>
								</div>
							</div>

							<div className="mt-10 flex flex-col gap-3">
								<button
									type="button"
									onClick={handleQuickLogin}
									disabled={isContinuing}
									className="mx-auto inline-flex h-12 items-center justify-center rounded-full bg-[#25d366] px-8 text-lg font-medium text-[#111b21] transition hover:bg-[#20bf5d] disabled:cursor-not-allowed disabled:bg-[#98e7bb]"
								>
									{isContinuing ? "Logging in..." : "Login"}
								</button>
								<button
									type="button"
									onClick={() => setStep("method")}
									className="mx-auto text-[1rem] text-[#111b21]/80 underline underline-offset-4"
								>
									Back
								</button>
							</div>
						</>
					)}

					{step === "phone" && (
						<>
							<h1 className="text-4xl tracking-tight">Enter phone number</h1>
							<p className="mt-3 text-sm text-[#111b21]/90">Select a country and enter your phone number.</p>

							<div className="mt-9 space-y-4 text-left">
								<div className="mx-auto w-full max-w-md">
									<CountryPicker value={countryCode} onChange={setCountryCode} />
								</div>

								<div className="mx-auto flex h-14 w-full max-w-md items-center rounded-4xl border border-black/45 bg-[#ffffff] px-5">
									<span className="mr-3 text-2xl text-[#111b21]">{selectedDialCode}</span>
									<input
										id="phone"
										value={phone}
										onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))}
										placeholder="9876.."
										inputMode="numeric"
										className="w-full bg-transparent text-2xl outline-none placeholder:text-[#111b21]/45"
									/>
								</div>
							</div>

							<div className="flex flex-col">
								<button
									type="button"
									onClick={handleContinue}
									disabled={!phoneValid || isContinuing || isVerifying || isResending}
									className="mx-auto mt-10 inline-flex h-12 items-center justify-center rounded-full bg-[#37C572] px-7 text-lg font-medium text-[#111b21] transition hover:bg-[#37C572] disabled:cursor-not-allowed disabled:bg-[#98e7bb]"
								>
									{isContinuing ? "Sending OTP..." : "Continue"}
								</button>
							</div>
						</>
					)}

					{step === "otp" && (
						<>
							<h1 className="text-4xl tracking-tight">Enter verification code</h1>
							<p className="mt-3 text-sm text-[#111b21]/90">Code sent to {fullPhoneNumber}</p>

							<div className="mt-8 flex justify-center gap-2 sm:gap-3">
								{otp.map((digit, index) => (
									<input
										key={index}
										id={`otp-${index}`}
										ref={(element) => {
											otpInputRefs.current[index] = element;
										}}
										value={digit}
										onChange={(event) => handleOtpChange(index, event.target.value)}
										onKeyDown={(event) => handleOtpKeyDown(index, event)}
										onPaste={handleOtpPaste}
										inputMode="numeric"
										autoComplete={index === 0 ? "one-time-code" : "off"}
										maxLength={1}
										className="h-14 w-12 rounded-2xl border border-black/40 bg-[#f0f2f5] text-center text-3xl outline-none focus:border-[#25d366] sm:h-16 sm:w-14"
									/>
								))}
							</div>

							<button
								type="button"
								onClick={handleVerify}
								disabled={!otpValid || isVerifying}
								className="mx-auto mt-10 inline-flex h-12 items-center justify-center rounded-full bg-[#25d366] px-8 text-lg font-medium text-[#111b21] transition hover:bg-[#20bf5d] disabled:cursor-not-allowed disabled:bg-[#98e7bb]"
							>
								{isVerifying ? "Verifying..." : "Verify"}
							</button>

							<div className="mt-6 flex justify-center gap-6">
								<button
									type="button"
									onClick={handleEditNumber}
									className="text-[1rem] text-[#111b21]/80 underline underline-offset-4"
								>
									Edit number
								</button>
								<button
									type="button"
									onClick={handleResend}
									disabled={isResending || isVerifying || isContinuing}
									className="text-[1rem] text-[#111b21]/80 underline underline-offset-4"
								>
									{isResending ? "Resending..." : "Resend code"}
								</button>
							</div>
						</>
					)}

					{status.message ? <p className={`mt-4 text-sm ${statusTextClassName}`}>{status.message}</p> : null}
					<div id="recaptcha-container" />
				</div>
			</section>
		</main>
	);
}
