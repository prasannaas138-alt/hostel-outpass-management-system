// Pagination footer for long lists (Outpass History) - ALWAYS visible.
// Left: "Showing X - Y of N outpasses" (computed from the current page).
// Right: compact prev/pages/next controls (windowed numbers, e.g. 1 2 3 ... 10).
// Pages are dynamic - page N simply slices the current newest-first sorted
// list (30 per page); nothing is stored on the records.
const PAGE_SIZE = 30;

const buildPageList = (page, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const wanted = new Set([1, 2, total - 1, total, page - 1, page, page + 1]);
  const sorted = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const list = [];
  let previous = 0;
  for (const p of sorted) {
    if (p - previous > 1) list.push('...');
    list.push(p);
    previous = p;
  }
  return list;
};

export default function Pagination({
  page,
  totalPages,
  onChange,
  total = 0,
  // Records per page for the Showing X - Y range. Defaults to 30
  // (student history); the redesigned Outpass History passes 15.
  pageSize = PAGE_SIZE,
  label = 'Outpass history pages',
}) {
  // Never hidden - even a single page (or zero records) shows the footer.
  const pages = Math.max(1, Math.ceil(Number(totalPages) || 0));
  const displayStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const displayEnd = Math.min(page * pageSize, total);

  const go = (next) => {
    const clamped = Math.min(Math.max(1, next), pages);
    if (clamped !== page) onChange(clamped);
  };

  return (
    <div className="history-pagination">
      <p className="history-pagination__info">
        Showing {displayStart} - {displayEnd} of {total} outpasses
      </p>
      <nav className="history-pagination__pages" aria-label={label}>
        <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Previous page">
          {'<'}
        </button>
        {buildPageList(page, pages).map((entry, index) =>
          entry === '...' ? (
            <span key={`gap-${index}`} className="history-pagination__ellipsis" aria-hidden="true">
              ...
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
        <button type="button" disabled={page >= pages} onClick={() => go(page + 1)} aria-label="Next page">
          {'>'}
        </button>
      </nav>
    </div>
  );
}
