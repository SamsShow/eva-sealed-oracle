/** EVA's mark — a glossy white body with cyan→blue scan eyes. */
export function EvaMark({ size = 52 }: { size?: number }) {
  return (
    <span
      className="eva-mark inline-flex items-center justify-center"
      style={{ width: size, height: size * 0.82 }}
      aria-hidden
    >
      <span className="flex items-center" style={{ gap: size * 0.1, width: "58%" }}>
        <span
          className="eva-eye flex-1"
          style={{ height: size * 0.16 }}
        />
        <span
          className="eva-eye flex-1"
          style={{ height: size * 0.16, animationDelay: "0.3s" }}
        />
      </span>
    </span>
  );
}
