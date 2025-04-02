import React from "react"
import { Helmet } from "react-helmet"
import DataTableExample from "@/components/examples/DataTableExample"

export default function DataTableDemo() {
  return (
    <>
      <Helmet>
        <title>Data Table Demo | Pool Management</title>
      </Helmet>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Data Table Filters Demo</h1>
        <p className="text-muted-foreground mb-8">
          This page demonstrates the implementation of advanced data table filters using TanStack Table and the bazza/ui components.
        </p>
        
        <div className="rounded-lg border p-4">
          <DataTableExample />
        </div>
      </div>
    </>
  )
}