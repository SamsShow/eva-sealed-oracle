export function ProvenanceFooter() {
  const accountId = process.env.NEXT_PUBLIC_MEMWAL_ACCOUNT_ID;
  const explorer = accountId
    ? `https://suiscan.xyz/mainnet/object/${accountId}`
    : null;

  return (
    <footer className="mt-10 border-t border-zinc-900 pt-5 text-xs text-zinc-500">
      <p>
        Every prediction, lesson and dossier is a memory in EVA&apos;s{" "}
        <span className="text-emerald-400">MemWalAccount</span> on Sui mainnet —
        encrypted blobs on Walrus. Memory is the seedling: proof that what was
        learned persists.
      </p>
      {explorer ? (
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sky-400 hover:underline"
        >
          View EVA&apos;s memory on the Sui explorer ↗ ({accountId?.slice(0, 10)}…)
        </a>
      ) : (
        <p className="mt-2 text-zinc-600">
          Set NEXT_PUBLIC_MEMWAL_ACCOUNT_ID to show the explorer link.
        </p>
      )}
    </footer>
  );
}
