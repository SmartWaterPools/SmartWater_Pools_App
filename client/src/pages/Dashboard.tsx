import { useAuth } from "../contexts/AuthContext";
import LoginCard from "@/components/dashboard/LoginCard";

// Import role-specific dashboards
import { AdminDashboard } from "../components/dashboards/AdminDashboard";
import { TechnicianDashboard } from "../components/dashboards/TechnicianDashboard";
import { ClientDashboard } from "../components/dashboards/ClientDashboard";

/**
 * Main Dashboard Component
 * 
 * Routes users to their role-specific dashboard interface based on their role
 * and authentication status. For unauthenticated users, shows login card.
 */
export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();

  // If not authenticated, show login interface
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <LoginCard />
        </div>
      </div>
    );
  }

  // Route authenticated users to their role-specific dashboard
  switch (user.role) {
    case 'system_admin':
    case 'org_admin':
    case 'admin':
      return <AdminDashboard />;
    
    case 'manager':
      // For now, managers get the admin interface until we create ManagerDashboard
      return <AdminDashboard />;
    
    case 'office_staff':
      // For now, office staff get the admin interface until we create OfficeStaffDashboard
      return <AdminDashboard />;
    
    case 'technician':
      return <TechnicianDashboard />;
    
    case 'client':
      return <ClientDashboard />;
    
    default:
      console.warn(`Unknown user role: ${user.role}, showing generic dashboard`);
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome, {user.name}!
            </h1>
            <p className="text-gray-600">
              Your account role ({user.role}) doesn't have a specific dashboard configured yet.
            </p>
          </div>
        </div>
      );
  }
}