import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { ServiceReport } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Printer,
  Clock,
  Droplets,
  Wrench,
  DollarSign,
  Beaker,
  Star,
  CheckCircle2,
  XCircle,
  Thermometer,
  Gauge,
  Waves,
  Zap,
  Lightbulb,
  Filter,
  Fan,
  Flame,
  Pipette,
  AlertTriangle,
  FileText,
  MessageSquare,
  ClipboardCheck,
  Eye,
  Palette,
} from "lucide-react";

type ReportWithNames = ServiceReport & {
  clientName?: string;
  technicianName?: string;
};

interface ChecklistItem {
  name: string;
  completed: boolean;
  notes?: string;
}

interface ChemicalApplied {
  name: string;
  amount: number;
  unit: string;
  cost?: number;
  costCents?: number;
}

interface WaterReadingConfig {
  key: keyof ServiceReport;
  label: string;
  unit: string;
  idealMin: number;
  idealMax: number;
  rangeMin: number;
  rangeMax: number;
}

const waterReadings: WaterReadingConfig[] = [
  { key: "phLevel", label: "pH Level", unit: "", idealMin: 7.2, idealMax: 7.6, rangeMin: 6.8, rangeMax: 8.2 },
  { key: "freeChlorine", label: "Free Chlorine", unit: "ppm", idealMin: 1, idealMax: 3, rangeMin: 0, rangeMax: 10 },
  { key: "combinedChlorine", label: "Combined Chlorine", unit: "ppm", idealMin: 0, idealMax: 0.5, rangeMin: 0, rangeMax: 1 },
  { key: "alkalinity", label: "Alkalinity", unit: "ppm", idealMin: 80, idealMax: 120, rangeMin: 0, rangeMax: 300 },
  { key: "calciumHardness", label: "Calcium Hardness", unit: "ppm", idealMin: 200, idealMax: 400, rangeMin: 0, rangeMax: 1000 },
  { key: "cyanuricAcid", label: "Cyanuric Acid", unit: "ppm", idealMin: 30, idealMax: 50, rangeMin: 0, rangeMax: 150 },
  { key: "totalDissolvedSolids", label: "TDS", unit: "ppm", idealMin: 0, idealMax: 2000, rangeMin: 0, rangeMax: 5000 },
  { key: "saltLevel", label: "Salt Level", unit: "ppm", idealMin: 2700, idealMax: 3400, rangeMin: 0, rangeMax: 6000 },
  { key: "phosphateLevel", label: "Phosphate Level", unit: "ppb", idealMin: 0, idealMax: 100, rangeMin: 0, rangeMax: 2000 },
];

function getReadingColor(value: number, idealMin: number, idealMax: number, rangeMin: number, rangeMax: number) {
  if (value >= idealMin && value <= idealMax) return "text-green-600";
  const rangeMid = (rangeMax - rangeMin) / 2;
  const distFromIdeal = Math.min(Math.abs(value - idealMin), Math.abs(value - idealMax));
  const threshold = (idealMax - idealMin) * 1.5;
  if (distFromIdeal <= threshold) return "text-amber-500";
  return "text-red-500";
}

function getReadingBgColor(value: number, idealMin: number, idealMax: number) {
  if (value >= idealMin && value <= idealMax) return "bg-green-500";
  const distFromIdeal = Math.min(Math.abs(value - idealMin), Math.abs(value - idealMax));
  const threshold = (idealMax - idealMin) * 1.5;
  if (distFromIdeal <= threshold) return "bg-amber-500";
  return "bg-red-500";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800 border-green-200";
    case "draft": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "sent_to_client": return "bg-blue-100 text-blue-800 border-blue-200";
    case "reviewed": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getConditionBadge(condition: string) {
  switch (condition) {
    case "excellent": return "bg-green-100 text-green-800 border-green-200";
    case "good": return "bg-blue-100 text-blue-800 border-blue-200";
    case "fair": return "bg-amber-100 text-amber-800 border-amber-200";
    case "poor": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getEquipmentStatusColor(condition: string | null | undefined) {
  if (!condition) return "bg-gray-100 text-gray-600 border-gray-200";
  const c = condition.toLowerCase();
  if (["good", "working", "running", "clear", "clean", "normal"].includes(c)) return "bg-green-100 text-green-700 border-green-200";
  if (["needs_cleaning", "needs_attention", "noisy", "slightly_cloudy", "buildup", "debris", "low", "high", "flickering", "algae_spots", "staining", "scaling", "stuck"].includes(c)) return "bg-amber-100 text-amber-700 border-amber-200";
  if (["needs_replacement", "not_working", "not_running", "leaking", "broken", "cloudy", "green", "dark_green", "cracked", "missing", "damaged"].includes(c)) return "bg-red-100 text-red-700 border-red-200";
  if (c === "na" || c === "n/a") return "bg-gray-100 text-gray-500 border-gray-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function formatCondition(condition: string | null | undefined) {
  if (!condition) return "N/A";
  return condition.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatTime(timestamp: string | Date | null | undefined) {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ServiceReportView() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: report, isLoading } = useQuery<ReportWithNames>({
    queryKey: ["/api/service-reports", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Report Not Found</h3>
        <p className="text-muted-foreground mb-6">The requested service report could not be found.</p>
        <Button variant="outline" onClick={() => navigate("/maintenance")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const checklistItems: ChecklistItem[] = report.checklistItems ? JSON.parse(report.checklistItems) : [];
  const chemicalsApplied: ChemicalApplied[] = report.chemicalsApplied ? JSON.parse(report.chemicalsApplied) : [];
  const completedChecklist = checklistItems.filter(i => i.completed).length;

  const activeReadings = waterReadings.filter(r => report[r.key] != null);
  const inRangeCount = activeReadings.filter(r => {
    const val = parseFloat(String(report[r.key]));
    return val >= r.idealMin && val <= r.idealMax;
  }).length;
  const waterChemScore = activeReadings.length > 0 ? Math.round((inRangeCount / activeReadings.length) * 100) : null;

  const equipmentFields = [
    { key: "filterCondition", label: "Filter", icon: Filter, value: report.filterPressurePsi, valueLabel: "PSI" },
    { key: "pumpCondition", label: "Pump", icon: Fan, value: report.pumpFlowRate, valueLabel: "GPM" },
    { key: "heaterCondition", label: "Heater", icon: Flame, value: report.heaterTemperature, valueLabel: "°F" },
    { key: "saltCellCondition", label: "Salt Cell", icon: Zap },
    { key: "cleanerCondition", label: "Cleaner", icon: Waves },
    { key: "lightCondition", label: "Lights", icon: Lightbulb },
    { key: "surfaceCondition", label: "Surface", icon: Droplets },
    { key: "waterLineCondition", label: "Water Line", icon: Waves },
    { key: "tileCondition", label: "Tile", icon: Wrench },
    { key: "waterLevel", label: "Water Level", icon: Gauge },
    { key: "skimmerCondition", label: "Skimmer", icon: Filter },
  ] as const;

  const activeEquipment = equipmentFields.filter(e => {
    const val = report[e.key as keyof ServiceReport];
    return val != null && val !== "na" && val !== "n/a";
  });
  const goodEquipment = activeEquipment.filter(e => {
    const val = String(report[e.key as keyof ServiceReport] || "").toLowerCase();
    return ["good", "working", "running", "clear", "clean", "normal"].includes(val);
  });
  const equipmentHealthPct = activeEquipment.length > 0 ? Math.round((goodEquipment.length / activeEquipment.length) * 100) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          .print-full { max-width: 100% !important; padding: 0 !important; }
          body { font-size: 12px; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/maintenance")} className="print-hidden shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Report</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{new Date(report.serviceDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              {report.clientName && (
                <>
                  <span>•</span>
                  <span className="font-medium text-foreground">{report.clientName}</span>
                </>
              )}
              {report.technicianName && (
                <>
                  <span>•</span>
                  <span>Tech: {report.technicianName}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getStatusBadge(report.status)}>
            {formatCondition(report.status)}
          </Badge>
          {report.overallCondition && (
            <Badge className={getConditionBadge(report.overallCondition)}>
              {formatCondition(report.overallCondition)}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print-hidden">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-teal-50">
                <Clock className="h-5 w-5 text-teal-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Service Duration</CardTitle>
            </div>
            <div className="text-2xl font-bold">
              {report.totalServiceMinutes ? `${report.totalServiceMinutes} min` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTime(report.arrivalTime)} → {formatTime(report.departureTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-cyan-50">
                <Droplets className="h-5 w-5 text-cyan-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Water Chemistry</CardTitle>
            </div>
            <div className={`text-2xl font-bold ${waterChemScore !== null ? (waterChemScore > 80 ? "text-green-600" : waterChemScore >= 50 ? "text-amber-500" : "text-red-500") : "text-muted-foreground"}`}>
              {waterChemScore !== null ? `${waterChemScore}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {waterChemScore !== null ? `${inRangeCount} of ${activeReadings.length} readings in range` : "No readings"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <Wrench className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Equipment Health</CardTitle>
            </div>
            <div className={`text-2xl font-bold ${equipmentHealthPct !== null ? (equipmentHealthPct > 80 ? "text-green-600" : equipmentHealthPct >= 50 ? "text-amber-500" : "text-red-500") : "text-muted-foreground"}`}>
              {equipmentHealthPct !== null ? `${equipmentHealthPct}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {equipmentHealthPct !== null ? `${goodEquipment.length} of ${activeEquipment.length} items good` : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Chemical Cost</CardTitle>
            </div>
            <div className="text-2xl font-bold">
              {report.totalChemicalCost != null ? `$${(report.totalChemicalCost / 100).toFixed(2)}` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {chemicalsApplied.length > 0 ? `${chemicalsApplied.length} chemicals applied` : "No chemicals"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Water Chemistry Section */}
      {(activeReadings.length > 0 || report.waterClarity || report.waterColor) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-50">
                <Droplets className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Water Chemistry</CardTitle>
                <CardDescription>Chemical balance and water quality readings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(report.waterClarity || report.waterColor) && (
              <div className="flex flex-wrap gap-3">
                {report.waterClarity && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm font-medium">Clarity:</span>
                    <Badge variant="outline" className="capitalize">{formatCondition(report.waterClarity)}</Badge>
                  </div>
                )}
                {report.waterColor && (
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-cyan-500" />
                    <span className="text-sm font-medium">Color:</span>
                    <Badge variant="outline" className="capitalize">{formatCondition(report.waterColor)}</Badge>
                  </div>
                )}
              </div>
            )}

            {report.waterTemperature != null && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-50/50 border border-cyan-100">
                <Thermometer className="h-5 w-5 text-cyan-600" />
                <span className="font-medium">Water Temperature</span>
                <span className="text-xl font-bold text-cyan-700 ml-auto">{String(report.waterTemperature)}°F</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeReadings.map(reading => {
                const value = parseFloat(String(report[reading.key]));
                const progressPct = Math.min(100, Math.max(0, ((value - reading.rangeMin) / (reading.rangeMax - reading.rangeMin)) * 100));
                const colorClass = getReadingColor(value, reading.idealMin, reading.idealMax, reading.rangeMin, reading.rangeMax);
                const bgColorClass = getReadingBgColor(value, reading.idealMin, reading.idealMax);

                return (
                  <div key={reading.key} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{reading.label}</span>
                      {reading.unit && <span className="text-xs text-muted-foreground">{reading.unit}</span>}
                    </div>
                    <div className={`text-2xl font-bold ${colorClass}`}>
                      {value}
                    </div>
                    <div className="relative">
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${bgColorClass}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      {/* Ideal range indicator */}
                      <div
                        className="absolute top-0 h-2 border-l border-r border-green-400/60"
                        style={{
                          left: `${((reading.idealMin - reading.rangeMin) / (reading.rangeMax - reading.rangeMin)) * 100}%`,
                          width: `${((reading.idealMax - reading.idealMin) / (reading.rangeMax - reading.rangeMin)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ideal: {reading.idealMin}–{reading.idealMax} {reading.unit}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment Status Section */}
      {equipmentFields.some(e => report[e.key as keyof ServiceReport] != null) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <Wrench className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Equipment Status</CardTitle>
                <CardDescription>Condition of pool equipment and components</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {equipmentFields.map(equip => {
                const condition = report[equip.key as keyof ServiceReport] as string | null;
                if (condition == null) return null;
                const Icon = equip.icon;
                const numericValue = "value" in equip ? report[equip.value as unknown as keyof ServiceReport] : null;

                return (
                  <div key={equip.key} className="p-4 rounded-lg border bg-card flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-orange-50 shrink-0">
                      <Icon className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{equip.label}</p>
                      <Badge className={`mt-1 text-xs ${getEquipmentStatusColor(condition)}`}>
                        {formatCondition(condition)}
                      </Badge>
                      {numericValue != null && (
                        <p className="text-lg font-semibold mt-1">
                          {String(numericValue)} {"valueLabel" in equip ? (equip as any).valueLabel : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Section */}
      {checklistItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <ClipboardCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Service Checklist</CardTitle>
                <CardDescription>{completedChecklist} of {checklistItems.length} items completed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress
              value={(completedChecklist / checklistItems.length) * 100}
              className="h-2"
            />
            <div className="space-y-2">
              {checklistItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 py-2">
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm ${item.completed ? "text-foreground" : "text-muted-foreground"}`}>
                      {item.name}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chemicals Applied Section */}
      {chemicalsApplied.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Beaker className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Chemicals Applied</CardTitle>
                <CardDescription>{chemicalsApplied.length} chemicals used during service</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Chemical</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Unit</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {chemicalsApplied.map((chem, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-3 px-2 font-medium">{chem.name}</td>
                      <td className="py-3 px-2 text-right">{chem.amount}</td>
                      <td className="py-3 px-2 text-muted-foreground">{chem.unit}</td>
                      <td className="py-3 px-2 text-right">${((chem.costCents || chem.cost || 0) / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td colSpan={3} className="py-3 px-2 font-semibold">Total</td>
                    <td className="py-3 px-2 text-right font-semibold">
                      ${report.totalChemicalCost != null ? (report.totalChemicalCost / 100).toFixed(2) : (chemicalsApplied.reduce((s, c) => s + (c.costCents || c.cost || 0), 0) / 100).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes & Recommendations */}
      {(report.techNotes || report.recommendations || report.followUpRequired || report.internalNotes || report.customerNotes) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Notes & Recommendations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.techNotes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Technician Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{report.techNotes}</p>
                </CardContent>
              </Card>
            )}

            {report.recommendations && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line text-amber-900">{report.recommendations}</p>
                </CardContent>
              </Card>
            )}

            {report.followUpRequired && (
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-700 border-red-200">Follow-Up Required</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line text-red-800">{report.followUpNotes || "Follow-up service needed."}</p>
                </CardContent>
              </Card>
            )}

            {report.internalNotes && (
              <Card className="border-gray-300 bg-gray-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Internal / Office Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line text-gray-700">{report.internalNotes}</p>
                </CardContent>
              </Card>
            )}

            {report.customerNotes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Customer Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{report.customerNotes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <Separator />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-sm text-muted-foreground">
        <p>Report generated on {new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        {report.customerSatisfaction != null && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Satisfaction:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${s <= report.customerSatisfaction! ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {report.customerSignature && (
        <div className="flex flex-col items-center gap-2 py-4 border-t">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Customer Signature</p>
          <img
            src={report.customerSignature.startsWith("data:") ? report.customerSignature : `data:image/png;base64,${report.customerSignature}`}
            alt="Customer Signature"
            className="max-w-xs h-auto border rounded-lg p-2 bg-white"
          />
        </div>
      )}
    </div>
  );
}
