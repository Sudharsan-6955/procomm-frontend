"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile, updateMyProfile } from "@/services/api";
import { clearSession, clearPushToken, getPushToken, getSessionToken, getSessionUser } from "@/lib/session";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Avatar from "@/components/common/Avatar";
import { unregisterPushToken } from "@/services/api";

function isOnline(lastSeenAt) {
	if (!lastSeenAt) {
		return false;
	}

	const timestamp = new Date(lastSeenAt).getTime();
	if (Number.isNaN(timestamp)) {
		return false;
	}

	return Date.now() - timestamp < 2 * 60 * 1000;
}

function toMaskedEmail(emailValue) {
	const email = String(emailValue || "").trim().toLowerCase();
	if (!email.includes("@")) {
		return "";
	}

	const [local, domain] = email.split("@");
	if (!local || !domain) {
		return "";
	}

	if (email.length <= 24) {
		return email;
	}

	const localHead = local.slice(0, Math.min(6, local.length));
	return `${localHead}..${domain}`;
}

function getContactDisplay(profile) {
	const phone = String(profile?.phoneNumber || "").trim();
	if (phone) {
		return phone;
	}

	const maskedEmail = toMaskedEmail(profile?.email);
	if (maskedEmail) {
		return maskedEmail;
	}

	return "No contact";
}

function getSecurityLabel(profile) {
	const provider = String(profile?.authProvider || "").toLowerCase();
	if (provider === "google" || provider === "email") {
		return "Email";
	}
	if (provider === "phone") {
		return "Phone";
	}
	return "Unknown";
}

export default function ProfilePage() {
	const router = useRouter();
	const [editMode, setEditMode] = useState(false);
	const [editedName, setEditedName] = useState("");
	const [editedAbout, setEditedAbout] = useState("");
	const [editedSocial, setEditedSocial] = useState({
		instagram: "",
		facebook: "",
		github: "",
		linkedin: "",
	});
	const [editingSocial, setEditingSocial] = useState(null);
	const [tempSocialValue, setTempSocialValue] = useState("");
	const [isHydrated, setIsHydrated] = useState(false);
	const [hasSession, setHasSession] = useState(false);
	const [sessionUserId, setSessionUserId] = useState(null);
	const [saveState, setSaveState] = useState({ loading: false, error: null, success: false });

	useEffect(() => {
		setIsHydrated(true);
		const token = getSessionToken();
		const sessionUser = getSessionUser();
		setHasSession(Boolean(token));
		setSessionUserId(sessionUser?._id || null);
	}, []);

	useEffect(() => {
		if (isHydrated && !hasSession) {
			router.replace("/auth/login");
		}
	}, [hasSession, isHydrated, router]);

	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ["profile", sessionUserId],
		queryFn: getMyProfile,
		enabled: isHydrated && hasSession,
		retry: 1,
	});

	useEffect(() => {
		if (profile?.name) {
			setEditedName(profile.name);
			setEditedAbout(profile.about || "");
			setEditedSocial({
				instagram: profile.instagram || "",
				facebook: profile.facebook || "",
				github: profile.github || "",
				linkedin: profile.linkedin || "",
			});
		}
	}, [profile]);

	const handleLogout = async () => {
		try {
			const pushToken = getPushToken();
			if (pushToken) {
				try {
					await unregisterPushToken(pushToken);
				} catch (error) {
					console.warn("Push token unregister skipped:", error?.message || error);
				}
			}
			clearPushToken();
			await signOut(auth);
		} catch (error) {
			// Phone-login sessions may not have Firebase auth state.
			console.warn("Firebase logout skipped:", error?.message || error);
		} finally {
			clearSession();
			router.push("/auth/login");
		}
	};

	const handleUpdateProfile = async () => {
		if (!editedName.trim()) {
			setSaveState({ loading: false, error: "Name is required", success: false });
			return;
		}

		setSaveState({ loading: true, error: null, success: false });

		try {
			await updateMyProfile({
				name: editedName,
				about: editedAbout,
				instagram: editedSocial.instagram,
				facebook: editedSocial.facebook,
				github: editedSocial.github,
				linkedin: editedSocial.linkedin,
			});
			setSaveState({ loading: false, error: null, success: true });
			setEditMode(false);
			setTimeout(() => setSaveState({ loading: false, error: null, success: false }), 3000);
		} catch (error) {
			console.error("Update profile error:", error);
			setSaveState({ loading: false, error: "Failed to save profile", success: false });
		}
	};

	const handleSocialEdit = (platform) => {
		setEditingSocial(platform);
		setTempSocialValue(editedSocial[platform] || "");
	};

	const handleSocialSave = () => {
		if (editingSocial) {
			setEditedSocial({
				...editedSocial,
				[editingSocial]: tempSocialValue,
			});
		}
		setEditingSocial(null);
		setTempSocialValue("");
	};

	const handleSocialRemove = (platform) => {
		setEditedSocial({
			...editedSocial,
			[platform]: "",
		});
	};

	const socialPlatforms = [
		{ id: "instagram", name: "Instagram", tone: "text-pink-600" },
		{ id: "facebook", name: "Facebook", tone: "text-blue-600" },
		{ id: "github", name: "GitHub", tone: "text-[#111b21]" },
		{ id: "linkedin", name: "LinkedIn", tone: "text-blue-500" },
	];

	const renderSocialIcon = (platformId, className = "") => {
		if (platformId === "instagram") {
			return (
				<svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
				</svg>
			);
		}

		if (platformId === "facebook") {
			return (
				<svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
				</svg>
			);
		}

		if (platformId === "github") {
			return (
				<svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
				</svg>
			);
		}

		return (
			<svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.814 0-9.737h3.554v1.378c.43-.664 1.199-1.608 2.925-1.608 2.136 0 3.74 1.393 3.74 4.386v5.581zM5.337 8.855c-1.144 0-1.915-.761-1.915-1.715 0-.955.77-1.715 1.958-1.715 1.188 0 1.915.76 1.932 1.715 0 .954-.744 1.715-1.975 1.715zm1.946 11.597H3.392V9.167h3.891v11.285zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
			</svg>
		);
	};

	if (!isHydrated || !hasSession) {
		return <main className="min-h-screen bg-[#efeae2]" />;
	}

	return (
		<>
			<main className="fixed inset-0 bg-gray-200/90 backdrop-blur-sm overflow-y-auto">
				<div className="flex min-h-screen items-center justify-center p-4">
					<div className="w-full max-w-2xl rounded-3xl border border-white/30 bg-white/98 backdrop-blur-xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
					{profileLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00a884] border-t-transparent" />
						</div>
					) : (
						<div>
							<button
								type="button"
								onClick={() => router.back()}
								className={`mb-6 flex items-center gap-2 rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition ${editMode ? "absolute top-4 left-4 p-1.5" : ""}`}
								title="Go back"
							>
								<svg className="h-5 w-5 text-[#111b21]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
								</svg>
							</button>

							<div className={`mb-8 flex items-start gap-6 ${editMode ? "items-center gap-3 mt-6" : ""}`}>
								<Avatar
									name={profile?.name}
									src={profile?.profilePic}
									size={editMode ? 80 : 120}
									online={isOnline(profile?.lastSeenAt)}
								/>
								<div className={editMode ? "flex-1 flex flex-col justify-center" : "flex-1"}>
									<h1 className={`font-bold text-[#111b21] ${editMode ? "text-lg" : "text-3xl"}`}>{profile?.name || "User"}</h1>
									<p className={`mt-2 text-sm font-medium text-[#667781] ${editMode ? "hidden" : ""}`}>{getContactDisplay(profile)}</p>
									{!editMode && <p className="mt-1 text-xs font-medium text-[#00a884]">{getSecurityLabel(profile)}</p>}
									{profile?.about && !editMode && (
										<p className="mt-3 text-sm text-[#111b21] italic">{profile.about}</p>
									)}
									<p className={`${editMode ? "mt-1" : "mt-3"} inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-[#00a884] bg-white/40 ${editMode ? "inline-flex" : ""}`}>
										<span className="inline-block h-2 w-2 rounded-full bg-[#00a884]" />
										{isOnline(profile?.lastSeenAt)
											? "Online now"
											: `Last seen: ${new Date(profile?.lastSeenAt).toLocaleDateString()}`}
									</p>

									{/* Social Media Links */}
									{!editMode && (
										<div className="mt-4 flex gap-2">
											{profile?.instagram && (
												<a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-3 py-1.5 text-pink-600 hover:bg-pink-50 transition" title="Instagram">
													<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
														<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
													</svg>
													<span className="text-xs font-semibold">Instagram</span>
												</a>
											)}
											{profile?.facebook && (
												<a href={`https://facebook.com/${profile.facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-3 py-1.5 text-blue-600 hover:bg-blue-50 transition" title="Facebook">
													<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
														<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
													</svg>
													<span className="text-xs font-semibold">Facebook</span>
												</a>
											)}
											{profile?.github && (
												<a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-3 py-1.5 text-gray-800 hover:bg-gray-100 transition" title="GitHub">
													<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
														<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
													</svg>
													<span className="text-xs font-semibold">GitHub</span>
												</a>
											)}
											{profile?.linkedin && (
												<a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-3 py-1.5 text-blue-500 hover:bg-blue-50 transition" title="LinkedIn">
													<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
														<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.814 0-9.737h3.554v1.378c.43-.664 1.199-1.608 2.925-1.608 2.136 0 3.74 1.393 3.74 4.386v5.581zM5.337 8.855c-1.144 0-1.915-.761-1.915-1.715 0-.955.77-1.715 1.958-1.715 1.188 0 1.915.76 1.932 1.715 0 .954-.744 1.715-1.975 1.715zm1.946 11.597H3.392V9.167h3.891v11.285zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
													</svg>
													<span className="text-xs font-semibold">LinkedIn</span>
												</a>
											)}
										</div>
									)}
								</div>
							</div>

							{!editMode && <hr className="my-8 border-gray-200" />}

							{!editMode && (
								<div className="flex gap-3">
									<button
										type="button"
										onClick={() => setEditMode(true)}
										className="flex-1 rounded-xl bg-[#00a884] px-6 py-3 font-bold text-white hover:bg-[#008f72] transition shadow-lg hover:shadow-xl"
									>
										Edit Profile
									</button>
									<button
										type="button"
										onClick={handleLogout}
										className="flex-1 rounded-xl bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-600 transition shadow-lg hover:shadow-xl"
									>
										Logout
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</main>

			{/* Edit Profile Modal */}
			{editMode && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/20 backdrop-blur-sm">
					<div className="w-full max-w-lg rounded-2xl border border-white/30 bg-white/98 backdrop-blur-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-lg font-bold text-[#111b21]">Edit Profile</h2>
							<button
								type="button"
								onClick={() => setEditMode(false)}
								className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 transition text-[#667781] hover:text-[#111b21]"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-semibold text-[#111b21] mb-2">Name</label>
								<input
									value={editedName}
									onChange={(e) => setEditedName(e.target.value)}
									className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111b21] outline-none focus:border-[#00a884] focus:bg-white focus:ring-2 focus:ring-[#00a884]/20 transition"
									placeholder="Enter your name"
								/>
							</div>

							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="block text-sm font-semibold text-[#111b21]">About</label>
									<span className="text-xs font-medium text-[#667781]">{editedAbout.length}/50</span>
								</div>
								<input
									type="text"
									value={editedAbout}
									onChange={(e) => {
										if (e.target.value.length <= 50) {
											setEditedAbout(e.target.value);
										}
									}}
									maxLength="50"
									className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111b21] outline-none focus:border-[#00a884] focus:bg-white focus:ring-2 focus:ring-[#00a884]/20 transition"
									placeholder="Tell us about yourself"
								/>
							</div>

							<div className="border-t border-gray-200 pt-4">
								<h3 className="text-sm font-bold text-[#111b21] mb-3">Social Media</h3>
								
								{/* Social Media Popup */}
								{editingSocial && (
									<div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/20 backdrop-blur-sm">
										<div className="w-full max-w-sm rounded-2xl border border-white/30 bg-white/98 backdrop-blur-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
											<div className="flex items-center justify-between mb-4">
												<p className="text-sm font-bold text-[#111b21]">
													{socialPlatforms.find(p => p.id === editingSocial)?.name} Profile Link
												</p>
												<button
													type="button"
													onClick={() => {
														setEditingSocial(null);
														setTempSocialValue("");
													}}
													className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 transition text-[#667781] hover:text-[#111b21]"
												>
													<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
											
											<div className="mb-4">
												<label className="block text-xs font-semibold text-[#667781] mb-2">Profile URL</label>
												<input
													type="text"
													value={tempSocialValue}
													onChange={(e) => setTempSocialValue(e.target.value)}
													placeholder="Enter your profile link"
													className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#111b21] outline-none focus:border-[#00a884] focus:bg-white focus:ring-2 focus:ring-[#00a884]/20 transition"
													autoFocus
												/>
											</div>
											
											<div className="flex gap-2">
												<button
													type="button"
													onClick={handleSocialSave}
													className="flex-1 rounded-lg bg-[#00a884] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#008f72] active:scale-95 shadow-md hover:shadow-lg"
												>
													Add
												</button>
												<button
													type="button"
													onClick={() => {
														setEditingSocial(null);
														setTempSocialValue("");
													}}
													className="flex-1 rounded-lg border-1.5 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#111b21] transition hover:bg-gray-50 active:scale-95"
												>
													Cancel
												</button>
											</div>
										</div>
									</div>
								)}

								<div className="flex flex-wrap items-center gap-2">
									{socialPlatforms.map((platform) => (
										<div key={platform.id} className="relative">
											<button
												type="button"
												onClick={() => handleSocialEdit(platform.id)}
												className={`group relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 hover:-translate-y-0.5 hover:scale-110 active:scale-95 ${
													editedSocial[platform.id]
														? "border-[#00a884] bg-[#ecfff9] shadow-lg"
														: "border-gray-200 bg-gray-50 hover:border-[#00a884]"
												}`}
												title={platform.name}
											>
												<span className={`${platform.tone} text-base`}>
													{renderSocialIcon(platform.id, "h-4 w-4 transition-transform duration-300 group-hover:rotate-12")}
												</span>
												{editedSocial[platform.id] ? (
													<span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#00a884] ring-2 ring-white" />
												) : null}
												<span className="pointer-events-none absolute -top-8 rounded-md bg-[#111b21] px-2 py-1 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 whitespace-nowrap">
													{platform.name}
												</span>
											</button>
											{editedSocial[platform.id] && (
												<button
													type="button"
													onClick={() => handleSocialRemove(platform.id)}
													className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition active:scale-90 shadow-md"
													title="Remove"
												>
													×
												</button>
											)}
										</div>
									))}
								</div>

								<div className="mt-3 flex flex-wrap gap-2">
									{socialPlatforms
										.filter((platform) => Boolean(editedSocial[platform.id]))
										.map((platform) => (
											<span
												key={`${platform.id}-value`}
												className="inline-flex items-center gap-2 rounded-full bg-[#ecfff9] px-2.5 py-1 text-xs font-medium text-[#00a884] border border-[#00a884]/30"
											>
												{platform.name}
												<button
													type="button"
													onClick={() => handleSocialRemove(platform.id)}
													className="ml-1 font-bold hover:text-red-500 transition"
												>
													×
												</button>
											</span>
										))}
								</div>
							</div>

							{saveState.error && (
								<div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium flex items-center gap-2">
									<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
									</svg>
									{saveState.error}
								</div>
							)}

							{saveState.success && (
								<div className="rounded-xl border border-[#00a884] bg-[#ecfff9] px-4 py-3 text-sm text-[#00a884] font-medium flex items-center gap-2">
									<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
									</svg>
									Profile saved successfully!
								</div>
							)}

							<div className="flex gap-2 pt-2">
								<button
									type="button"
									onClick={handleUpdateProfile}
									disabled={saveState.loading}
									className="flex-1 rounded-xl bg-[#00a884] px-4 py-2 font-bold text-sm text-white hover:bg-[#008f72] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
								>
									{saveState.loading ? (
										<span className="flex items-center justify-center gap-2">
											<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
											Saving...
										</span>
									) : (
										"Save Changes"
									)}
								</button>
								<button
									type="button"
									onClick={() => setEditMode(false)}
									disabled={saveState.loading}
									className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 font-bold text-sm text-[#111b21] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>

	);
}
