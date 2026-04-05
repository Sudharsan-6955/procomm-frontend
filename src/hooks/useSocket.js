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
			const socket = initSocket();
			if (!socket) {
				return;
			}
			joinRooms = () => {
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
