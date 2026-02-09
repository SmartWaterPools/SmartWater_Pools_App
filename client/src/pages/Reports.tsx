import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { ServiceReport } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Droplets,
  Wrench,
  DollarSign,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

type ReportWithNames = ServiceReport & {
  clientName?: string;
  technicianName?: string;
};

interface ReportSummary {
  totalReports: number;
  waterChemistryCompliance: number;
  averageChemicalCost: number;
  followUpsRequired: number;
}

interface Technician {
  id: number;
  userId: number;
  specialization?: string;
  user?: { name: string };
  name?: string;
}

const waterReadingRanges = [
  { key: "phLevel", idealMin: 7.2, idealMax: 7.6 },
  { key: "freeChlorine", idealMin: 1, idealMax: 3 },
  { key: "combinedChlorine", idealMin: 0, idealMax: 0.5 },
  { key: "alkalinity", idealMin: 80, idealMax: 120 },
  { key: "calciumHardness", idealMin: 200, idealMax: 400 },
  { key: "cyanuricAcid", idealMin: 30, idealMax: 50 },
  { key: "totalDissolvedSolids", idealMin: 0, idealMax: 2000 },
  { key: "saltLevel", idealMin: 2700, idealMax: 3400 },
  { key: "phosphateLevel", idealMin: 0, idealMax: 100 },
] as const;

const equipmentKeys = [
  "filterCondition",
  "pumpCondition",
  "heaterCondition",
  "saltCellCondition",
  "cleanerCondition",
  "lightCondition",
  "surfaceCondition",
  "waterLineCondition",
  "tileCondition",
  "skimmerCondition",
] as const;

const goodStatuses = ["good", "working", "running", "clear", "clean", "normal"];

function getConditionColor(condition: string | null | undefined) {
  switch (condition) {
    case "excellent": return "bg-green-100 text-green-800 border-green-200";
    case "good": return "bg-blue-100 text-blue-800 border-blue-200";
    case "fair": return "bg-amber-100 text-amber-800 border-amber-200";
    case "poor": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-green-100 text-green-800 border-green-200";
    case "draft": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "sent_to_client": return "bg-blue-100 text-blue-800 border-blue-200";
    case "reviewed": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatStatus(status: string) {
  return status.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function computeWaterScore(report: ReportWithNames) {
  let total = 0;
  let inRange = 0;
  for (const r of waterReadingRanges) {
    const val = report[r.key as keyof ServiceReport];
    if (val != null) {
      total++;
      const num = parseFloat(String(val));
      if (num >= r.idealMin && num <= r.idealMax) inRange++;
    }
  }
  return total > 0 ? { inRange, total } : null;
}

function computeEquipmentIssues(report: ReportWithNames) {
  let issues = 0;
  let total = 0;
  for (const key of equipmentKeys) {
    const val = report[key as keyof ServiceReport];
    if (val != null && val !== "na" && val !== "n/a") {
      total++;
      if (!goodStatuses.includes(String(val).toLowerCase())) issues++;
    }
  }
  return total > 0 ? issues : null;
}

export default function Reports() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [limit, setLimit] = useState(12);

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("search", searchQuery);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);
  if (technicianFilter !== "all") queryParams.set("technicianId", technicianFilter);
  queryParams.set("limit", String(limit));

  const { data: summary, isLoading: summaryLoading } = useQuery<ReportSummary>({
    queryKey: ["/api/service-reports/summary?period=month"],
  });

  const { data: reports, isLoading: reportsLoading } = useQuery<ReportWithNames[]>({
    queryKey: ["/api/service-reports", `?${queryParams.toString()}`],
  });

  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });

  const hasMore = reports && reports.length >= limit;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Service Reports</h1>
        <p className="text-muted-foreground mt-1">
          View completed field service reports from work orders and maintenance visits
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                    <p className="text-3xl font-bold mt-1">{summary?.totalReports ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">This month</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Water Chemistry</p>
                    <p className="text-3xl font-bold mt-1">{summary?.waterChemistryCompliance ?? 0}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Compliance rate</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Droplets className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Chemical Cost</p>
                    <p className="text-3xl font-bold mt-1">
                      ${((summary?.averageChemicalCost ?? 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Per service visit</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Follow-ups Required</p>
                    <p className="text-3xl font-bold mt-1">{summary?.followUpsRequired ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Need attention</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="sent_to_client">Sent to Client</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 w-[160px]"
                  placeholder="Start date"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 w-[160px]"
                  placeholder="End date"
                />
              </div>
            </div>

            <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians?.map((tech) => (
                  <SelectItem key={tech.id} value={String(tech.id)}>
                    {tech.name || tech.user?.name || `Technician ${tech.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {reportsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Reports Found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            No service reports match your current filters. Try adjusting your search criteria or create a new report from a work order.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => {
              const waterScore = computeWaterScore(report);
              const equipIssues = computeEquipmentIssues(report);
              const chemCost = report.totalChemicalCost != null ? (report.totalChemicalCost / 100).toFixed(2) : null;

              return (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-200 group"
                  onClick={() => navigate(`/reports/${report.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                          {report.clientName || "Unknown Client"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {new Date(report.serviceDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        {report.followUpRequired && (
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" title="Follow-up required" />
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {report.overallCondition && (
                        <Badge variant="outline" className={`text-xs ${getConditionColor(report.overallCondition)}`}>
                          {formatStatus(report.overallCondition)}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-xs ${getStatusColor(report.status)}`}>
                        {formatStatus(report.status)}
                      </Badge>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      {report.technicianName && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{report.technicianName}</span>
                        </div>
                      )}

                      {waterScore && (
                        <div className="flex items-center gap-2">
                          <Droplets className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span className={waterScore.inRange === waterScore.total ? "text-green-600" : waterScore.inRange >= waterScore.total / 2 ? "text-amber-600" : "text-red-600"}>
                            {waterScore.inRange}/{waterScore.total} readings in range
                          </span>
                        </div>
                      )}

                      {equipIssues !== null && (
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                          <span className={equipIssues === 0 ? "text-green-600" : "text-amber-600"}>
                            {equipIssues === 0 ? "All equipment good" : `${equipIssues} equipment issue${equipIssues > 1 ? "s" : ""}`}
                          </span>
                        </div>
                      )}

                      {chemCost !== null && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5 shrink-0" />
                          <span>${chemCost} chemicals</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setLimit((prev) => prev + 12)}
                className="px-8"
              >
                Load More Reports
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
