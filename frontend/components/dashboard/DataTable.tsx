'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell content. */
  render: (row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  /** Provide to make the column sortable by clicking its header. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Extra classes for the body cells, e.g. a max width. */
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
  /** Screen-reader label when `header` is empty (e.g. an actions column). */
  srHeader?: string;
}

export interface DataTableProps<T> {
  rows: ReadonlyArray<T>;
  columns: ReadonlyArray<Column<T>>;
  rowKey: (row: T) => string | number;
  title?: ReactNode;
  description?: ReactNode;
  /** Search box in the toolbar. Filtering itself is done by the caller. */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  /** Extra toolbar controls (filters, export buttons) shown on the right. */
  toolbar?: ReactNode;
  /** Show a "No" column with the running row number. */
  numbered?: boolean;
  emptyMessage?: ReactNode;
  /** Optional heading and button for the empty state, e.g. "Add your first employee". */
  emptyTitle?: ReactNode;
  emptyAction?: ReactNode;
  pageSizeOptions?: number[];
  initialPageSize?: number;
  onRowClick?: (row: T) => void;
  className?: string;
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

/**
 * The one table used across the dashboards: dark header row, numbered rows,
 * search/filters above, page numbers and page size below.
 */
export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  title,
  description,
  search,
  toolbar,
  numbered = true,
  emptyMessage = 'Nothing to show yet.',
  emptyTitle,
  emptyAction,
  pageSizeOptions = [10, 25, 50],
  initialPageSize = 10,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const get = column.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a) ?? '';
      const bv = get(b) ?? '';
      const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? result : -result;
    });
  }, [rows, columns, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Go back to page 1 whenever the result set or page size changes.
  useEffect(() => setPage(1), [total, pageSize]);
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  function toggleSort(key: string) {
    setSort((prev) => (prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));
  }

  // Page numbers: first, last, current ±1, with gaps.
  const pages = useMemo(() => {
    const set = new Set([1, pageCount, current - 1, current, current + 1].filter((p) => p >= 1 && p <= pageCount));
    const list = [...set].sort((a, b) => a - b);
    const out: Array<number | 'gap'> = [];
    list.forEach((p, i) => {
      if (i > 0 && p - list[i - 1] > 1) out.push('gap');
      out.push(p);
    });
    return out;
  }, [pageCount, current]);

  const hasToolbar = title || description || search || toolbar;

  return (
    <section className={cx('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs', className)}>
      {hasToolbar && (
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold text-navy-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <label className="relative">
                <span className="sr-only">{search.placeholder ?? 'Search'}</span>
                <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" /></svg>
                <input
                  type="search"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder ?? 'Search'}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-50 focus:outline-none sm:w-56"
                />
              </label>
            )}
            {toolbar}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-navy-950 text-white">
              {numbered && <th scope="col" className="w-14 px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase">No</th>}
              {columns.map((c) => {
                const sortable = Boolean(c.sortValue);
                const dir = sort?.key === c.key ? sort.dir : null;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}
                    className={cx('px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap uppercase', alignClass[c.align ?? 'left'], c.hideOnMobile && 'max-md:hidden')}
                  >
                    {sortable ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-brand-200">
                        {c.header}
                        <SortIcon dir={dir} />
                      </button>
                    ) : c.header || (c.srHeader && <span className="sr-only">{c.srHeader}</span>)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (numbered ? 1 : 0)} className="px-4 py-14 text-center">
                  {emptyTitle && <p className="text-base font-semibold text-navy-900">{emptyTitle}</p>}
                  <p className={cx('text-sm text-slate-500', Boolean(emptyTitle) && 'mt-1')}>{emptyMessage}</p>
                  {search?.value ? (
                    <button type="button" onClick={() => search.onChange('')} className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700">Clear search</button>
                  ) : emptyAction ? <div className="mt-4 flex justify-center">{emptyAction}</div> : null}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx('border-b border-slate-100 last:border-0', onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60')}
                >
                  {numbered && <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums">{start + i + 1}</td>}
                  {columns.map((c) => (
                    <td key={c.key} className={cx('px-4 py-3.5 align-middle text-slate-700', alignClass[c.align ?? 'left'], c.hideOnMobile && 'max-md:hidden', c.className)}>
                      {c.render(row, start + i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-500">Page {current} of {pageCount} • {total} total</p>
          <nav aria-label="Pagination" className="flex items-center gap-1.5">
            <PageButton label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}><Chevron dir="left" /></PageButton>
            {pages.map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-slate-400">...</span>
              ) : (
                <PageButton key={p} label={`Page ${p}`} active={p === current} onClick={() => setPage(p)}>{p}</PageButton>
              ),
            )}
            <PageButton label="Next page" disabled={current === pageCount} onClick={() => setPage(current + 1)}><Chevron dir="right" /></PageButton>
          </nav>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span className="sr-only">Rows per page</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-600 focus:outline-none">
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n} per page</option>)}
            </select>
          </label>
        </div>
      )}
    </section>
  );
}

function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  return (
    <svg viewBox="0 0 12 16" className="size-3 text-slate-400" aria-hidden="true" fill="currentColor">
      <path d="M6 2 10 7H2z" opacity={dir === 'desc' ? 0.35 : 1} className={dir === 'asc' ? 'text-white' : undefined} />
      <path d="M6 14 2 9h8z" opacity={dir === 'asc' ? 0.35 : 1} />
    </svg>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'} />
    </svg>
  );
}

function PageButton({ children, onClick, active, disabled, label }: { children: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'grid size-8 place-items-center rounded-full text-sm font-medium transition-colors disabled:opacity-40',
        active ? 'bg-navy-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {children}
    </button>
  );
}

/** Round avatar with initials, used in table name cells. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return <span className={cx('grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700', className)}>{initials}</span>;
}

/** Name + secondary line, the standard first cell of a row. */
export function NameCell({ name, sub }: { name: string; sub?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="truncate font-medium text-navy-900">{name}</p>
        {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}
