import { useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  FileText, 
  Edit,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { VendorForm } from '@/components/business/VendorForm';
import { EntityEmailList } from '@/components/communications/EntityEmailList';
import { EntitySMSList } from '@/components/communications/EntitySMSList';

interface Vendor {
  id: number;
  name: string;
  category: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  organizationId: number;
}

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditForm, setShowEditForm] = useState(false);

  const { 
    data: vendor, 
    isLoading,
    error
  } = useQuery<Vendor>({
    queryKey: ['/api/vendors', id],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${id}`);
      if (!res.ok) throw new Error('Failed to fetch vendor');
      return res.json();
    },
    enabled: !!id
  });

  const formatCategory = (category: string): string => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "chemical supplier":
        return "bg-blue-100 text-blue-800";
      case "equipment":
        return "bg-green-100 text-green-800";
      case "parts":
        return "bg-orange-100 text-orange-800";
      case "service":
        return "bg-purple-100 text-purple-800";
      case "office":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 w-full lg:col-span-2" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Vendor not found</h1>
        <Button onClick={() => setLocation('/business')} data-testid="button-back-to-business">
          Back to Business
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link href="/business" className="hover:text-foreground transition-colors" data-testid="link-business">
          Business
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link 
          href="/business" 
          onClick={(e) => {
            e.preventDefault();
            setLocation('/business');
            setTimeout(() => {
              const vendorsTab = document.querySelector('[value="vendors"]');
              if (vendorsTab) (vendorsTab as HTMLElement).click();
            }, 100);
          }}
          className="hover:text-foreground transition-colors"
          data-testid="link-vendors"
        >
          Vendors
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{vendor.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation('/business')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="text-vendor-name">{vendor.name}</h1>
              <Badge 
                variant="outline" 
                className={getCategoryColor(vendor.category)}
                data-testid="badge-category"
              >
                {formatCategory(vendor.category)}
              </Badge>
              {vendor.isActive ? (
                <Badge variant="outline" className="bg-green-100 text-green-800" data-testid="badge-status">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-800" data-testid="badge-status">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button 
          onClick={() => setShowEditForm(true)}
          data-testid="button-edit-vendor"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Vendor
        </Button>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Building2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="communications" data-testid="tab-communications">
            <MessageSquare className="h-4 w-4 mr-2" />
            Communications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Vendor Information</CardTitle>
                <CardDescription>Details about this vendor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Vendor Name</p>
                        <p className="font-medium" data-testid="text-name">{vendor.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                        <p data-testid="text-contact">{vendor.contactName || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        {vendor.email ? (
                          <a 
                            href={`mailto:${vendor.email}`} 
                            className="text-primary hover:underline"
                            data-testid="link-email"
                          >
                            {vendor.email}
                          </a>
                        ) : (
                          <p className="text-muted-foreground" data-testid="text-email">Not specified</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                        {vendor.phone ? (
                          <a 
                            href={`tel:${vendor.phone}`} 
                            className="text-primary hover:underline"
                            data-testid="link-phone"
                          >
                            {vendor.phone}
                          </a>
                        ) : (
                          <p className="text-muted-foreground" data-testid="text-phone">Not specified</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Website</p>
                        {vendor.website ? (
                          <a 
                            href={vendor.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            data-testid="link-website"
                          >
                            {vendor.website}
                          </a>
                        ) : (
                          <p className="text-muted-foreground" data-testid="text-website">Not specified</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Address</p>
                        <p data-testid="text-address">{vendor.address || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">
                  {vendor.notes || 'No notes added for this vendor.'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {vendor.email && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = `mailto:${vendor.email}`}
                    data-testid="button-send-email"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                )}
                {vendor.phone && (
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = `tel:${vendor.phone}`}
                    data-testid="button-call"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                )}
                {vendor.website && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(vendor.website!, '_blank')}
                    data-testid="button-visit-website"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EntityEmailList 
              entityType="vendor" 
              entityId={parseInt(id!)} 
              entityName={vendor.name}
            />
            <EntitySMSList 
              entityType="vendor" 
              entityId={parseInt(id!)} 
              entityName={vendor.name}
              entityPhone={vendor.phone || undefined}
            />
          </div>
        </TabsContent>
      </Tabs>

      {showEditForm && (
        <VendorForm
          vendorToEdit={{
            id: vendor.id,
            name: vendor.name,
            category: vendor.category,
            contactName: vendor.contactName || undefined,
            email: vendor.email || undefined,
            phone: vendor.phone || undefined,
            website: vendor.website || undefined,
            address: vendor.address || undefined,
            notes: vendor.notes || undefined,
            isActive: vendor.isActive
          }}
          onClose={() => setShowEditForm(false)}
        />
      )}
    </div>
  );
}
