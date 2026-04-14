"use client";

import { useEffect, useMemo, useState } from "react";
import { initSocket } from "@/lib/socket";

export function usePresence(userId) {
	const [presenceByUserId, setPresenceByUserId] = useState({});

	useEffect(() => {
		if (!userId) {
			return;
		}

		// Presence updates kku shared socket init panrom.
		const socket = initSocket();
		if (!socket) {
			return;
		}
		const handlePresenceState = (event = {}) => {
			const onlineUserIds = Array.isArray(event.onlineUserIds) ? event.onlineUserIds : [];
			const onlineSet = new Set(onlineUserIds.map((id) => String(id)));

			setPresenceByUserId((current) => {
				const next = { ...current };

				// Reset known users to offline first, then mark currently online ones.
				for (const knownUserId of Object.keys(next)) {
					next[knownUserId] = {
						...(next[knownUserId] || {}),
						online: onlineSet.has(knownUserId),
					};
				}

				for (const onlineUserId of onlineUserIds) {
					const normalizedUserId = String(onlineUserId);
					next[normalizedUserId] = {
						...(next[normalizedUserId] || {}),
						online: true,
					};
				}
				return next;
			});
		};

		const handlePresenceUpdate = (event = {}) => {
			const normalizedUserId = String(event.userId || "");
			if (!normalizedUserId) {
				return;
			}

			setPresenceByUserId((current) => ({
				...current,
				[normalizedUserId]: {
					...(current[normalizedUserId] || {}),
					online: Boolean(event.online),
					...(event.lastSeenAt ? { lastSeenAt: event.lastSeenAt } : {}),
				},
			}));
		};

		socket.on("presence:state", handlePresenceState);
		socket.on("presence:update", handlePresenceUpdate);

		return () => {
			// Cleanup panna listener duplicate aagadhu.
			socket.off("presence:state", handlePresenceState);
			socket.off("presence:update", handlePresenceUpdate);
		};
	}, [userId]);

	return useMemo(() => presenceByUserId, [presenceByUserId]);
}