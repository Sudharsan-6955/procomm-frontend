"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MessageStatus from "./MessageStatus";

export default function MessageItem({ msg, onEdit, onToggleFavorite, onTogglePin, onDelete }) {
	const [showMenu, setShowMenu] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [draftText, setDraftText] = useState(msg?.text || "");
	const DELETE_FOR_EVERYONE_WINDOW_MS = 15 * 60 * 1000;
	const EDIT_WINDOW_MS = 3 * 60 * 1000;
	const menuRef = useRef(null);

	const time = msg?.createdAt
		? new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			minute: "2-digit",
		}).format(new Date(msg.createdAt))
		: "";

	const canEdit = Boolean(msg?.isMine && !msg?.isDeletedForEveryone);
	const canRunActions = true;
	const messageAgeMs = Date.now() - new Date(msg?.createdAt || 0).getTime();
	const canEditMessage = Boolean(
		canEdit && !Number.isNaN(messageAgeMs) && messageAgeMs <= EDIT_WINDOW_MS
	);
	const canDeleteForEveryone = Boolean(
		msg?.isMine &&
			!msg?.isDeletedForEveryone &&
			!Number.isNaN(messageAgeMs) &&
			messageAgeMs <= DELETE_FOR_EVERYONE_WINDOW_MS
	);

	const isLikelySingleLine = useMemo(() => {
		const text = String(msg?.text || "");
		if (text.includes("\n")) {
			return false;
		}

		// Heuristic to mimic WhatsApp: short single-line messages keep time inline.
		return text.length <= 36;
	}, [msg?.text]);

	useEffect(() => {
		if (!showMenu) {
			return;
		}

		const handleClickOutside = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setShowMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showMenu]);

	const handleSaveEdit = () => {
		const trimmed = String(draftText || "").trim();
		if (!trimmed || trimmed === msg?.text) {
			setIsEditing(false);
			return;
		}

		onEdit?.(msg._id, trimmed);
		setIsEditing(false);
		setShowMenu(false);
	};

	const handleDeleteForMe = () => {
		if (!canRunActions) {
			return;
		}
		onDelete?.(msg._id, "me");
		setShowMenu(false);
	};

	const handleDeleteForEveryone = () => {
		if (!canRunActions || !canDeleteForEveryone) {
			return;
		}
		onDelete?.(msg._id, "everyone");
		setShowMenu(false);
	};

	return (
		<div className={`mb-2 flex ${msg.isMine ? "justify-end" : "justify-start"} ${showMenu ? "relative z-50" : "relative z-0"}`}>
			<div
				className={`relative max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm md:max-w-md ${
					msg.isMine ? "rounded-br-sm bg-[#d9fdd3]" : "rounded-bl-sm bg-white"
				}`}
			>
				<div ref={menuRef} className="absolute right-1 top-1 z-40">
					<button
						type="button"
						disabled={!canRunActions}
						onClick={() => setShowMenu((prev) => !prev)}
						className="relative z-10 flex h-6 items-center rounded-full px-1 text-[#667781] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label="Message actions"
					>
						<svg
							className={`h-3.5 w-3.5 transition-transform duration-200 ${showMenu ? "rotate-180" : "rotate-0"}`}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden="true"
						>
							<path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>

					{showMenu && (
						<div
							className={`absolute top-8 z-50 w-44 rounded-xl border border-black/10 bg-white p-1 shadow-lg ${
								msg.isMine ? "right-0" : "left-full ml-2"
							}`}
						>
						<button
							type="button"
							onClick={() => {
								if (!canRunActions) {
									return;
								}
								onToggleFavorite?.(msg._id);
								setShowMenu(false);
							}}
							className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#111b21] hover:bg-[#f5f7f9]"
						>
							{msg?.isFavorite ? "Unfavorite" : "Favorite"}
						</button>
						<button
							type="button"
							onClick={() => {
								if (!canRunActions) {
									return;
								}
								onTogglePin?.(msg._id);
								setShowMenu(false);
							}}
							className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#111b21] hover:bg-[#f5f7f9]"
						>
							{msg?.isPinned ? "Unpin" : "Pin"}
						</button>
						{canEditMessage && (
							<button
								type="button"
								onClick={() => {
									setDraftText(msg?.text || "");
									setIsEditing(true);
									setShowMenu(false);
								}}
								className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#111b21] hover:bg-[#f5f7f9]"
							>
								Edit
							</button>
						)}
						{msg?.isMine && !msg?.isDeletedForEveryone && (
							canDeleteForEveryone && (
							<button
								type="button"
								onClick={handleDeleteForEveryone}
								className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-[#fff1f1]"
							>
								Delete for everyone
							</button>
							)
						)}
						<button
							type="button"
							onClick={handleDeleteForMe}
							className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-[#fff1f1]"
						>
							Delete for me
						</button>
						</div>
					)}
				</div>

				{isEditing ? (
					<div className="mt-2">
						<textarea
							value={draftText}
							onChange={(e) => setDraftText(e.target.value)}
							rows={2}
							className="w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-sm text-[#111b21] outline-none focus:border-[#00a884]"
						/>
						<div className="mt-2 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setIsEditing(false)}
								className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-[#111b21]"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSaveEdit}
								className="rounded-full bg-[#00a884] px-3 py-1 text-xs font-semibold text-white"
							>
								Save
							</button>
						</div>
					</div>
				) : (
					<div className="pr-6">
						{isLikelySingleLine ? (
							<div className="flex items-end gap-1.5">
								<p
									className={`whitespace-pre-wrap wrap-break-word text-[#111b21] ${
										msg?.isDeletedForEveryone ? "italic text-[#667781]" : ""
									}`}
								>
									{msg.text}
								</p>
								<div className="ml-auto flex items-center gap-1 text-[11px] text-[#667781]">
									{msg?.isFavorite && (
										<svg className="h-3.5 w-3.5 text-[#ef4444]" viewBox="0 0 24 24" fill="currentColor" aria-label="Favorite">
											<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
										</svg>
									)}
									{msg?.isEdited && !msg?.isDeletedForEveryone && <span>edited</span>}
									<span>{time}</span>
									{msg?.isMine && <MessageStatus status={msg?.deliveryStatus?.status || "sent"} />}
								</div>
							</div>
						) : (
							<>
								<p
									className={`whitespace-pre-wrap wrap-break-word text-[#111b21] ${
										msg?.isDeletedForEveryone ? "italic text-[#667781]" : ""
									}`}
								>
									{msg.text}
								</p>
								<div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-[#667781]">
									{msg?.isFavorite && (
										<svg className="h-3.5 w-3.5 text-[#ef4444]" viewBox="0 0 24 24" fill="currentColor" aria-label="Favorite">
											<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
										</svg>
									)}
									{msg?.isEdited && !msg?.isDeletedForEveryone && <span>edited</span>}
									<span>{time}</span>
									{msg?.isMine && <MessageStatus status={msg?.deliveryStatus?.status || "sent"} />}
								</div>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
