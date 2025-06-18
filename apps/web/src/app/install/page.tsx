'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import InstallationWizard from '@/components/installation-wizard';

export default function InstallPage() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkInstallationStatus();
  }, []);

  const checkInstallationStatus = async () => {
    try {
      const response = await fetch('/api/install/status');
      const data = await response.json();
      
      if (data.isInstalled) {
        setIsInstalled(true);
      }
    } catch (err) {
      setError('Unable to check installation status.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking installation status...</p>
        </div>
      </div>
    );
  }

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Already Installed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Vyral CMS is already installed on this system. You cannot run the installation wizard again.
            </p>
          </div>
          <div className="space-y-4">
            <a
              href="/admin"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Admin Dashboard
            </a>
            <a
              href="/"
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Website
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Installation Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
          </div>
          <button
            onClick={checkInstallationStatus}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <InstallationWizard />;
}
