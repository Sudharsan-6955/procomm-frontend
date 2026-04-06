"use client";

import { useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	deleteMessage as deleteMessageApi,
	editMessage as editMessageApi,
	getMessages,
	sendMessage as sendMessageApi,
	toggleFavoriteMessage,
	togglePinMessage,
} from "@/services/api";

function dedupeMessagesById(messages = []) {
	const mergedById = new Map();

	for (const msg of messages) {
		const id = String(msg?._id || "");
		if (!id) {
			continue;
		}

		if (!mergedById.has(id)) {
			mergedById.set(id, msg);
			continue;
		}

		const previous = mergedById.get(id);
		const next = { ...previous, ...msg };
		if (previous?._isLocalEcho === false || msg?._isLocalEcho === false) {
			next._isLocalEcho = false;
		}

		mergedById.set(id, next);
	}

	return Array.from(mergedById.values());
}

export function useMessages(chatId, currentUserId, socket) {
	// TanStack query client la messages cache manage pannitu optimistic update panrom.
	const queryClient = useQueryClient();
	const queryKey = ["messages", chatId];

	// Chat select aana server-la irundhu messages fetch panrom.
	const messagesQuery = useQuery({
		queryKey,
		queryFn: async () => {
			if (!chatId) {
				return [];
			}

			const data = await getMessages(chatId);
			return Array.isArray(data) ? data : [];
		},
		enabled: Boolean(chatId),
		staleTime: 10000,
	});

	const sendMutation = useMutation({
		mutationFn: async (text) => {
			if (!chatId) {
				throw new Error("No chat selected");
			}

			const payload = await sendMessageApi(chatId, { text });
			return payload;
		},
		onMutate: async (text) => {
			if (!chatId) {
				return {};
			}

			// Existing fetch cancel pannitu optimistic message add panrom.
			await queryClient.cancelQueries({ queryKey });

			const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
			const optimistic = {
				_id: tempId,
				chatId,
				text,
				senderId: currentUserId,
				createdAt: new Date().toISOString(),
				isMine: true,
				deliveryStatus: { status: "sent", deliveredAt: null, readAt: null },
				_isLocalEcho: true,
			};

			queryClient.setQueryData(queryKey, (old = []) => [...old, optimistic]);

			// Chats list preview-kum immediately latest text reflect aaganum.
			queryClient.setQueryData(["chats"], (old = []) => {
				const list = Array.isArray(old) ? old : [];
				const index = list.findIndex((chat) => String(chat._id) === String(chatId));
				if (index === -1) {
					return list;
				}

				const next = [...list];
				const [target] = next.splice(index, 1);
				next.unshift({
					...target,
					lastMessage: String(text || "").trim() || target.lastMessage || "",
					lastMessageAt: optimistic.createdAt,
				});

				return next;
			});

			return { tempId };
		},
		onSuccess: (created, _text, context) => {
			if (!context?.tempId) {
				return;
			}

			queryClient.setQueryData(queryKey, (old = []) => {
				const list = Array.isArray(old) ? old : [];
				const withoutTemp = list.filter((msg) => String(msg._id) !== String(context.tempId));
				const normalizedCreated = {
					...created,
					isMine: String(created?.senderId || currentUserId) === String(currentUserId),
					deliveryStatus:
						created?.deliveryStatus || { status: "sent", deliveredAt: null, readAt: null },
					_isLocalEcho: false,
				};

				return dedupeMessagesById([...withoutTemp, normalizedCreated]);
			});
		},
		onError: (_error, _text, context) => {
			if (!context?.tempId) {
				return;
			}

			queryClient.setQueryData(queryKey, (old = []) =>
				old.filter((msg) => String(msg._id) !== String(context.tempId))
			);
		},
		onSettled: async () => {
			if (!chatId) {
				return;
			}

			// Server state confirm aaga messages and chats both refetch panrom.
			await queryClient.invalidateQueries({ queryKey });
			await queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});

	const editMutation = useMutation({
		mutationFn: async ({ messageId, text }) => {
			if (!chatId) {
				throw new Error("No chat selected");
			}

			return editMessageApi(chatId, messageId, { text });
		},
		onSuccess: (updated) => {
			// Edit result வந்ததும் local cache full sync.
			queryClient.setQueryData(queryKey, (old = []) =>
				old.map((msg) =>
					String(msg._id) === String(updated._id)
						? { ...updated, isMine: String(updated.senderId) === String(currentUserId) }
						: msg
				)
			);
		},
		onSettled: async () => {
			// Chat preview message fresh-ah varanum.
			await queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});

	const favoriteMutation = useMutation({
		mutationFn: async (messageId) => {
			if (!chatId) {
				throw new Error("No chat selected");
			}
			if (!messageId || String(messageId).startsWith("temp-")) {
				throw new Error("Message is still sending");
			}

			return toggleFavoriteMessage(chatId, messageId);
		},
		onMutate: async (messageId) => {
			// Toggle start aaga munnadi existing cache cancel pannrom.
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData(queryKey);

			queryClient.setQueryData(queryKey, (old = []) =>
				old.map((msg) =>
					String(msg._id) === String(messageId)
						? { ...msg, isFavorite: !msg.isFavorite }
						: msg
				)
			);

			return { previous };
		},
		onSuccess: (updated) => {
				// Favorite status server result oda replace panrom.
			queryClient.setQueryData(queryKey, (old = []) =>
				old.map((msg) =>
					String(msg._id) === String(updated._id)
						? { ...updated, isMine: String(updated.senderId) === String(currentUserId) }
						: msg
				)
			);
		},
		onError: (_error, _messageId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
		},
		onSettled: async () => {
			// Query refetch pannina final truth கிடைக்கும்.
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	const pinMutation = useMutation({
		mutationFn: async (messageId) => {
			if (!chatId) {
				throw new Error("No chat selected");
			}
			if (!messageId || String(messageId).startsWith("temp-")) {
				throw new Error("Message is still sending");
			}

			return togglePinMessage(chatId, messageId);
		},
		onMutate: async (messageId) => {
			// Pin toggle kku old query pause pannitu optimistic update panrom.
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData(queryKey);

			queryClient.setQueryData(queryKey, (old = []) =>
				old.map((msg) =>
					String(msg._id) === String(messageId)
						? { ...msg, isPinned: !msg.isPinned }
						: msg
				)
			);

			return { previous };
		},
		onSuccess: (updated) => {
				// Server response vandha pin status cache la sync aagum.
			queryClient.setQueryData(queryKey, (old = []) =>
				old.map((msg) =>
					String(msg._id) === String(updated._id)
						? { ...updated, isMine: String(updated.senderId) === String(currentUserId) }
						: msg
				)
			);
		},
		onError: (_error, _messageId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
		},
		onSettled: async () => {
			// One final refetch for stable cache state.
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async ({ messageId, scope }) => {
			if (!chatId) {
				throw new Error("No chat selected");
			}
			if (!messageId || String(messageId).startsWith("temp-")) {
				throw new Error("Message is still sending");
			}

			return deleteMessageApi(chatId, messageId, scope);
		},
		onSuccess: (result, variables) => {
			if (result?.removed) {
				// Message delete aana full removal cache-la reflect panrom.
				queryClient.setQueryData(queryKey, (old = []) =>
					old.filter((msg) => String(msg._id) !== String(variables.messageId))
				);
				return;
			}

			// Soft delete / partial update cases ku cache replace panrom.
			queryClient.setQueryData(queryKey, (old = []) =>
				old.map((msg) =>
					String(msg._id) === String(result._id)
						? { ...result, isMine: String(result.senderId) === String(currentUserId) }
						: msg
				)
			);
		},
		onSettled: async () => {
			// Chats list preview/date update aaga refresh panrom.
			await queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
	});

	// Socket listener for real-time messages
	useEffect(() => {
		if (!socket || !chatId) {
			return;
		}

		const handleNewMessage = (msg) => {
			if (String(msg.chatId) !== String(chatId)) {
				return;
			}

			// Real-time message வந்ததும் current chat cache update panrom.
			queryClient.setQueryData(queryKey, (old = []) => {
				const list = Array.isArray(old) ? old : [];
				const normalizedIncoming = {
					...msg,
					isMine: String(msg.senderId) === String(currentUserId),
					deliveryStatus: msg.deliveryStatus || { status: "sent", deliveredAt: null, readAt: null },
				};

				return dedupeMessagesById([...list, normalizedIncoming]);
			});
		};

		const handleUpdatedMessage = (msg) => {
			if (String(msg.chatId) !== String(chatId)) {
				return;
			}

			// Edited message same chat-la irundha local list la replace panrom.
			queryClient.setQueryData(queryKey, (old = []) =>
				old.map((item) =>
					String(item._id) === String(msg._id)
						? {
							...item,
							...msg,
							isMine: String(msg.senderId) === String(currentUserId),
							isFavorite:
								typeof msg.isFavorite === "boolean" ? msg.isFavorite : item.isFavorite,
							isPinned: typeof msg.isPinned === "boolean" ? msg.isPinned : item.isPinned,
							deliveryStatus: msg.deliveryStatus || item.deliveryStatus || { status: "sent", deliveredAt: null, readAt: null },
						}
						: item
				)
			);
		};

		const handleRemovedMessage = (event) => {
			if (String(event.chatId) !== String(chatId)) {
				return;
			}

			// Remove event வந்தா message cache-la irundhu delete panrom.
			queryClient.setQueryData(queryKey, (old = []) =>
				old.filter((item) => String(item._id) !== String(event.messageId))
			);
		};

		socket.on("message:new", handleNewMessage);
		socket.on("message:updated", handleUpdatedMessage);
		socket.on("message:removed", handleRemovedMessage);

		return () => {
			// Listener cleanup important, illana duplicate message updates varum.
			socket.off("message:new", handleNewMessage);
			socket.off("message:updated", handleUpdatedMessage);
			socket.off("message:removed", handleRemovedMessage);
		};
	}, [socket, chatId, queryClient, queryKey, currentUserId]);

	const hydratedMessages = useMemo(() => {
		const base = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];

		const hydrated = base.map((msg) => ({
			...msg,
			isMine: String(msg.senderId) === String(currentUserId),
			deliveryStatus: msg.deliveryStatus || { status: "sent", deliveredAt: null, readAt: null },
		}));

		return dedupeMessagesById(hydrated);
	}, [messagesQuery.data, currentUserId]);

	return {
		messages: hydratedMessages,
		isLoading: messagesQuery.isLoading,
		isFetching: messagesQuery.isFetching,
		isSending: sendMutation.isPending,
		isMessageActionPending:
			editMutation.isPending ||
			favoriteMutation.isPending ||
			pinMutation.isPending ||
			deleteMutation.isPending,
		sendMessage: (text) => sendMutation.mutate(text),
		editMessage: (messageId, text) => editMutation.mutate({ messageId, text }),
		toggleFavorite: (messageId) => favoriteMutation.mutate(messageId),
		togglePin: (messageId) => pinMutation.mutate(messageId),
		deleteMessage: (messageId, scope) => deleteMutation.mutate({ messageId, scope }),
	};
}
