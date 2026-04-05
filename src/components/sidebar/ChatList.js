"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/common/Avatar";
import { getAllUsers } from "@/services/api";

function formatLastSeen(dateValue) {
	if (!dateValue) {
		return "";
	}

	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

function getPresenceForUser(presenceByUserId, userId) {
	return presenceByUserId?.[String(userId)] || null;
}

function isOnline(lastSeenAt, presence) {
	void lastSeenAt;
	return Boolean(presence?.online);
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

function getContactDisplay(user) {
	const phone = String(user?.phoneNumber || "").trim();
	if (phone) {
		return phone;
	}

	const maskedEmail = toMaskedEmail(user?.email);
	if (maskedEmail) {
		return maskedEmail;
	}

	return "No contact";
}

function getSecurityLabel(user) {
	const provider = String(user?.authProvider || "").toLowerCase();
	if (provider === "google" || provider === "email") {
		return "Email";
	}
	if (provider === "phone") {
		return "Phone";
	}
	return "Unknown";
}

export default function ChatList({
	chats,
	selectedChatId,
	onSelectChat,
	onStartChat,
	onStartChatWithUser,
	onOpenProfile,
	onLogout,
	isLoading,
	me,
	presenceByUserId,
	unreadByChat = {},
}) {
	const [query, setQuery] = useState("");
	const [startingUserId, setStartingUserId] = useState("");
	const [showUserPicker, setShowUserPicker] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const [mobileTab, setMobileTab] = useState("chats");

	const { data: usersData, isLoading: isUsersLoading } = useQuery({
		queryKey: ["sidebar-users"],
		queryFn: () => getAllUsers(30, 0),
		retry: 1,
	});

	const availableContacts = useMemo(() => {
		const all = Array.isArray(usersData?.users) ? usersData.users : [];
		return all.filter((user) => String(user._id) !== String(me?._id));
	}, [usersData, me?._id]);

	const filteredContacts = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return availableContacts;
		}

		return availableContacts.filter((user) => {
			const target = `${user.name || ""} ${user.phoneNumber || ""} ${user.email || ""}`.toLowerCase();
			return target.includes(q);
		});
	}, [availableContacts, query]);

	const filteredChats = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return chats;
		}

		return chats.filter((chat) => {
			const target = `${chat.otherUser?.name || ""} ${chat.lastMessage || ""}`.toLowerCase();
			return target.includes(q);
		});
	}, [chats, query]);

	const uniqueFilteredContacts = useMemo(() => {
		if (!query.trim()) {
			return filteredContacts;
		}

		const chatUserIds = new Set(filteredChats.map((chat) => String(chat.otherUser?._id)));
		return filteredContacts.filter((user) => !chatUserIds.has(String(user._id)));
	}, [filteredContacts, filteredChats, query]);

	const displayedChats = useMemo(() => {
		if (filteredChats.length > 0) {
			return filteredChats;
		}

		return chats;
	}, [filteredChats, chats]);

	const handleContactClick = async (userId) => {
		if (!userId || !onStartChatWithUser) {
			return;
		}

		setStartingUserId(userId);
		try {
			await onStartChatWithUser(userId);
			setShowUserPicker(false);
			setQuery("");
		} finally {
			setStartingUserId("");
		}
	};

	const getOnlineState = (user) => {
		const presence = getPresenceForUser(presenceByUserId, user?._id);
		return isOnline(user?.lastSeenAt, presence);
	};

	return (
		<aside className="flex h-full w-full shrink-0 flex-col border-r border-black/10 bg-[#f8fbf7] md:w-90 lg:w-105">
			<header className="flex items-center justify-between border-b border-black/10 bg-[#f0f2f5] px-4 py-3">
				<h1 className="text-lg font-bold text-[#00a884]">PROCOMM</h1>
				<div className="relative">
					<button
						type="button"
						onClick={() => setShowMenu((prev) => !prev)}
						className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/10"
						title="Menu"
					>
						<svg className="h-6 w-6 text-[#667781]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>

					{showMenu && (
						<>
							<div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
							<div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-black/10 bg-white shadow-lg">
								<button
									type="button"
									onClick={() => {
										onOpenProfile?.();
										setShowMenu(false);
									}}
									className="mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-lg border-b border-black/5 px-4 py-3 text-left transition hover:bg-[#f8f9fa]"
								>
									<span className="text-sm font-semibold text-[#111b21]">Profile</span>
								</button>
								<button
									type="button"
									onClick={() => setShowMenu(false)}
									className="mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-lg border-b border-black/5 px-4 py-3 text-left transition hover:bg-[#f8f9fa]"
								>
									<span className="text-sm font-semibold text-[#111b21]">Help</span>
								</button>
								<button
									type="button"
									onClick={() => setShowMenu(false)}
									className="mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-lg border-b border-black/5 px-4 py-3 text-left transition hover:bg-[#f8f9fa]"
								>
									<span className="text-sm font-semibold text-[#111b21]">Settings</span>
								</button>
								<div className="my-1 border-t border-black/10" />
								<button
									type="button"
									onClick={() => {
										setShowMenu(false);
										onLogout?.();
									}}
									className="mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-lg px-4 py-3 text-left text-red-600 transition hover:bg-[#ffebee]"
								>
									<span className="text-sm font-semibold">Logout</span>
								</button>
							</div>
						</>
					)}
				</div>
			</header>

			<div className="border-b border-black/10 bg-[#f0f2f5] px-3 pb-3">
				<div className="flex gap-2">
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search or start new chat"
						className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111b21] outline-none focus:border-[#00a884]"
					/>
					<button
						type="button"
						onClick={() => setShowUserPicker((prev) => !prev)}
						className="rounded-lg bg-[#00a884] px-3 py-2 text-sm font-semibold text-white hover:bg-[#008f72]"
					>
						{showUserPicker ? "Close" : "New"}
					</button>
				</div>
			</div>

			<div className="recent-chats-scroll min-h-0 flex-1 overflow-y-auto bg-white pb-20 md:pb-0">
				{mobileTab === "calls" && (
					<div className="px-4 py-8 md:hidden">
						<div className="rounded-2xl border border-black/10 bg-[#f8fbf7] p-4">
							<p className="text-sm font-semibold text-[#111b21]">Calls</p>
							<p className="mt-2 text-sm text-[#667781]">Calling features are coming soon.</p>
						</div>
					</div>
				)}

				{mobileTab === "profile" && (
					<div className="px-4 py-8 md:hidden">
						<div className="rounded-2xl border border-black/10 bg-[#f8fbf7] p-4">
							<p className="text-sm font-semibold text-[#111b21]">Profile</p>
							<p className="mt-2 text-sm text-[#667781]">Open your profile page from the button below.</p>
							<button
								type="button"
								onClick={onOpenProfile}
								className="mt-3 rounded-full bg-[#00a884] px-4 py-2 text-sm font-semibold text-white hover:bg-[#008f72]"
							>
								Go to profile
							</button>
						</div>
					</div>
				)}

				{mobileTab === "chats" && (
					<>
						{query.trim() && (
							<>
								{filteredChats.length > 0 && (
									<>
										<p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#667781]">Recent Chats</p>
										{filteredChats.map((chat) => {
											const isActive = chat._id === selectedChatId;
											const name = chat.otherUser?.name || "Unknown";
											const unreadCount = unreadByChat[String(chat._id)] || 0;

											return (
												<button
													key={chat._id}
													type="button"
													onClick={() => onSelectChat(chat._id)}
													className={`flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left transition ${
														isActive ? "bg-[#f0f2f5]" : "hover:bg-[#f8f9fa]"
													}`}
												>
													<Avatar name={name} src={chat.otherUser?.profilePic} size={48} online={getOnlineState(chat.otherUser)} />
													<div className="min-w-0 flex-1">
														<div className="flex items-center justify-between gap-2">
															<div className="flex items-center gap-1">
																<p className="truncate text-sm font-semibold text-[#111b21]">{name}</p>
																{unreadCount > 0 && (
																	<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00a884] px-1 text-[11px] font-semibold text-white">
																		{unreadCount > 99 ? "99+" : unreadCount}
																	</span>
																)}
															</div>
															<span className="text-[11px] text-[#667781]">{formatLastSeen(chat.lastMessageAt)}</span>
														</div>
														<p className="truncate text-sm text-[#667781]">{chat.lastMessage || "Tap to start chatting"}</p>
													</div>
												</button>
											);
										})}
									</>
								)}

								{!isUsersLoading && uniqueFilteredContacts.length > 0 && (
									<>
										<p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#667781]">All Users</p>
										{uniqueFilteredContacts.map((user) => (
											<button
												key={user._id}
												type="button"
												onClick={() => handleContactClick(user._id)}
												disabled={startingUserId === user._id}
												className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left transition hover:bg-[#f8f9fa] disabled:opacity-70"
											>
												<Avatar name={user.name} src={user.profilePic} size={48} online={getOnlineState(user)} />
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-semibold text-[#111b21]">{user.name}</p>
													<p className="truncate text-xs text-[#667781]">{getContactDisplay(user)}</p>
												</div>
												<span className="text-xs font-medium text-[#00a884]">{startingUserId === user._id ? "Opening..." : "Chat"}</span>
											</button>
										))}
									</>
								)}

								{filteredChats.length === 0 && uniqueFilteredContacts.length === 0 && (
									<p className="px-4 py-6 text-sm text-[#667781]">No results found.</p>
								)}
							</>
						)}

						{!query.trim() && (
							<>
								{showUserPicker && (
									<>
										{isUsersLoading && <p className="px-4 py-6 text-sm text-[#667781]">Loading users...</p>}
										{!isUsersLoading && availableContacts.length === 0 && <p className="px-4 py-6 text-sm text-[#667781]">No users found.</p>}
										{!isUsersLoading && availableContacts.length > 0 && (
											<>
												<p className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#667781]">All Users</p>
												{availableContacts.map((user) => (
													<button
														key={user._id}
														type="button"
														onClick={() => handleContactClick(user._id)}
														disabled={startingUserId === user._id}
														className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left transition hover:bg-[#f8f9fa] disabled:opacity-70"
													>
														<Avatar name={user.name} src={user.profilePic} size={48} online={getOnlineState(user)} />
														<div className="min-w-0 flex-1">
															<p className="truncate text-sm font-semibold text-[#111b21]">{user.name}</p>
															<p className="truncate text-xs text-[#667781]">{getContactDisplay(user)}</p>
														</div>
														<span className="text-xs font-medium text-[#00a884]">{startingUserId === user._id ? "Opening..." : "Chat"}</span>
													</button>
												))}
											</>
										)}
									</>
								)}

								{!showUserPicker && (
									<>
										{isLoading && <p className="px-4 py-6 text-sm text-[#667781]">Loading chats...</p>}
										{!isLoading && chats.length === 0 && (
											<div className="px-4 py-4">
												<p className="pb-3 text-sm text-[#667781]">No recent chats yet. Start with a contact.</p>
												{isUsersLoading && <p className="text-xs text-[#667781]">Loading contacts...</p>}
												{!isUsersLoading && availableContacts.length === 0 && <p className="text-xs text-[#667781]">No contacts available.</p>}
												{!isUsersLoading && availableContacts.length > 0 && (
													<div className="space-y-2">
														{availableContacts.map((user) => (
															<button
																key={user._id}
																type="button"
																onClick={() => handleContactClick(user._id)}
																disabled={startingUserId === user._id}
																className="flex w-full items-center gap-3 rounded-lg border border-black/10 px-3 py-2 text-left transition hover:bg-[#f8f9fa] disabled:opacity-70"
															>
																<Avatar name={user.name} src={user.profilePic} size={40} online={getOnlineState(user)} />
																<div className="min-w-0 flex-1">
																	<p className="truncate text-sm font-semibold text-[#111b21]">{user.name}</p>
																	<p className="truncate text-xs text-[#667781]">{getContactDisplay(user)}</p>
																</div>
																<span className="text-xs font-medium text-[#00a884]">{startingUserId === user._id ? "Opening..." : "Chat"}</span>
															</button>
														))}
													</div>
												)}
										</div>
									)}

									{displayedChats.length > 0 && <p className="mb-1 px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#667781]">Recent Chats</p>}

									{displayedChats.map((chat) => {
										const isActive = chat._id === selectedChatId;
										const name = chat.otherUser?.name || "Unknown";
										const unreadCount = unreadByChat[String(chat._id)] || 0;

										return (
											<button
												key={chat._id}
												type="button"
												onClick={() => onSelectChat(chat._id)}
												className={`flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left transition ${isActive ? "bg-[#f0f2f5]" : "hover:bg-[#f8f9fa]"}`}
											>
												<Avatar name={name} src={chat.otherUser?.profilePic} size={48} online={getOnlineState(chat.otherUser)} />
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-2">
														<div className="flex items-center gap-1">
															<p className="truncate text-sm font-semibold text-[#111b21]">{name}</p>
															{unreadCount > 0 && (
																<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00a884] px-1 text-[11px] font-semibold text-white">
																	{unreadCount > 99 ? "99+" : unreadCount}
																</span>
															)}
														</div>
														<span className="text-[11px] text-[#667781]">{formatLastSeen(chat.lastMessageAt)}</span>
													</div>
													<p className="truncate text-sm text-[#667781]">{chat.lastMessage || "Tap to start chatting"}</p>
												</div>
											</button>
										);
									})}
								</>
							)}
						</>
					)}
				</>
				)}
			</div>

			<footer className="hidden border-t border-black/10 bg-[#f0f2f5] px-4 py-3 md:block">
				<button type="button" onClick={onOpenProfile} className="flex w-full cursor-pointer items-center gap-3 pb-0.75 text-left">
					<Avatar name={me?.name || "You"} src={me?.profilePic} size={40} online={getOnlineState(me)} />
					<div>
						<p className="text-sm font-semibold text-[#111b21]">{me?.name || "My Profile"}</p>
						<p className="text-xs text-[#667781]">{getContactDisplay(me)}</p>
						<p className="text-[11px] text-[#00a884]">{getSecurityLabel(me)}</p>
					</div>
				</button>
			</footer>

			<nav className="border-t border-black/10 bg-white px-2 py-2 md:hidden">
				<div className="grid grid-cols-3 gap-2">
					<button type="button" onClick={() => setMobileTab("chats")} className={`flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition ${mobileTab === "chats" ? "bg-[#e9fffa] text-[#00a884]" : "text-[#667781] hover:bg-black/5"}`}>
						<span>Chats</span>
					</button>
					<button type="button" onClick={() => setMobileTab("calls")} className={`flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition ${mobileTab === "calls" ? "bg-[#e9fffa] text-[#00a884]" : "text-[#667781] hover:bg-black/5"}`}>
						<span>Calls</span>
					</button>
					<button type="button" onClick={() => setMobileTab("profile")} className={`flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition ${mobileTab === "profile" ? "bg-[#e9fffa] text-[#00a884]" : "text-[#667781] hover:bg-black/5"}`}>
						<span>Profile</span>
					</button>
				</div>
			</nav>
		</aside>
	);
}