"use client";

function TickIcon({ double = false, color = "currentColor" }) {
	if (!double) {
		return (
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" aria-hidden="true">
				<path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		);
	}

	return (
		<span className="relative inline-block h-3 w-4" aria-hidden="true">
			<svg className="absolute left-0 top-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
				<path d="M4.5 12.5l3.5 3.5L15 9" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			<svg className="absolute left-2 top-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
				<path d="M4.5 12.5l3.5 3.5L15 9" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</span>
	);
}

export default function MessageStatus({ status = "sent" }) {
	if (status === "read") {
		return <TickIcon double color="#53bdeb" />;
	}

	if (status === "delivered") {
		return <TickIcon double color="#667781" />;
	}

	return <TickIcon color="#667781" />;
}