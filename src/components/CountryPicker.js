"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactCountryFlag from "react-country-flag";
import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import enLabels from "react-phone-number-input/locale/en";

export default function CountryPicker({ value, onChange, id = "country" }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const rootRef = useRef(null);

	const options = useMemo(() => {
		return getCountries()
			.map((code) => {
				try {
					const dial = `+${getCountryCallingCode(code)}`;
					const name = enLabels[code] ?? code;
					return { code, dial, name };
				} catch {
					return null;
				}
			})
			.filter(Boolean);
	}, []);

	const selected = useMemo(() => {
		return options.find((country) => country.code === value) ?? options[0];
	}, [options, value]);

	const filtered = useMemo(() => {
		const clean = query.trim().toLowerCase();
		if (!clean) {
			return options;
		}

		return options.filter((country) => {
			return (
				country.name.toLowerCase().includes(clean) ||
				country.code.toLowerCase().includes(clean) ||
				country.dial.includes(clean)
			);
		});
	}, [options, query]);

	useEffect(() => {
		const handleOutside = (event) => {
			if (!rootRef.current?.contains(event.target)) {
				setOpen(false);
			}
		};

		document.addEventListener("mousedown", handleOutside);
		return () => document.removeEventListener("mousedown", handleOutside);
	}, []);

	const chooseCountry = (code) => {
		onChange(code);
		setOpen(false);
		setQuery("");
	};

	return (
		<div ref={rootRef} className="relative">
			<label htmlFor={id} className="sr-only">
				Select country
			</label>
			<button
				type="button"
				
				id={id}
				onClick={() => setOpen((prev) => !prev)}
				className="flex h-14 w-full items-center justify-between rounded-4xl border border-black/45 bg-[#ffffff] px-5 text-left outline-none transition focus-visible:border-[#25d366]"
			>
				<span className="flex items-center gap-3 overflow-hidden">
					<ReactCountryFlag
						countryCode={selected?.code}
						svg
						style={{ width: "1.5em", height: "1.5em" }}
						title={selected?.name}
					/>
					<span className="truncate text-[1.15rem] text-[#111b21]">
						{selected?.name} ({selected?.dial})
					</span>
				</span>
				<span className={`text-xl text-[#111b21] transition-transform ${open ? "rotate-180" : "rotate-0"}`} aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
						<path
							stroke="#000000"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeMiterlimit="10"
							strokeWidth="1.5"
							d="M19.92 8.95l-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"
						/>
					</svg>
				</span>
			</button>

			{open ? (
				<div className="absolute z-30 mt-2 w-full rounded-3xl border border-black/20 bg-[#ececee] p-3 shadow-xl">
					<div className="relative">
						<input
							type="text"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search country"
							className="h-12 w-full rounded-full border-2 border-black/30 bg-transparent pl-11 pr-4 text-lg outline-none transition focus:border-[#25d366] placeholder:text-[#111b21]/50"
						/>
						<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
								<path
									d="M9.2 11.7h5M11.7 14.2v-5M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM22 22l-2-2"
									stroke="#000000"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</span>
					</div>

					<div
						className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
						style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
					>
						{filtered.length ? (
							filtered.map((country) => {
								const isSelected = country.code === value;
								return (
									<button
										key={country.code}
										type="button"
										onClick={() => chooseCountry(country.code)}
										className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-black/5"
									>
										<span className="flex items-center gap-3">
											<ReactCountryFlag
												countryCode={country.code}
												svg
												style={{ width: "1.4em", height: "1.4em" }}
												title={country.name}
											/>
											<span className="text-[1.05rem] text-[#111b21]">{country.name}</span>
										</span>
										<span className="text-[1.05rem] text-[#111b21]/70">{isSelected ? "✓" : country.dial}</span>
									</button>
								);
							})
						) : (
							<p className="px-3 py-4 text-[0.95rem] text-[#111b21]/70">No countries found.</p>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}