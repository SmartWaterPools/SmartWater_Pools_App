import { MoreHorizontal, MessageCircle, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ProjectWithDetails, 
  getStatusClasses, 
  formatDate 
} from "@/lib/types";

interface ProjectCardProps {
  project: ProjectWithDetails;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusClasses = getStatusClasses(project.status);
  
  const bgColorClass = 
    project.status === 'in_progress' ? 'bg-blue-50' : 
    project.status === 'review' ? 'bg-green-50' : 
    project.status === 'planning' ? 'bg-blue-50' : 
    project.status === 'completed' ? 'bg-green-50' : 
    'bg-blue-50';
  
  const iconBgClass = 
    project.status === 'in_progress' ? 'bg-primary' : 
    project.status === 'review' ? 'bg-green-500' : 
    project.status === 'planning' ? 'bg-blue-500' : 
    project.status === 'completed' ? 'bg-green-500' : 
    'bg-primary';
  
  return (
    <div className="border border-gray-100 rounded-lg mb-4 overflow-hidden">
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between p-4 ${bgColorClass}`}>
        <div className="flex items-start">
          <div className={`${iconBgClass} text-white p-2.5 rounded-lg flex-shrink-0`}>
            <Building className="h-5 w-5" />
          </div>
          <div className="ml-3">
            <h3 className="text-base font-semibold text-foreground font-heading">{project.name}</h3>
            <p className="text-sm text-gray-500">Client: {project.client.user.name}</p>
          </div>
        </div>
        <div className="flex items-center mt-3 md:mt-0">
          <span className={`${statusClasses.bg} ${statusClasses.text} text-xs font-medium px-2.5 py-1 rounded-full`}>
            {project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}
          </span>
          <span className="text-sm text-gray-500 ml-4">{project.completion}% Complete</span>
        </div>
      </div>
      <div className="p-4">
        <Progress value={project.completion} className="h-2.5 mb-4" />
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-gray-600">Due: {formatDate(project.deadline)}</span>
          </div>
          <div className="flex items-center text-sm">
            <Users className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-gray-600">{project.assignments.length} Technicians</span>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center space-x-1">
            {project.assignments.slice(0, 4).map((assignment, index) => (
              <div 
                key={assignment.id} 
                className="w-6 h-6 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs overflow-hidden"
                title={assignment.technician.user.name}
              >
                {assignment.technician.user.name.charAt(0)}
              </div>
            ))}
            {project.assignments.length > 4 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                +{project.assignments.length - 4}
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary bg-blue-50 hover:bg-blue-100">
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 bg-gray-100 hover:bg-gray-200">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Building(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}
