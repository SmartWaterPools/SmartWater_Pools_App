import { ProjectWithDetails } from "@/lib/types";
import { getStatusClasses } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, ClipboardList, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

interface ProjectCardProps {
  project: ProjectWithDetails;
}

export function ProjectCard({ project }: ProjectCardProps) {
  // Get the status styling
  const statusClasses = getStatusClasses(project.status);
  
  // Format dates
  const startDate = new Date(project.startDate);
  const endDate = project.estimatedCompletionDate ? new Date(project.estimatedCompletionDate) : null;
  const dateRange = endDate 
    ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
    : `${format(startDate, "MMM d, yyyy")}`;
  
  // For now, we'll use a fixed progress value since 'completion' is not in the schema
  const progress = 0;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
          <Badge className={`${statusClasses.bg} ${statusClasses.text}`}>
            {project.status.replace("_", " ").split(" ").map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(" ")}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {project.client.user.name}
          {project.client.companyName && ` (${project.client.companyName})`}
        </p>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">{project.description}</p>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium text-gray-500 ml-2">{progress}%</span>
          </div>
          
          <div className="flex items-center space-x-3 pt-1">
            <div className="flex items-center text-sm">
              <CalendarDays className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-gray-600">{dateRange}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-gray-600">{project.assignments && project.assignments.length || 0} Team members</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1 justify-between items-center">
        <div className="flex space-x-1">
          {project.budget && (
            <Badge variant="outline" className="text-xs">
              ${project.budget.toLocaleString()}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="gap-1">
          <span>View Details</span>
          <ArrowUpRight className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}