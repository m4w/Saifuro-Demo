import { useState } from "react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DataTable, type Column, type SortState } from "./data-table";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: "a", name: "Bravo", amount: 300 },
  { id: "b", name: "Alpha", amount: 1200 },
  { id: "c", name: "Charlie", amount: 45 },
];

const columns: Column<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
  {
    id: "amount",
    header: "Amount",
    cell: (r) => r.amount,
    sortValue: (r) => r.amount,
    firstDirection: "desc",
    align: "end",
  },
  { id: "note", header: "Note", cell: () => "–" },
];

function SortableTable({ data = rows }: { data?: Row[] }) {
  const [sort, setSort] = useState<SortState>({
    columnId: "name",
    direction: "asc",
  });
  return (
    <DataTable
      caption="Test rows"
      columns={columns}
      rows={data}
      getRowKey={(r) => r.id}
      sort={sort}
      onSortChange={setSort}
      empty={<p>Nothing here</p>}
    />
  );
}

const firstCells = () =>
  [...document.querySelectorAll("tbody tr")].map(
    (tr) => tr.querySelector("td")?.textContent,
  );

describe("DataTable", () => {
  it("is a named table with sortable column headers", async () => {
    const screen = await render(<SortableTable />);
    await expect
      .element(screen.getByRole("table", { name: "Test rows" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("columnheader", { name: "Name" }))
      .toHaveAttribute("aria-sort", "ascending");
    await expect
      .element(screen.getByRole("columnheader", { name: "Amount" }))
      .not.toHaveAttribute("aria-sort");
    // Columns without sortValue have no button.
    expect(
      screen.getByRole("button", { name: "Note" }).elements(),
    ).toHaveLength(0);
    expect(firstCells()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorts with the keyboard, starting in the column's preferred direction", async () => {
    const screen = await render(<SortableTable />);
    const amount = screen.getByRole("button", { name: "Amount" });

    await userEvent.click(screen.getByRole("button", { name: "Name" })); // toggles Name to descending
    expect(firstCells()).toEqual(["Charlie", "Bravo", "Alpha"]);

    (amount.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect
      .element(screen.getByRole("columnheader", { name: "Amount" }))
      .toHaveAttribute("aria-sort", "descending");
    expect(firstCells()).toEqual(["Alpha", "Bravo", "Charlie"]); // 1200, 300, 45

    await userEvent.keyboard(" ");
    await expect
      .element(screen.getByRole("columnheader", { name: "Amount" }))
      .toHaveAttribute("aria-sort", "ascending");
    expect(firstCells()).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("shows the empty state in place of rows", async () => {
    const screen = await render(<SortableTable data={[]} />);
    await expect.element(screen.getByText("Nothing here")).toBeVisible();
  });

  it("marks the table busy while loading", async () => {
    const screen = await render(
      <DataTable
        caption="Loading rows"
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        loading
      />,
    );
    await expect
      .element(screen.getByRole("table", { name: "Loading rows" }))
      .toHaveAttribute("aria-busy", "true");
  });
});
