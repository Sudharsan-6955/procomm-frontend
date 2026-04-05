"use client";

import { useState } from "react";

function initials(name = "U") {
	return (
		name
			.split(" ")
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "U"
	);
}

export default function Avatar({ name, src, size = 40, online = false }) {
	const [imageFailed, setImageFailed] = useState(false);
	const px = `${size}px`;
	const showImage = Boolean(src) && !imageFailed;

	return (
		<div className="relative shrink-0" style={{ width: px, height: px }}>
			{showImage ? (
				<img
					src={src}
					alt={name || "User"}
					className="h-full w-full rounded-full object-cover"
					onError={(event) => {
						event.currentTarget.style.display = "none";
						setImageFailed(true);
					}}
				/>
			) : null}
			<div
				className="grid h-full w-full place-items-center rounded-full bg-[#d9fdd3] font-semibold text-[#075e54]"
				style={{
					display: showImage ? "none" : "grid",
					fontSize: `${Math.max(12, Math.floor(size * 0.32))}px`,
				}}
			>
				{initials(name)}
			</div>
			{online ? (
				<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#22c55e]" />
			) : null}
		</div>
	);
}
