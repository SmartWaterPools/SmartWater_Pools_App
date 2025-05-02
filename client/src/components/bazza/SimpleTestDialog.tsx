import React from 'react';
import { Button } from "../ui/button";

type SimpleTestDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
};

export function SimpleTestDialog({
  isOpen,
  onClose,
  title = "Test Dialog"
}: SimpleTestDialogProps) {
  console.log("SimpleTestDialog: Rendering with isOpen =", isOpen);
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>
        <p className="text-gray-600 mb-4">
          This is a simple test dialog to verify that modal dialogs work in this application.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}