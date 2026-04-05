"use client";

export default function ChatItem({ chat, isActive, onClick }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center gap-3 border-b border-black/5 p-3 text-left transition ${
				isActive ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
			}`}
		>
			<img
				src={chat.user.profilePic}
				alt={chat.user.name}
				className="h-10 w-10 rounded-full object-cover"
			/>

			<div className="min-w-0 flex-1">
				<h4 className="truncate text-sm font-semibold text-[#111b21]">{chat.user.name}</h4>
				<p className="truncate text-sm text-[#667781]">{chat.lastMessage}</p>
			</div>

			<span className="text-xs text-[#667781]">{chat.lastMessageTime}</span>
		</button>
	);
}
