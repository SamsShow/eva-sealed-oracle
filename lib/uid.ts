"use client";

/** Per-browser anonymous id for the single-player MVP (no login). */
export function getUid(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("eva:uid");
  if (!id) {
    id = `u_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("eva:uid", id);
  }
  return id;
}
