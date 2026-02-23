import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { Droplets, Wrench, CheckSquare, Beaker, FileText, Plus, Trash2, Loader2, AlertTriangle, Send, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const PREDEFINED_ISSUES: Record<string, string[]> = {
  "Water Quality": [
    "Green pool", "Cloudy water", "Algae buildup", "Discolored water",
    "Foam on surface", "Strong chlorine smell", "Low water level", "High water level"
  ],
  "Equipment - Pump": [
    "Pump not running", "Pump making noise", "Pump leaking", "Low flow rate", "Air in pump basket"
  ],
  "Equipment - Filter": [
    "High filter pressure", "Filter leaking", "Filter needs replacement", "Broken filter gauge"
  ],
  "Equipment - Heater": [
    "Heater not firing", "Heater error code", "Heater leaking", "Low heat output"
  ],
  "Equipment - Salt System": [
    "Salt cell needs cleaning", "Salt cell needs replacement", "Low salt reading", "Salt system error"
  ],
  "Pool Surface": [
    "Cracked plaster", "Staining", "Scaling", "Tile damage", "Missing tiles", "Coping damage"
  ],
  "Safety & Structure": [
    "Broken drain cover", "Fence/gate issue", "Missing safety equipment", "Deck damage",
    "Leak detected", "Light not working"
  ],
  "Cleaner": [
    "Cleaner not moving", "Cleaner stuck", "Hose tangled", "Cleaner needs repair"
  ],
  "Skimmer & Plumbing": [
    "Skimmer cracked", "Skimmer basket broken", "Return fitting loose", "Valve stuck", "Plumbing leak"
  ],
};

type IssueEntry = {
  category: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  notes: string;
};

const DEFAULT_CHECKLIST_ITEMS = [
  "Skim surface debris",
  "Brush walls and steps",
  "Vacuum pool floor",
  "Clean skimmer baskets",
  "Clean pump strainer basket",
  "Backwash/clean filter",
  "Test water chemistry",
  "Add chemicals as needed",
  "Check equipment operation",
  "Inspect pool surface",
];

const chemicalSchema = z.object({
  name: z.string().min(1, "Chemical name is required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  unit: z.string().min(1, "Unit is required"),
  costDollars: z.coerce.number().min(0, "Cost must be positive").default(0),
});

const checklistItemSchema = z.object({
  name: z.string(),
  completed: z.boolean().default(false),
  notes: z.string().optional(),
});

const fieldServiceReportSchema = z.object({
  phLevel: z.coerce.number().min(0).max(14).optional().or(z.literal("")),
  freeChlorine: z.coerce.number().min(0).max(10).optional().or(z.literal("")),
  combinedChlorine: z.coerce.number().min(0).max(1).optional().or(z.literal("")),
  alkalinity: z.coerce.number().min(0).max(300).optional().or(z.literal("")),
  calciumHardness: z.coerce.number().min(0).max(1000).optional().or(z.literal("")),
  cyanuricAcid: z.coerce.number().min(0).max(150).optional().or(z.literal("")),
  tds: z.coerce.number().min(0).max(5000).optional().or(z.literal("")),
  saltLevel: z.coerce.number().min(0).max(6000).optional().or(z.literal("")),
  phosphateLevel: z.coerce.number().min(0).max(2000).optional().or(z.literal("")),
  waterTemperature: z.coerce.number().optional().or(z.literal("")),
  waterClarity: z.string().optional(),
  waterColor: z.string().optional(),

  filterPressurePsi: z.coerce.number().min(0).optional().or(z.literal("")),
  filterCondition: z.string().optional(),
  pumpCondition: z.string().optional(),
  pumpFlowRate: z.coerce.number().min(0).optional().or(z.literal("")),
  heaterCondition: z.string().optional(),
  heaterTemperature: z.coerce.number().optional().or(z.literal("")),
  saltCellCondition: z.string().optional(),
  cleanerCondition: z.string().optional(),
  lightCondition: z.string().optional(),
  surfaceCondition: z.string().optional(),
  waterLineCondition: z.string().optional(),
  tileCondition: z.string().optional(),
  waterLevel: z.string().optional(),
  skimmerCondition: z.string().optional(),

  checklist: z.array(checklistItemSchema).optional(),

  chemicals: z.array(chemicalSchema).optional(),

  issues: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    notes: z.string().optional(),
  })).optional(),

  techNotes: z.string().optional(),
  recommendations: z.string().optional(),
  followUpRequired: z.boolean().default(false),
  followUpNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  customerPresent: z.boolean().default(false),
  customerNotes: z.string().optional(),
  overallCondition: z.string().optional(),
});

type FieldServiceReportValues = z.infer<typeof fieldServiceReportSchema>;

interface FieldServiceReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId?: number;
  maintenanceId?: number;
  clientId: number;
  technicianId?: number;
  serviceTemplateId?: number;
  checklistItems?: string;
  onSuccess?: () => void;
}

function getConditionColor(value: string): string {
  const greenValues = ["good", "running", "working", "clean", "clear", "normal"];
  const yellowValues = ["needs_cleaning", "noisy", "slightly_cloudy", "buildup", "low", "high", "flickering", "stuck", "debris"];
  const redValues = ["needs_replacement", "leaking", "not_running", "not_working", "cloudy", "green", "dark_green", "algae_spots", "staining", "scaling", "cracked", "missing", "damaged"];

  if (greenValues.includes(value)) return "text-emerald-600 dark:text-emerald-400";
  if (yellowValues.includes(value)) return "text-amber-600 dark:text-amber-400";
  if (redValues.includes(value)) return "text-red-600 dark:text-red-400";
  return "";
}

interface SliderFieldConfig {
  min: number;
  max: number;
  step: number;
  idealMin: number;
  idealMax: number;
  unit?: string;
}

const WATER_CHEMISTRY_SLIDERS: Record<string, SliderFieldConfig> = {
  phLevel: { min: 0, max: 14, step: 0.1, idealMin: 7.2, idealMax: 7.6 },
  freeChlorine: { min: 0, max: 10, step: 0.1, idealMin: 1, idealMax: 3, unit: "ppm" },
  combinedChlorine: { min: 0, max: 1, step: 0.1, idealMin: 0, idealMax: 0.5, unit: "ppm" },
  alkalinity: { min: 0, max: 300, step: 1, idealMin: 80, idealMax: 120, unit: "ppm" },
  calciumHardness: { min: 0, max: 1000, step: 1, idealMin: 200, idealMax: 400, unit: "ppm" },
  cyanuricAcid: { min: 0, max: 150, step: 1, idealMin: 30, idealMax: 50, unit: "ppm" },
  tds: { min: 0, max: 5000, step: 1, idealMin: 0, idealMax: 3000, unit: "ppm" },
  saltLevel: { min: 0, max: 6000, step: 100, idealMin: 2700, idealMax: 3400, unit: "ppm" },
  phosphateLevel: { min: 0, max: 2000, step: 10, idealMin: 0, idealMax: 100, unit: "ppb" },
  waterTemperature: { min: 40, max: 110, step: 1, idealMin: 78, idealMax: 84, unit: "°F" },
};

function getSliderColor(value: number | "", config: SliderFieldConfig): string {
  if (value === "" || value === undefined || value === null) return "bg-muted";
  const v = Number(value);
  if (v >= config.idealMin && v <= config.idealMax) return "bg-emerald-500";
  const rangeSize = config.idealMax - config.idealMin;
  const buffer = Math.max(rangeSize * 0.5, (config.max - config.min) * 0.05);
  if (v >= config.idealMin - buffer && v <= config.idealMax + buffer) return "bg-amber-500";
  return "bg-red-500";
}

function getSliderTextColor(value: number | "", config: SliderFieldConfig): string {
  if (value === "" || value === undefined || value === null) return "text-muted-foreground";
  const v = Number(value);
  if (v >= config.idealMin && v <= config.idealMax) return "text-emerald-600 dark:text-emerald-400";
  const rangeSize = config.idealMax - config.idealMin;
  const buffer = Math.max(rangeSize * 0.5, (config.max - config.min) * 0.05);
  if (v >= config.idealMin - buffer && v <= config.idealMax + buffer) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getSliderTrackHex(value: number | "", config: SliderFieldConfig): string {
  if (value === "" || value === undefined || value === null) return "#94a3b8";
  const v = Number(value);
  if (v >= config.idealMin && v <= config.idealMax) return "#10b981";
  const rangeSize = config.idealMax - config.idealMin;
  const buffer = Math.max(rangeSize * 0.5, (config.max - config.min) * 0.05);
  if (v >= config.idealMin - buffer && v <= config.idealMax + buffer) return "#f59e0b";
  return "#ef4444";
}

function ChemistrySliderField({
  label,
  value,
  onChange,
  config,
  idealLabel,
}: {
  label: string;
  value: number | "";
  onChange: (val: number | "") => void;
  config: SliderFieldConfig;
  idealLabel: string;
}) {
  const numValue = value === "" || value === undefined || value === null ? config.min : Number(value);
  const hasValue = value !== "" && value !== undefined && value !== null;
  const textColor = getSliderTextColor(value, config);
  const trackHex = getSliderTrackHex(value, config);

  const idealLeftPct = ((config.idealMin - config.min) / (config.max - config.min)) * 100;
  const idealWidthPct = ((config.idealMax - config.idealMin) / (config.max - config.min)) * 100;

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${textColor}`}>
          {hasValue ? numValue : "—"}
          {hasValue && config.unit && <span className="text-xs font-normal ml-0.5">{config.unit}</span>}
        </span>
      </div>
      <div className="relative pt-1">
        <div
          className="absolute h-2 rounded-full bg-emerald-200 dark:bg-emerald-900/40 top-1 z-0 pointer-events-none"
          style={{ left: `${idealLeftPct}%`, width: `${idealWidthPct}%` }}
        />
        <Slider
          min={config.min}
          max={config.max}
          step={config.step}
          value={[numValue]}
          onValueChange={([v]) => onChange(v)}
          className="relative z-10"
          style={{ ["--slider-track-color" as string]: trackHex }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{config.min}</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{idealLabel}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
}

interface EquipmentSliderProps {
  label: string;
  value: number | string;
  onChange: (val: number | string) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  idealMin?: number;
  idealMax?: number;
}

function EquipmentSlider({ label, value, onChange, min, max, step, unit, idealMin, idealMax }: EquipmentSliderProps) {
  const numVal = value === "" || value === undefined ? undefined : Number(value);
  const hasValue = numVal !== undefined && !isNaN(numVal);

  const getColor = () => {
    if (!hasValue || idealMin === undefined || idealMax === undefined) return "text-muted-foreground";
    if (numVal! >= idealMin && numVal! <= idealMax) return "text-emerald-600 dark:text-emerald-400";
    const lowThreshold = idealMin - (idealMax - idealMin) * 0.5;
    const highThreshold = idealMax + (idealMax - idealMin) * 0.5;
    if (numVal! >= lowThreshold && numVal! <= highThreshold) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getTrackColor = () => {
    if (!hasValue || idealMin === undefined || idealMax === undefined) return "bg-primary";
    if (numVal! >= idealMin && numVal! <= idealMax) return "bg-emerald-500";
    const lowThreshold = idealMin - (idealMax - idealMin) * 0.5;
    const highThreshold = idealMax + (idealMax - idealMin) * 0.5;
    if (numVal! >= lowThreshold && numVal! <= highThreshold) return "bg-amber-500";
    return "bg-red-500";
  };

  const idealLeftPct = idealMin !== undefined ? ((idealMin - min) / (max - min)) * 100 : 0;
  const idealWidthPct = idealMin !== undefined && idealMax !== undefined ? ((idealMax - idealMin) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${getColor()}`}>
          {hasValue ? `${numVal}` : "—"} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </span>
      </div>
      <div className="relative">
        {idealMin !== undefined && idealMax !== undefined && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-2 bg-emerald-200/50 dark:bg-emerald-800/50 rounded-full pointer-events-none z-0"
            style={{ left: `${idealLeftPct}%`, width: `${idealWidthPct}%` }}
          />
        )}
        <Slider
          value={hasValue ? [numVal!] : [min]}
          onValueChange={(vals) => onChange(vals[0])}
          min={min}
          max={max}
          step={step}
          className={`relative z-10 [&_[role=slider]]:border-2 ${hasValue ? `[&_span:first-child_span]:${getTrackColor()}` : ""}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        {idealMin !== undefined && idealMax !== undefined && (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ideal: {idealMin}–{idealMax}</span>
        )}
        <span>{max}</span>
      </div>
    </div>
  );
}

export function FieldServiceReportForm({
  open,
  onOpenChange,
  workOrderId,
  maintenanceId,
  clientId,
  technicianId,
  serviceTemplateId,
  checklistItems,
  onSuccess,
}: FieldServiceReportFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("water-chemistry");
  const [selectedIssues, setSelectedIssues] = useState<IssueEntry[]>([]);

  const parsedChecklist: string[] = (() => {
    if (checklistItems) {
      try {
        const parsed = JSON.parse(checklistItems);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return DEFAULT_CHECKLIST_ITEMS;
  })();

  const form = useForm<FieldServiceReportValues>({
    resolver: zodResolver(fieldServiceReportSchema),
    defaultValues: {
      phLevel: "",
      freeChlorine: "",
      combinedChlorine: "",
      alkalinity: "",
      calciumHardness: "",
      cyanuricAcid: "",
      tds: "",
      saltLevel: "",
      phosphateLevel: "",
      waterTemperature: "",
      waterClarity: "",
      waterColor: "",
      filterPressurePsi: "",
      filterCondition: "",
      pumpCondition: "",
      pumpFlowRate: "",
      heaterCondition: "",
      heaterTemperature: "",
      saltCellCondition: "",
      cleanerCondition: "",
      lightCondition: "",
      surfaceCondition: "",
      waterLineCondition: "",
      tileCondition: "",
      waterLevel: "",
      skimmerCondition: "",
      checklist: parsedChecklist.map((item) => ({
        name: item,
        completed: false,
        notes: "",
      })),
      chemicals: [],
      issues: [],
      techNotes: "",
      recommendations: "",
      followUpRequired: false,
      followUpNotes: "",
      internalNotes: "",
      customerPresent: false,
      customerNotes: "",
      overallCondition: "",
    },
  });

  const { fields: chemicalFields, append: addChemical, remove: removeChemical } = useFieldArray({
    control: form.control,
    name: "chemicals",
  });

  const watchFollowUp = form.watch("followUpRequired");
  const watchChemicals = form.watch("chemicals");

  const totalChemicalCost = (watchChemicals || []).reduce(
    (sum, c) => sum + (Number(c.costDollars) || 0),
    0
  );

  function toggleIssue(category: string, description: string) {
    setSelectedIssues(prev => {
      const exists = prev.find(i => i.category === category && i.description === description);
      let updated: IssueEntry[];
      if (exists) {
        updated = prev.filter(i => !(i.category === category && i.description === description));
      } else {
        updated = [...prev, { category, description, severity: "medium", notes: "" }];
      }
      form.setValue("issues", updated);
      return updated;
    });
  }

  function updateIssueSeverity(category: string, description: string, severity: IssueEntry["severity"]) {
    setSelectedIssues(prev => {
      const updated = prev.map(i =>
        i.category === category && i.description === description ? { ...i, severity } : i
      );
      form.setValue("issues", updated);
      return updated;
    });
  }

  function updateIssueNotes(category: string, description: string, notes: string) {
    setSelectedIssues(prev => {
      const updated = prev.map(i =>
        i.category === category && i.description === description ? { ...i, notes } : i
      );
      form.setValue("issues", updated);
      return updated;
    });
  }

  function isIssueSelected(category: string, description: string): boolean {
    return selectedIssues.some(i => i.category === category && i.description === description);
  }

  function getSelectedIssue(category: string, description: string): IssueEntry | undefined {
    return selectedIssues.find(i => i.category === category && i.description === description);
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case "low": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "";
    }
  }

  useEffect(() => {
    if (open) {
      form.reset({
        phLevel: "",
        freeChlorine: "",
        combinedChlorine: "",
        alkalinity: "",
        calciumHardness: "",
        cyanuricAcid: "",
        tds: "",
        saltLevel: "",
        phosphateLevel: "",
        waterTemperature: "",
        waterClarity: "",
        waterColor: "",
        filterPressurePsi: "",
        filterCondition: "",
        pumpCondition: "",
        pumpFlowRate: "",
        heaterCondition: "",
        heaterTemperature: "",
        saltCellCondition: "",
        cleanerCondition: "",
        lightCondition: "",
        surfaceCondition: "",
        waterLineCondition: "",
        tileCondition: "",
        waterLevel: "",
        skimmerCondition: "",
        checklist: parsedChecklist.map((item) => ({
          name: item,
          completed: false,
          notes: "",
        })),
        chemicals: [],
        issues: [],
        techNotes: "",
        recommendations: "",
        followUpRequired: false,
        followUpNotes: "",
        internalNotes: "",
        customerPresent: false,
        customerNotes: "",
        overallCondition: "",
      });
      setActiveTab("water-chemistry");
      setSelectedIssues([]);
    }
  }, [open]);

  const submitMutation = useMutation({
    mutationFn: async (values: FieldServiceReportValues) => {
      const chemicalsApplied = (values.chemicals || []).map((c) => ({
        name: c.name,
        amount: c.amount,
        unit: c.unit,
        costCents: Math.round((Number(c.costDollars) || 0) * 100),
      }));

      const totalChemCost = chemicalsApplied.reduce((sum, c) => sum + c.costCents, 0);

      const payload = {
        workOrderId: workOrderId || null,
        maintenanceId: maintenanceId || null,
        clientId,
        technicianId: technicianId || null,
        serviceTemplateId: serviceTemplateId || null,
        serviceDate: new Date().toISOString().split("T")[0],
        status: "completed",
        phLevel: values.phLevel === "" ? null : String(values.phLevel),
        freeChlorine: values.freeChlorine === "" ? null : String(values.freeChlorine),
        combinedChlorine: values.combinedChlorine === "" ? null : String(values.combinedChlorine),
        chlorineLevel: values.freeChlorine === "" ? null : String(values.freeChlorine),
        alkalinity: values.alkalinity === "" ? null : String(values.alkalinity),
        calciumHardness: values.calciumHardness === "" ? null : String(values.calciumHardness),
        cyanuricAcid: values.cyanuricAcid === "" ? null : String(values.cyanuricAcid),
        totalDissolvedSolids: values.tds === "" ? null : String(values.tds),
        saltLevel: values.saltLevel === "" ? null : String(values.saltLevel),
        phosphateLevel: values.phosphateLevel === "" ? null : String(values.phosphateLevel),
        waterTemperature: values.waterTemperature === "" ? null : String(values.waterTemperature),
        waterClarity: values.waterClarity || null,
        waterColor: values.waterColor || null,
        filterPressurePsi: values.filterPressurePsi === "" ? null : String(values.filterPressurePsi),
        filterCondition: values.filterCondition || null,
        pumpCondition: values.pumpCondition || null,
        pumpFlowRate: values.pumpFlowRate === "" ? null : String(values.pumpFlowRate),
        heaterCondition: values.heaterCondition || null,
        heaterTemperature: values.heaterTemperature === "" ? null : String(values.heaterTemperature),
        saltCellCondition: values.saltCellCondition || null,
        cleanerCondition: values.cleanerCondition || null,
        lightCondition: values.lightCondition || null,
        surfaceCondition: values.surfaceCondition || null,
        waterLineCondition: values.waterLineCondition || null,
        tileCondition: values.tileCondition || null,
        waterLevel: values.waterLevel || null,
        skimmerCondition: values.skimmerCondition || null,
        checklistItems: JSON.stringify(values.checklist || []),
        chemicalsApplied: JSON.stringify(chemicalsApplied),
        totalChemicalCost: totalChemCost,
        techNotes: values.techNotes || null,
        recommendations: values.recommendations || null,
        followUpRequired: values.followUpRequired,
        followUpNotes: values.followUpNotes || null,
        internalNotes: values.internalNotes || null,
        customerPresent: values.customerPresent,
        customerNotes: values.customerNotes || null,
        overallCondition: values.overallCondition || null,
        issues: JSON.stringify(values.issues || []),
      };

      return await apiRequest("POST", "/api/service-reports", payload);
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-reports"] });
      let reportId: number | undefined;
      try {
        const savedReport = await response.json();
        reportId = savedReport?.id;
      } catch {}

      if (sendAction === "report" && reportId) {
        sendReportMutation.mutate(reportId);
        setSendAction("none");
        return;
      }
      if (sendAction === "issues" && reportId) {
        sendIssuesMutation.mutate(reportId);
        setSendAction("none");
        return;
      }

      setSendAction("none");
      toast({
        title: "Service Report Submitted",
        description: "Field service report has been saved successfully.",
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setSendAction("none");
      toast({
        title: "Error",
        description: error.message || "Failed to submit service report.",
        variant: "destructive",
      });
    },
  });

  const [sendAction, setSendAction] = useState<"none" | "report" | "issues">("none");

  const sendReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const res = await apiRequest("POST", `/api/service-reports/${reportId}/send`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.emailWarning) {
        toast({ title: "Report Saved", description: data.emailWarning, variant: "destructive" });
      } else {
        toast({ title: "Report Sent", description: "Service report has been emailed to the customer." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/service-reports"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send report.", variant: "destructive" });
    },
  });

  const sendIssuesMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const res = await apiRequest("POST", `/api/service-reports/${reportId}/send-issues`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.emailWarning) {
        toast({ title: "Report Saved", description: data.emailWarning, variant: "destructive" });
      } else {
        toast({ title: "Issue Report Sent", description: "Issue notification has been emailed to the customer." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/service-reports"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to send issue report.", variant: "destructive" });
    },
  });

  function onSubmit(values: FieldServiceReportValues) {
    submitMutation.mutate(values);
  }

  async function handleSendReport() {
    const isValid = await form.trigger();
    if (!isValid) return;
    setSendAction("report");
    const values = form.getValues();
    submitMutation.mutate(values);
  }

  async function handleSendIssues() {
    const isValid = await form.trigger();
    if (!isValid) return;
    setSendAction("issues");
    const values = form.getValues();
    submitMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-primary" />
            Field Service Report
          </DialogTitle>
          <DialogDescription>
            Complete the service report for this {workOrderId ? "work order" : "maintenance visit"}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-auto">
                <TabsTrigger value="water-chemistry" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <Droplets className="h-3.5 w-3.5 text-cyan-600" />
                  <span className="hidden sm:inline">Water</span>
                </TabsTrigger>
                <TabsTrigger value="equipment" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <Wrench className="h-3.5 w-3.5 text-orange-600" />
                  <span className="hidden sm:inline">Equipment</span>
                </TabsTrigger>
                <TabsTrigger value="checklist" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Checklist</span>
                </TabsTrigger>
                <TabsTrigger value="chemicals" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <Beaker className="h-3.5 w-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Chemicals</span>
                </TabsTrigger>
                <TabsTrigger value="issues" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 relative">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <span className="hidden sm:inline">Issues</span>
                  {selectedIssues.length > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-[10px] absolute -top-1 -right-1">
                      {selectedIssues.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
                  <FileText className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Notes</span>
                </TabsTrigger>
              </TabsList>

              {/* Water Chemistry Tab */}
              <TabsContent value="water-chemistry" className="space-y-4 mt-4">
                <Card className="border-cyan-200 dark:border-cyan-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                      <Droplets className="h-4 w-4" />
                      Water Chemistry Readings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phLevel"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="pH Level"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.phLevel}
                                idealLabel="Ideal: 7.2–7.6"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="freeChlorine"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Free Chlorine (ppm)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.freeChlorine}
                                idealLabel="Ideal: 1–3 ppm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="combinedChlorine"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Combined Chlorine (ppm)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.combinedChlorine}
                                idealLabel="Ideal: <0.5 ppm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="alkalinity"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Alkalinity (ppm)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.alkalinity}
                                idealLabel="Ideal: 80–120 ppm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="calciumHardness"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Calcium Hardness (ppm)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.calciumHardness}
                                idealLabel="Ideal: 200–400 ppm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cyanuricAcid"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Cyanuric Acid (ppm)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.cyanuricAcid}
                                idealLabel="Ideal: 30–50 ppm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tds"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="TDS (ppm)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.tds}
                                idealLabel="Ideal: <3000 ppm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="saltLevel"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Salt Level (ppm)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.saltLevel}
                                idealLabel="Ideal: 2700–3400 ppm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phosphateLevel"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Phosphate Level (ppb)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.phosphateLevel}
                                idealLabel="Ideal: <100 ppb"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterTemperature"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <ChemistrySliderField
                                label="Water Temperature (°F)"
                                value={field.value as number | ""}
                                onChange={field.onChange}
                                config={WATER_CHEMISTRY_SLIDERS.waterTemperature}
                                idealLabel="Ideal: 78–84°F"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="waterClarity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Clarity</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select clarity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="clear" className="text-emerald-600">Clear</SelectItem>
                                <SelectItem value="slightly_cloudy" className="text-amber-600">Slightly Cloudy</SelectItem>
                                <SelectItem value="cloudy" className="text-red-600">Cloudy</SelectItem>
                                <SelectItem value="green" className="text-red-600">Green</SelectItem>
                                <SelectItem value="dark_green" className="text-red-700">Dark Green</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Color</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Crystal clear, Slight haze" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Equipment Status Tab */}
              <TabsContent value="equipment" className="space-y-4 mt-4">
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                      <Wrench className="h-4 w-4" />
                      Filtration & Pump
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="filterPressurePsi"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <EquipmentSlider
                                label="Filter Pressure (PSI)"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                min={0}
                                max={50}
                                step={1}
                                unit="PSI"
                                idealMin={8}
                                idealMax={20}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="filterCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Filter Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="good"><span className="text-emerald-600 font-medium">Good</span></SelectItem>
                                <SelectItem value="needs_cleaning"><span className="text-amber-600 font-medium">Needs Cleaning</span></SelectItem>
                                <SelectItem value="needs_replacement"><span className="text-red-600 font-medium">Needs Replacement</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pumpCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pump Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="running"><span className="text-emerald-600 font-medium">Running</span></SelectItem>
                                <SelectItem value="noisy"><span className="text-amber-600 font-medium">Noisy</span></SelectItem>
                                <SelectItem value="leaking"><span className="text-red-600 font-medium">Leaking</span></SelectItem>
                                <SelectItem value="not_running"><span className="text-red-600 font-medium">Not Running</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pumpFlowRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <EquipmentSlider
                                label="Pump Flow Rate (GPM)"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                min={0}
                                max={120}
                                step={1}
                                unit="GPM"
                                idealMin={30}
                                idealMax={60}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                      <Wrench className="h-4 w-4" />
                      Heating & Salt System
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="heaterCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Heater Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="working"><span className="text-emerald-600 font-medium">Working</span></SelectItem>
                                <SelectItem value="not_working"><span className="text-red-600 font-medium">Not Working</span></SelectItem>
                                <SelectItem value="na"><span className="text-muted-foreground">N/A</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="heaterTemperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <EquipmentSlider
                                label="Heater Temperature (°F)"
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                min={40}
                                max={110}
                                step={1}
                                unit="°F"
                                idealMin={78}
                                idealMax={84}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="saltCellCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salt Cell Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="good"><span className="text-emerald-600 font-medium">Good</span></SelectItem>
                                <SelectItem value="needs_cleaning"><span className="text-amber-600 font-medium">Needs Cleaning</span></SelectItem>
                                <SelectItem value="needs_replacement"><span className="text-red-600 font-medium">Needs Replacement</span></SelectItem>
                                <SelectItem value="na"><span className="text-muted-foreground">N/A</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                      <Wrench className="h-4 w-4" />
                      Pool Surface & Accessories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="cleanerCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cleaner Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="working"><span className="text-emerald-600 font-medium">Working</span></SelectItem>
                                <SelectItem value="stuck"><span className="text-amber-600 font-medium">Stuck</span></SelectItem>
                                <SelectItem value="not_working"><span className="text-red-600 font-medium">Not Working</span></SelectItem>
                                <SelectItem value="na"><span className="text-muted-foreground">N/A</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lightCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Light Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="working"><span className="text-emerald-600 font-medium">Working</span></SelectItem>
                                <SelectItem value="flickering"><span className="text-amber-600 font-medium">Flickering</span></SelectItem>
                                <SelectItem value="not_working"><span className="text-red-600 font-medium">Not Working</span></SelectItem>
                                <SelectItem value="na"><span className="text-muted-foreground">N/A</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="surfaceCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Surface Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="clean"><span className="text-emerald-600 font-medium">Clean</span></SelectItem>
                                <SelectItem value="algae_spots"><span className="text-amber-600 font-medium">Algae Spots</span></SelectItem>
                                <SelectItem value="staining"><span className="text-red-600 font-medium">Staining</span></SelectItem>
                                <SelectItem value="scaling"><span className="text-red-600 font-medium">Scaling</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterLineCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Line Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="clean"><span className="text-emerald-600 font-medium">Clean</span></SelectItem>
                                <SelectItem value="buildup"><span className="text-amber-600 font-medium">Buildup</span></SelectItem>
                                <SelectItem value="staining"><span className="text-red-600 font-medium">Staining</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tileCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tile Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="good"><span className="text-emerald-600 font-medium">Good</span></SelectItem>
                                <SelectItem value="cracked"><span className="text-red-600 font-medium">Cracked</span></SelectItem>
                                <SelectItem value="missing"><span className="text-red-600 font-medium">Missing</span></SelectItem>
                                <SelectItem value="na"><span className="text-muted-foreground">N/A</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="waterLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Water Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="normal"><span className="text-emerald-600 font-medium">Normal</span></SelectItem>
                                <SelectItem value="low"><span className="text-amber-600 font-medium">Low</span></SelectItem>
                                <SelectItem value="high"><span className="text-amber-600 font-medium">High</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="skimmerCondition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skimmer Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="clear"><span className="text-emerald-600 font-medium">Clear</span></SelectItem>
                                <SelectItem value="debris"><span className="text-amber-600 font-medium">Debris</span></SelectItem>
                                <SelectItem value="damaged"><span className="text-red-600 font-medium">Damaged</span></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="space-y-4 mt-4">
                <Card className="border-emerald-200 dark:border-emerald-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckSquare className="h-4 w-4" />
                      Service Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {form.watch("checklist")?.map((_, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <FormField
                            control={form.control}
                            name={`checklist.${index}.completed`}
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-3 space-y-0 min-w-0 flex-shrink-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer leading-tight">
                                  {parsedChecklist[index]}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`checklist.${index}.notes`}
                            render={({ field }) => (
                              <FormItem className="flex-1 min-w-0">
                                <FormControl>
                                  <Input
                                    placeholder="Notes (optional)"
                                    className="h-8 text-sm"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Chemicals Applied Tab */}
              <TabsContent value="chemicals" className="space-y-4 mt-4">
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                        <Beaker className="h-4 w-4" />
                        Chemicals Applied
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addChemical({ name: "", amount: 0, unit: "lbs", costDollars: 0 })}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Chemical
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chemicalFields.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Beaker className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No chemicals added yet.</p>
                        <p className="text-xs mt-1">Click "Add Chemical" to record chemical usage.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chemicalFields.map((chemField, index) => (
                          <div key={chemField.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg border bg-muted/30 items-end">
                            <FormField
                              control={form.control}
                              name={`chemicals.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="sm:col-span-4">
                                  <FormLabel className="text-xs">Chemical Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Liquid Chlorine" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`chemicals.${index}.amount`}
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel className="text-xs">Amount</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.1" min="0" placeholder="0" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`chemicals.${index}.unit`}
                              render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                  <FormLabel className="text-xs">Unit</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Unit" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="lbs">lbs</SelectItem>
                                      <SelectItem value="oz">oz</SelectItem>
                                      <SelectItem value="gallons">gallons</SelectItem>
                                      <SelectItem value="quarts">quarts</SelectItem>
                                      <SelectItem value="pints">pints</SelectItem>
                                      <SelectItem value="tablets">tablets</SelectItem>
                                      <SelectItem value="bags">bags</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`chemicals.${index}.costDollars`}
                              render={({ field }) => (
                                <FormItem className="sm:col-span-3">
                                  <FormLabel className="text-xs">Cost ($)</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="sm:col-span-1 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeChemical(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {chemicalFields.length > 0 && (
                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <div className="bg-purple-50 dark:bg-purple-950/30 px-4 py-2 rounded-lg">
                          <span className="text-sm text-muted-foreground mr-2">Total Cost:</span>
                          <span className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                            ${totalChemicalCost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Issues Tab */}
              <TabsContent value="issues" className="space-y-4 mt-4">
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      Report Issues
                      {selectedIssues.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {selectedIssues.length} selected
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {Object.entries(PREDEFINED_ISSUES).map(([category, issues]) => (
                      <div key={category}>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {issues.map((issue) => {
                            const selected = isIssueSelected(category, issue);
                            const issueData = getSelectedIssue(category, issue);
                            return (
                              <div
                                key={`${category}-${issue}`}
                                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                                  selected
                                    ? "border-red-400 bg-red-50 dark:bg-red-950/20 dark:border-red-700 ring-1 ring-red-400"
                                    : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                                }`}
                                onClick={() => toggleIssue(category, issue)}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${selected ? "text-red-700 dark:text-red-400" : ""}`}>
                                    {issue}
                                  </span>
                                  {selected && (
                                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                  )}
                                </div>
                                {selected && issueData && (
                                  <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                                    <Select
                                      value={issueData.severity}
                                      onValueChange={(val) => updateIssueSeverity(category, issue, val as IssueEntry["severity"])}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="low">
                                          <span className="text-blue-600">Low</span>
                                        </SelectItem>
                                        <SelectItem value="medium">
                                          <span className="text-amber-600">Medium</span>
                                        </SelectItem>
                                        <SelectItem value="high">
                                          <span className="text-orange-600">High</span>
                                        </SelectItem>
                                        <SelectItem value="critical">
                                          <span className="text-red-600">Critical</span>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      placeholder="Optional notes..."
                                      className="h-8 text-xs"
                                      value={issueData.notes || ""}
                                      onChange={(e) => updateIssueNotes(category, issue, e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {selectedIssues.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-2">Selected Issues Summary</h4>
                        <div className="space-y-1">
                          {selectedIssues.map((issue, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Badge className={`text-[10px] ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </Badge>
                              <span className="font-medium">{issue.description}</span>
                              <span className="text-muted-foreground text-xs">({issue.category})</span>
                              {issue.notes && <span className="text-muted-foreground text-xs">— {issue.notes}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes & Recommendations Tab */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Service Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="techNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tech Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe work performed, observations, and any issues found..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recommendations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recommendations for Client</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any recommendations for the customer..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Follow Up</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="followUpRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="text-sm font-medium">Follow Up Required</FormLabel>
                            <FormDescription className="text-xs">
                              Does this service need a follow-up visit?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {watchFollowUp && (
                      <FormField
                        control={form.control}
                        name="followUpNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Follow Up Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What needs to be done on the follow-up visit..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Internal & Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="internalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office-Only Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Internal notes not visible to the customer..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>These notes are only visible to office staff.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerPresent"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="text-sm font-medium">Customer Present</FormLabel>
                            <FormDescription className="text-xs">
                              Was the customer present during service?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customerNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notes from or about the customer..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="overallCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Pool Condition</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select overall condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent"><span className="text-emerald-600 font-medium">Excellent</span></SelectItem>
                              <SelectItem value="good"><span className="text-emerald-600 font-medium">Good</span></SelectItem>
                              <SelectItem value="fair"><span className="text-amber-600 font-medium">Fair</span></SelectItem>
                              <SelectItem value="poor"><span className="text-red-600 font-medium">Poor</span></SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t">
              <div className="flex flex-col sm:flex-row w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={submitMutation.isPending || sendReportMutation.isPending || sendIssuesMutation.isPending}
                >
                  Cancel
                </Button>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendIssues}
                  disabled={submitMutation.isPending || sendReportMutation.isPending || sendIssuesMutation.isPending || selectedIssues.length === 0}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {sendIssuesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Send Issues
                      {selectedIssues.length > 0 && (
                        <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-[10px]">{selectedIssues.length}</Badge>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendReport}
                  disabled={submitMutation.isPending || sendReportMutation.isPending || sendIssuesMutation.isPending}
                  className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-700 dark:text-cyan-400 dark:hover:bg-cyan-950"
                >
                  {sendReportMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Report
                    </>
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={submitMutation.isPending || sendReportMutation.isPending || sendIssuesMutation.isPending}
                  className="min-w-[140px]"
                >
                  {submitMutation.isPending && sendAction === "none" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
