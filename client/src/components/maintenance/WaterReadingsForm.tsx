import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define the schema for water readings form
const waterReadingsSchema = z.object({
  maintenanceId: z.number(),
  clientId: z.number(),
  ph: z.coerce.number().min(0).max(14).optional(),
  chlorine: z.coerce.number().min(0).max(10).optional(),
  alkalinity: z.coerce.number().min(0).max(300).optional(),
  cyanuricAcid: z.coerce.number().min(0).max(300).optional(),
  calcium: z.coerce.number().min(0).max(1000).optional(),
  phosphate: z.coerce.number().min(0).max(2000).optional(),
  salinity: z.coerce.number().min(0).max(5000).optional(),
  tds: z.coerce.number().min(0).max(10000).optional(),
  temperature: z.coerce.number().min(0).max(120).optional(),
  notes: z.string().optional(),
});

type WaterReadingsFormValues = z.infer<typeof waterReadingsSchema>;

interface WaterReadingsFormProps {
  maintenanceId: number;
  clientId: number;
  onSuccess?: () => void;
}

// Define target ranges for each parameter
const targetRanges = {
  ph: { min: 7.2, max: 7.8, unit: "" },
  chlorine: { min: 1, max: 3, unit: "ppm" },
  alkalinity: { min: 80, max: 120, unit: "ppm" },
  cyanuricAcid: { min: 30, max: 50, unit: "ppm" },
  calcium: { min: 200, max: 400, unit: "ppm" },
  phosphate: { min: 0, max: 100, unit: "ppb" },
  salinity: { min: 2500, max: 3500, unit: "ppm" },
  tds: { min: 0, max: 1500, unit: "ppm" },
  temperature: { min: 78, max: 82, unit: "°F" },
};

// Helper function to determine status of a reading
function getReadingStatus(param: string, value: number | undefined): "ideal" | "warning" | "critical" | undefined {
  if (value === undefined) return undefined;
  
  const range = targetRanges[param as keyof typeof targetRanges];
  if (!range) return undefined;
  
  if (value >= range.min && value <= range.max) {
    return "ideal";
  } else if (
    (value >= range.min * 0.9 && value < range.min) || 
    (value > range.max && value <= range.max * 1.1)
  ) {
    return "warning";
  } else {
    return "critical";
  }
}

// Helper function to get badge variant based on status
function getBadgeVariant(status: "ideal" | "warning" | "critical" | undefined): "default" | "secondary" | "destructive" {
  switch (status) {
    case "ideal":
      return "default";
    case "warning":
      return "secondary";
    case "critical":
      return "destructive";
    default:
      return "secondary";
  }
}

export function WaterReadingsForm({ maintenanceId, clientId, onSuccess }: WaterReadingsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize the form with default values
  const form = useForm<WaterReadingsFormValues>({
    resolver: zodResolver(waterReadingsSchema),
    defaultValues: {
      maintenanceId,
      clientId,
      ph: undefined,
      chlorine: undefined,
      alkalinity: undefined,
      cyanuricAcid: undefined,
      calcium: undefined,
      phosphate: undefined,
      salinity: undefined,
      tds: undefined,
      temperature: undefined,
      notes: "",
    }
  });
  
  // Create mutation for submitting the form
  const mutation = useMutation({
    mutationFn: async (values: WaterReadingsFormValues) => {
      return apiRequest<any>("/api/water-readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      toast({
        title: "Water readings recorded",
        description: "Water test results have been saved successfully.",
      });
      form.reset({
        maintenanceId,
        clientId,
        ph: undefined,
        chlorine: undefined,
        alkalinity: undefined,
        cyanuricAcid: undefined,
        calcium: undefined,
        phosphate: undefined,
        salinity: undefined,
        tds: undefined,
        temperature: undefined,
        notes: "",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/water-readings/maintenance/${maintenanceId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/water-readings/latest/client/${clientId}`] });
      
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to record water readings",
        description: error.message || "There was a problem recording water readings. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  function onSubmit(data: WaterReadingsFormValues) {
    mutation.mutate(data);
  }
  
  // Helper to determine which parameters should be highlighted as requiring action
  function getNeedsAttentionParameters(): string[] {
    const values = form.getValues();
    const needsAttention: string[] = [];
    
    Object.keys(targetRanges).forEach((param) => {
      const value = values[param as keyof typeof values] as number | undefined;
      const status = getReadingStatus(param, value);
      if (status === "warning" || status === "critical") {
        needsAttention.push(param);
      }
    });
    
    return needsAttention;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Water Chemistry Readings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* pH Field */}
              <FormField
                control={form.control}
                name="ph"
                render={({ field }) => {
                  const status = getReadingStatus("ph", field.value);
                  return (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>pH Level</FormLabel>
                        {status && (
                          <Badge variant={getBadgeVariant(status)}>
                            {status === "ideal" ? "Ideal" : status === "warning" ? "Action Needed" : "Critical"}
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" max="14" placeholder="7.2-7.8" {...field} />
                      </FormControl>
                      <FormDescription>
                        Target: {targetRanges.ph.min}-{targetRanges.ph.max}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Chlorine Field */}
              <FormField
                control={form.control}
                name="chlorine"
                render={({ field }) => {
                  const status = getReadingStatus("chlorine", field.value);
                  return (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Free Chlorine (ppm)</FormLabel>
                        {status && (
                          <Badge variant={getBadgeVariant(status)}>
                            {status === "ideal" ? "Ideal" : status === "warning" ? "Action Needed" : "Critical"}
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" max="10" placeholder="1-3" {...field} />
                      </FormControl>
                      <FormDescription>
                        Target: {targetRanges.chlorine.min}-{targetRanges.chlorine.max} ppm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Alkalinity Field */}
              <FormField
                control={form.control}
                name="alkalinity"
                render={({ field }) => {
                  const status = getReadingStatus("alkalinity", field.value);
                  return (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Total Alkalinity (ppm)</FormLabel>
                        {status && (
                          <Badge variant={getBadgeVariant(status)}>
                            {status === "ideal" ? "Ideal" : status === "warning" ? "Action Needed" : "Critical"}
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Input type="number" min="0" max="300" placeholder="80-120" {...field} />
                      </FormControl>
                      <FormDescription>
                        Target: {targetRanges.alkalinity.min}-{targetRanges.alkalinity.max} ppm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Cyanuric Acid Field */}
              <FormField
                control={form.control}
                name="cyanuricAcid"
                render={({ field }) => {
                  const status = getReadingStatus("cyanuricAcid", field.value);
                  return (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Cyanuric Acid (ppm)</FormLabel>
                        {status && (
                          <Badge variant={getBadgeVariant(status)}>
                            {status === "ideal" ? "Ideal" : status === "warning" ? "Action Needed" : "Critical"}
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Input type="number" min="0" max="300" placeholder="30-50" {...field} />
                      </FormControl>
                      <FormDescription>
                        Target: {targetRanges.cyanuricAcid.min}-{targetRanges.cyanuricAcid.max} ppm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Calcium Field */}
              <FormField
                control={form.control}
                name="calcium"
                render={({ field }) => {
                  const status = getReadingStatus("calcium", field.value);
                  return (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Calcium Hardness (ppm)</FormLabel>
                        {status && (
                          <Badge variant={getBadgeVariant(status)}>
                            {status === "ideal" ? "Ideal" : status === "warning" ? "Action Needed" : "Critical"}
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Input type="number" min="0" max="1000" placeholder="200-400" {...field} />
                      </FormControl>
                      <FormDescription>
                        Target: {targetRanges.calcium.min}-{targetRanges.calcium.max} ppm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* TDS Field */}
              <FormField
                control={form.control}
                name="tds"
                render={({ field }) => {
                  const status = getReadingStatus("tds", field.value);
                  return (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Total Dissolved Solids (ppm)</FormLabel>
                        {status && (
                          <Badge variant={getBadgeVariant(status)}>
                            {status === "ideal" ? "Ideal" : status === "warning" ? "Action Needed" : "Critical"}
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        <Input type="number" min="0" max="10000" placeholder="0-1500" {...field} />
                      </FormControl>
                      <FormDescription>
                        Target: Below {targetRanges.tds.max} ppm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any observations about water quality, clarity, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Recording..." : "Record Water Readings"}
            </Button>
          </form>
        </Form>
      </CardContent>
      {getNeedsAttentionParameters().length > 0 && (
        <CardFooter className="bg-amber-50 border-t border-amber-200">
          <div className="text-amber-800 text-sm">
            <h4 className="font-semibold mb-1">Water Chemistry Actions Needed</h4>
            <ul className="list-disc list-inside space-y-1">
              {getNeedsAttentionParameters().map(param => (
                <li key={param}>
                  {param === "ph" ? "pH" : param.charAt(0).toUpperCase() + param.slice(1)} is out of recommended range.
                </li>
              ))}
            </ul>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}