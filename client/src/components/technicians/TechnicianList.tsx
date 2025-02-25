import { TechnicianWithUser } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Mail, Phone, MapPin } from "lucide-react";

interface TechnicianListProps {
  technicians: TechnicianWithUser[];
  isLoading: boolean;
  onTechnicianSelect: (technician: TechnicianWithUser) => void;
}

export function TechnicianList({ technicians, isLoading, onTechnicianSelect }: TechnicianListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="ml-4 space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <div className="flex mt-1">
                  <Skeleton className="h-4 w-4 rounded-full mr-1" />
                  <Skeleton className="h-4 w-4 rounded-full mr-1" />
                  <Skeleton className="h-4 w-4 rounded-full mr-1" />
                  <Skeleton className="h-4 w-4 rounded-full mr-1" />
                  <Skeleton className="h-4 w-4 rounded-full mr-1" />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center mb-2">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center mb-2">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center mb-4">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <p className="text-gray-500">No technicians found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {technicians.map((technician) => (
        <div 
          key={technician.id} 
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition"
        >
          <div className="flex items-start">
            <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl flex-shrink-0">
              {technician.user.name.charAt(0)}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{technician.user.name}</h3>
              <p className="text-sm text-gray-500">{technician.specialization}</p>
              <div className="flex items-center mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Star
                      key={rating}
                      className="h-4 w-4 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <span className="ml-1 text-xs text-gray-500">(32)</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <span>{technician.user.email}</span>
              </div>
              {technician.user.phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{technician.user.phone}</span>
                </div>
              )}
              {technician.user.address && (
                <div className="flex items-start text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <span>{technician.user.address}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1 mb-4">
              {technician.certifications && technician.certifications.split(',').map((cert, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-100 text-primary hover:bg-blue-200">
                  {cert.trim()}
                </Badge>
              ))}
            </div>
            
            <Button
              onClick={() => onTechnicianSelect(technician)}
              variant="outline"
              className="w-full"
            >
              View Details
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}