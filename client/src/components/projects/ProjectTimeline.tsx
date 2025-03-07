import React, { useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { format } from "date-fns";

interface ProjectPhase {
  id: number;
  projectId: number;
  name: string;
  description?: string | null;
  status: string;
  order: number;
  percentComplete: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  estimatedDuration?: number | null;
  actualDuration?: number | null;
  cost?: number | null;
  permitRequired?: boolean;
  inspectionRequired?: boolean;
  inspectionDate?: string | null;
  inspectionPassed?: boolean | null;
  inspectionNotes?: string | null;
}

interface ProjectTimelineProps {
  phases: ProjectPhase[];
  currentPhase?: string | null;
}

export function ProjectTimeline({ phases, currentPhase }: ProjectTimelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  
  // Convert project phases to gantt tasks
  const convertToGanttTasks = (phases: ProjectPhase[]): Task[] => {
    return phases
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((phase, index) => {
        // Handle start and end dates
        let start: Date;
        let end: Date;
        
        if (phase.startDate) {
          start = new Date(phase.startDate);
        } else {
          // Default start date (project start or today)
          start = new Date();
        }
        
        if (phase.endDate) {
          end = new Date(phase.endDate);
        } else if (phase.estimatedDuration && phase.startDate) {
          // Calculate end date based on estimated duration
          end = new Date(start);
          end.setDate(start.getDate() + phase.estimatedDuration);
        } else {
          // Default to 1 day duration
          end = new Date(start);
          end.setDate(start.getDate() + 1);
        }
        
        // Determine color based on status
        let barBackgroundColor = "#6b7280";
        let barProgressColor = "#4b5563";
        let barProgressSelectedColor = "#4b5563";
        let barBackgroundSelectedColor = "#6b7280";

        switch (phase.status) {
          case "planning":
            barBackgroundColor = "#3b82f6";
            barProgressColor = "#2563eb";
            barProgressSelectedColor = "#2563eb";
            barBackgroundSelectedColor = "#3b82f6";
            break;
          case "pending":
            barBackgroundColor = "#f59e0b";
            barProgressColor = "#d97706";
            barProgressSelectedColor = "#d97706";
            barBackgroundSelectedColor = "#f59e0b";
            break;
          case "in_progress":
            barBackgroundColor = "#10b981";
            barProgressColor = "#059669";
            barProgressSelectedColor = "#059669";
            barBackgroundSelectedColor = "#10b981";
            break;
          case "completed":
            barBackgroundColor = "#22c55e";
            barProgressColor = "#16a34a";
            barProgressSelectedColor = "#16a34a";
            barBackgroundSelectedColor = "#22c55e";
            break;
          case "delayed":
            barBackgroundColor = "#ef4444";
            barProgressColor = "#dc2626";
            barProgressSelectedColor = "#dc2626";
            barBackgroundSelectedColor = "#ef4444";
            break;
        }
        
        // Add visual indicator for current phase
        if (currentPhase === phase.name) {
          barBackgroundSelectedColor = "#8b5cf6"; // Purple highlight for selected phase
          barProgressSelectedColor = "#7c3aed";
        }
        
        // Create the task object
        return {
          id: `${phase.id}`,
          name: phase.name,
          start,
          end,
          progress: phase.percentComplete / 100,
          type: "task",
          isDisabled: false,
          hideChildren: false,
          styles: {} as any, // Using type assertion to fix type incompatibility
          dependencies: index > 0 ? [`${phases[index - 1].id}`] : [], // Simple sequential dependencies
          project: "", // Could be used for grouping
          displayOrder: phase.order,
          description: phase.description || ""
        };
      });
  };
  
  const tasks = convertToGanttTasks(phases);

  // Determine if we have enough data to show the chart
  const hasTimelineData = tasks.length > 0;

  // Options for the Gantt chart display
  const viewDate = tasks.length > 0 ? tasks[0].start : new Date();
  const locale = "en-US";

  // Function to handle view mode changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Calculate timeline range for header display
  const getTimelineRange = () => {
    if (tasks.length === 0) return "No timeline data";
    
    const startDates = tasks.map(t => t.start);
    const endDates = tasks.map(t => t.end);
    
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    return `${format(minDate, "MMM d, yyyy")} - ${format(maxDate, "MMM d, yyyy")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Timeline</h3>
        <div className="flex items-center gap-2">
          <select
            className="text-sm px-2 py-1 rounded border bg-background"
            value={viewMode}
            onChange={(e) => handleViewModeChange(e.target.value as ViewMode)}
          >
            <option value={ViewMode.Day}>Day</option>
            <option value={ViewMode.Week}>Week</option>
            <option value={ViewMode.Month}>Month</option>
            <option value={ViewMode.Year}>Year</option>
          </select>
          <div className="text-sm text-muted-foreground">
            {getTimelineRange()}
          </div>
        </div>
      </div>
      
      {!hasTimelineData ? (
        <div className="p-8 text-center border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">
            Not enough timeline data to display. Please add start and end dates to your project phases.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onDateChange={(task) => console.log("Date change:", task)}
            onProgressChange={(task) => console.log("Progress change:", task)}
            onDoubleClick={(task) => console.log("Double click:", task)}
            onClick={(task) => console.log("Click:", task)}
            listCellWidth="155px"
            columnWidth={viewMode === ViewMode.Year ? 350 : viewMode === ViewMode.Month ? 300 : 60}
            locale={locale}
            viewDate={viewDate}
            preStepsCount={1}
            timeStep={1000}
            arrowColor="#848484"
            fontFamily="'Inter', sans-serif"
            todayColor="rgba(79, 70, 229, 0.15)"
          />
        </div>
      )}
      
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Timeline Legend</h4>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-xs">Planning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-xs">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-xs">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-green-600"></div>
            <span className="text-xs">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-xs">Delayed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-purple-500"></div>
            <span className="text-xs">Current Phase</span>
          </div>
        </div>
      </div>
    </div>
  );
}