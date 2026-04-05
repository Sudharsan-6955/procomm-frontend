"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "./useSocket";

export function useUnreadCounts(userId, chats = []) {
	const [unreadByChat, setUnreadByChat] = useState({});
	const socket = useSocket(userId, null);
	const mounted = useRef(false);
	const queryClient = useQueryClient();

	// Initialize unread counts from chats data (which now includes unreadCount from server)
	useEffect(() => {
		if (!Array.isArray(chats) || chats.length === 0) {
			return;
		}

		// Initialize from server data when chats load
		const initial = {};
		for (const chat of chats) {
			initial[String(chat._id)] = chat.unreadCount || 0;
		}

		setUnreadByChat(initial);
		mounted.current = true;
	}, [chats]);

	// Listen for message updates via socket
	useEffect(() => {
		if (!socket || !userId) {
			return;
		}

		const handleMessageNew = (msg) => {
			const chatId = String(msg.chatId);
			const senderId = String(msg.senderId);
			const userIdStr = String(userId);
			const previewText = String(msg?.text || "").trim() || "New message";

			queryClient.setQueryData(["chats"], (old = []) => {
				const list = Array.isArray(old) ? old : [];
				const index = list.findIndex((chat) => String(chat._id) === chatId);
				if (index === -1) {
					return list;
				}

				const next = [...list];
				const [target] = next.splice(index, 1);
				next.unshift({
					...target,
					lastMessage: previewText,
					lastMessageAt: msg?.createdAt || new Date().toISOString(),
				});

				return next;
			});

			// Only count messages from other users that aren't read
			if (senderId !== userIdStr) {
				const status = msg.deliveryStatus?.status || "sent";
				if (status !== "read") {
					setUnreadByChat((prev) => ({
						...prev,
						[chatId]: (prev[chatId] || 0) + 1,
					}));
				}
			}
		};

		const handleMessageUpdated = (msg) => {
			const chatId = String(msg.chatId);
			const senderId = String(msg.senderId);
			const userIdStr = String(userId);
			const previewText = String(msg?.text || "").trim() || "Message updated";

			queryClient.setQueryData(["chats"], (old = []) => {
				const list = Array.isArray(old) ? old : [];
				const index = list.findIndex((chat) => String(chat._id) === chatId);
				if (index === -1) {
					return list;
				}

				const next = [...list];
				const [target] = next.splice(index, 1);
				next.unshift({
					...target,
					lastMessage: previewText,
					lastMessageAt: msg?.updatedAt || msg?.createdAt || new Date().toISOString(),
				});

				return next;
			});

			// If message was from other user and is now read, decrement count
			if (senderId !== userIdStr) {
				const newStatus = msg.deliveryStatus?.status || "sent";

				// Decrement if message is now read
				if (newStatus === "read") {
					setUnreadByChat((prev) => {
						const count = Math.max(0, (prev[chatId] || 0) - 1);
						return {
							...prev,
							[chatId]: count,
						};
					});
				}
			}
		};

		const handleMessagesRead = (event) => {
			const chatId = String(event.chatId);
			// Clear unread count for this chat when messages are marked read
			setUnreadByChat((prev) => ({
				...prev,
				[chatId]: 0,
			}));
		};

		socket.on("message:new", handleMessageNew);
		socket.on("message:updated", handleMessageUpdated);
		socket.on("chat:messagesRead", handleMessagesRead);

		return () => {
			socket.off("message:new", handleMessageNew);
			socket.off("message:updated", handleMessageUpdated);
			socket.off("chat:messagesRead", handleMessagesRead);
		};
	}, [socket, userId, queryClient]);

	return unreadByChat;
}