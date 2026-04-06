"use client";

import { useEffect } from "react";
import { initSocket, getSocket } from "@/lib/socket";

export function useSocket(userId, chatId) {
	useEffect(() => {
		if (!userId) {
			return;
		}

		let joinRooms;
		try {
			// Singleton socket create panna initSocket use panrom.
			const socket = initSocket();
			if (!socket) {
				return;
			}
			joinRooms = () => {
				// User room join pannitu, selected chat irundha adhayum join panrom.
				socket.emit("join");
				if (chatId) {
					socket.emit("joinChat", chatId);
				}
			};

			joinRooms();
			socket.on("connect", joinRooms);
		} catch (error) {
			console.error("Socket initialization error:", error);
		}

		return () => {
			const socket = getSocket();
			if (!socket) {
				return;
			}
			if (joinRooms) {
				// Connect retry listeners remove pannitu duplicate join avoid panrom.
				socket.off("connect", joinRooms);
			}
			// Keep socket alive for other hooks
		};
	}, [userId, chatId]);

	if (!userId) {
		return null;
	}

	return getSocket();
}
