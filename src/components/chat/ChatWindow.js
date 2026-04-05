"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MessageInput from "./MessageInput";
import MessageItem from "./MessageItem";
import Avatar from "@/components/common/Avatar";

const RECENTLY_WINDOW_MS = 10 * 60 * 1000;

function formatLastSeen(dateValue) {
	if (!dateValue) {
		return "";
	}

	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	if (!Number.isNaN(diffMs) && diffMs >= 0 && diffMs < RECENTLY_WINDOW_MS) {
		return "last seen recently";
	}

	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
	const messageDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	const timeText = new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
	}).format(date);

	if (messageDayStart.getTime() === todayStart.getTime()) {
		return `last seen today at ${timeText}`;
	}

	if (messageDayStart.getTime() === yesterdayStart.getTime()) {
		return `last seen yesterday at ${timeText}`;
	}

	const dateText = new Intl.DateTimeFormat("en-US", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);

	return `last seen ${dateText} at ${timeText}`;
}

function formatDateAndTime(dateValue) {
	if (!dateValue) {
		return "";
	}

	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return new Intl.DateTimeFormat("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
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

function normalizeSocialUrl(platform, value) {
	const raw = String(value || "").trim();
	if (!raw) {
		return "";
	}

	if (/^https?:\/\//i.test(raw)) {
		return raw;
	}

	if (platform === "instagram") {
		return `https://instagram.com/${raw.replace(/^@/, "")}`;
	}

	if (platform === "facebook") {
		return `https://facebook.com/${raw.replace(/^@/, "")}`;
	}

	if (platform === "github") {
		return `https://github.com/${raw.replace(/^@/, "")}`;
	}

	return `https://linkedin.com/in/${raw.replace(/^@/, "")}`;
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

function getContactDisplay(person) {
	const phone = String(person?.phoneNumber || "").trim();
	if (phone) {
		return phone;
	}

	const maskedEmail = toMaskedEmail(person?.email);
	if (maskedEmail) {
		return maskedEmail;
	}

	return "No contact available";
}

function getSecurityLabel(person) {
	const provider = String(person?.authProvider || "").toLowerCase();
	if (provider === "google" || provider === "email") {
		return "Email";
	}
	if (provider === "phone") {
		return "Phone";
	}
	return "Unknown";
}

function toLocalDayKey(dateValue) {
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDayHeading(dateValue) {
	const date = new Date(dateValue);
	if (Number.isNaN(date.getTime())) {
		return "Unknown date";
	}

	const messageDayKey = toLocalDayKey(date);
	const now = new Date();
	const todayKey = toLocalDayKey(now);
	now.setDate(now.getDate() - 1);
	const yesterdayKey = toLocalDayKey(now);

	if (messageDayKey === todayKey) {
		return "Today";
	}

	if (messageDayKey === yesterdayKey) {
		return "Yesterday";
	}

	return new Intl.DateTimeFormat("en-US", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
}

export default function ChatWindow({
	selectedChat,
	initialUnreadCount = 0,
	messages,
	isLoading,
	onSendMessage,
	isSending,
	onEditMessage,
	onToggleFavorite,
	onTogglePin,
	onDeleteMessage,
	onBackToList,
	presenceByUserId,
	onChatOpened,
}) {
	const [showRightSidebar, setShowRightSidebar] = useState(false);
	const [activePinnedIndex, setActivePinnedIndex] = useState(0);
	const [highlightedMessageId, setHighlightedMessageId] = useState(null);
	const [showScrollToBottom, setShowScrollToBottom] = useState(false);
	const [hideUnreadDivider, setHideUnreadDivider] = useState(false);
	const messageViewportRef = useRef(null);
	const positionedChatIdRef = useRef(null);
	const previousLastMessageIdRef = useRef(null);
	const isNearBottomRef = useRef(true);
	const person = selectedChat?.otherUser || { name: "Unknown", phoneNumber: "", profilePic: "" };
	const aboutText = typeof person.about === "string" ? person.about.trim() : "";
	const pinnedMessages = useMemo(
		() => messages.filter((msg) => msg?.isPinned && !msg?.isDeletedForEveryone),
		[messages]
	);
	const activePinnedMessage = pinnedMessages[activePinnedIndex] || null;
	const peerPresence = getPresenceForUser(presenceByUserId, selectedChat?.otherUser?._id);
	const listItems = useMemo(() => {
		const items = [];
		let lastDayKey = "";
		const unreadCount = Number(initialUnreadCount) || 0;
		const shouldShowUnreadDivider = unreadCount > 0 && !hideUnreadDivider;

		let firstUnreadMessageId = null;
		if (shouldShowUnreadDivider) {
			const firstUnreadMessage = messages.find(
				(msg) =>
					!msg?.isMine &&
					(msg?.deliveryStatus?.status === "sent" || msg?.deliveryStatus?.status === "delivered")
			);

			if (firstUnreadMessage?._id) {
				firstUnreadMessageId = String(firstUnreadMessage._id);
			} else if (messages.length > 0) {
				const fallbackIndex = Math.max(messages.length - unreadCount, 0);
				const fallbackMessage = messages[fallbackIndex];
				if (fallbackMessage?._id) {
					firstUnreadMessageId = String(fallbackMessage._id);
				}
			}
		}

		for (const msg of messages) {
			if (firstUnreadMessageId && String(msg?._id) === firstUnreadMessageId) {
				items.push({
					type: "unread-separator",
					id: `unread-${selectedChat?._id || "chat"}`,
					label: "Unread messages",
				});
			}

			const createdAt = msg?.createdAt;
			const dayKey = toLocalDayKey(createdAt);

			if (dayKey && dayKey !== lastDayKey) {
				items.push({
					type: "day-separator",
					id: `day-${dayKey}`,
					label: formatDayHeading(createdAt),
				});
				lastDayKey = dayKey;
			}

			items.push({
				type: "message",
				id: String(msg._id),
				msg,
			});
		}

		return items;
	}, [messages, initialUnreadCount, hideUnreadDivider, selectedChat?._id]);

	useEffect(() => {
		if (pinnedMessages.length === 0) {
			setActivePinnedIndex(0);
			return;
		}

		if (activePinnedIndex > pinnedMessages.length - 1) {
			setActivePinnedIndex(pinnedMessages.length - 1);
		}
	}, [activePinnedIndex, pinnedMessages.length]);

	useEffect(() => {
		setHideUnreadDivider(false);
	}, [selectedChat?._id, initialUnreadCount]);

	useEffect(() => {
		if ((Number(initialUnreadCount) || 0) === 0) {
			setHideUnreadDivider(true);
		}
	}, [initialUnreadCount]);

	useEffect(() => {
		const selectedId = String(selectedChat?._id || "");
		if (!selectedId || isLoading || !messages.length) {
			return;
		}

		if (positionedChatIdRef.current === selectedId) {
			return;
		}

		const viewport = messageViewportRef.current;
		if (!viewport) {
			return;
		}

		const targetMessage = messages[messages.length - 1] || null;

		const messageId = targetMessage?._id;
		if (messageId) {
			const selector = `[data-message-id="${String(messageId)}"]`;
			const targetElement = viewport.querySelector(selector);
			if (targetElement) {
				targetElement.scrollIntoView({
					behavior: "auto",
					block: "end",
				});
			}
		}

		setShowScrollToBottom(false);

		positionedChatIdRef.current = selectedId;
		onChatOpened?.(selectedId);
	}, [selectedChat?._id, isLoading, messages, onChatOpened]);

	useEffect(() => {
		const viewport = messageViewportRef.current;
		if (!viewport) {
			return;
		}

		const updateScrollButtonVisibility = () => {
			const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
			isNearBottomRef.current = remaining <= 120;
			setShowScrollToBottom(remaining > 120);
		};

		updateScrollButtonVisibility();
		viewport.addEventListener("scroll", updateScrollButtonVisibility, { passive: true });

		return () => {
			viewport.removeEventListener("scroll", updateScrollButtonVisibility);
		};
	}, [selectedChat?._id, messages.length]);

	useEffect(() => {
		const viewport = messageViewportRef.current;
		if (!viewport || !messages.length) {
			return;
		}

		const lastMessage = messages[messages.length - 1];
		const lastMessageId = String(lastMessage?._id || "");
		if (!lastMessageId) {
			return;
		}

		const previousLastId = previousLastMessageIdRef.current;
		if (!previousLastId) {
			previousLastMessageIdRef.current = lastMessageId;
			return;
		}

		if (previousLastId === lastMessageId) {
			return;
		}

		const shouldFollowLatest = Boolean(lastMessage?.isMine) || isNearBottomRef.current;
		if (shouldFollowLatest) {
			viewport.scrollTo({
				top: viewport.scrollHeight,
				behavior: "smooth",
			});
		}

		previousLastMessageIdRef.current = lastMessageId;
	}, [messages]);

	const handleScrollToBottom = () => {
		const viewport = messageViewportRef.current;
		if (!viewport) {
			return;
		}

		viewport.scrollTo({
			top: viewport.scrollHeight,
			behavior: "smooth",
		});
	};

	const handleSend = (text) => {
		setHideUnreadDivider(true);
		onSendMessage?.(text);
	};

	const handleJumpToMessage = (messageId) => {
		const target = document.querySelector(`[data-message-id="${messageId}"]`);
		if (!target) {
			return;
		}

		target.scrollIntoView({ behavior: "smooth", block: "center" });
		setHighlightedMessageId(messageId);
		setTimeout(() => setHighlightedMessageId(null), 1200);
	};
	const socialLinks = [
		{ id: "instagram", label: "Instagram", href: normalizeSocialUrl("instagram", person.instagram) },
		{ id: "facebook", label: "Facebook", href: normalizeSocialUrl("facebook", person.facebook) },
		{ id: "github", label: "GitHub", href: normalizeSocialUrl("github", person.github) },
		{ id: "linkedin", label: "LinkedIn", href: normalizeSocialUrl("linkedin", person.linkedin) },
	].filter((item) => Boolean(item.href));

	if (!selectedChat) {
		return (
			<section className="grid h-full flex-1 place-items-center bg-[#f0efe8] px-6 text-center">
				<div>
					<h2 className="text-xl font-semibold text-[#111b21]">WhatsApp Web Style Workspace</h2>
					<p className="mt-2 text-sm text-[#667781]">Pick a conversation from the left panel to start messaging.</p>
					{onBackToList && (
						<button
							type="button"
							onClick={onBackToList}
							className="mt-4 rounded-full bg-[#00a884] px-4 py-2 text-sm font-semibold text-white md:hidden"
						>
							Back to chats
						</button>
					)}
				</div>
			</section>
		);
	}

	return (
		<section className="relative flex h-full min-w-0 flex-1 overflow-hidden">
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center justify-between border-b border-black/10 bg-[#f0f2f5] px-4 py-3">
					<div className="flex min-w-0 items-center gap-2">
						<button
							type="button"
							onClick={onBackToList}
							className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#667781] transition hover:bg-black/10 md:hidden"
							aria-label="Back to chats"
						>
							<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
						<div
							onClick={() => setShowRightSidebar(!showRightSidebar)}
							className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-black/5"
						>
						<Avatar
							name={person.name}
							src={person.profilePic}
							size={40}
							online={isOnline(person.lastSeenAt, peerPresence)}
						/>
							<div className="min-w-0">
							<p className="text-sm font-semibold text-[#111b21]">{person.name}</p>
							<p className="text-xs text-[#667781]">
								{isOnline(person.lastSeenAt, peerPresence)
									? "online"
									: formatLastSeen(peerPresence?.lastSeenAt || person.lastSeenAt) || "last seen recently"}
							</p>
							</div>
						</div>
					</div>
				</header>

				{activePinnedMessage && (
					<div className="border-b border-black/10 bg-[#f3f4f6] px-3 py-2">
						<div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-2 py-2 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all duration-200">
							<div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eceff2] text-[#667781]">
								<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M16 3a1 1 0 0 1 .78 1.62l-2.56 3.2v4.68a1 1 0 0 1-.29.7l-2.5 2.5a.75.75 0 0 1-1.28-.53V7.82L7.6 4.62A1 1 0 0 1 8.38 3H16z" />
								</svg>
							</div>

							<button
								type="button"
								onClick={() => handleJumpToMessage(activePinnedMessage._id)}
								className="min-w-0 flex-1 text-left"
								title="Jump to pinned message"
							>
								<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667781]">Pinned message</p>
								<p className="mt-0.5 truncate text-xs text-[#111b21]">{activePinnedMessage.text}</p>
							</button>

							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setActivePinnedIndex((prev) => Math.max(prev - 1, 0))}
									disabled={activePinnedIndex === 0}
									className="grid h-7 w-7 place-items-center rounded-full text-[#667781] hover:bg-black/5 disabled:opacity-40"
									aria-label="Previous pinned message"
								>
									<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</button>
								<button
									type="button"
									onClick={() => setActivePinnedIndex((prev) => Math.min(prev + 1, pinnedMessages.length - 1))}
									disabled={activePinnedIndex === pinnedMessages.length - 1}
									className="grid h-7 w-7 place-items-center rounded-full text-[#667781] hover:bg-black/5 disabled:opacity-40"
									aria-label="Next pinned message"
								>
									<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</button>
								<span className="px-1 text-[11px] text-[#667781]">{activePinnedIndex + 1}/{pinnedMessages.length}</span>
								<button
									type="button"
									onClick={() => onTogglePin?.(activePinnedMessage._id)}
									className="rounded-full px-2 py-1 text-[11px] font-semibold text-[#667781] transition hover:bg-black/5"
								>
									Unpin
								</button>
							</div>
						</div>
					</div>
				)}

				<div
					ref={messageViewportRef}
					className="chat-messages-scroll min-h-0 flex-1 overflow-y-auto p-4"
					style={{
						backgroundColor: "#efeae2",
						backgroundImage:
							"radial-gradient(circle at 25px 25px, rgba(0,0,0,0.03) 2px, transparent 0), radial-gradient(circle at 75px 75px, rgba(0,0,0,0.03) 2px, transparent 0)",
						backgroundSize: "100px 100px",
					}}
				>
					{isLoading && <p className="text-sm text-[#667781]">Loading messages...</p>}
					{!isLoading && messages.length === 0 && (
						<p className="text-sm text-[#667781]">No messages yet. Say hi and break the silence.</p>
					)}

					{listItems.map((item) => {
						if (item.type === "unread-separator") {
							return (
								<div key={item.id} className="my-3 flex justify-center">
									<span className="rounded-full border border-[#f29c9c]/40 bg-[#fff3f3] px-3 py-1 text-[11px] font-semibold text-[#d23b3b] shadow-sm">
										{item.label}
									</span>
								</div>
							);
						}

						if (item.type === "day-separator") {
							return (
								<div key={item.id} className="my-3 flex justify-center">
									<span className="rounded-full border border-black/5 bg-[#f3f4f6] px-3 py-1 text-[11px] font-medium text-[#54656f] shadow-sm">
										{item.label}
									</span>
								</div>
							);
						}

						const msg = item.msg;
						return (
							<div
								key={item.id}
								data-message-id={item.id}
								className={`rounded-xl transition-all duration-300 ${
									highlightedMessageId === item.id ? "bg-[#ddf7ee] ring-1 ring-[#9fdfcb]" : ""
								}`}
							>
								<MessageItem
									msg={msg}
									onEdit={onEditMessage}
									onToggleFavorite={onToggleFavorite}
									onTogglePin={onTogglePin}
									onDelete={onDeleteMessage}
								/>
							</div>
						);
					})}
				</div>

				{showScrollToBottom && (
					<button
						type="button"
						onClick={handleScrollToBottom}
						className="absolute bottom-20 right-5 z-20 grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-[#111b21] shadow-lg transition hover:bg-[#f6f7f8]"
						aria-label="Jump to latest message"
					>
						<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				)}

				<MessageInput onSendMessage={handleSend} isSending={isSending} />
			</div>

			<aside
				className={`absolute inset-y-0 right-0 z-20 flex h-full w-full max-w-[320px] flex-col overflow-hidden border-l border-black/10 bg-[#f7f8fa] transition-transform duration-200 md:static md:inset-auto md:z-auto md:w-[320px] md:max-w-none ${
					showRightSidebar ? "translate-x-0 md:flex" : "translate-x-full md:hidden"
				}`}
			>
				<div className="shrink-0 border-b border-black/10 px-5 py-6 text-center">
					<div className="mb-3 flex justify-end">
						<button
							type="button"
							onClick={() => setShowRightSidebar(false)}
							className="grid h-8 w-8 place-items-center rounded-full text-[#667781] transition hover:bg-black/10"
							aria-label="Close profile panel"
						>
							<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
					</div>
					<div className="mx-auto w-fit">
						<Avatar name={person.name} src={person.profilePic} size={96} online={isOnline(person.lastSeenAt, peerPresence)} />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-[#111b21]">{person.name}</h3>
					<p className="mt-1 text-sm text-[#667781]">{getContactDisplay(person)}</p>
					<p className="mt-1 text-xs text-[#00a884]">{getSecurityLabel(person)}</p>
					<p className="mt-1 text-xs text-[#667781]">
						{isOnline(person.lastSeenAt, peerPresence)
							? "online"
							: formatLastSeen(peerPresence?.lastSeenAt || person.lastSeenAt) || "last seen recently"}
					</p>
				</div>

				<div className="modern-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
					<div className="rounded-xl border border-black/10 bg-white p-4">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667781]">About</p>
						{aboutText ? (
							<p className="mt-2 text-[#111b21] leading-relaxed wrap-break-word">{aboutText}</p>
						) : (
							<p className="mt-2 text-[#667781] italic">No about message yet.</p>
						)}
					</div>
					<div className="rounded-xl border border-black/10 bg-white p-4">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667781]">Social Links</p>
						{socialLinks.length > 0 ? (
							<div className="mt-3 flex items-center gap-2">
								{socialLinks.map((social) => (
									<a
										key={social.id}
										href={social.href}
										target="_blank"
										rel="noopener noreferrer"
										title={social.label}
										className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-[#f7f8fa] text-[#111b21] transition hover:-translate-y-0.5 hover:bg-[#ecfff9]"
									>
										{social.id === "instagram" ? (
											<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
											</svg>
										) : social.id === "facebook" ? (
											<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
											</svg>
										) : social.id === "github" ? (
											<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
											</svg>
										) : (
											<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.05-8.814 0-9.737h3.554v1.378c.43-.664 1.199-1.608 2.925-1.608 2.136 0 3.74 1.393 3.74 4.386v5.581zM5.337 8.855c-1.144 0-1.915-.761-1.915-1.715 0-.955.77-1.715 1.958-1.715 1.188 0 1.915.76 1.932 1.715 0 .954-.744 1.715-1.975 1.715zm1.946 11.597H3.392V9.167h3.891v11.285zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
											</svg>
										)}
									</a>
								))}
							</div>
						) : (
							<p className="mt-2 text-[#667781] italic">No social links shared.</p>
						)}
					</div>
					<div className="rounded-xl border border-black/10 bg-white p-4">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667781]">Media & Files</p>
						<p className="mt-2 text-[#111b21]">0 photos, 0 videos, 0 docs</p>
					</div>
					<div className="rounded-xl border border-black/10 bg-white p-4">
						<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667781]">Created Chat</p>
						<p className="mt-2 text-[#111b21]">{formatDateAndTime(selectedChat.createdAt) || "Recently"}</p>
					</div>
				</div>
			</aside>
		</section>
	);
}
