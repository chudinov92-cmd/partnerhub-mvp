import { useIsLgUp as e } from "@/hooks/useIsLgUp";
import { useCallback as t, useEffect as n, useLayoutEffect as r, useMemo as i, useRef as a, useState as o } from "react";
import { createPortal as s } from "react-dom";
import { useVisualViewportLayout as c } from "@/hooks/useMobileKeyboardInset";
import { Fragment as l, jsx as u, jsxs as d } from "react/jsx-runtime";
import f from "focus-trap-react";
import { useOverlayBodyLock as p } from "@/hooks/useOverlayBodyLock";
//#region src/lib/SelectOptionList.tsx
function m({ options: e, value: t, onSelect: n, variant: r = "default", listHeader: i, emptyHint: a, emptyMessage: o = "Ничего не найдено", listRef: s, compact: c = !1 }) {
	let f = r === "profile";
	return /* @__PURE__ */ d(l, { children: [
		i,
		a,
		e.length === 0 ? /* @__PURE__ */ u("p", {
			className: c ? "px-2 py-1 text-[11px] text-slate-400" : "px-3 py-2 text-sm text-slate-400",
			children: o
		}) : null,
		e.map((e) => {
			let r = e.value === (t ?? "");
			return /* @__PURE__ */ u("button", {
				type: "button",
				onClick: () => n(e.value),
				className: "flex w-full items-center rounded-lg text-left hover:bg-slate-50 " + (c ? "min-h-9 px-2 py-1.5 text-sm" : "min-h-11 px-3 py-2.5 text-sm") + (f ? r ? " bg-[#009966]/15 text-[#009966]" : " text-slate-800 hover:bg-[#009966]/10" : r ? " bg-sky-50 text-sky-800" : " text-slate-700"),
				children: /* @__PURE__ */ u("span", {
					className: "truncate",
					children: e.label
				})
			}, e.value || "__empty__");
		})
	] });
}
//#endregion
//#region src/lib/SelectSearchField.tsx
function h({ value: e, onChange: t, placeholder: r, variant: i = "default", autoFocusOnDesktop: s = !1 }) {
	let c = a(null), [l, d] = o(!1), f = a(!1), p = i === "profile";
	n(() => {
		f.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
	}, []), n(() => {
		l && c.current && c.current.focus({ preventScroll: !0 });
	}, [l]), n(() => {
		s && c.current && (f.current || c.current.focus({ preventScroll: !0 }));
	}, [s]);
	let m = "h-11 w-full rounded-full border px-3 text-base text-slate-900 placeholder:text-slate-400 outline-none lg:h-9 lg:px-3 lg:text-sm " + (p ? "border-gray-200 focus:border-[#009966] focus:ring-1 focus:ring-[#009966]" : "border-slate-200 focus:border-sky-400 focus:ring-1 focus:ring-sky-400"), h = "flex h-11 w-full items-center rounded-full border px-3 text-base text-slate-400 lg:h-9 lg:px-3 lg:text-sm " + (p ? "border-gray-200" : "border-slate-200");
	return f.current && !l ? /* @__PURE__ */ u("div", {
		role: "button",
		tabIndex: -1,
		onClick: () => d(!0),
		className: h,
		children: r
	}) : /* @__PURE__ */ u("input", {
		ref: c,
		value: e,
		onChange: (e) => t(e.target.value),
		placeholder: r,
		className: m
	});
}
//#endregion
//#region src/lib/types.ts
function g(e, t) {
	let n = t.trim().toLowerCase();
	return !n || e.label.toLowerCase().includes(n);
}
function _(e, t) {
	return !!e || t > 8;
}
//#endregion
//#region src/lib/DesktopSelectMenu.tsx
function v({ open: e, onClose: l, anchorRef: f, options: p, value: v, onSelect: y, searchable: b, searchPlaceholder: x = "Найти", variant: S = "default", listHeader: C, emptyHint: w, renderListExtras: T, emptyMessage: E, menuClassName: D, filterOption: O = g }) {
	let [k, A] = o(""), [j, M] = o(!1), N = a(null), P = a(null), F = a(!1), [I, L] = o(null), { height: R } = c(), z = _(b, p.length), B = S === "profile";
	n(() => {
		F.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
	}, []);
	let V = t(() => {
		let e = f.current;
		if (!e) return;
		let t = e.getBoundingClientRect(), n = t.bottom + 6, r = Math.max(120, R - n - 12), i = Math.min(560, window.innerHeight * .4, r);
		L({
			top: n,
			left: t.left,
			width: t.width,
			maxHeight: i
		});
	}, [f, R]);
	r(() => {
		e && V();
	}, [
		e,
		V,
		p.length
	]), n(() => {
		if (!e) return;
		let t = () => V();
		window.addEventListener("resize", t), window.addEventListener("scroll", t, !0);
		let n = window.visualViewport;
		return n?.addEventListener("resize", t), n?.addEventListener("scroll", t), () => {
			window.removeEventListener("resize", t), window.removeEventListener("scroll", t, !0), n?.removeEventListener("resize", t), n?.removeEventListener("scroll", t);
		};
	}, [e, V]), n(() => {
		e || (A(""), M(!1), L(null));
	}, [e]), n(() => {
		if (!e) return;
		let t = (e) => {
			let t = e.target;
			f.current?.contains(t) || N.current?.contains(t) || l();
		}, n = (e) => {
			e.key === "Escape" && l();
		};
		return document.addEventListener("mousedown", t), document.addEventListener("keydown", n), () => {
			document.removeEventListener("mousedown", t), document.removeEventListener("keydown", n);
		};
	}, [
		e,
		l,
		f
	]), n(() => {
		e && z && (F.current || M(!0));
	}, [e, z]), n(() => {
		if (!e) return;
		let t = P.current;
		if (!t) return;
		let n = () => {
			let e = document.activeElement;
			e instanceof HTMLInputElement && e.blur();
		};
		return t.addEventListener("touchstart", n, { passive: !0 }), () => t.removeEventListener("touchstart", n);
	}, [e]);
	let H = i(() => !z || !k.trim() ? p : p.filter((e) => O(e, k)), [
		p,
		k,
		z,
		O
	]);
	return !e || typeof document > "u" || !I ? null : s(/* @__PURE__ */ d("div", {
		ref: N,
		className: "pointer-events-auto fixed z-[2050] rounded-xl border bg-white p-1 shadow-xl " + (B ? "border-gray-200" : "border-slate-200") + (D ?? ""),
		style: {
			top: I.top,
			left: I.left,
			width: I.width
		},
		onMouseDown: (e) => e.stopPropagation(),
		children: [z ? /* @__PURE__ */ u("div", {
			className: "px-2 pb-1",
			children: F.current && !j ? /* @__PURE__ */ u("div", {
				role: "button",
				tabIndex: -1,
				onClick: () => M(!0),
				className: "flex h-9 w-full items-center rounded-full border px-3 text-sm text-slate-400 " + (B ? "border-gray-200" : "border-slate-200"),
				children: x
			}) : /* @__PURE__ */ u(h, {
				value: k,
				onChange: A,
				placeholder: x,
				variant: S,
				autoFocusOnDesktop: !0
			})
		}) : null, /* @__PURE__ */ u("div", {
			ref: P,
			className: "overflow-y-auto overscroll-contain",
			style: { maxHeight: I.maxHeight },
			children: /* @__PURE__ */ u(m, {
				options: H,
				value: v,
				onSelect: (e) => {
					y(e), l();
				},
				variant: S,
				listHeader: C,
				emptyHint: T?.({
					search: k,
					visibleOptions: H
				}) ?? w,
				emptyMessage: E,
				compact: !0
			})
		})]
	}), document.body);
}
//#endregion
//#region src/lib/MobileSelectSheet.tsx
function y({ open: e, onClose: t, title: r, options: l, value: v, onSelect: y, searchable: b, searchPlaceholder: x = "Найти", variant: S = "default", listHeader: C, emptyHint: w, renderListExtras: T, emptyMessage: E, menuClassName: D, filterOption: O = g }) {
	let [k, A] = o(""), j = a(null), { offsetTop: M, height: N } = c(), P = _(b, l.length);
	p(e), n(() => {
		e || A("");
	}, [e]), n(() => {
		if (!e) return;
		let n = (e) => {
			e.key === "Escape" && t();
		};
		return document.addEventListener("keydown", n), () => document.removeEventListener("keydown", n);
	}, [e, t]), n(() => {
		if (!e) return;
		let t = j.current;
		if (!t) return;
		let n = (e) => {
			if (e.target?.closest("input")) return;
			let t = document.activeElement;
			t instanceof HTMLInputElement && t.blur();
		};
		return t.addEventListener("touchstart", n, { passive: !0 }), () => t.removeEventListener("touchstart", n);
	}, [e]);
	let F = i(() => !P || !k.trim() ? l : l.filter((e) => O(e, k)), [
		l,
		k,
		P,
		O
	]);
	return !e || typeof document > "u" ? null : s(/* @__PURE__ */ u("div", {
		className: "fixed inset-0 z-[2050] bg-slate-900/50",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "mobile-select-sheet-title",
		onClick: t,
		children: /* @__PURE__ */ u(f, {
			active: e,
			focusTrapOptions: {
				allowOutsideClick: !0,
				clickOutsideDeactivates: !1,
				escapeDeactivates: !1,
				returnFocusOnDeactivate: !0
			},
			children: /* @__PURE__ */ d("div", {
				className: "fixed flex w-full flex-col overflow-hidden border-gray-200 bg-white shadow-xl " + (D ?? ""),
				style: {
					top: M,
					left: 0,
					right: 0,
					bottom: "auto",
					height: Math.max(N, 200)
				},
				onClick: (e) => e.stopPropagation(),
				children: [/* @__PURE__ */ d("div", {
					className: "shrink-0 border-b border-slate-100 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]",
					children: [/* @__PURE__ */ d("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ u("h2", {
							id: "mobile-select-sheet-title",
							className: "min-w-0 truncate text-base font-semibold text-slate-900",
							children: r
						}), /* @__PURE__ */ u("button", {
							type: "button",
							onClick: t,
							className: "shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600",
							"aria-label": "Закрыть",
							children: "✕"
						})]
					}), P ? /* @__PURE__ */ u("div", {
						className: "mt-3",
						children: /* @__PURE__ */ u(h, {
							value: k,
							onChange: A,
							placeholder: x,
							variant: S
						})
					}) : null]
				}), /* @__PURE__ */ u("div", {
					ref: j,
					className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1",
					children: /* @__PURE__ */ u(m, {
						options: F,
						value: v,
						onSelect: (e) => {
							y(e), t();
						},
						variant: S,
						listHeader: C,
						emptyHint: T?.({
							search: k,
							visibleOptions: F
						}) ?? w,
						emptyMessage: E
					})
				})]
			})
		})
	}), document.body);
}
//#endregion
//#region src/lib/SelectOverlay.tsx
function b({ title: t, anchorRef: n, ...r }) {
	let i = e();
	return i === null ? null : i ? /* @__PURE__ */ u(v, {
		anchorRef: n,
		...r
	}) : /* @__PURE__ */ u(y, {
		title: t,
		...r
	});
}
//#endregion
export { v as DesktopSelectMenu, y as MobileSelectSheet, m as SelectOptionList, b as SelectOverlay, h as SelectSearchField, g as defaultFilterOption, _ as shouldShowSearch };
