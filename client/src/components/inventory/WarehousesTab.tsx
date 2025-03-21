import { Warehouse, AlertCircle } from "lucide-react";

export default function WarehousesTab() {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg p-8">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-center">Warehouses Feature Coming Soon</h3>
      <p className="text-muted-foreground text-center mt-2">
        This functionality is currently under development and will be available soon.
      </p>
    </div>
  );
}