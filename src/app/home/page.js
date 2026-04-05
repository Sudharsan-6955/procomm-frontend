import HomeHero from "@/components/Home/HomeHero";

export default function HomePage() {
	return (
		<main className="min-h-screen bg-[#fcf5eb] px-5 py-8 text-[#111b21] sm:px-10 sm:py-10">
			<div className="mx-auto w-full max-w-6xl space-y-6">
				<HomeHero />

				<section className="grid gap-4 sm:grid-cols-3">
					<article className="rounded-3xl border border-black/10 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#111b21]/60">Chats</p>
						<p className="mt-2 text-3xl font-semibold">24</p>
						<p className="mt-2 text-sm text-[#111b21]/70">Recent threads ready to continue.</p>
					</article>
					<article className="rounded-3xl border border-black/10 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#111b21]/60">Pinned</p>
						<p className="mt-2 text-3xl font-semibold">8</p>
						<p className="mt-2 text-sm text-[#111b21]/70">Important conversations at a glance.</p>
					</article>
					<article className="rounded-3xl border border-black/10 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#111b21]/60">Profile</p>
						<p className="mt-2 text-3xl font-semibold">100%</p>
						<p className="mt-2 text-sm text-[#111b21]/70">Account setup complete in UI-only mode.</p>
					</article>
				</section>
			</div>
		</main>
	);
}
