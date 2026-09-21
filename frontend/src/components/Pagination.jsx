// Pagination — compact page control for long lists (Outpass History).
// Windowed page numbers (1 2 3 … 10) so hundreds of pages never render
// hundreds of buttons. Pages are dynamic: page N simply slices the current
// newest-first sorted list — nothing is stored on the records.
const buildPageList = (page, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const wanted = new Set([1, 2, total - 1, total, page - 1, page, page + 1]);
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const list = [];
  let previous = 0;
  for (const p of sorted) {
    if (p - previous > 1) list.push('…');
    list.push(p);
    previous = p;
  }
  return list;
};

export default function Pagination({
  page,
  totalPages,
  onChange,
  label = 'Outpass history pages',
}) {
  if (!totalPages || totalPages <= 1) return null;

  const go = (next) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (clamped !== page) onChange(clamped);
  };

  return (
    <nav className="history-pagination" aria-label={label}>
      <button type="button" disabled={page <= 1} onClick={() => go(page - 1)}>
        ‹ Previous
      </button>
      {buildPageList(page, totalPages).map((entry, index) =>
        entry === '…' ? (
          <span
            key={`gap-${index}`}
            className="history-pagination__ellipsis"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-current={entry === page ? 'page' : undefined}
            onClick={() => go(entry)}
          >
            {entry}
          </button>
        )
      )}
      <button type="button" disabled={page >= totalPages} onClick={() => go(page + 1)}>
        Next ›
      </button>
    </nav>
  );
}