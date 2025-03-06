import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { Trash, Edit, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Client, ServiceTemplate } from "@shared/schema";
import { ClientWithUser } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

// Define the form schema for client-specific instructions
const customInstructionsSchema = z.object({
  serviceLevel: z.string().min(1, "Service level is required"),
  customServiceInstructions: z.array(
    z.string().min(1, "Instruction cannot be empty")
  ).min(1, "At least one instruction is required"),
});

type CustomInstructionsFormValues = z.infer<typeof customInstructionsSchema>;

interface CustomInstructionsProps {
  clientId: number;
  initialData?: {
    serviceLevel?: string;
    customServiceInstructions?: string[];
  };
}

export function CustomInstructions({ clientId, initialData }: CustomInstructionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Form setup
  const form = useForm<CustomInstructionsFormValues>({
    resolver: zodResolver(customInstructionsSchema),
    defaultValues: {
      serviceLevel: initialData?.serviceLevel || "standard",
      customServiceInstructions: initialData?.customServiceInstructions || ["Check water chemistry"],
    },
  });

  // Fetch service templates for reference
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/service-templates"],
    select: (data: ServiceTemplate[]) => data,
  });

  // Mutation for updating client service instructions
  const mutation = useMutation({
    mutationFn: async (values: CustomInstructionsFormValues) => {
      return await apiRequest(`/api/clients/${clientId}`, "PATCH", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      setIsEditing(false);
      toast({
        title: "Instructions updated",
        description: "Service instructions have been updated successfully",
      });
    },
  });

  // Add a new instruction
  const addInstruction = () => {
    const currentInstructions = form.getValues("customServiceInstructions") || [];
    form.setValue("customServiceInstructions", [...currentInstructions, ""]);
  };

  // Remove an instruction
  const removeInstruction = (index: number) => {
    const currentInstructions = form.getValues("customServiceInstructions");
    if (currentInstructions.length <= 1) {
      toast({
        title: "Cannot remove item",
        description: "You must have at least one instruction",
        variant: "destructive",
      });
      return;
    }
    form.setValue(
      "customServiceInstructions",
      currentInstructions.filter((_, i) => i !== index)
    );
  };

  // Form submission handler
  const onSubmit = (data: CustomInstructionsFormValues) => {
    mutation.mutate(data);
  };

  // Helper function to import from a template
  const importFromTemplate = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    form.setValue("customServiceInstructions", template.checklistItems);
    toast({
      title: "Template imported",
      description: `Imported ${template.checklistItems.length} items from "${template.name}" template`,
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Service Instructions</CardTitle>
            <CardDescription>Custom service instructions for this client</CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="serviceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The level of service for this client
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {templates.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Import from template:</h4>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(template => (
                      <Button
                        key={template.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => importFromTemplate(template.id)}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <FormLabel>Custom Instructions</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                    <Plus className="h-4 w-4 mr-1" /> Add Instruction
                  </Button>
                </div>

                {form.watch("customServiceInstructions")?.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`customServiceInstructions.${index}`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Service instruction" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstruction(index)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Instructions"}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Service Level:</h3>
              <p className="mt-1 capitalize">
                {initialData?.serviceLevel || "Not specified"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium">Custom Instructions:</h3>
              {initialData?.customServiceInstructions?.length ? (
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {initialData.customServiceInstructions.map((instruction, index) => (
                    <li key={index} className="text-sm">{instruction}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-gray-500 italic">No custom instructions specified</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}