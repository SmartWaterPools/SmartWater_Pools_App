import * as React from "react"
import { X } from "lucide-react"
import { Column, Table } from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { FilterOperator, FilterBadge } from "./data-table-filter"

// Filter type for DataTableFilters component
export interface DataTableFilter {
  id: string
  label: string
  value: any
  operator: FilterOperator
}

// Props for DataTableFilters component
interface DataTableFiltersProps<TData> {
  table: Table<TData>
  filters: {
    id: string
    title: string
    options?: {
      label: string
      value: string
      icon?: React.ComponentType<{ className?: string }>
    }[]
    operators?: {
      label: string
      value: FilterOperator
    }[]
    type?: "text" | "number" | "date" | "select" | "multi-select"
    placeholder?: string
  }[]
}

// Main DataTableFilters component
export function DataTableFilters<TData>({
  table,
  filters
}: DataTableFiltersProps<TData>) {
  const [open, setOpen] = React.useState(false)
  const [selectedFilter, setSelectedFilter] = React.useState<string | null>(null)
  const [selectedOperator, setSelectedOperator] = React.useState<FilterOperator>("contains")
  const [filterValue, setFilterValue] = React.useState<string>("")
  
  // Get all column filters currently applied
  const columnFilters = table.getState().columnFilters

  // Handle filter selection
  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId)
    
    // Find the appropriate filter configuration
    const filterConfig = filters.find(f => f.id === filterId)
    
    // Set default operator based on filter type
    if (filterConfig) {
      const defaultOperator = filterConfig.operators && filterConfig.operators.length > 0
        ? filterConfig.operators[0].value
        : filterConfig.type === "select" || filterConfig.type === "multi-select"
          ? "equals"
          : "contains"
      
      setSelectedOperator(defaultOperator)
    }
  }
  
  // Handle operator selection
  const handleOperatorSelect = (operator: FilterOperator) => {
    setSelectedOperator(operator)
  }
  
  // Apply the selected filter
  const applyFilter = () => {
    if (!selectedFilter || !filterValue) return
    
    const column = table.getColumn(selectedFilter)
    if (!column) return
    
    // Apply the filter based on the operator and type
    const filterConfig = filters.find(f => f.id === selectedFilter)
    
    if (filterConfig?.type === "multi-select") {
      column.setFilterValue(filterValue.split(','))
    } else {
      column.setFilterValue(filterValue)
    }
    
    // Reset filter form
    setFilterValue("")
    setOpen(false)
  }
  
  // Clear all filters
  const clearAllFilters = () => {
    table.resetColumnFilters()
  }
  
  // Remove specific filter
  const removeFilter = (columnId: string) => {
    const column = table.getColumn(columnId)
    if (column) {
      column.setFilterValue(undefined)
    }
  }
  
  // Transform column filters to DataTableFilter format for rendering
  const activeFilters: DataTableFilter[] = React.useMemo(() => {
    return columnFilters.map(filter => {
      const column = table.getColumn(filter.id)
      const columnDef = column?.columnDef
      const filterConfig = filters.find(f => f.id === filter.id)
      
      return {
        id: filter.id,
        label: filterConfig?.title || columnDef?.header as string || filter.id,
        value: filter.value,
        operator: "contains" // Default operator
      }
    })
  }, [columnFilters, table, filters])
  
  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 border-dashed">
              <span>Add filter</span>
              <X className="ml-2 h-4 w-4 opacity-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Find filter..." />
              <CommandList>
                <CommandEmpty>No filters found.</CommandEmpty>
                <CommandGroup>
                  {filters.map((filter) => (
                    <CommandItem
                      key={filter.id}
                      onSelect={() => handleFilterSelect(filter.id)}
                    >
                      {filter.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            
            {selectedFilter && (
              <>
                <Separator />
                <div className="p-2">
                  <div className="flex flex-col gap-2">
                    {/* Selected filter */}
                    <div className="text-sm font-medium">
                      {filters.find(f => f.id === selectedFilter)?.title}
                    </div>
                    
                    {/* Operator selection */}
                    <div className="grid gap-2">
                      <Command>
                        <CommandInput placeholder="Select operator..." />
                        <CommandList>
                          <CommandEmpty>No operators found.</CommandEmpty>
                          <CommandGroup>
                            {filters
                              .find(f => f.id === selectedFilter)
                              ?.operators?.map((operator) => (
                                <CommandItem
                                  key={operator.value}
                                  onSelect={() => handleOperatorSelect(operator.value)}
                                >
                                  {operator.label}
                                </CommandItem>
                              )) || (
                                <CommandItem onSelect={() => handleOperatorSelect("contains")}>
                                  Contains
                                </CommandItem>
                              )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                    
                    {/* Value input */}
                    <div className="grid gap-2">
                      {filters.find(f => f.id === selectedFilter)?.type === "select" ? (
                        <Command>
                          <CommandInput placeholder="Select value..." />
                          <CommandList>
                            <CommandEmpty>No options found.</CommandEmpty>
                            <CommandGroup>
                              {filters
                                .find(f => f.id === selectedFilter)
                                ?.options?.map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    onSelect={() => setFilterValue(option.value)}
                                  >
                                    {option.label}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      ) : (
                        <Input
                          placeholder={filters.find(f => f.id === selectedFilter)?.placeholder || "Enter value..."}
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          className="h-8"
                        />
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={applyFilter}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
        
        {/* Display active filters */}
        {activeFilters.map((filter, idx) => (
          <FilterBadge
            key={`${filter.id}-${idx}`}
            filter={filter}
            label={filter.label}
            onRemove={() => removeFilter(filter.id)}
          />
        ))}
        
        {/* Clear all filters button */}
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-2 lg:px-3"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}