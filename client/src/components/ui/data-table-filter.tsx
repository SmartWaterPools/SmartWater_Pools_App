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

// Filter operators
export type FilterOperator = "equals" | "contains" | "startsWith" | "endsWith" | "between" | "greaterThan" | "lessThan" | "isAnyOf" | "is" | "isNot" | "after" | "before" | "isToday"

// Filter type
export interface Filter {
  id: string
  operator: FilterOperator
  value: any
}

// Faceted option type
export interface FacetedOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  color?: string
}

// Filter props
interface DataTableFilterProps<TData, TValue> {
  column: Column<TData, TValue>
  title?: string
  options?: FacetedOption[]
  operators?: { label: string; value: FilterOperator; icon?: React.ComponentType<{ className?: string }> }[]
  showOperatorSelect?: boolean
  filterType?: "text" | "number" | "date" | "select" | "multi-select"
}

// Filter badge props
export interface FilterBadgeProps {
  filter: {
    id: string
    value: any
    operator: FilterOperator
  }
  label?: string
  onRemove?: () => void
}

// Filter badge component
export function FilterBadge({ filter, label, onRemove }: FilterBadgeProps) {
  const displayValue = typeof filter.value === 'object' && filter.value !== null 
    ? `${filter.value.min} - ${filter.value.max}` 
    : Array.isArray(filter.value) 
      ? filter.value.join(', ')
      : String(filter.value)

  const operatorDisplay = {
    "equals": "=",
    "contains": "contains",
    "startsWith": "starts with",
    "endsWith": "ends with",
    "between": "between",
    "greaterThan": ">",
    "lessThan": "<",
    "isAnyOf": "is any of",
    "is": "is",
    "isNot": "is not",
    "after": "after",
    "before": "before",
    "isToday": "is today"
  }[filter.operator]

  return (
    <Badge variant="outline" className="flex items-center gap-1 rounded-md px-2 py-1">
      {label && <span className="text-xs font-medium">{label}</span>}
      {operatorDisplay && <span className="text-xs">{operatorDisplay}</span>}
      <span className="text-xs font-medium">{displayValue}</span>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  )
}

// Main data table filter component
export function DataTableFilter<TData, TValue>({
  column,
  title,
  options,
  operators = [
    { label: "Contains", value: "contains" },
    { label: "Equals", value: "equals" },
    { label: "Starts with", value: "startsWith" },
    { label: "Ends with", value: "endsWith" }
  ],
  showOperatorSelect = true,
  filterType = "text"
}: DataTableFilterProps<TData, TValue>) {
  const columnFilterValue = column.getFilterValue() as string
  const [selectedOperator, setSelectedOperator] = React.useState<FilterOperator>("contains")
  const [value, setValue] = React.useState<string>("")
  const [open, setOpen] = React.useState(false)

  // Apply filter on column
  const applyFilter = () => {
    if (!value.length) return
    
    if (filterType === "multi-select" && Array.isArray(options)) {
      column.setFilterValue(value.split(','))
    } else {
      column.setFilterValue(value)
    }
    
    // Close popover after applying filter
    setOpen(false)
  }

  // Clear filter
  const clearFilter = () => {
    column.setFilterValue(undefined)
    setValue("")
    setOpen(false)
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }

  // Handle select option
  const handleSelectOption = (selectedValue: string) => {
    setValue(selectedValue)
    column.setFilterValue(selectedValue)
    setOpen(false)
  }

  // Handle operator change
  const handleOperatorChange = (operator: FilterOperator) => {
    setSelectedOperator(operator)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 border-dashed",
            column.getIsFiltered() ? "border-primary bg-muted" : "border-muted-foreground/30"
          )}
        >
          {column.getIsFiltered() ? (
            <Badge variant="outline" className="rounded-sm px-1 font-normal">
              {columnFilterValue as string}
              <X className="ml-1 h-3 w-3" onClick={() => column.setFilterValue(undefined)} />
            </Badge>
          ) : (
            <>
              {title || column.id}
              <X className="ml-1 h-3 w-3 opacity-0" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2 text-sm">
          <div className="font-medium">{title || column.id}</div>
          <div className="text-xs text-muted-foreground">Filter by {title || column.id}</div>
        </div>
        <Separator />
        
        {/* Filter Operators (if enabled) */}
        {showOperatorSelect && (
          <div className="p-2">
            <Command>
              <CommandInput placeholder="Select operator..." />
              <CommandList>
                <CommandEmpty>No operators found.</CommandEmpty>
                <CommandGroup>
                  {operators.map((operator) => (
                    <CommandItem
                      key={operator.value}
                      onSelect={() => handleOperatorChange(operator.value)}
                      className="cursor-pointer"
                    >
                      {operator.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
        
        {/* Filter Input */}
        <div className="p-2">
          {filterType === "select" && options ? (
            <Command>
              <CommandInput placeholder="Search options..." />
              <CommandList>
                <CommandEmpty>No options found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => handleSelectOption(option.value)}
                    >
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <Input
              placeholder="Filter value..."
              value={value}
              onChange={handleInputChange}
              className="h-8"
            />
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between p-2">
          <Button variant="ghost" size="sm" onClick={clearFilter}>
            Clear
          </Button>
          <Button size="sm" onClick={applyFilter}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}