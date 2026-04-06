"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatList from "@/components/sidebar/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePresence } from "@/hooks/usePresence";
import { useSocket } from "@/hooks/useSocket";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { clearSession, getPushToken, getSessionToken, clearPushToken } from "@/lib/session";
import { createDirectChat, searchProfiles, unregisterPushToken } from "@/services/api";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { disconnectSocket } from "@/lib/socket";
import { signOut } from "firebase/auth";

function ChatPageContent() {
	// TanStack query client use pannitu chats/cache refresh pannrom.
	const queryClient = useQueryClient();
	const router = useRouter();
	const searchParams = useSearchParams();
	const initialChatId = searchParams.get("chatId");
	const [selectedChatId, setSelectedChatId] = useState(initialChatId);
	const [selectedChatInitialUnreadCount, setSelectedChatInitialUnreadCount] = useState(0);
	const [mobileView, setMobileView] = useState(initialChatId ? "chat" : "list");
	const { data: me, isLoading: isLoadingMe } = useCurrentUser();
	const presenceByUserId = usePresence(me?._id);
	// User irundha dhaan socket init aagum; illena extra connect avoid pannidum.
	const socket = useSocket(me?._id, selectedChatId);
	const { data: chats = [], isLoading: isChatsLoading } = useChats();
	const unreadByChat = useUnreadCounts(me?._id, chats);

	useEffect(() => {
		const token = getSessionToken();
		if (!token && !isLoadingMe) {
			router.push("/auth/login");
		}
	}, [isLoadingMe, router]);

	useEffect(() => {
		if (!selectedChatId || isChatsLoading) {
			return;
		}

		const stillAccessible = chats.some((chat) => String(chat._id) === String(selectedChatId));
		if (!stillAccessible) {
			setSelectedChatId(null);
			setMobileView("list");
			router.replace("/chat");
		}
	}, [chats, isChatsLoading, router, selectedChatId]);

	const handleSelectChat = (chatId) => {
		const chatKey = String(chatId || "");
		const liveUnread = Number(unreadByChat[chatKey] || 0);
		const chatData = chats.find((item) => String(item._id) === chatKey);
		const fallbackUnread = Number(chatData?.unreadCount || 0);

		setSelectedChatInitialUnreadCount(liveUnread || fallbackUnread || 0);
		setSelectedChatId(chatId);
		setMobileView("chat");
	};

	const handleBackToList = () => {
		setMobileView("list");
	};

	const handleStartChat = async (queryText) => {
		if (!queryText?.trim()) {
			return;
		}

		const profiles = await searchProfiles(queryText);
		if (!profiles.length) {
			return;
		}

		const direct = await createDirectChat(profiles[0]._id);
		if (direct?._id) {
			// Puthu chat create aana udane chats list refresh aaga cache invalidate panrom.
			await queryClient.invalidateQueries({ queryKey: ["chats"] });
			setSelectedChatInitialUnreadCount(0);
			setSelectedChatId(String(direct._id));
			setMobileView("chat");
		}
	};

	const handleStartChatWithUser = async (targetUserId) => {
		if (!targetUserId) {
			return;
		}

		const direct = await createDirectChat(targetUserId);
		if (direct?._id) {
			// Same flow: new direct chat வந்தா cached chats refetch aaganum.
			await queryClient.invalidateQueries({ queryKey: ["chats"] });
			setSelectedChatInitialUnreadCount(0);
			setSelectedChatId(String(direct._id));
			setMobileView("chat");
		}
	};

	const handleChatOpened = (chatId) => {
		if (!socket || !chatId) {
			return;
		}

		// Chat open aana udane unread/read sync panna socket emit panrom.
		socket.emit("chat:markRead", String(chatId));
	};

	const handleOpenProfile = () => {
		router.push("/settings/profile");
	};

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
			// Logout time la socket cleanup pannitu app state clear panrom.
			disconnectSocket();
			// Query cache full ah clear pannina stale chats/messages thirumba varadhu.
			queryClient.clear();
			clearSession();
			router.push("/auth/login");
		}
	};

	const resolvedSelectedChatId = useMemo(() => {
		return selectedChatId || null;
	}, [selectedChatId]);

	const selectedChat = chats.find((chat) => chat._id === resolvedSelectedChatId) || null;

	const {
		messages,
		isLoading: isMessagesLoading,
		sendMessage,
		isSending,
		editMessage,
		toggleFavorite,
		togglePin,
		deleteMessage,
	} = useMessages(resolvedSelectedChatId, me?._id, socket);

	if (isLoadingMe) {
		return <main className="grid h-screen place-items-center bg-[#efeae2]">Loading profile...</main>;
	}

	return (
		<main className="h-screen bg-[#efeae2] text-[#111b21]">
			<div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden border-x border-black/10 bg-white md:flex-row">
				<div className={`${mobileView === "chat" ? "hidden" : "flex"} h-full min-w-0 flex-1 md:flex md:w-auto md:flex-none`}>
					<ChatList
						chats={chats}
						me={me}
						presenceByUserId={presenceByUserId}
						selectedChatId={resolvedSelectedChatId}
						unreadByChat={unreadByChat}
						onSelectChat={handleSelectChat}
						onStartChat={handleStartChat}
						onStartChatWithUser={handleStartChatWithUser}
						onOpenProfile={handleOpenProfile}
						onLogout={handleLogout}
						isLoading={isChatsLoading}
					/>
				</div>
				<div className={`${mobileView === "chat" ? "flex" : "hidden"} h-full min-w-0 flex-1 md:flex`}>
					{selectedChat ? (
						<ChatWindow
							selectedChat={selectedChat}
							initialUnreadCount={selectedChatInitialUnreadCount}
							messages={messages}
							presenceByUserId={presenceByUserId}
							isLoading={isMessagesLoading}
							onSendMessage={sendMessage}
							isSending={isSending}
							onEditMessage={editMessage}
							onToggleFavorite={toggleFavorite}
							onTogglePin={togglePin}
							onDeleteMessage={deleteMessage}
							onBackToList={handleBackToList}
							onChatOpened={handleChatOpened}
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center bg-[#f0f2f5]">
							<svg className="mb-4 h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
							</svg>
							<h2 className="text-xl font-semibold text-gray-700">Select a chat to start messaging</h2>
							<p className="mt-2 text-sm text-gray-500">Choose a conversation from the list or start a new chat</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}

function ChatPageFallback() {
	return <main className="grid h-screen place-items-center bg-[#efeae2]">Loading chat...</main>;
}

export default function ChatPage() {
	return (
		<Suspense fallback={<ChatPageFallback />}>
			<ChatPageContent />
		</Suspense>
	);
}