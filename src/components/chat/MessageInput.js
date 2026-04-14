"use client";

import { useState } from "react";
import { X } from "lucide-react";
import MessageInputActions from "./MessageInputActions";

export default function MessageInput({ onSendMessage, isSending }) {
	const [text, setText] = useState("");
	const [pendingAttachments, setPendingAttachments] = useState([]);

	const handleAttachmentPick = (files, kind) => {
		const formatted = files.map((file) => ({
			id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
			file,
			kind,
		}));

		setPendingAttachments((current) => [...current, ...formatted]);
	};

	const handleEmojiPick = (emoji) => {
		setText((current) => `${current}${emoji}`);
	};

	const removeAttachment = (id) => {
		setPendingAttachments((current) => current.filter((item) => item.id !== id));
	};

	const handleSend = () => {
		if (isSending) {
			return;
		}

		const trimmed = text.trim();
		if (!trimmed && pendingAttachments.length === 0) {
			return;
		}

		const attachmentText = pendingAttachments
			.map((item) => `[${item.kind}: ${item.file.name}]`)
			.join(" ");
		const payload = [trimmed, attachmentText].filter(Boolean).join("\n");

		onSendMessage(payload);
		setText("");
		setPendingAttachments([]);
	};

	return (
		<div
			className="border-t border-black/10 bg-[#f0f2f5]/95 px-2 pb-2 pt-2 backdrop-blur-sm md:px-3 md:pb-3"
			style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
		>
			{pendingAttachments.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-2 rounded-xl bg-white px-3 py-2">
					{pendingAttachments.map((item) => (
						<div key={item.id} className="flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f8fa] px-3 py-1 text-xs text-[#111b21]">
							<span className="max-w-45 truncate">{item.file.name}</span>
							<button
								type="button"
								onClick={() => removeAttachment(item.id)}
								className="grid h-4 w-4 place-items-center rounded-full text-[#667781] transition hover:bg-black/10 hover:text-[#111b21]"
								aria-label={`Remove ${item.file.name}`}
							>
								<X className="h-3 w-3" strokeWidth={2.4} />
							</button>
						</div>
					))}
				</div>
			)}

			<div className="flex items-center gap-1.5 rounded-2xl bg-white px-2 py-1 shadow-[0_1px_1px_rgba(11,20,26,0.08)] md:gap-2">
				<MessageInputActions onAttachmentPick={handleAttachmentPick} onEmojiPick={handleEmojiPick} />
				<input
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.repeat) {
							e.preventDefault();
							handleSend();
						}
					}}
					className="h-10 min-w-0 flex-1 bg-transparent px-1 text-sm text-[#111b21] outline-none placeholder:text-[#667781]"
					placeholder="Type a message"
				/>
				<button
					type="button"
					onClick={handleSend}
					disabled={isSending}
					className="rounded-full bg-[#25d366] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1da955] disabled:opacity-60 md:px-4"
				>
					Send
				</button>
			</div>
		</div>
	);
}
