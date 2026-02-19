import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Camera, 
  Upload, 
  Check, 
  Wifi, 
  WifiOff, 
  Clock,
  Database,
  Trash2
} from 'lucide-react';

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
    imageUrl: z.string().optional(),
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

interface CustomQuestion {
  id: number;
  organizationId: number;
  label: string;
  fieldType: string;
  options: string[] | null;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
}

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
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [offlineData, setOfflineData] = useState<PoolInfoFormValues | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [forceSaving, setForceSaving] = useState(false);
  const [customResponses, setCustomResponses] = useState<Record<number, string>>({});

  const { data: customQuestions } = useQuery({
    queryKey: ['/api/pool-wizard-questions'],
    queryFn: async () => {
      const res = await fetch('/api/pool-wizard-questions');
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: existingResponses } = useQuery({
    queryKey: [`/api/clients/${clientId}/wizard-responses`],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/wizard-responses`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  useEffect(() => {
    if (existingResponses && existingResponses.length > 0) {
      const responseMap: Record<number, string> = {};
      existingResponses.forEach((r: any) => {
        responseMap[r.questionId] = r.response || '';
      });
      setCustomResponses(responseMap);
    }
  }, [existingResponses]);

  // Check if there's saved form data in localStorage
  const getSavedFormData = (): PoolInfoFormValues | null => {
    const savedData = localStorage.getItem(`pool_wizard_${clientId}`);
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing saved form data:', e);
        return null;
      }
    }
    return null;
  };

  // Initialize form with saved data, existing data, or defaults
  const savedFormData = getSavedFormData();
  
  const form = useForm<PoolInfoFormValues>({
    resolver: zodResolver(poolInfoSchema),
    defaultValues: {
      poolType: savedFormData?.poolType || existingData?.poolType || "",
      poolSize: savedFormData?.poolSize || existingData?.poolSize || "",
      filterType: savedFormData?.filterType || existingData?.filterType || "",
      heaterType: savedFormData?.heaterType || existingData?.heaterType || null,
      chemicalSystem: savedFormData?.chemicalSystem || existingData?.chemicalSystem || "",
      specialNotes: savedFormData?.specialNotes || existingData?.specialNotes || "",
      serviceDay: savedFormData?.serviceDay || existingData?.serviceDay || "",
      equipment: savedFormData?.equipment || existingData?.equipment || [],
      images: savedFormData?.images || existingData?.images || [],
    },
  });

  useEffect(() => {
    const loadExistingEquipment = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/equipment`);
        if (res.ok) {
          const existing = await res.json();
          if (Array.isArray(existing) && existing.length > 0 && (!form.getValues('equipment') || form.getValues('equipment').length === 0)) {
            const mapped = existing.map((item: any) => ({
              name: item.name || '',
              type: item.type || '',
              brand: item.brand || '',
              model: item.model || '',
              serialNumber: item.serialNumber || '',
              installDate: item.installDate || '',
              status: item.status || 'operational',
              notes: item.notes || '',
              imageUrl: item.imageUrl || '',
            }));
            form.setValue('equipment', mapped);
          }
        }
      } catch (err) {
        console.warn('Could not load existing equipment:', err);
      }
    };
    if (clientId && !savedFormData?.equipment?.length) {
      loadExistingEquipment();
    }
  }, [clientId]);

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
        'PATCH',
        `/api/clients/${clientId}`,
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
        imageUrl: '',
      }
    ]);
  };

  const handleRemoveEquipment = (index: number) => {
    const equipment = form.getValues('equipment') || [];
    form.setValue('equipment', equipment.filter((_, i) => i !== index));
  };

  const handleEquipmentPhotoChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        form.setValue(`equipment.${index}.imageUrl`, compressedDataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process each file with image resizing for better performance
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        // Compress/resize image before saving
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          // Max dimensions to keep image size reasonable
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          let width = img.width;
          let height = img.height;
          
          // Resize while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image to canvas
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Get compressed image data as JPEG with quality 0.8 (80%)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          setTempImages(prev => [...prev, { dataUrl: compressedDataUrl, file }]);
          
          // Add to form
          const images = form.getValues('images') || [];
          form.setValue('images', [...images, {
            imageUrl: compressedDataUrl,
            caption: '',
            category: 'pool',
          }]);
        };
        
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };
  
  // Add mutations for equipment and images
  const addEquipmentMutation = useMutation({
    mutationFn: async (equipment: any) => {
      console.log('Adding equipment:', equipment);
      
      const processedEquipment = {
        ...equipment,
        installDate: equipment.installDate && equipment.installDate.trim() !== '' 
          ? equipment.installDate 
          : null,
        lastServiceDate: equipment.lastServiceDate && equipment.lastServiceDate.trim() !== '' 
          ? equipment.lastServiceDate 
          : null
      };
      
      console.log('Processed equipment for saving:', processedEquipment);
      
      return await apiRequest(
        'POST',
        `/api/clients/${clientId}/equipment`,
        processedEquipment
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
        'POST',
        `/api/clients/${clientId}/images`,
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

  // Function to save form data to localStorage
  const saveToLocalStorage = (data: PoolInfoFormValues) => {
    try {
      localStorage.setItem(`pool_wizard_${clientId}`, JSON.stringify(data));
      setLastSaved(new Date());
      console.log('Saved pool wizard data to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  // Create a debounced version of saveToLocalStorage for autosave
  const debouncedSave = (values: PoolInfoFormValues) => {
    if (isAutoSaveEnabled) {
      saveToLocalStorage(values);
    }
  };

  // Setup online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "You're back online",
        description: "You can now save your work to the server.",
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Don't worry, your work is automatically saved locally.",
        variant: "destructive"
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Setup form watcher for autosave
    const subscription = form.watch((values) => {
      // Timeout to avoid excessive saves during rapid changes
      setTimeout(() => {
        debouncedSave(values as PoolInfoFormValues);
      }, 2000);
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
    };
  }, [isAutoSaveEnabled, clientId, form]);
  
  // Attempt to save offline data when back online
  useEffect(() => {
    if (isOnline && offlineData) {
      const saveOfflineData = async () => {
        try {
          await handleSubmit(offlineData);
          setOfflineData(null);
          localStorage.removeItem(`pool_wizard_${clientId}`);
          toast({
            title: "Offline data saved",
            description: "Your offline changes have been successfully uploaded to the server.",
          });
        } catch (error) {
          console.error('Failed to save offline data:', error);
          toast({
            title: "Failed to save offline data",
            description: "Please try again by clicking 'Save All Information'.",
            variant: "destructive"
          });
        }
      };
      
      saveOfflineData();
    }
  }, [isOnline, offlineData]);

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
      
      // Wait for client update to complete
      console.log('Updating client with pool information:', clientUpdateData);
      await updateClientMutation.mutateAsync(clientUpdateData);
      console.log('Client update completed successfully');
      
      // 2. Delete all existing equipment first, then re-create
      try {
        const existingEquipmentRes = await fetch(`/api/clients/${clientId}/equipment`);
        if (existingEquipmentRes.ok) {
          const existing = await existingEquipmentRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            console.log(`Deleting ${existing.length} existing equipment items...`);
            for (const item of existing) {
              await apiRequest('DELETE', `/api/clients/${clientId}/equipment/${item.id}`);
            }
            console.log('Existing equipment deleted');
          }
        }
      } catch (err) {
        console.warn('Could not fetch/delete existing equipment:', err);
      }

      if (data.equipment && data.equipment.length > 0) {
        console.log(`Saving ${data.equipment.length} equipment items...`);
        const equipmentPromises = data.equipment.map(equipment => 
          addEquipmentMutation.mutateAsync({
            ...equipment,
            clientId: clientId
          })
        );
        await Promise.all(equipmentPromises);
        console.log('All equipment saved successfully');
      }
      
      // 3. Save each image
      if (data.images && data.images.length > 0) {
        console.log(`Saving ${data.images.length} images...`);
        const imagePromises = data.images.map(image => 
          addImageMutation.mutateAsync({
            ...image,
            clientId: clientId
          })
        );
        await Promise.all(imagePromises);
        console.log('All images saved successfully');
      }

      // 4. Save custom question responses
      if (Object.keys(customResponses).length > 0) {
        const responsesArray = Object.entries(customResponses).map(([questionId, response]) => ({
          questionId: parseInt(questionId),
          response: response
        }));
        await apiRequest('PUT', `/api/clients/${clientId}/wizard-responses`, responsesArray);
      }
      
      toast({
        title: 'Pool information wizard completed',
        description: 'All information has been successfully saved.',
      });
      
      // Update client data in the cache
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/equipment`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/images`] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/wizard-responses`] });
      
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
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="step-1">Pool Information</TabsTrigger>
                <TabsTrigger value="step-2">Equipment</TabsTrigger>
                <TabsTrigger value="step-3">Images</TabsTrigger>
                <TabsTrigger value="step-4">Custom</TabsTrigger>
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
                                <Input 
                                  type="date" 
                                  {...field} 
                                  value={field.value || ''}
                                />
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

                      <div className="mt-4">
                        <Label className="text-sm font-medium">Equipment Photo</Label>
                        {form.watch(`equipment.${index}.imageUrl`) ? (
                          <div className="mt-2 relative inline-block">
                            <img
                              src={form.watch(`equipment.${index}.imageUrl`)}
                              alt={`Equipment ${index + 1}`}
                              className="max-h-48 rounded-md border object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => form.setValue(`equipment.${index}.imageUrl`, '')}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        ) : null}
                        <div className="mt-2">
                          <input
                            type="file"
                            id={`equipment-photo-${index}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleEquipmentPhotoChange(index, e)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`equipment-photo-${index}`)?.click()}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {form.watch(`equipment.${index}.imageUrl`) ? 'Change Photo' : 'Add Photo'}
                          </Button>
                        </div>
                      </div>
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

              {/* Step 4: Custom Questions */}
              <TabsContent value="step-4">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Custom Questions</h3>
                  {customQuestions && customQuestions.filter((q: CustomQuestion) => q.isActive).length > 0 ? (
                    <div className="space-y-4">
                      {customQuestions
                        .filter((q: CustomQuestion) => q.isActive)
                        .sort((a: CustomQuestion, b: CustomQuestion) => a.displayOrder - b.displayOrder)
                        .map((question: CustomQuestion) => (
                          <div key={question.id} className="space-y-2">
                            <Label>
                              {question.label}
                              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            {question.fieldType === 'text' && (
                              <Input
                                value={customResponses[question.id] || ''}
                                onChange={(e) => setCustomResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                                placeholder={`Enter ${question.label.toLowerCase()}`}
                              />
                            )}
                            {question.fieldType === 'textarea' && (
                              <Textarea
                                value={customResponses[question.id] || ''}
                                onChange={(e) => setCustomResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                                placeholder={`Enter ${question.label.toLowerCase()}`}
                              />
                            )}
                            {question.fieldType === 'number' && (
                              <Input
                                type="number"
                                value={customResponses[question.id] || ''}
                                onChange={(e) => setCustomResponses(prev => ({ ...prev, [question.id]: e.target.value }))}
                                placeholder={`Enter ${question.label.toLowerCase()}`}
                              />
                            )}
                            {question.fieldType === 'select' && question.options && (
                              <Select
                                value={customResponses[question.id] || ''}
                                onValueChange={(value) => setCustomResponses(prev => ({ ...prev, [question.id]: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${question.label.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {question.options.map((option: string) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {question.fieldType === 'boolean' && (
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={customResponses[question.id] === 'true'}
                                  onCheckedChange={(checked) => setCustomResponses(prev => ({ ...prev, [question.id]: checked ? 'true' : 'false' }))}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {customResponses[question.id] === 'true' ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed rounded-lg">
                      <p className="text-gray-500">No custom questions configured for your organization.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <Separator />
            
            {/* Autosave toggle and status */}
            <div className="flex items-center justify-between mb-4 bg-muted/30 p-3 rounded-md">
              <div className="flex items-center space-x-2">
                <Label htmlFor="autosave" className="cursor-pointer">
                  Autosave
                </Label>
                <Switch
                  id="autosave"
                  checked={isAutoSaveEnabled}
                  onCheckedChange={setIsAutoSaveEnabled}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
                
                {lastSaved && (
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

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
                {step < 4 ? (
                  <Button 
                    type="button" 
                    onClick={() => setStep(step + 1)}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={() => {
                      setForceSaving(true);
                      try {
                        // Save to localStorage first (always works even offline)
                        const formData = form.getValues();
                        saveToLocalStorage(formData);
                        
                        if (isOnline) {
                          // If online, submit to server
                          form.handleSubmit(handleSubmit)();
                        } else {
                          // If offline, store for later and notify user
                          setOfflineData(formData);
                          toast({
                            title: "Saved locally",
                            description: "Your changes have been saved offline. They will upload automatically when you're back online.",
                          });
                        }
                      } catch (error) {
                        console.error('Error in Save All Information:', error);
                        toast({
                          title: "Error saving information",
                          description: "There was a problem saving your changes.",
                          variant: "destructive"
                        });
                      } finally {
                        setForceSaving(false);
                      }
                    }}
                    disabled={updateClientMutation.isPending || forceSaving}
                  >
                    {updateClientMutation.isPending || forceSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        {isOnline ? (
                          <Database className="h-4 w-4 mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
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