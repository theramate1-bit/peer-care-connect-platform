import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNavigation } from '@/components/navigation/BreadcrumbNavigation';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsHeader } from './SettingsHeader';

interface SettingsLayoutProps {
  children?: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isSettingsPage = location.pathname.startsWith('/settings');

  return (
    <div className="min-h-screen bg-background">
      {/* Settings Header */}
      <SettingsHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Settings Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <SettingsSidebar />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb Navigation */}
            {isSettingsPage && (
              <div className="mb-6">
                <BreadcrumbNavigation />
              </div>
            )}
            
            {/* Settings Content */}
            <Card>
              <CardContent className="p-6">
                {children || <Outlet />}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
