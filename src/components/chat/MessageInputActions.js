"use client";

import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { FileText, Image as ImageIcon, Paperclip, Plus, Smile } from "lucide-react";

const ATTACHMENT_OPTIONS = [
	{ key: "photo", label: "Photos & Videos", icon: ImageIcon, tone: "text-[#34b7f1]" },
	{ key: "document", label: "Document", icon: FileText, tone: "text-[#ff8f00]" },
	{ key: "file", label: "File", icon: Paperclip, tone: "text-[#7b5eff]" },
];

export default function MessageInputActions({ onEmojiPick, onAttachmentPick }) {
	const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
	const [isEmojiOpen, setIsEmojiOpen] = useState(false);
	const actionsRef = useRef(null);
	const photoInputRef = useRef(null);
	const documentInputRef = useRef(null);
	const fileInputRef = useRef(null);

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (!actionsRef.current?.contains(event.target)) {
				setIsAttachmentMenuOpen(false);
				setIsEmojiOpen(false);
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const handleAttachmentChoice = (kind) => {
		if (kind === "photo") {
			photoInputRef.current?.click();
			return;
		}

		if (kind === "document") {
			documentInputRef.current?.click();
			return;
		}

		fileInputRef.current?.click();
	};

	const handleAttachmentInput = (event, kind) => {
		const selectedFiles = Array.from(event.target.files || []);
		if (selectedFiles.length > 0) {
			onAttachmentPick?.(selectedFiles, kind);
		}

		event.target.value = "";
		setIsAttachmentMenuOpen(false);
	};

	return (
		<div ref={actionsRef} className="relative flex items-center gap-1">
			<input
				ref={photoInputRef}
				type="file"
				accept="image/*,video/*"
				multiple
				onChange={(event) => handleAttachmentInput(event, "photo")}
				className="hidden"
			/>
			<input
				ref={documentInputRef}
				type="file"
				accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
				multiple
				onChange={(event) => handleAttachmentInput(event, "document")}
				className="hidden"
			/>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				onChange={(event) => handleAttachmentInput(event, "file")}
				className="hidden"
			/>

			<button
				type="button"
				onClick={() => {
					setIsAttachmentMenuOpen((current) => !current);
					setIsEmojiOpen(false);
				}}
				className="grid h-9 w-9 place-items-center rounded-full text-[#54656f] transition hover:bg-black/5 hover:text-[#111b21]"
				aria-label="Open attachment options"
			>
				<Plus className={`h-5 w-5 transition-transform ${isAttachmentMenuOpen ? "rotate-45" : ""}`} strokeWidth={2.25} />
			</button>

			<button
				type="button"
				onClick={() => {
					setIsEmojiOpen((current) => !current);
					setIsAttachmentMenuOpen(false);
				}}
				className="grid h-9 w-9 place-items-center rounded-full text-[#54656f] transition hover:bg-black/5 hover:text-[#111b21]"
				aria-label="Open emoji picker"
			>
				<Smile className="h-5 w-5" strokeWidth={2.1} />
			</button>

			{isAttachmentMenuOpen && (
				<div className="absolute bottom-full left-0 z-20 mb-3 w-60 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_14px_40px_rgba(0,0,0,0.14)]">
					{ATTACHMENT_OPTIONS.map((option) => {
						const Icon = option.icon;
						return (
							<button
								key={option.key}
								type="button"
								onClick={() => handleAttachmentChoice(option.key)}
								className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[#111b21] transition hover:bg-[#f0f2f5]"
							>
								<span className={`grid h-8 w-8 place-items-center rounded-full bg-black/5 ${option.tone}`}>
									<Icon className="h-4 w-4" strokeWidth={2} />
								</span>
								<span>{option.label}</span>
							</button>
						);
					})}
				</div>
			)}

			{isEmojiOpen && (
				<div className="absolute bottom-full left-11 z-20 mb-3 overflow-hidden rounded-2xl border border-black/10 shadow-[0_14px_40px_rgba(0,0,0,0.14)]">
					<EmojiPicker
						onEmojiClick={(emojiData) => onEmojiPick?.(emojiData.emoji)}
						width={Math.min(320, typeof window !== "undefined" ? window.innerWidth - 32 : 320)}
						height={360}
						searchDisabled={false}
						lazyLoadEmojis
					/>
				</div>
			)}
		</div>
	);
}