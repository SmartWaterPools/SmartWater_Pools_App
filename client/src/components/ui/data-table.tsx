import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DataTableFilter, FilterBadge } from "./data-table-filter"

// Helper interfaces for our DataTable component
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableFilters?: boolean
  enableColumnVisibility?: boolean
  enablePagination?: boolean
  enableGlobalFilter?: boolean
}

// Main DataTable component
export function DataTable<TData, TValue>({
  columns,
  data,
  enableFilters = true,
  enableColumnVisibility = true,
  enablePagination = true,
  enableGlobalFilter = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Create the table instance
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  // Handler for global filter input
  const handleGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setGlobalFilter(value)
  }

  // Helper to clear all filters
  const clearAllFilters = () => {
    setColumnFilters([])
    setGlobalFilter("")
  }

  // Active filters section
  const activeFilters = React.useMemo(() => {
    return columnFilters.map(filter => {
      const column = table.getColumn(filter.id)
      const columnDef = column?.columnDef
      return {
        id: filter.id,
        column: columnDef?.header as string || filter.id,
        value: filter.value,
      }
    })
  }, [columnFilters, table])

  // Render the active filters row
  const renderActiveFilters = () => {
    if (activeFilters.length === 0) return null

    return (
      <div className="flex flex-wrap items-center gap-2 p-2 mb-2 bg-muted/20 rounded-md">
        {activeFilters.map((filter, index) => (
          <FilterBadge
            key={`${filter.id}-${index}`}
            filter={{ id: filter.id, value: filter.value, operator: "equals" }}
            label={filter.column}
            onRemove={() => {
              table.getColumn(filter.id)?.setFilterValue(undefined)
            }}
          />
        ))}
        {activeFilters.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="h-7 px-2 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>
    )
  }

  // Render filter UI for a column
  const renderColumnFilter = (column: any) => {
    if (!column.getCanFilter()) return null
    
    return (
      <DataTableFilter 
        column={column} 
        title={column.columnDef.header} 
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search input and filters */}
      {enableGlobalFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search all columns..."
              value={globalFilter}
              onChange={handleGlobalFilterChange}
              className="h-8 w-full"
            />
          </div>
          {enableFilters && (
            <div className="flex flex-wrap items-center gap-1">
              {table.getAllColumns()
                .filter(column => column.getCanFilter())
                .map(column => (
                  <div key={column.id}>
                    {renderColumnFilter(column)}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Active filters section */}
      {renderActiveFilters()}

      {/* The data table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {enablePagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}