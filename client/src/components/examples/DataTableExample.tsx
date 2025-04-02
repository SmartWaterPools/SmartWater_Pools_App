import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { DataTableEnhanced } from "@/components/ui/data-table-enhanced"
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Example task type
interface Task {
  id: string
  title: string
  assignee: string
  status: "todo" | "in progress" | "done" | "canceled"
  priority: "low" | "medium" | "high"
  estimatedHours: number
  endDate: string
  labels: string[]
}

// Get relative date display (e.g., "2 days ago")
function getRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  
  return `${diffDays} days`
}

// Example data
const data: Task[] = [
  {
    id: "TASK-1",
    title: "Create new landing page",
    assignee: "John Smith",
    status: "in progress",
    priority: "high",
    estimatedHours: 6,
    endDate: "2025-03-19",
    labels: ["design", "frontend"]
  },
  {
    id: "TASK-2",
    title: "Fix API endpoint",
    assignee: "Jane Doe",
    status: "todo",
    priority: "medium",
    estimatedHours: 3,
    endDate: "2025-03-20",
    labels: ["backend", "api"]
  },
  {
    id: "TASK-3",
    title: "Implement authentication",
    assignee: "John Smith",
    status: "done",
    priority: "high",
    estimatedHours: 8,
    endDate: "2025-03-15",
    labels: ["security", "backend"]
  },
  {
    id: "TASK-4",
    title: "Design product page",
    assignee: "Sarah Johnson",
    status: "todo",
    priority: "low",
    estimatedHours: 4,
    endDate: "2025-03-21",
    labels: ["design"]
  },
  {
    id: "TASK-5",
    title: "Fix mobile responsiveness",
    assignee: "Jane Doe",
    status: "in progress",
    priority: "medium",
    estimatedHours: 5,
    endDate: "2025-03-18",
    labels: ["frontend", "mobile"]
  }
]

export default function DataTableExample() {
  // Column definitions for the DataTable
  const columns: ColumnDef<Task>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <div>{row.getValue("id")}</div>,
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
      cell: ({ row }) => <div>{row.getValue("assignee")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        
        const statusMap: Record<string, { label: string, color: string }> = {
          "todo": { label: "To Do", color: "bg-blue-100 text-blue-800" },
          "in progress": { label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
          "done": { label: "Done", color: "bg-green-100 text-green-800" },
          "canceled": { label: "Canceled", color: "bg-red-100 text-red-800" }
        }
        
        const { label, color } = statusMap[status] || { label: status, color: "bg-gray-100" }
        
        return (
          <Badge variant="outline" className={`${color} border-none`}>
            {label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string
        
        const priorityMap: Record<string, { label: string, color: string }> = {
          "low": { label: "Low", color: "bg-blue-100 text-blue-800" },
          "medium": { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
          "high": { label: "High", color: "bg-red-100 text-red-800" }
        }
        
        const { label, color } = priorityMap[priority] || { label: priority, color: "bg-gray-100" }
        
        return (
          <Badge variant="outline" className={`${color} border-none`}>
            {label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "estimatedHours",
      header: "Est. Hours",
      cell: ({ row }) => <div>{row.getValue("estimatedHours")}</div>,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => {
        const endDate = row.getValue("endDate") as string
        return <div>{getRelativeDate(endDate)}</div>
      },
    },
    {
      accessorKey: "labels",
      header: "Labels",
      cell: ({ row }) => {
        const labels = row.getValue("labels") as string[]
        
        return (
          <div className="flex flex-wrap gap-1">
            {labels.map((label) => (
              <Badge key={label} variant="outline" className="px-2 py-0 text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const task = row.original
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(task.id)}
              >
                Copy task ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Define the filterable columns
  const filterableColumns = [
    {
      id: "title",
      title: "Title",
      type: "text",
    },
    {
      id: "status",
      title: "Status",
      type: "select",
      options: [
        { label: "To Do", value: "todo" },
        { label: "In Progress", value: "in progress" },
        { label: "Done", value: "done" },
        { label: "Canceled", value: "canceled" },
      ],
    },
    {
      id: "priority",
      title: "Priority",
      type: "select",
      options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ],
    },
    {
      id: "assignee",
      title: "Assignee",
      type: "text",
    },
    {
      id: "estimatedHours",
      title: "Estimated Hours",
      type: "number",
      operators: [
        { label: "Equals", value: "equals" },
        { label: "Greater than", value: "greaterThan" },
        { label: "Less than", value: "lessThan" },
        { label: "Between", value: "between" },
      ],
    },
    {
      id: "endDate",
      title: "End Date",
      type: "date",
      operators: [
        { label: "Before", value: "before" },
        { label: "After", value: "after" },
        { label: "Between", value: "between" },
        { label: "Is today", value: "isToday" },
      ],
    }
  ]

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      <DataTableEnhanced
        columns={columns}
        data={data}
        filterableColumns={filterableColumns}
        globalSearchPlaceholder="Search all tasks..."
      />
    </div>
  )
}