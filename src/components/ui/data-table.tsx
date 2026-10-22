import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "./icons";
import { Skeleton } from "./skeleton";

export type SortDirection = "asc" | "desc";
export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface Column<T> {
  id: string;
  header: string;
  /** Hide the header text visually, e.g. for an actions column. */
  srOnlyHeader?: boolean;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. */
  sortValue?: (row: T) => string | number | bigint;
  /** Direction used when the user first sorts by this column. */
  firstDirection?: SortDirection;
  align?: "start" | "end";
  className?: string;
}

interface DataTableProps<T> {
  /** Accessible name of the table. */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  loading?: boolean;
  /** Shown in place of rows when there are none. */
  empty?: ReactNode;
}

/**
 * A real <table>: screen readers get rows, columns and sort state for free.
 * Sortable headers are buttons with aria-sort. To make a whole row clickable,
 * put one link in it with `stretchedLink`: keyboard users tab to that link,
 * mouse users can click anywhere on the row.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  sort,
  onSortChange,
  loading,
  empty,
}: DataTableProps<T>) {
  const sorted = sort ? sortRows(rows, columns, sort) : rows;

  return (
    <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
      <table
        className="w-full min-w-180 border-collapse text-left text-sm"
        aria-busy={loading || undefined}
      >
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-muted text-text-muted">
          <tr>
            {columns.map((column) => (
              <HeaderCell
                key={column.id}
                column={column}
                sort={sort}
                onSortChange={onSortChange}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((column) => (
                  <td key={column.id} className="px-4 py-3.5">
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr className="border-t border-border">
              <td colSpan={columns.length} className="px-4 py-12">
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={getRowKey(row)}
                className="relative border-t border-border transition-colors hover:bg-surface-muted focus-within:bg-surface-muted"
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      "px-4 py-3 align-top",
                      column.align === "end" && "text-right",
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Add to the one link in a row to make the whole row clickable. */
export const stretchedLink = "after:absolute after:inset-0 after:content-['']";

function HeaderCell<T>({
  column,
  sort,
  onSortChange,
}: {
  column: Column<T>;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
}) {
  const active = sort?.columnId === column.id ? sort.direction : undefined;
  const align = column.align === "end" ? "text-right" : "text-left";
  const label = (
    <span className={column.srOnlyHeader ? "sr-only" : undefined}>
      {column.header}
    </span>
  );

  if (!column.sortValue || !onSortChange) {
    return (
      <th scope="col" className={cn("px-4 py-2.5 text-xs font-medium", align)}>
        {label}
      </th>
    );
  }

  const next: SortDirection = active
    ? active === "asc"
      ? "desc"
      : "asc"
    : (column.firstDirection ?? "asc");
  const SortIcon =
    active === "asc"
      ? ArrowUpIcon
      : active === "desc"
        ? ArrowDownIcon
        : ArrowUpDownIcon;

  return (
    <th
      scope="col"
      aria-sort={
        active === "asc"
          ? "ascending"
          : active === "desc"
            ? "descending"
            : undefined
      }
      className={cn("px-2 py-1.5 text-xs font-medium", align)}
    >
      <button
        type="button"
        onClick={() => onSortChange({ columnId: column.id, direction: next })}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-surface hover:text-text",
          column.align === "end" && "flex-row-reverse",
          active && "text-text",
        )}
      >
        {label}
        <SortIcon size={14} className={active ? undefined : "opacity-60"} />
      </button>
    </th>
  );
}

export function sortRows<T>(
  rows: T[],
  columns: Column<T>[],
  sort: SortState,
): T[] {
  const column = columns.find((c) => c.id === sort.columnId);
  if (!column?.sortValue) return rows;
  const value = column.sortValue;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    const order =
      typeof x === "string" && typeof y === "string"
        ? x.localeCompare(y)
        : x < y
          ? -1
          : x > y
            ? 1
            : 0;
    return order * factor;
  });
}
