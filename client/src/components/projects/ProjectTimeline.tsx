import React, { useState } from "react";
import { Gantt, ViewMode, Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { format } from "date-fns";

// Use the Task type from the gantt-task-react library
type Task = GanttTask;

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
  
  // Ensure phases is an array and not empty
  if (!phases || !Array.isArray(phases) || phases.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">
          Not enough timeline data to display. Please add start and end dates to your project phases.
        </p>
      </div>
    );
  }

  // Convert project phases to gantt tasks
  const tasks: Task[] = [];
  
  try {
    // Create a shallow copy of the phases array to avoid mutating the original
    const phasesCopy = [...phases];
    
    // Sort by order
    phasesCopy.sort((a, b) => a.order - b.order);
    
    // Map each phase to a Gantt task
    for (let i = 0; i < phasesCopy.length; i++) {
      const phase = phasesCopy[i];
      
      // Handle start date
      let start: Date;
      if (phase.startDate) {
        start = new Date(phase.startDate);
      } else {
        // Default start date is today
        start = new Date();
      }
      
      // Handle end date
      let end: Date;
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
      let backgroundColor = "#6b7280";
      let progressColor = "#4b5563";
      let backgroundSelectedColor = "#6b7280";
      let progressSelectedColor = "#4b5563";
      
      // Set colors based on status
      switch (phase.status) {
        case "planning":
          backgroundColor = "#3b82f6";
          progressColor = "#2563eb";
          backgroundSelectedColor = "#3b82f6";
          progressSelectedColor = "#2563eb";
          break;
        case "pending":
          backgroundColor = "#f59e0b";
          progressColor = "#d97706";
          backgroundSelectedColor = "#f59e0b";
          progressSelectedColor = "#d97706";
          break;
        case "in_progress":
          backgroundColor = "#10b981";
          progressColor = "#059669";
          backgroundSelectedColor = "#10b981";
          progressSelectedColor = "#059669";
          break;
        case "completed":
          backgroundColor = "#22c55e";
          progressColor = "#16a34a";
          backgroundSelectedColor = "#22c55e";
          progressSelectedColor = "#16a34a";
          break;
        case "delayed":
          backgroundColor = "#ef4444";
          progressColor = "#dc2626";
          backgroundSelectedColor = "#ef4444";
          progressSelectedColor = "#dc2626";
          break;
      }
      
      // Highlight current phase
      if (currentPhase === phase.name) {
        backgroundSelectedColor = "#8b5cf6";
        progressSelectedColor = "#7c3aed";
      }
      
      // Create the task object
      const task: Task = {
        id: `${phase.id}`,
        name: phase.name,
        start,
        end,
        progress: phase.percentComplete / 100,
        type: "task" as any,
        isDisabled: false,
        styles: {
          backgroundColor,
          progressColor,
          backgroundSelectedColor,
          progressSelectedColor
        },
        dependencies: i > 0 ? [`${phasesCopy[i - 1].id}`] : [],
        project: "",
        hideChildren: false
      };
      
      tasks.push(task);
    }
  } catch (error) {
    console.error("Error preparing timeline data:", error);
    return (
      <div className="p-8 text-center border rounded-lg bg-muted/10 text-red-500">
        <p>Error generating timeline visualization. Please try again or contact support.</p>
        <p className="text-xs mt-2 text-muted-foreground">{String(error)}</p>
      </div>
    );
  }
  
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
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
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
          locale="en-US"
          fontSize="12px"
        />
      </div>
      
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