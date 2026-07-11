import React, { useState } from "react";
import { Icono } from "../icons";
import { Button } from "../button";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Buscar registros...",
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const itemsPerPage = 8;
  const Search = Icono.Search;
  const Up = Icono.ChevronUp;
  const Down = Icono.ChevronDown;

  const filteredData = React.useMemo(() => {
    if (!searchKey || !searchQuery) return data;
    return data.filter((item) => {
      const val = item[searchKey];
      return String(val || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });
  }, [data, searchKey, searchQuery]);

  const sortedData = React.useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey as keyof T];
      const valB = b[sortKey as keyof T];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const comparison = String(valA).localeCompare(String(valB), undefined, {
        numeric: true,
      });
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortOrder]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {searchKey && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pr-4 pl-10 text-sm text-zinc-100 placeholder-zinc-600 transition-all focus:border-[#10B981] focus:outline-none"
          />
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-2xl border border-[#2A2A2E] bg-[#18181B] shadow-xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#2A2A2E] bg-[#111113]/30">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  className={`px-5 py-3 text-xs font-bold tracking-wider text-zinc-400 uppercase ${
                    col.sortable
                      ? "cursor-pointer select-none hover:text-zinc-200"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable &&
                      sortKey === String(col.key) &&
                      (sortOrder === "asc" ? (
                        <Up className="h-3.5 w-3.5" />
                      ) : (
                        <Down className="h-3.5 w-3.5" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-zinc-500"
                >
                  Sin registros encontrados.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={(item.id as string | undefined) || idx}
                  className="border-b border-[#2A2A2E]/60 transition-all last:border-b-0 hover:bg-[#232326]/30"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-5 py-3.5 text-sm text-zinc-300"
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key as keyof T] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-medium text-zinc-500">
            Página {currentPage} de {totalPages} ({filteredData.length}{" "}
            registros)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1 text-xs"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="px-3 py-1 text-xs"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
