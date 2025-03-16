import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { FileText, Check, Upload, Camera, UploadCloud, Droplets, Thermometer, Beaker, Wrench, CheckCircle, ArrowLeft, ArrowRight, Save, CheckSquare, Square, AlertCircle, Home, List, Loader2 } from 'lucide-react';
import SignatureCanvas from './SignatureCanvas';

// Define the maintenance report schema
const maintenanceReportSchema = z.object({
  maintenanceId: z.number(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
  beforePhotos: z.array(z.string()).default([]),
  afterPhotos: z.array(z.string()).default([]),
  workItems: z.array(z.object({
    id: z.string(),
    description: z.string(),
    completed: z.boolean().default(false),
  })).default([]),
  chemicalReadings: z.object({
    chlorine: z.number().min(0).max(100).nullable().default(null),
    ph: z.number().min(0).max(140).nullable().default(null),
    alkalinity: z.number().min(0).max(1000).nullable().default(null),
    calcium: z.number().min(0).max(1000).nullable().default(null),
    cyanuricAcid: z.number().min(0).max(1000).nullable().default(null),
    tds: z.number().min(0).max(10000).nullable().default(null),
    phosphates: z.number().min(0).max(1000).nullable().default(null),
    saltLevel: z.number().min(0).max(10000).nullable().default(null),
  }).default({}),
  chemicalsAdded: z.array(z.object({
    id: z.string(),
    type: z.string(),
    amount: z.number().min(0),
    unit: z.string(),
  })).default([]),
  equipmentChecks: z.object({
    pumpPsi: z.number().min(0).max(100).nullable().default(null),
    filterPressure: z.number().min(0).max(100).nullable().default(null),
    pumpBasket: z.boolean().default(false),
    skimmerBasket: z.boolean().default(false),
    pumpMotor: z.boolean().default(false),
    filterOperating: z.boolean().default(false),
  }).default({}),
  notes: z.string().optional(),
  securedYard: z.boolean().default(false),
  customerSignature: z.string().optional(),
  technicianSignature: z.string().optional(),
  completedAt: z.date().nullable().default(null),
});

// Define the form types
type MaintenanceReportFormValues = z.infer<typeof maintenanceReportSchema>;

// Define default work items
const DEFAULT_WORK_ITEMS = [
  { id: 'skim', description: 'Skim surface debris', completed: false },
  { id: 'vacuum', description: 'Vacuum pool floor', completed: false },
  { id: 'brush', description: 'Brush walls and steps', completed: false },
  { id: 'empty', description: 'Empty pump and skimmer baskets', completed: false },
  { id: 'clean', description: 'Clean tile line', completed: false },
  { id: 'backwash', description: 'Backwash filter if needed', completed: false },
  { id: 'test', description: 'Test water chemistry', completed: false },
  { id: 'adjust', description: 'Add chemicals as needed', completed: false }
];

// Define chemical types
const CHEMICAL_TYPES = [
  { id: 'liquid_chlorine', label: 'Liquid Chlorine', defaultUnit: 'gallons' },
  { id: 'tablets', label: 'Chlorine Tablets', defaultUnit: 'tablets' },
  { id: 'muriatic_acid', label: 'Muriatic Acid', defaultUnit: 'oz' },
  { id: 'soda_ash', label: 'Soda Ash', defaultUnit: 'oz' },
  { id: 'sodium_bicarbonate', label: 'Sodium Bicarbonate', defaultUnit: 'lb' },
  { id: 'calcium_chloride', label: 'Calcium Chloride', defaultUnit: 'lb' },
  { id: 'stabilizer', label: 'Stabilizer (CYA)', defaultUnit: 'oz' },
  { id: 'algaecide', label: 'Algaecide', defaultUnit: 'oz' },
  { id: 'salt', label: 'Salt', defaultUnit: 'lb' },
  { id: 'phosphate_remover', label: 'Phosphate Remover', defaultUnit: 'oz' },
];

// Photo upload component
const PhotoUpload = ({ 
  photos, 
  setPhotos, 
  label, 
  description 
}: { 
  photos: string[]; 
  setPhotos: (photos: string[]) => void; 
  label: string; 
  description: string;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    const files = e.target.files;
    if (!files || files.length === 0) {
      setIsUploading(false);
      return;
    }
    
    // For this MVP implementation, we'll simulate file uploads
    // In a real implementation, this would upload to a server/CDN
    // and return URLs to the uploaded files
    
    const newPhotos = [...photos];
    Array.from(files).forEach(file => {
      // Create a local file URL (this is just for demo purposes)
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          newPhotos.push(reader.result);
          
          // If all files have been processed, update state
          if (newPhotos.length === photos.length + files.length) {
            setPhotos(newPhotos);
            setIsUploading(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label>{label}</Label>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      
      <div className="flex flex-wrap gap-3 mb-4">
        {photos.map((photo, index) => (
          <div 
            key={index} 
            className="relative w-32 h-32 border rounded-md overflow-hidden group"
          >
            <img 
              src={photo} 
              alt={`Uploaded photo ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            <div 
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => removePhoto(index)}
                className="h-8 px-2"
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        
        <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex flex-col items-center justify-center p-2 text-center">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 mb-2 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
              </>
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handlePhotoUpload} 
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
};

export default function MaintenanceReportForm() {
  const { id } = useParams<{ id: string }>();
  const maintenanceId = parseInt(id || '0', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Track the current step
  const [currentStep, setCurrentStep] = useState<string>('before-photos');
  const steps = [
    { id: 'before-photos', label: 'Before Photos', icon: Camera },
    { id: 'work-items', label: 'Work Items', icon: CheckSquare },
    { id: 'chemistry', label: 'Chemistry', icon: Beaker },
    { id: 'equipment', label: 'Equipment', icon: Wrench },
    { id: 'after-photos', label: 'After Photos', icon: Camera },
    { id: 'secure-yard', label: 'Secure Yard', icon: Home },
    { id: 'review', label: 'Review & Submit', icon: FileText },
  ];
  
  // Form state
  const [photos, setPhotos] = useState<{ before: string[], after: string[] }>({ before: [], after: [] });
  const [workItems, setWorkItems] = useState<{ id: string, description: string, completed: boolean }[]>(DEFAULT_WORK_ITEMS);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
  
  // Fetch existing report if available
  const { data: existingReport, isLoading: isLoadingReport } = useQuery({
    queryKey: ['/api/maintenance-reports/maintenance', maintenanceId],
    queryFn: () => apiRequest(`/api/maintenance-reports/maintenance/${maintenanceId}`),
    enabled: !!maintenanceId,
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const report = data[0];
        
        // Populate form with existing data
        if (report.beforePhotos && report.beforePhotos.length > 0) {
          setPhotos(prev => ({ ...prev, before: report.beforePhotos }));
        }
        
        if (report.afterPhotos && report.afterPhotos.length > 0) {
          setPhotos(prev => ({ ...prev, after: report.afterPhotos }));
        }
        
        if (report.workItems && report.workItems.length > 0) {
          setWorkItems(report.workItems);
        }
        
        if (report.customerSignature) {
          setCustomerSignature(report.customerSignature);
        }
        
        if (report.technicianSignature) {
          setTechnicianSignature(report.technicianSignature);
        }
        
        // Update form
        const formValues: Partial<MaintenanceReportFormValues> = {
          maintenanceId,
          status: report.status || 'draft',
          beforePhotos: report.beforePhotos || [],
          afterPhotos: report.afterPhotos || [],
          workItems: report.workItems || DEFAULT_WORK_ITEMS,
          chemicalReadings: report.chemicalReadings || {},
          chemicalsAdded: report.chemicalsAdded || [],
          equipmentChecks: report.equipmentChecks || {},
          notes: report.notes || '',
          securedYard: report.securedYard || false,
          customerSignature: report.customerSignature || '',
          technicianSignature: report.technicianSignature || '',
          completedAt: report.completedAt ? new Date(report.completedAt) : null,
        };
        
        form.reset(formValues as MaintenanceReportFormValues);
      }
    }
  });
  
  // Form definition
  const form = useForm<MaintenanceReportFormValues>({
    resolver: zodResolver(maintenanceReportSchema),
    defaultValues: {
      maintenanceId,
      status: 'draft',
      beforePhotos: [],
      afterPhotos: [],
      workItems: DEFAULT_WORK_ITEMS,
      chemicalReadings: {
        chlorine: null,
        ph: null,
        alkalinity: null,
        calcium: null,
        cyanuricAcid: null,
        tds: null,
        phosphates: null,
        saltLevel: null,
      },
      chemicalsAdded: [],
      equipmentChecks: {
        pumpPsi: null,
        filterPressure: null,
        pumpBasket: false,
        skimmerBasket: false,
        pumpMotor: false,
        filterOperating: false,
      },
      notes: '',
      securedYard: false,
      customerSignature: '',
      technicianSignature: '',
      completedAt: null,
    }
  });
  
  // Save report mutation
  const saveReportMutation = useMutation({
    mutationFn: async (data: MaintenanceReportFormValues) => {
      // Check if we're updating an existing report or creating a new one
      if (existingReport && existingReport.length > 0) {
        return apiRequest(`/api/maintenance-reports/${existingReport[0].id}`, 'PATCH', data);
      } else {
        return apiRequest('/api/maintenance-reports', 'POST', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-reports/maintenance', maintenanceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenances', maintenanceId] });
      
      toast({
        title: "Report saved",
        description: "Your maintenance report has been saved successfully.",
      });
      setSaveInProgress(false);
    },
    onError: (error) => {
      toast({
        title: "Error saving report",
        description: "There was an error saving your report. Please try again.",
        variant: "destructive",
      });
      setSaveInProgress(false);
      console.error("Error saving report:", error);
    }
  });
  
  // Submit report mutation (status = submitted)
  const submitReportMutation = useMutation({
    mutationFn: async (data: MaintenanceReportFormValues) => {
      const submitData = { ...data, status: 'submitted', completedAt: new Date() };
      
      // Check if we're updating an existing report or creating a new one
      if (existingReport && existingReport.length > 0) {
        return apiRequest(`/api/maintenance-reports/${existingReport[0].id}`, 'PATCH', submitData);
      } else {
        return apiRequest('/api/maintenance-reports', 'POST', submitData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-reports/maintenance', maintenanceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenances', maintenanceId] });
      
      toast({
        title: "Report submitted",
        description: "Your maintenance report has been submitted successfully.",
      });
      setSaveInProgress(false);
      
      // Navigate back to maintenance list
      navigate('/maintenance');
    },
    onError: (error) => {
      toast({
        title: "Error submitting report",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
      setSaveInProgress(false);
      console.error("Error submitting report:", error);
    }
  });
  
  // Update form values when photos change
  useEffect(() => {
    form.setValue('beforePhotos', photos.before);
    form.setValue('afterPhotos', photos.after);
  }, [photos, form]);
  
  // Update form values when work items change
  useEffect(() => {
    form.setValue('workItems', workItems);
  }, [workItems, form]);
  
  // Update form values when signatures change
  useEffect(() => {
    if (customerSignature) {
      form.setValue('customerSignature', customerSignature);
    }
    if (technicianSignature) {
      form.setValue('technicianSignature', technicianSignature);
    }
  }, [customerSignature, technicianSignature, form]);
  
  // Save draft handler
  const handleSaveDraft = () => {
    setSaveInProgress(true);
    saveReportMutation.mutate(form.getValues());
  };
  
  // Submit handler
  const onSubmit = (data: MaintenanceReportFormValues) => {
    setSaveInProgress(true);
    submitReportMutation.mutate(data);
  };
  
  // Handle work item toggle
  const toggleWorkItem = (itemId: string) => {
    setWorkItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };
  
  // Navigate to next step
  const goToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
    
    // Auto-save when moving between steps
    handleSaveDraft();
  };
  
  // Navigate to previous step
  const goToPrevStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };
  
  // Calculate progress percentage
  const progressPercentage = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    return Math.round((currentIndex / (steps.length - 1)) * 100);
  };
  
  // Format chemical readings for display
  const formatChemicalReading = (value: number | null, unit: string) => {
    if (value === null) return 'Not recorded';
    return `${value} ${unit}`;
  };
  
  if (isLoadingReport) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Maintenance Report</CardTitle>
          <CardDescription>Loading maintenance report...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full max-w-sm" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mt-6">
        <CardHeader>
          <CardTitle>Maintenance Report</CardTitle>
          <CardDescription>Complete the following steps to record this maintenance service</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Progress indicator */}
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{progressPercentage()}%</span>
                </div>
                <Progress value={progressPercentage()} className="h-2" />
              </div>
              
              {/* Step navigation */}
              <div className="flex flex-wrap gap-2 mb-6">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                  
                  return (
                    <Button
                      key={step.id}
                      type="button"
                      variant={isActive ? "default" : (isCompleted ? "outline" : "ghost")}
                      size="sm"
                      className={`flex items-center gap-1 ${isActive ? 'bg-primary text-primary-foreground' : ''} ${isCompleted ? 'border-primary text-primary' : ''}`}
                      onClick={() => setCurrentStep(step.id)}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{step.label}</span>
                      {isCompleted && <Check className="h-3 w-3 ml-1" />}
                    </Button>
                  );
                })}
              </div>
              
              {/* Step content */}
              <div className="mb-8">
                {currentStep === 'before-photos' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Before Photos</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Take photos of the pool before you begin service. These photos will document the initial condition.
                      </p>
                    </div>
                    
                    <PhotoUpload
                      photos={photos.before}
                      setPhotos={(newPhotos) => setPhotos(prev => ({ ...prev, before: newPhotos }))}
                      label="Before Photos"
                      description="Take photos of the pool before you begin service"
                    />
                  </div>
                )}
                
                {currentStep === 'work-items' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Work Items</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Check off each task as you complete it. This documents the work performed during this service visit.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {workItems.map((item) => (
                        <div 
                          key={item.id}
                          className={`flex items-center space-x-3 p-3 rounded-md border ${item.completed ? 'bg-primary/5 border-primary/30' : 'bg-card'}`}
                        >
                          <Checkbox
                            id={item.id}
                            checked={item.completed}
                            onCheckedChange={() => toggleWorkItem(item.id)}
                          />
                          <label
                            htmlFor={item.id}
                            className={`flex-grow cursor-pointer text-sm font-medium ${item.completed ? 'text-primary' : ''}`}
                          >
                            {item.description}
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter any additional notes about the work performed..." 
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {currentStep === 'chemistry' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Water Chemistry</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Record water chemistry readings and log chemicals added to the pool.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Water Test Readings</h4>
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.chlorine"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Free Chlorine (ppm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="10"
                                  step="0.1" 
                                  placeholder="0.0" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.ph"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>pH</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="14"
                                  step="0.1" 
                                  placeholder="7.4" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.alkalinity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Alkalinity (ppm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="300"
                                  step="1" 
                                  placeholder="80" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.calcium"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Calcium Hardness (ppm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="800"
                                  step="1" 
                                  placeholder="250" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Additional Readings (Optional)</h4>
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.cyanuricAcid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stabilizer/CYA (ppm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100"
                                  step="1" 
                                  placeholder="30" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.tds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Dissolved Solids (ppm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="5000"
                                  step="1" 
                                  placeholder="1000" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.phosphates"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phosphates (ppb)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="1000"
                                  step="1" 
                                  placeholder="100" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="chemicalReadings.saltLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Salt Level (ppm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="4000"
                                  step="1" 
                                  placeholder="3200" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Chemicals Added</h4>
                      <p className="text-sm text-muted-foreground">
                        Record any chemicals added to the pool during this service visit.
                      </p>
                      
                      {form.getValues().chemicalsAdded.map((chemical, index) => (
                        <div key={index} className="flex flex-wrap items-end gap-2 p-3 border rounded-md bg-muted/30">
                          <div className="flex-1 min-w-[150px]">
                            <Label htmlFor={`chemical-type-${index}`} className="text-xs mb-1 block">Type</Label>
                            <Select 
                              value={chemical.type}
                              onValueChange={(value) => {
                                const newChemicals = [...form.getValues().chemicalsAdded];
                                newChemicals[index].type = value;
                                
                                // Set default unit based on chemical type
                                const chemType = CHEMICAL_TYPES.find(c => c.id === value);
                                if (chemType) {
                                  newChemicals[index].unit = chemType.defaultUnit;
                                }
                                
                                form.setValue('chemicalsAdded', newChemicals);
                              }}
                            >
                              <SelectTrigger id={`chemical-type-${index}`} className="w-full">
                                <SelectValue placeholder="Select chemical" />
                              </SelectTrigger>
                              <SelectContent>
                                {CHEMICAL_TYPES.map((chemType) => (
                                  <SelectItem key={chemType.id} value={chemType.id}>
                                    {chemType.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="w-20">
                            <Label htmlFor={`chemical-amount-${index}`} className="text-xs mb-1 block">Amount</Label>
                            <Input 
                              id={`chemical-amount-${index}`}
                              type="number"
                              min="0"
                              step="0.1"
                              value={chemical.amount || ''}
                              onChange={(e) => {
                                const newChemicals = [...form.getValues().chemicalsAdded];
                                newChemicals[index].amount = parseFloat(e.target.value) || 0;
                                form.setValue('chemicalsAdded', newChemicals);
                              }}
                            />
                          </div>
                          
                          <div className="w-24">
                            <Label htmlFor={`chemical-unit-${index}`} className="text-xs mb-1 block">Unit</Label>
                            <Select 
                              value={chemical.unit}
                              onValueChange={(value) => {
                                const newChemicals = [...form.getValues().chemicalsAdded];
                                newChemicals[index].unit = value;
                                form.setValue('chemicalsAdded', newChemicals);
                              }}
                            >
                              <SelectTrigger id={`chemical-unit-${index}`} className="w-full">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="oz">oz</SelectItem>
                                <SelectItem value="lb">lb</SelectItem>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="L">L</SelectItem>
                                <SelectItem value="gallons">gallons</SelectItem>
                                <SelectItem value="tablets">tablets</SelectItem>
                                <SelectItem value="cups">cups</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newChemicals = [...form.getValues().chemicalsAdded];
                              newChemicals.splice(index, 1);
                              form.setValue('chemicalsAdded', newChemicals);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const newChemicals = [...form.getValues().chemicalsAdded];
                          newChemicals.push({
                            id: `chem-${Date.now()}`,
                            type: CHEMICAL_TYPES[0].id,
                            amount: 0,
                            unit: CHEMICAL_TYPES[0].defaultUnit,
                          });
                          form.setValue('chemicalsAdded', newChemicals);
                        }}
                      >
                        Add Chemical
                      </Button>
                    </div>
                  </div>
                )}
                
                {currentStep === 'equipment' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Equipment Check</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Inspect and record the condition of pool equipment.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Pressure Readings</h4>
                        
                        <FormField
                          control={form.control}
                          name="equipmentChecks.pumpPsi"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pump Pressure (PSI)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="50"
                                  step="0.5" 
                                  placeholder="15" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="equipmentChecks.filterPressure"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Filter Pressure (PSI)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="50"
                                  step="0.5" 
                                  placeholder="20" 
                                  {...field}
                                  value={field.value === null ? '' : field.value}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Equipment Condition</h4>
                        
                        <FormField
                          control={form.control}
                          name="equipmentChecks.pumpBasket"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Pump Basket Clean</FormLabel>
                                <FormDescription>Pump basket is clean and in good condition</FormDescription>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="equipmentChecks.skimmerBasket"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Skimmer Basket Clean</FormLabel>
                                <FormDescription>Skimmer basket is clean and in good condition</FormDescription>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="equipmentChecks.pumpMotor"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Pump Motor Working</FormLabel>
                                <FormDescription>Pump motor is operating correctly</FormDescription>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="equipmentChecks.filterOperating"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Filter Operating</FormLabel>
                                <FormDescription>Filter is operating correctly</FormDescription>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {currentStep === 'after-photos' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">After Photos</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Take photos of the pool after completing your service. These photos will document the final condition.
                      </p>
                    </div>
                    
                    <PhotoUpload
                      photos={photos.after}
                      setPhotos={(newPhotos) => setPhotos(prev => ({ ...prev, after: newPhotos }))}
                      label="After Photos"
                      description="Take photos of the pool after completing your service"
                    />
                  </div>
                )}
                
                {currentStep === 'secure-yard' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Secure the Property</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Confirm that you have secured the client's property and gates before leaving.
                      </p>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="securedYard"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Property Security Confirmation</FormLabel>
                          <FormControl>
                            <div className="bg-muted/50 rounded-lg p-4 border">
                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  id="securedYard"
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                                <div>
                                  <label
                                    htmlFor="securedYard"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    I confirm that I have secured all gates, doors, and entry points
                                  </label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    By checking this box, I confirm that I have secured all gates, locked all doors, and ensured that the property is secure before leaving.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-3">Customer Signature</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ask the customer to sign to confirm service completion.
                      </p>
                      
                      <SignatureCanvas
                        value={customerSignature}
                        onChange={setCustomerSignature}
                        label="Customer Signature"
                      />
                    </div>
                    
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-3">Technician Signature</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sign to confirm you have completed all required service items.
                      </p>
                      
                      <SignatureCanvas
                        value={technicianSignature}
                        onChange={setTechnicianSignature}
                        label="Technician Signature"
                      />
                    </div>
                  </div>
                )}
                
                {currentStep === 'review' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Review & Submit</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Review your maintenance report and submit when ready.
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Before & After Photos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Before Photos</h4>
                              <div className="flex flex-wrap gap-2">
                                {photos.before.length > 0 ? (
                                  photos.before.map((photo, index) => (
                                    <div key={index} className="w-16 h-16 rounded-md overflow-hidden">
                                      <img src={photo} alt={`Before ${index + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">No before photos added</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">After Photos</h4>
                              <div className="flex flex-wrap gap-2">
                                {photos.after.length > 0 ? (
                                  photos.after.map((photo, index) => (
                                    <div key={index} className="w-16 h-16 rounded-md overflow-hidden">
                                      <img src={photo} alt={`After ${index + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">No after photos added</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Work Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {workItems.map((item) => (
                              <div key={item.id} className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {item.completed ? (
                                    <Check className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Square className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className={item.completed ? 'text-sm' : 'text-sm text-muted-foreground'}>
                                  {item.description}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          {form.getValues().notes && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="text-sm font-medium mb-1">Notes</h4>
                              <p className="text-sm">{form.getValues().notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Water Chemistry</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <h4 className="text-xs text-muted-foreground">Chlorine</h4>
                              <p className="text-sm font-medium">
                                {formatChemicalReading(form.getValues().chemicalReadings.chlorine, 'ppm')}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs text-muted-foreground">pH</h4>
                              <p className="text-sm font-medium">
                                {formatChemicalReading(form.getValues().chemicalReadings.ph, '')}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs text-muted-foreground">Alkalinity</h4>
                              <p className="text-sm font-medium">
                                {formatChemicalReading(form.getValues().chemicalReadings.alkalinity, 'ppm')}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs text-muted-foreground">Calcium</h4>
                              <p className="text-sm font-medium">
                                {formatChemicalReading(form.getValues().chemicalReadings.calcium, 'ppm')}
                              </p>
                            </div>
                          </div>
                          
                          {form.getValues().chemicalsAdded.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="text-sm font-medium mb-2">Chemicals Added</h4>
                              <div className="space-y-2">
                                {form.getValues().chemicalsAdded.map((chemical, index) => {
                                  const chemType = CHEMICAL_TYPES.find(c => c.id === chemical.type);
                                  return (
                                    <div key={index} className="flex items-center gap-2">
                                      <Beaker className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm">
                                        {chemType?.label}: {chemical.amount} {chemical.unit}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Equipment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs text-muted-foreground">Pump PSI</h4>
                              <p className="text-sm font-medium">
                                {formatChemicalReading(form.getValues().equipmentChecks.pumpPsi, 'PSI')}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs text-muted-foreground">Filter PSI</h4>
                              <p className="text-sm font-medium">
                                {formatChemicalReading(form.getValues().equipmentChecks.filterPressure, 'PSI')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              {form.getValues().equipmentChecks.pumpBasket ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">Pump Basket Clean</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {form.getValues().equipmentChecks.skimmerBasket ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">Skimmer Basket Clean</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {form.getValues().equipmentChecks.pumpMotor ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">Pump Motor Working</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {form.getValues().equipmentChecks.filterOperating ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">Filter Operating</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Final Steps</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              {form.getValues().securedYard ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                              <span className="text-sm">
                                {form.getValues().securedYard ? 
                                  "Property secured" : 
                                  "Property security not confirmed"}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <div>
                                <h4 className="text-sm font-medium mb-2">Customer Signature</h4>
                                {customerSignature ? (
                                  <div className="border rounded-md p-2 bg-card">
                                    <img
                                      src={customerSignature}
                                      alt="Customer signature"
                                      className="h-20 w-auto object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
                                    No customer signature
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-medium mb-2">Technician Signature</h4>
                                {technicianSignature ? (
                                  <div className="border rounded-md p-2 bg-card">
                                    <img
                                      src={technicianSignature}
                                      alt="Technician signature"
                                      className="h-20 w-auto object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="border border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
                                    No technician signature
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Submission warnings */}
                      {(!customerSignature || !technicianSignature || !form.getValues().securedYard) && (
                        <Alert variant="warning">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Attention Required</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 mt-2">
                              {!form.getValues().securedYard && (
                                <li>Please confirm you have secured the client's property</li>
                              )}
                              {!customerSignature && (
                                <li>Customer signature is missing</li>
                              )}
                              {!technicianSignature && (
                                <li>Technician signature is missing</li>
                              )}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Navigation buttons */}
                <div className="flex flex-wrap justify-between gap-2 mt-8 pt-4 border-t">
                  <div>
                    {currentStep !== steps[0].id && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goToPrevStep}
                        disabled={saveInProgress}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={saveInProgress}
                    >
                      {saveInProgress ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Draft
                        </>
                      )}
                    </Button>
                    
                    {currentStep !== 'review' ? (
                      <Button
                        type="button"
                        onClick={goToNextStep}
                        disabled={saveInProgress}
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={saveInProgress || !form.getValues().securedYard || !customerSignature || !technicianSignature}
                      >
                        {saveInProgress ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Submit Report
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}