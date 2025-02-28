import { useState } from "react";
import { 
  User, 
  Calendar, 
  FileText, 
  CreditCard, 
  Clock, 
  Wrench, 
  ChevronRight, 
  Plus, 
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { RepairRequestForm } from "@/components/repairs/RepairRequestForm";

// Mock client data - in a real app this would come from an API
const client = {
  name: "Morrison Family",
  address: "123 Lake Dr",
  phone: "555-567-8901",
  email: "morrison@email.com",
  projects: [
    {
      id: 1,
      name: "Mediterranean Luxury Pool",
      status: "in_progress",
      completion: 68,
      nextMilestone: "Tile Installation",
      dueDate: "Nov 15, 2023"
    }
  ],
  maintenances: [
    {
      id: 1,
      type: "Weekly Cleaning",
      date: "Oct 27, 2023",
      time: "10:00 AM",
      technician: "Michael Torres",
      status: "scheduled"
    },
    {
      id: 2,
      type: "Filter Check",
      date: "Nov 10, 2023",
      time: "2:30 PM",
      technician: "Sarah Kim",
      status: "scheduled"
    }
  ],
  repairs: [
    {
      id: 1,
      issueType: "Water Leak",
      reportedDate: "Oct 15, 2023",
      status: "in_progress",
      technician: "David Chen",
      description: "Leak detected near pump connection"
    }
  ],
  invoices: [
    {
      id: 1,
      description: "Progress payment for Mediterranean Luxury Pool (35%)",
      amount: 25000,
      issueDate: "Oct 12, 2023",
      dueDate: "Oct 27, 2023",
      status: "pending"
    }
  ]
};

export default function ClientPortal() {
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">SmartWater Pool Portal</h1>
          <p className="text-gray-500 text-sm">Managing your pool has never been easier</p>
        </div>
        <div className="mt-3 md:mt-0 space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Pool Support
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Service
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white">
            Make Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl mb-4">
                {client.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold">{client.name}</h2>
              <p className="text-sm text-gray-500">{client.address}</p>
              <div className="mt-4 flex items-center justify-center space-x-4">
                <Button variant="outline" size="sm" className="rounded-full">
                  <User className="h-4 w-4 mr-1" />
                  Profile
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-primary mr-2" />
                  <div>
                    <h3 className="text-sm font-medium">Next Service</h3>
                    <p className="text-xs">Oct 27, 10:00 AM - Weekly Cleaning</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium">Payment Due</h3>
                    <p className="text-xs">Oct 27 - $25,000</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-yellow-600">
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Your Pool Project</CardTitle>
          </CardHeader>
          <CardContent>
            {client.projects.length > 0 ? (
              client.projects.map(project => (
                <div key={project.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="p-4 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                      <span className="bg-blue-100 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                        {project.status || "In Progress"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{project.completion}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: `${project.completion}%` }}></div>
                    </div>
                    
                    {/* Pool Specifications */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Pool Specifications</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Pool Type</p>
                          <p className="font-medium">{project.poolType || "Custom"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Size</p>
                          <p className="font-medium">{project.poolSize || "Standard"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Water Volume</p>
                          <p className="font-medium">{project.waterVolume || "N/A"} gallons</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Filtration System</p>
                          <p className="font-medium">{project.filtrationSystem || "Standard"}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-sm">
                        <p className="text-gray-500">Next Milestone</p>
                        <p className="font-medium">{project.nextMilestone}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-500">Target Completion</p>
                        <p className="font-medium">{project.dueDate}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">View Project Details</Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No active projects found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="maintenance" className="mb-6">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="repairs">Repairs</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>
        
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Maintenance Schedule</CardTitle>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-1" />
                View Calendar
              </Button>
            </CardHeader>
            <CardContent>
              {client.maintenances.length > 0 ? (
                <div className="space-y-3">
                  {client.maintenances.map(maintenance => (
                    <div key={maintenance.id} className="flex items-start p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center bg-blue-100 rounded-lg p-2 mr-3 flex-shrink-0 w-12 h-12 text-center">
                        <span className="text-primary text-sm font-semibold">{maintenance.date.split(' ')[1]}</span>
                        <span className="text-primary text-xs">{maintenance.date.split(' ')[0]}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground">{maintenance.type}</h4>
                        <div className="flex items-center mt-1">
                          <span className="text-xs bg-blue-100 text-primary px-2 py-0.5 rounded-full">{maintenance.time}</span>
                          <span className="text-xs ml-2 flex items-center text-gray-500">
                            <User className="h-3 w-3 mr-1" />
                            {maintenance.technician}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No scheduled maintenance found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="repairs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Repair Requests</CardTitle>
              <Dialog open={repairDialogOpen} onOpenChange={setRepairDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="h-4 w-4 mr-1" />
                    Request Repair
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <RepairRequestForm onClose={() => setRepairDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {client.repairs.length > 0 ? (
                <div className="space-y-3">
                  {client.repairs.map(repair => (
                    <div key={repair.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-sm font-medium">{repair.issueType}</h4>
                          <p className="text-xs text-gray-500">{repair.description}</p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">
                          {repair.status.replace('_', ' ').charAt(0).toUpperCase() + repair.status.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {repair.technician}
                        </div>
                        <div>Reported: {repair.reportedDate}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No repair requests found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Invoices & Payments</CardTitle>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {client.invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {client.invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${invoice.amount.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.issueDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.dueDate}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="outline" size="sm">Pay Now</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No invoices found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
