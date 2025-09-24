import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SettingsHeaderProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  showSaveButton?: boolean;
  showResetButton?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title = "Settings",
  description = "Manage your account settings and preferences",
  showBackButton = true,
  showSaveButton = false,
  showResetButton = false,
  onSave,
  onReset,
  isDirty = false,
  isSaving = false
}) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{title}</h1>
                {userProfile?.user_role && (
                  <Badge variant="secondary" className="text-xs">
                    {userProfile.user_role.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showResetButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
            
            {showSaveButton && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
