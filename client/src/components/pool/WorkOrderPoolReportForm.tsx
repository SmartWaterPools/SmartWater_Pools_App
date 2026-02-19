import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Droplets, Wrench, ClipboardList, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PoolReport } from "@shared/schema";

const POOL_CONDITIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "needs_attention", label: "Needs Attention" },
] as const;

const SERVICES = [
  { value: "skimming", label: "Skimming" },
  { value: "vacuuming", label: "Vacuuming" },
  { value: "brushing", label: "Brushing" },
  { value: "filter_clean", label: "Filter Clean" },
  { value: "chemical_balance", label: "Chemical Balance" },
  { value: "backwash", label: "Backwash" },
  { value: "equipment_check", label: "Equipment Check" },
  { value: "tile_clean", label: "Tile Clean" },
  { value: "other", label: "Other" },
] as const;

const CHEMICAL_FIELDS = [
  { key: "pH", label: "pH", step: "0.1", min: "0", max: "14", placeholder: "7.2" },
  { key: "chlorine", label: "Chlorine (ppm)", step: "0.1", min: "0", max: "10", placeholder: "3.0" },
  { key: "alkalinity", label: "Alkalinity (ppm)", step: "1", min: "0", max: "300", placeholder: "100" },
  { key: "calcium_hardness", label: "Calcium Hardness (ppm)", step: "1", min: "0", max: "1000", placeholder: "300" },
  { key: "cyanuric_acid", label: "Cyanuric Acid (ppm)", step: "1", min: "0", max: "150", placeholder: "40" },
  { key: "salt", label: "Salt (ppm)", step: "100", min: "0", max: "6000", placeholder: "3200" },
  { key: "phosphates", label: "Phosphates (ppb)", step: "10", min: "0", max: "2000", placeholder: "50" },
  { key: "tds", label: "TDS (ppm)", step: "1", min: "0", max: "5000", placeholder: "1000" },
] as const;

const poolReportFormSchema = z.object({
  reportDate: z.date({ required_error: "Report date is required" }),
  poolCondition: z.string().min(1, "Pool condition is required"),
  chemicalReadings: z.object({
    pH: z.coerce.number().min(0).max(14).optional().or(z.literal("")),
    chlorine: z.coerce.number().min(0).max(10).optional().or(z.literal("")),
    alkalinity: z.coerce.number().min(0).max(300).optional().or(z.literal("")),
    calcium_hardness: z.coerce.number().min(0).max(1000).optional().or(z.literal("")),
    cyanuric_acid: z.coerce.number().min(0).max(150).optional().or(z.literal("")),
    salt: z.coerce.number().min(0).max(6000).optional().or(z.literal("")),
    phosphates: z.coerce.number().min(0).max(2000).optional().or(z.literal("")),
    tds: z.coerce.number().min(0).max(5000).optional().or(z.literal("")),
  }),
  servicesPerformed: z.array(z.string()).default([]),
  recommendations: z.string().optional(),
  notes: z.string().optional(),
});

type PoolReportFormValues = z.infer<typeof poolReportFormSchema>;

interface WorkOrderPoolReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: number;
  clientId: number;
  technicianId?: number;
  maintenanceOrderId?: number;
  editReport?: PoolReport | null;
  onSuccess?: () => void;
}

export function WorkOrderPoolReportForm({
  open,
  onOpenChange,
  workOrderId,
  clientId,
  technicianId,
  maintenanceOrderId,
  editReport,
  onSuccess,
}: WorkOrderPoolReportFormProps) {
  const { toast } = useToast();
  const isEditing = !!editReport;

  const form = useForm<PoolReportFormValues>({
    resolver: zodResolver(poolReportFormSchema),
    defaultValues: {
      reportDate: new Date(),
      poolCondition: "",
      chemicalReadings: {
        pH: "",
        chlorine: "",
        alkalinity: "",
        calcium_hardness: "",
        cyanuric_acid: "",
        salt: "",
        phosphates: "",
        tds: "",
      },
      servicesPerformed: [],
      recommendations: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (editReport) {
        const readings = (editReport.chemicalReadings as Record<string, number | string | undefined>) || {};
        form.reset({
          reportDate: editReport.reportDate ? new Date(editReport.reportDate) : new Date(),
          poolCondition: editReport.poolCondition || "",
          chemicalReadings: {
            pH: readings.pH ?? "",
            chlorine: readings.chlorine ?? "",
            alkalinity: readings.alkalinity ?? "",
            calcium_hardness: readings.calcium_hardness ?? "",
            cyanuric_acid: readings.cyanuric_acid ?? "",
            salt: readings.salt ?? "",
            phosphates: readings.phosphates ?? "",
            tds: readings.tds ?? "",
          },
          servicesPerformed: editReport.servicesPerformed || [],
          recommendations: editReport.recommendations || "",
          notes: editReport.notes || "",
        });
      } else {
        form.reset({
          reportDate: new Date(),
          poolCondition: "",
          chemicalReadings: {
            pH: "",
            chlorine: "",
            alkalinity: "",
            calcium_hardness: "",
            cyanuric_acid: "",
            salt: "",
            phosphates: "",
            tds: "",
          },
          servicesPerformed: [],
          recommendations: "",
          notes: "",
        });
      }
    }
  }, [open, editReport]);

  const submitMutation = useMutation({
    mutationFn: async (values: PoolReportFormValues) => {
      const chemicalReadings: Record<string, number> = {};
      for (const [key, val] of Object.entries(values.chemicalReadings)) {
        if (val !== "" && val !== undefined && val !== null) {
          chemicalReadings[key] = Number(val);
        }
      }

      const payload = {
        workOrderId,
        clientId,
        technicianId: technicianId || null,
        maintenanceOrderId: maintenanceOrderId || null,
        reportDate: format(values.reportDate, "yyyy-MM-dd"),
        poolCondition: values.poolCondition,
        chemicalReadings: Object.keys(chemicalReadings).length > 0 ? chemicalReadings : null,
        servicesPerformed: values.servicesPerformed,
        recommendations: values.recommendations || null,
        notes: values.notes || null,
      };

      if (isEditing && editReport) {
        return await apiRequest("PATCH", `/api/business/pool-reports/${editReport.id}`, payload);
      }
      return await apiRequest("POST", "/api/business/pool-reports", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/pool-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business/pool-reports", "work-order", workOrderId] });
      toast({
        title: isEditing ? "Pool Report Updated" : "Pool Report Created",
        description: isEditing
          ? "The pool report has been updated successfully."
          : "A new pool report has been created successfully.",
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save pool report.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: PoolReportFormValues) {
    submitMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Droplets className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Pool Report" : "Add Pool Report"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the pool report details below."
              : "Complete the pool report for this work order."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reportDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Report Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poolCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POOL_CONDITIONS.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                  <Droplets className="h-4 w-4" />
                  Chemical Readings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {CHEMICAL_FIELDS.map((chem) => (
                    <FormField
                      key={chem.key}
                      control={form.control}
                      name={`chemicalReadings.${chem.key}` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">{chem.label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={chem.step}
                              min={chem.min}
                              max={chem.max}
                              placeholder={chem.placeholder}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <ClipboardList className="h-4 w-4" />
                  Services Performed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="servicesPerformed"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {SERVICES.map((service) => (
                          <FormField
                            key={service.value}
                            control={form.control}
                            name="servicesPerformed"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(service.value)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, service.value]);
                                      } else {
                                        field.onChange(current.filter((v: string) => v !== service.value));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {service.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-400">
                  <FileText className="h-4 w-4" />
                  Notes & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="recommendations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommendations</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any recommendations for the client..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this service visit..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Report" : "Create Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
