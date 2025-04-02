import * as React from "react"
import { X } from "lucide-react"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFilters } from "./data-table-filters"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  filterableColumns?: {
    id: string
    title: string
    options?: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
    operators?: {
      label: string
      value: string
    }[]
    type?: "text" | "number" | "date" | "select" | "multi-select"
    placeholder?: string
  }[]
  searchableColumns?: {
    id: string
    title: string
  }[]
  globalSearchPlaceholder?: string
}

export function DataTableToolbar<TData>({
  table,
  filterableColumns = [],
  searchableColumns = [],
  globalSearchPlaceholder = "Search all columns..."
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const [globalFilter, setGlobalFilter] = React.useState<string>("")

  // Handle global filter input
  const handleGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilter(e.target.value)
    table.setGlobalFilter(e.target.value)
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-2 md:flex-row">
        {/* Global search */}
        <div className="flex-1">
          <Input
            placeholder={globalSearchPlaceholder}
            value={globalFilter}
            onChange={handleGlobalFilterChange}
            className="h-8 w-full"
          />
        </div>
      </div>

      {/* Filters */}
      {filterableColumns.length > 0 && (
        <DataTableFilters table={table} filters={filterableColumns} />
      )}
    </div>
  )
}