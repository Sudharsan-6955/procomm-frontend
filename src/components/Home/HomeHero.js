"use client";

import Link from "next/link";

export default function HomeHero() {
	return (
		<section className="relative overflow-hidden rounded-4xl border border-black/10 bg-[#d9fdd3] p-8 sm:p-12">
			<div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#25d366]/20 blur-2xl" aria-hidden="true" />
			<div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-[#128c7e]/20 blur-2xl" aria-hidden="true" />

			<div className="relative z-10 max-w-2xl">
				<p className="inline-flex rounded-full border border-black/20 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#111b21]">
					Welcome
				</p>
				<h1 className="mt-4 text-4xl font-semibold leading-tight text-[#0b141a] sm:text-5xl">
					Connect faster with a clean, focused chat experience
				</h1>
				<p className="mt-4 text-base text-[#111b21]/80 sm:text-lg">
					Your UI-only dashboard is ready. Jump into conversations, manage your profile, and keep everything in one place.
				</p>

				<div className="mt-8 flex flex-wrap gap-3">
					<Link
						href="/chat"
						className="inline-flex items-center justify-center rounded-full bg-[#111b21] px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
					>
						Open Chats
					</Link>
					<Link
						href="/settings/profile"
						className="inline-flex items-center justify-center rounded-full border border-black/20 bg-white px-6 py-3 text-sm font-medium text-[#111b21] transition hover:bg-[#f3f7f4]"
					>
						Edit Profile
					</Link>
				</div>
			</div>
		</section>
	);
}
