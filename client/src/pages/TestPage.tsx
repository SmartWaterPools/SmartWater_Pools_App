import React, { useState } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { SimpleTestDialog } from '../components/bazza/SimpleTestDialog';

export default function TestPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  console.log("TestPage: Rendering with isDialogOpen =", isDialogOpen);
  
  const openDialog = () => {
    console.log("Test Page: Opening dialog");
    setIsDialogOpen(true);
  };
  
  const closeDialog = () => {
    console.log("Test Page: Closing dialog");
    setIsDialogOpen(false);
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Test Page</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dialog Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This is a test page to verify that basic dialog functionality is working.
          </p>
          <Button onClick={openDialog}>Open Test Dialog</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Component Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Dialog is currently: <strong>{isDialogOpen ? 'OPEN' : 'CLOSED'}</strong></p>
        </CardContent>
      </Card>
      
      {/* Test Dialog */}
      <SimpleTestDialog 
        isOpen={isDialogOpen}
        onClose={closeDialog}
        title="Simple Test Dialog"
      />
    </div>
  );
}