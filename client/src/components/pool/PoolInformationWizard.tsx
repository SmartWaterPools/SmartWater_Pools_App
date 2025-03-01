import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Save, Camera, Upload, Check } from 'lucide-react';

// Define the pool information schema with validation rules
const poolInfoSchema = z.object({
  // Basic Pool Information
  poolType: z.string().min(1, { message: "Pool type is required" }),
  poolSize: z.string().min(1, { message: "Pool size is required" }),
  filterType: z.string().min(1, { message: "Filter type is required" }),
  heaterType: z.string().nullable().optional(),
  chemicalSystem: z.string().min(1, { message: "Chemical system is required" }),
  specialNotes: z.string().optional(),
  serviceDay: z.string().optional(),
  
  // Equipment Information
  equipment: z.array(z.object({
    name: z.string().min(1, { message: "Equipment name is required" }),
    type: z.string().min(1, { message: "Equipment type is required" }),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    installDate: z.string().optional(),
    status: z.string().default("operational"),
    notes: z.string().optional(),
  })).optional().default([]),
  
  // Images
  images: z.array(z.object({
    imageUrl: z.string().min(1, { message: "Image URL is required" }),
    caption: z.string().optional(),
    category: z.string().optional(),
  })).optional().default([]),
});

type PoolInfoFormValues = z.infer<typeof poolInfoSchema>;

const POOL_TYPES = [
  { value: "inground", label: "In-Ground" },
  { value: "aboveground", label: "Above Ground" },
  { value: "vinyl", label: "Vinyl Liner" },
  { value: "fiberglass", label: "Fiberglass" },
  { value: "gunite", label: "Gunite/Concrete" },
  { value: "other", label: "Other" },
];

const FILTER_TYPES = [
  { value: "sand", label: "Sand Filter" },
  { value: "cartridge", label: "Cartridge Filter" },
  { value: "de", label: "DE (Diatomaceous Earth) Filter" },
  { value: "other", label: "Other" },
];

const HEATER_TYPES = [
  { value: "gas", label: "Gas Heater" },
  { value: "electric", label: "Electric Heater" },
  { value: "heatpump", label: "Heat Pump" },
  { value: "solar", label: "Solar Heating" },
  { value: "none", label: "No Heater" },
];

const CHEMICAL_SYSTEMS = [
  { value: "chlorine", label: "Traditional Chlorine" },
  { value: "salt", label: "Salt Water Chlorinator" },
  { value: "mineral", label: "Mineral System" },
  { value: "ozone", label: "Ozone System" },
  { value: "uv", label: "UV System" },
  { value: "other", label: "Other" },
];

const SERVICE_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const EQUIPMENT_TYPES = [
  { value: "pump", label: "Pump" },
  { value: "filter", label: "Filter" },
  { value: "heater", label: "Heater" },
  { value: "chlorinator", label: "Chlorinator" },
  { value: "cleaner", label: "Automatic Cleaner" },
  { value: "light", label: "Light" },
  { value: "timer", label: "Timer/Controller" },
  { value: "other", label: "Other" },
];

interface PoolInformationWizardProps {
  clientId: number;
  onComplete?: () => void;
  existingData?: Partial<PoolInfoFormValues>;
}

export function PoolInformationWizard({ clientId, onComplete, existingData }: PoolInformationWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [tempImages, setTempImages] = useState<{ dataUrl: string; file: File }[]>([]);
  
  // Initialize form with default values or existing data
  const form = useForm<PoolInfoFormValues>({
    resolver: zodResolver(poolInfoSchema),
    defaultValues: {
      poolType: existingData?.poolType || "",
      poolSize: existingData?.poolSize || "",
      filterType: existingData?.filterType || "",
      heaterType: existingData?.heaterType || null,
      chemicalSystem: existingData?.chemicalSystem || "",
      specialNotes: existingData?.specialNotes || "",
      serviceDay: existingData?.serviceDay || "",
      equipment: existingData?.equipment || [],
      images: existingData?.images || [],
    },
  });

  // Define a type for client update data
  type ClientUpdateData = {
    poolType: string;
    poolSize: string;
    filterType: string;
    heaterType: string | null | undefined;
    chemicalSystem: string;
    specialNotes?: string;
    serviceDay?: string;
  };

  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientUpdateData) => {
      console.log('Updating client with data:', data);
      return await apiRequest(
        `/api/clients/${clientId}`,
        'PATCH',
        data
      );
    },
    onSuccess: () => {
      // Invalidate the client data query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      
      toast({
        title: 'Pool information updated',
        description: 'The client pool details have been successfully updated.',
      });
      
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      toast({
        title: 'Update failed',
        description: 'There was a problem updating the pool information.',
        variant: 'destructive',
      });
    },
  });

  const handleAddEquipment = () => {
    const equipment = form.getValues('equipment') || [];
    form.setValue('equipment', [
      ...equipment,
      {
        name: '',
        type: '',
        brand: '',
        model: '',
        serialNumber: '',
        installDate: '',
        status: 'operational',
        notes: '',
      }
    ]);
  };

  const handleRemoveEquipment = (index: number) => {
    const equipment = form.getValues('equipment') || [];
    form.setValue('equipment', equipment.filter((_, i) => i !== index));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setTempImages(prev => [...prev, { dataUrl, file }]);
        
        // Add to form
        const images = form.getValues('images') || [];
        form.setValue('images', [...images, {
          imageUrl: dataUrl,
          caption: '',
          category: 'pool',
        }]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  // Add mutations for equipment and images
  const addEquipmentMutation = useMutation({
    mutationFn: async (equipment: any) => {
      console.log('Adding equipment:', equipment);
      return await apiRequest(
        `/api/clients/${clientId}/equipment`,
        'POST',
        equipment
      );
    },
    onSuccess: () => {
      console.log('Equipment added successfully');
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/equipment`] });
    },
    onError: (error) => {
      console.error('Error adding equipment:', error);
      toast({
        title: 'Failed to add equipment',
        description: 'There was a problem saving the equipment details.',
        variant: 'destructive',
      });
    }
  });

  const addImageMutation = useMutation({
    mutationFn: async (image: any) => {
      console.log('Adding image:', image);
      return await apiRequest(
        `/api/clients/${clientId}/images`,
        'POST',
        image
      );
    },
    onSuccess: () => {
      console.log('Image added successfully');
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/images`] });
    },
    onError: (error) => {
      console.error('Error adding image:', error);
      toast({
        title: 'Failed to add image',
        description: 'There was a problem saving the image.',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = async (data: PoolInfoFormValues) => {
    console.log('Submitting pool information:', data);
    
    try {
      // 1. First update basic pool information
      const clientUpdateData = {
        poolType: data.poolType,
        poolSize: data.poolSize,
        filterType: data.filterType,
        heaterType: data.heaterType,
        chemicalSystem: data.chemicalSystem,
        specialNotes: data.specialNotes,
        serviceDay: data.serviceDay,
      };
      
      await updateClientMutation.mutateAsync(clientUpdateData);
      
      // 2. Save each equipment item
      if (data.equipment && data.equipment.length > 0) {
        for (const equipment of data.equipment) {
          // Ensure clientId is included in each equipment item
          await addEquipmentMutation.mutateAsync({
            ...equipment,
            clientId: clientId
          });
        }
      }
      
      // 3. Save each image
      if (data.images && data.images.length > 0) {
        for (const image of data.images) {
          // Ensure clientId is included in each image
          await addImageMutation.mutateAsync({
            ...image,
            clientId: clientId
          });
        }
      }
      
      toast({
        title: 'Pool information wizard completed',
        description: 'All information has been successfully saved.',
      });
      
      // Update client data in the cache
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/equipment`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/images`] });
      
      // Redirect back to client details
      setLocation(`/clients/${clientId}`);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error saving pool information:', error);
      toast({
        title: 'Save failed',
        description: 'There was a problem saving the pool information.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Pool Information Wizard</CardTitle>
        <CardDescription>Collect detailed information about the client's pool and equipment</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={`step-${step}`} onValueChange={(value) => setStep(parseInt(value.split('-')[1]))}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="step-1">Pool Information</TabsTrigger>
                <TabsTrigger value="step-2">Equipment</TabsTrigger>
                <TabsTrigger value="step-3">Images</TabsTrigger>
              </TabsList>
              
              {/* Step 1: Basic Pool Information */}
              <TabsContent value="step-1">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="poolType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pool Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pool type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {POOL_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="poolSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pool Size</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 15,000 gallons or 16' x 32'"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter size in gallons or dimensions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="filterType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Filter Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select filter type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {FILTER_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="heaterType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Heater Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select heater type (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HEATER_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="chemicalSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chemical System</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select chemical system" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CHEMICAL_SYSTEMS.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="serviceDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Service Day</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service day (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SERVICE_DAYS.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="specialNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter any special notes or instructions about this pool"
                            className="h-24"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              {/* Step 2: Equipment */}
              <TabsContent value="step-2">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Pool Equipment</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleAddEquipment}
                    >
                      Add Equipment
                    </Button>
                  </div>

                  {form.watch('equipment')?.map((_, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Equipment #{index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveEquipment(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`equipment.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Equipment Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Main Pump" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`equipment.${index}.type`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Equipment Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select equipment type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {EQUIPMENT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`equipment.${index}.brand`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Brand</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Hayward" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`equipment.${index}.model`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Super Pump" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`equipment.${index}.serialNumber`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Serial Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Serial Number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`equipment.${index}.installDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Install Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`equipment.${index}.status`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || 'operational'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="operational">Operational</SelectItem>
                                <SelectItem value="needs_service">Needs Service</SelectItem>
                                <SelectItem value="replaced">Replaced</SelectItem>
                                <SelectItem value="obsolete">Obsolete</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`equipment.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any notes about this equipment" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  
                  {(!form.watch('equipment') || form.watch('equipment').length === 0) && (
                    <div className="text-center p-6 border border-dashed rounded-lg">
                      <p className="text-gray-500">No equipment added yet</p>
                      <Button 
                        type="button" 
                        variant="outline"
                        className="mt-4"
                        onClick={handleAddEquipment}
                      >
                        Add First Equipment
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* Step 3: Images */}
              <TabsContent value="step-3">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Pool Images</h3>
                    <div>
                      <input
                        type="file"
                        id="image-upload"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="mr-2"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {form.watch('images')?.map((image, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="aspect-video relative">
                          <img
                            src={image.imageUrl}
                            alt={image.caption || `Pool image ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              const images = form.getValues('images') || [];
                              form.setValue('images', images.filter((_, i) => i !== index));
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                        
                        <div className="p-3">
                          <FormField
                            control={form.control}
                            name={`images.${index}.caption`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Add a caption"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`images.${index}.category`}
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value || 'pool'}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="pool">Pool</SelectItem>
                                    <SelectItem value="equipment">Equipment</SelectItem>
                                    <SelectItem value="issue">Issue/Problem</SelectItem>
                                    <SelectItem value="landscape">Landscape</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                    
                    {(!form.watch('images') || form.watch('images').length === 0) && (
                      <div className="col-span-3 text-center p-6 border border-dashed rounded-lg">
                        <p className="text-gray-500">No images added yet</p>
                        <Button 
                          type="button" 
                          variant="outline"
                          className="mt-4"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          Upload First Image
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <Separator />
            
            <div className="flex justify-between">
              <div>
                {step > 1 && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div>
                {step < 3 ? (
                  <Button 
                    type="button" 
                    onClick={() => setStep(step + 1)}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    disabled={updateClientMutation.isPending}
                  >
                    {updateClientMutation.isPending ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save All Information
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}