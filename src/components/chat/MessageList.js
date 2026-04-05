"use client";

import MessageItem from "./MessageItem";

export default function MessageList({ messages, isLoading }) {
	return (
		<div className="flex-1 overflow-y-auto p-4">
			{isLoading && <p className="text-sm text-[#667781]">Loading messages...</p>}
			{!isLoading && messages.length === 0 && (
				<p className="text-sm text-[#667781]">No messages yet. Say hello.</p>
			)}
			{messages.map((msg) => (
				<MessageItem key={msg._id} msg={msg} />
			))}
		</div>
	);
}
