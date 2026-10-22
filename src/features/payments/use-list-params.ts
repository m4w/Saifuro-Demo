"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { SortState } from "@/components/ui/data-table";

let lastList = { href: "/approvals", label: "Approval queue" };

/** The list the user last looked at, with its filters, for "Back to …" links. */
export function getLastList() {
  return lastList;
}

/**
 * Filters and sort order live in the URL, so they survive reloads, can be
 * shared, and come back when the user returns to the list.
 */
export function useListParams(defaultSort: SortState, list: { label: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    lastList = {
      href: window.location.pathname + window.location.search,
      label: list.label,
    };
  }, [searchParams, list.label]);

  const dir = searchParams.get("dir");
  const sort: SortState = {
    columnId: searchParams.get("sort") ?? defaultSort.columnId,
    direction: dir === "asc" || dir === "desc" ? dir : defaultSort.direction,
  };

  function update(changes: Record<string, string | null>) {
    // Start from the live URL: React's copy can be a keystroke behind.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    // Next.js syncs native history updates with useSearchParams, without a server round trip.
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  }

  return {
    get: (key: string) => searchParams.get(key) ?? "",
    sort,
    setSort: (s: SortState) => update({ sort: s.columnId, dir: s.direction }),
    update,
  };
}
