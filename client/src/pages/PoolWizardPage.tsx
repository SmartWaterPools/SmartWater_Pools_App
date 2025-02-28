import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { PoolInformationWizard } from '@/components/pool/PoolInformationWizard';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';

export default function PoolWizardPage() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/clients/${id}`)
      .then(res => res.json())
      .then(data => {
        setClient(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching client:", err);
        toast({
          title: "Error",
          description: "Failed to load client data",
          variant: "destructive",
        });
        setLoading(false);
      });
  }, [id, toast]);

  const handleWizardComplete = () => {
    toast({
      title: "Success",
      description: "Pool information has been updated successfully",
    });
    setLocation(`/clients/${id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <Skeleton className="h-8 w-40 mr-4" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Client not found</h1>
        <Button onClick={() => setLocation('/clients')}>Back to Clients</Button>
      </div>
    );
  }

  // Prepare the existing data for the wizard
  const existingData = {
    poolType: client.poolType || '',
    poolSize: client.poolSize || '',
    filterType: client.filterType || '',
    heaterType: client.heaterType || null,
    chemicalSystem: client.chemicalSystem || '',
    specialNotes: client.specialNotes || '',
    serviceDay: client.serviceDay || '',
    // In a real app, you would fetch equipment and images from their respective endpoints
    equipment: [],
    images: [],
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation(`/clients/${id}`)}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Client
        </Button>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{client.user.name}'s Pool Information</h1>
        <p className="text-gray-500">Complete the wizard to update pool details and equipment</p>
      </div>
      
      <PoolInformationWizard 
        clientId={parseInt(id || '0')}
        existingData={existingData}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}