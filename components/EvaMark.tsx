/** EVA's mark — a sleek white "head" with a cyan scan line. */
export function EvaMark({ size = 44 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-[40%] bg-white shadow-[0_0_24px_rgba(56,189,248,0.45)]"
      style={{ width: size, height: size * 0.78 }}
      aria-hidden
    >
      <span className="flex gap-[18%]" style={{ width: "62%" }}>
        <span className="h-2 flex-1 rounded-full bg-sky-400 animate-pulse" />
        <span className="h-2 flex-1 rounded-full bg-sky-400 animate-pulse" />
      </span>
    </span>
  );
}
