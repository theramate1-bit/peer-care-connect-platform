import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  AlertCircle, 
  Heart, 
  Shield, 
  Users,
  MapPin,
  Clock
} from 'lucide-react';
import { EmergencyContactsService, EmergencyContact } from '@/lib/database';
import { OfflineStorageService } from '@/lib/offline-storage';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContactsProps {
  className?: string;
}

export const EmergencyContacts: React.FC<EmergencyContactsProps> = ({ className }) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    fetchEmergencyContacts();
    setupOfflineSupport();
    
    // Listen for connection changes
    const cleanup = OfflineStorageService.onConnectionChange((online) => {
      setIsOffline(!online);
      if (!online) {
        // Device went offline, try to load from offline storage
        loadOfflineContacts();
      }
    });

    return cleanup;
  }, []);

  const fetchEmergencyContacts = async () => {
    try {
      setLoading(true);
      const emergencyContacts = await EmergencyContactsService.getActiveContacts();
      setContacts(emergencyContacts);
      
      // Store contacts offline for emergency access
      await OfflineStorageService.storeEmergencyContacts(emergencyContacts);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      
      // Try to load from offline storage as fallback
      await loadOfflineContacts();
      
      toast({
        title: "Connection Error",
        description: "Using offline emergency contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineContacts = async () => {
    try {
      const offlineContacts = await OfflineStorageService.getEmergencyContacts();
      if (offlineContacts.length > 0) {
        setContacts(offlineContacts);
        toast({
          title: "Offline Mode",
          description: "Using cached emergency contacts",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading offline contacts:', error);
    }
  };

  const setupOfflineSupport = async () => {
    try {
      // Check if device is currently offline
      setIsOffline(OfflineStorageService.isOffline());
      
      if (OfflineStorageService.isOffline()) {
        await loadOfflineContacts();
      }
    } catch (error) {
      console.error('Error setting up offline support:', error);
    }
  };

  const handleCall = (phone: string, name: string) => {
    try {
      // Create a phone link for mobile devices
      const phoneLink = `tel:${phone}`;
      window.open(phoneLink, '_self');
      
      toast({
        title: "Calling Emergency Contact",
        description: `Connecting to ${name}...`
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      toast({
        title: "Call Failed",
        description: "Unable to initiate call. Please dial manually.",
        variant: "destructive"
      });
    }
  };

  const getContactIcon = (type: EmergencyContact['type']) => {
    switch (type) {
      case 'crisis_hotline':
        return <Heart className="h-5 w-5 text-red-600" />;
      case 'emergency_services':
        return <Shield className="h-5 w-5 text-blue-600" />;
      case 'therapist':
        return <Users className="h-5 w-5 text-green-600" />;
      case 'family':
        return <Users className="h-5 w-5 text-purple-600" />;
      default:
        return <Phone className="h-5 w-5 text-gray-600" />;
    }
  };

  const getContactColor = (type: EmergencyContact['type']) => {
    switch (type) {
      case 'crisis_hotline':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'emergency_services':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'therapist':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'family':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getTypeBadgeColor = (type: EmergencyContact['type']) => {
    switch (type) {
      case 'crisis_hotline':
        return 'bg-red-100 text-red-800';
      case 'emergency_services':
        return 'bg-blue-100 text-blue-800';
      case 'therapist':
        return 'bg-green-100 text-green-800';
      case 'family':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeDisplayName = (type: EmergencyContact['type']) => {
    switch (type) {
      case 'crisis_hotline':
        return 'Crisis Support';
      case 'emergency_services':
        return 'Emergency Services';
      case 'therapist':
        return 'Therapist';
      case 'family':
        return 'Family';
      default:
        return 'Contact';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Emergency Contacts
          </CardTitle>
          <CardDescription>Quick access to emergency resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Emergency Contacts
          {isOffline && (
            <Badge variant="secondary" className="ml-2">
              Offline
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isOffline 
            ? "Using cached emergency contacts (offline mode)" 
            : "Quick access to emergency resources"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contacts.length > 0 ? (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div 
                key={contact.id} 
                className={`p-4 border rounded-lg transition-colors ${getContactColor(contact.type)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getContactIcon(contact.type)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{contact.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getTypeBadgeColor(contact.type)}`}
                        >
                          {getTypeDisplayName(contact.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {contact.description || 'Emergency contact'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCall(contact.phone, contact.name)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Emergency Contacts</h3>
            <p className="text-sm text-muted-foreground">
              Emergency contacts are not available at this time.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-800">Important Notice</span>
          </div>
          <p className="text-sm text-yellow-700">
            In case of emergency, call 911 (US) or 999 (UK) immediately. 
            These contacts are for non-emergency support and guidance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
