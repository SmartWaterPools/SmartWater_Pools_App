import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChemicalType, CHEMICAL_TYPES } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the schema for chemical usage form
const chemicalUsageSchema = z.object({
  maintenanceId: z.number(),
  chemicalType: z.enum(CHEMICAL_TYPES as unknown as [string, ...string[]]),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.coerce.number().min(0, "Unit cost must be a positive number"),
  totalCost: z.coerce.number().min(0, "Total cost must be a positive number"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type ChemicalUsageFormValues = z.infer<typeof chemicalUsageSchema>;

// Predefined units for different chemical types
const chemicalUnits: Record<ChemicalType, string[]> = {
  liquid_chlorine: ["gallon", "oz", "liter"],
  tablets: ["tablet", "lb", "kg"],
  muriatic_acid: ["gallon", "oz", "liter"],
  soda_ash: ["lb", "oz", "kg"],
  sodium_bicarbonate: ["lb", "oz", "kg"],
  calcium_chloride: ["lb", "oz", "kg"],
  stabilizer: ["lb", "oz", "kg"],
  algaecide: ["oz", "liter", "gallon"],
  salt: ["lb", "kg"],
  phosphate_remover: ["oz", "liter"],
  other: ["unit", "oz", "lb", "gallon", "liter", "kg"]
};

interface ChemicalUsageFormProps {
  maintenanceId: number;
  onSuccess?: () => void;
}

export function ChemicalUsageForm({ maintenanceId, onSuccess }: ChemicalUsageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChemical, setSelectedChemical] = useState<ChemicalType>("liquid_chlorine");
  
  // Initialize the form with default values
  const form = useForm<ChemicalUsageFormValues>({
    resolver: zodResolver(chemicalUsageSchema),
    defaultValues: {
      maintenanceId,
      chemicalType: "liquid_chlorine",
      amount: 0,
      unit: "gallon",
      unitCost: 0,
      totalCost: 0,
      reason: "",
      notes: ""
    }
  });
  
  // Create mutation for submitting the form
  const mutation = useMutation({
    mutationFn: async (values: ChemicalUsageFormValues) => {
      return apiRequest("/api/chemical-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      toast({
        title: "Chemical usage recorded",
        description: "Your chemical usage record has been saved successfully.",
      });
      form.reset({
        maintenanceId,
        chemicalType: "liquid_chlorine",
        amount: 0,
        unit: "gallon",
        unitCost: 0,
        totalCost: 0,
        reason: "",
        notes: ""
      });
      queryClient.invalidateQueries({ queryKey: [`/api/chemical-usage/maintenance/${maintenanceId}`] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to record chemical usage",
        description: error.message || "There was a problem recording your chemical usage. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  function onSubmit(data: ChemicalUsageFormValues) {
    mutation.mutate(data);
  }
  
  // Update total cost when amount or unit cost changes
  const calculateTotalCost = () => {
    const amount = form.watch("amount") || 0;
    const unitCost = form.watch("unitCost") || 0;
    const totalCost = amount * unitCost;
    form.setValue("totalCost", totalCost);
    return totalCost;
  };
  
  // When chemical type changes, update the unit with a default for that type
  const handleChemicalTypeChange = (value: ChemicalType) => {
    setSelectedChemical(value);
    form.setValue("chemicalType", value);
    form.setValue("unit", chemicalUnits[value][0]);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Chemical Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Chemical Type Field */}
            <FormField
              control={form.control}
              name="chemicalType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chemical Type</FormLabel>
                  <Select
                    onValueChange={(value) => handleChemicalTypeChange(value as ChemicalType)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select chemical type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHEMICAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Amount and Unit Fields in Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          calculateTotalCost();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {chemicalUnits[selectedChemical].map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Cost Fields in Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          calculateTotalCost();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Cost ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        readOnly 
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Auto-calculated based on amount and unit cost
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Reason Field */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Addition</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Why was this chemical added? (e.g., "Adjust pH", "Weekly maintenance")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
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
              {mutation.isPending ? "Recording..." : "Record Chemical Usage"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}