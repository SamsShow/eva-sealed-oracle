export function ProvenanceFooter() {
  const accountId = process.env.NEXT_PUBLIC_MEMWAL_ACCOUNT_ID;
  const explorer = accountId
    ? `https://suiscan.xyz/mainnet/object/${accountId}`
    : null;

  return (
    <footer className="mt-12 border-t border-[color:var(--line)] pt-6 text-xs text-faint">
      <p className="max-w-2xl leading-relaxed">
        Every prediction, lesson and dossier is a memory in EVA&apos;s{" "}
        <span className="font-medium text-[color:var(--seed)]">
          MemWalAccount
        </span>{" "}
        on Sui mainnet — encrypted blobs on Walrus. Memory is the seedling: proof
        that what was learned persists.
      </p>
      {explorer ? (
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 font-medium text-[color:var(--accent)] hover:underline"
        >
          View EVA&apos;s memory on the Sui explorer
          <span className="mono text-faint">
            ({accountId?.slice(0, 10)}…)
          </span>
          ↗
        </a>
      ) : (
        <p className="mt-3 text-faint">
          Set NEXT_PUBLIC_MEMWAL_ACCOUNT_ID to show the explorer link.
        </p>
      )}
    </footer>
  );
}
