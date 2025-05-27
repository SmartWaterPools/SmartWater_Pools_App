import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  Building, 
  CalendarCheck, 
  Wrench, 
  Users, 
  Search, 
  PlusCircle, 
  ArrowRight, 
  Eye, 
  Edit, 
  MoreHorizontal,
  ServerOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { MaintenanceItem } from "@/components/dashboard/MaintenanceItem";
import { UserManagementCard } from "@/components/dashboard/UserManagementCard";
import { useAuth } from "../contexts/AuthContext";
import { 
  DashboardSummary, 
  getStatusClasses, 
  getPriorityClasses, 
  formatDate 
} from "@/lib/types";

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  // If not authenticated, show simple login interface
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold mb-4">Welcome to SmartWater Pools</h2>
          <p className="text-gray-600 mb-6">Please log in to access your pool management dashboard.</p>
          <a 
            href="/api/auth/google" 
            className="inline-flex items-center justify-center bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Login with Google
          </a>
        </div>
      </div>
    );
  }

  // If authenticated, show full dashboard with all features
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">Welcome to SmartWater Pools, {user?.name}!</h1>
        <p className="text-gray-600">Manage your pool service operations efficiently</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Role: {user?.role} | Organization: {user?.organizationName || 'Not specified'}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold">Clients</h3>
              <p className="text-sm text-gray-600">Manage client accounts</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/maintenance">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <CalendarCheck className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <h3 className="font-semibold">Maintenance</h3>
              <p className="text-sm text-gray-600">Schedule & track maintenance</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Building className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <h3 className="font-semibold">Projects</h3>
              <p className="text-sm text-gray-600">Manage construction projects</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/repairs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Wrench className="h-8 w-8 mx-auto mb-3 text-orange-500" />
              <h3 className="font-semibold">Repairs</h3>
              <p className="text-sm text-gray-600">Track repair requests</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Additional Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Quick Access</h3>
            <div className="space-y-2">
              <Link href="/technicians">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Technicians
                </Button>
              </Link>
              <Link href="/inventory">
                <Button variant="outline" className="w-full justify-start">
                  <Building className="h-4 w-4 mr-2" />
                  Inventory Management
                </Button>
              </Link>
              <Link href="/communications">
                <Button variant="outline" className="w-full justify-start">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Communications
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Administration</h3>
            <div className="space-y-2">
              <Link href="/settings">
                <Button variant="outline" className="w-full justify-start">
                  Settings
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="outline" className="w-full justify-start">
                  System Administration
                </Button>
              </Link>
              <Link href="/business">
                <Button variant="outline" className="w-full justify-start">
                  Business Management
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}