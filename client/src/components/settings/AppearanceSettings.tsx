import React, { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Sun, 
  Moon, 
  Laptop, 
  Palette, 
  Image, 
  Upload,
  RefreshCw,
  Layout,
  AlignLeft,
  AlignJustify 
} from "lucide-react";

// Define appearance settings schema
const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  accentColor: z.string().min(4).default("#0284c7"),
  colorVariant: z.enum(["professional", "tint", "vibrant"]).default("tint"),
  borderRadius: z.number().min(0).max(20).default(8),
  compactMode: z.boolean().default(false),
  sidebarCollapsed: z.boolean().default(false),
  customLogo: z.boolean().default(false),
  // Not actually implemented in this demo, just for show
  logoUrl: z.string().optional(),
  brandName: z.string().min(1).default("Pool Service Pro"),
  customFontSize: z.enum(["small", "medium", "large"]).default("medium"),
});

type AppearanceFormValues = z.infer<typeof appearanceSchema>;

export function AppearanceSettings() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Form setup
  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      theme: "system",
      accentColor: "#0284c7",
      colorVariant: "tint",
      borderRadius: 8,
      compactMode: false,
      sidebarCollapsed: false,
      customLogo: false,
      brandName: "Pool Service Pro",
      customFontSize: "medium",
    },
  });

  // Mock appearance settings save
  const mutation = useMutation({
    mutationFn: async (values: AppearanceFormValues) => {
      setIsUpdating(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return values;
    },
    onSuccess: (data) => {
      setIsUpdating(false);
      // In a real implementation, this would update a theme context or similar
      toast({
        title: "Settings updated",
        description: "Your appearance settings have been saved",
      });
    },
    onError: () => {
      setIsUpdating(false);
      toast({
        title: "Error",
        description: "Failed to update appearance settings",
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  function onSubmit(data: AppearanceFormValues) {
    mutation.mutate(data);
  }

  // Preview component for theme selection
  const ThemePreview = ({ theme }: { theme: "light" | "dark" | "system" }) => {
    const getPreviewClass = () => {
      switch (theme) {
        case "light": return "bg-white border-gray-200";
        case "dark": return "bg-gray-900 border-gray-700";
        case "system": return "bg-gradient-to-br from-white to-gray-900 border-gray-400";
        default: return "bg-white border-gray-200";
      }
    };

    const getTextClass = () => {
      switch (theme) {
        case "light": return "text-gray-900";
        case "dark": return "text-white";
        case "system": return "text-gray-600";
        default: return "text-gray-900";
      }
    };

    return (
      <div className={`h-20 rounded-md p-2 border ${getPreviewClass()} flex items-center justify-center`}>
        <span className={`text-sm font-medium ${getTextClass()}`}>
          {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme
        </span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance Settings</CardTitle>
        <CardDescription>
          Customize the look and feel of your application. Changes will apply to all users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Theme</h3>
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>Choose a theme preference</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-4"
                      >
                        <FormItem className="flex flex-col space-y-3">
                          <FormControl>
                            <RadioGroupItem value="light" className="sr-only" />
                          </FormControl>
                          <div 
                            className={`cursor-pointer border-2 rounded-md overflow-hidden ${field.value === "light" ? "border-primary" : "border-transparent"}`}
                            onClick={() => field.onChange("light")}
                          >
                            <ThemePreview theme="light" />
                          </div>
                          <FormLabel className="text-center cursor-pointer" onClick={() => field.onChange("light")}>
                            <div className="flex items-center justify-center">
                              <Sun className="h-4 w-4 mr-1" />
                              Light
                            </div>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex flex-col space-y-3">
                          <FormControl>
                            <RadioGroupItem value="dark" className="sr-only" />
                          </FormControl>
                          <div 
                            className={`cursor-pointer border-2 rounded-md overflow-hidden ${field.value === "dark" ? "border-primary" : "border-transparent"}`}
                            onClick={() => field.onChange("dark")}
                          >
                            <ThemePreview theme="dark" />
                          </div>
                          <FormLabel className="text-center cursor-pointer" onClick={() => field.onChange("dark")}>
                            <div className="flex items-center justify-center">
                              <Moon className="h-4 w-4 mr-1" />
                              Dark
                            </div>
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex flex-col space-y-3">
                          <FormControl>
                            <RadioGroupItem value="system" className="sr-only" />
                          </FormControl>
                          <div 
                            className={`cursor-pointer border-2 rounded-md overflow-hidden ${field.value === "system" ? "border-primary" : "border-transparent"}`}
                            onClick={() => field.onChange("system")}
                          >
                            <ThemePreview theme="system" />
                          </div>
                          <FormLabel className="text-center cursor-pointer" onClick={() => field.onChange("system")}>
                            <div className="flex items-center justify-center">
                              <Laptop className="h-4 w-4 mr-1" />
                              System
                            </div>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Select a light or dark theme, or let the system decide based on user preferences
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Colors</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <div className="flex gap-2">
                        <div 
                          className="h-10 w-10 rounded-md border flex-shrink-0"
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input 
                            placeholder="#0284c7" 
                            {...field} 
                            type="text"
                          />
                        </FormControl>
                      </div>
                      <FormDescription>
                        The primary brand color used throughout the application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="colorVariant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color Variant</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select variant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="tint">Tint</SelectItem>
                          <SelectItem value="vibrant">Vibrant</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How strongly the accent color is used in the UI
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Interface</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="borderRadius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Border Radius: {field.value}px</FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={20}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="py-4"
                        />
                      </FormControl>
                      <FormDescription>
                        Adjust the roundness of UI elements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customFontSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Font Size</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium (Default)</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Adjust text size throughout the application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compactMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center">
                          <AlignJustify className="h-4 w-4 mr-2" />
                          <FormLabel className="text-base">Compact Mode</FormLabel>
                        </div>
                        <FormDescription>
                          Reduce spacing and padding in the UI
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sidebarCollapsed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center">
                          <Layout className="h-4 w-4 mr-2" />
                          <FormLabel className="text-base">Default Sidebar State</FormLabel>
                        </div>
                        <FormDescription>
                          Start with sidebar collapsed for more content space
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Branding</h3>
              
              <FormField
                control={form.control}
                name="brandName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Your company name displayed in the application
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customLogo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center">
                        <Image className="h-4 w-4 mr-2" />
                        <FormLabel className="text-base">Custom Logo</FormLabel>
                      </div>
                      <FormDescription>
                        Use your own company logo instead of the default
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("customLogo") && (
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="h-16 w-16 flex-shrink-0 rounded-md border flex items-center justify-center bg-gray-100">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload your logo</p>
                      <p className="text-sm text-muted-foreground">
                        Recommended size: 512x512px. PNG or SVG format.
                      </p>
                    </div>
                    <Button variant="outline" disabled className="flex-shrink-0">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" disabled>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}