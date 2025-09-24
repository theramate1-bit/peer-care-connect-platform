import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  AlertCircle,
  ArrowLeft,
  QrCode,
  Camera,
  MessageSquare,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NotificationsService } from '@/lib/database';
import { QRCodeScanner } from './QRCodeScanner';

interface SessionCheckInProps {
  sessionId: string;
  onBack?: () => void;
  onCheckInComplete?: () => void;
  className?: string;
}

export const SessionCheckIn: React.FC<SessionCheckInProps> = ({
  sessionId,
  onBack,
  onCheckInComplete,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInMethod, setCheckInMethod] = useState<'qr' | 'manual' | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    fetchSessionInfo();
  }, [sessionId]);

  const fetchSessionInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('client_sessions')
        .select(`
          *,
          therapist:therapist_id (
            first_name,
            last_name,
            user_role,
            phone
          )
        `)
        .eq('id', sessionId)
        .eq('client_id', user?.id)
        .single();

      if (error) throw error;
      setSessionInfo(data);
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
  };

  const handleQRCheckIn = async () => {
    try {
      setLoading(true);
      
      // Simulate QR code scanning
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('client_sessions')
        .update({ 
          status: 'in-progress',
          check_in_time: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      setCheckedIn(true);
      toast({
        title: "Check-in Successful",
        description: "You have successfully checked in to your session"
      });

      // Notify therapist
      await notifyTherapist();

    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Check-in Failed",
        description: "Failed to check in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = (qrData: string) => {
    // Process QR code data
    if (qrData.startsWith('session_')) {
      // Valid session QR code
      handleCheckIn();
    } else {
      toast({
        title: "Invalid QR Code",
        description: "Please scan the correct session QR code",
        variant: "destructive"
      });
    }
  };

  const handleManualCheckIn = async () => {
    if (!manualCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter the check-in code",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Verify manual code (in real implementation, this would be validated)
      if (manualCode !== 'CHECKIN123') {
        toast({
          title: "Invalid Code",
          description: "The check-in code is incorrect",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('client_sessions')
        .update({ 
          status: 'in-progress',
          check_in_time: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      setCheckedIn(true);
      toast({
        title: "Check-in Successful",
        description: "You have successfully checked in to your session"
      });

      // Notify therapist
      await notifyTherapist();

    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Check-in Failed",
        description: "Failed to check in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const notifyTherapist = async () => {
    try {
      // Send notification to therapist using the service
      await NotificationsService.createNotification({
        user_id: sessionInfo?.therapist_id || '',
        type: 'client_check_in',
        title: 'Client Checked In',
        message: `${user?.user_metadata?.first_name || 'Your client'} has checked in for their session`,
        data: {
          session_id: sessionId,
          client_id: user?.id
        }
      });
    } catch (error) {
      console.error('Error notifying therapist:', error);
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (checkedIn) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check-in Complete!</h2>
          <p className="text-muted-foreground mb-6">
            You have successfully checked in to your session. Your therapist has been notified.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">What's Next?</h3>
              <ul className="text-sm text-left space-y-1">
                <li>• Your therapist will be with you shortly</li>
                <li>• Please wait in the designated area</li>
                <li>• If you need assistance, contact the front desk</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Therapist
              </Button>
              <Button variant="outline" className="flex-1">
                <Phone className="h-4 w-4 mr-2" />
                Call Therapist
              </Button>
            </div>

            {onCheckInComplete && (
              <Button onClick={onCheckInComplete} className="w-full">
                Continue to Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Check In</h1>
          <p className="text-muted-foreground">
            {sessionInfo && `${sessionInfo.therapist?.first_name} ${sessionInfo.therapist?.last_name}`} - {formatTime(sessionInfo?.session_time)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in Methods */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose Check-in Method</CardTitle>
              <CardDescription>
                Select how you'd like to check in to your session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* QR Code Check-in */}
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  checkInMethod === 'qr' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setCheckInMethod('qr')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">QR Code</div>
                    <div className="text-sm text-muted-foreground">
                      Scan the QR code at the clinic
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Check-in */}
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  checkInMethod === 'manual' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => setCheckInMethod('manual')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Manual Code</div>
                    <div className="text-sm text-muted-foreground">
                      Enter the check-in code provided
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Code Input */}
          {checkInMethod === 'manual' && (
            <Card>
              <CardHeader>
                <CardTitle>Enter Check-in Code</CardTitle>
                <CardDescription>
                  Enter the code provided by the clinic staff
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="checkin-code">Check-in Code</Label>
                  <Input
                    id="checkin-code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter code here"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={handleManualCheckIn} 
                  disabled={loading || !manualCode.trim()}
                  className="w-full"
                >
                  {loading ? 'Checking In...' : 'Check In'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* QR Code Scanner */}
          {checkInMethod === 'qr' && (
            <QRCodeScanner 
              onScanSuccess={handleQRScan}
              onScanError={(error) => {
                toast({
                  title: "QR Scan Error",
                  description: error,
                  variant: "destructive"
                });
              }}
            />
          )}
        </div>

        {/* Session Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessionInfo && (
                <>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Therapist</div>
                      <div className="text-sm text-muted-foreground">
                        {sessionInfo.therapist?.first_name} {sessionInfo.therapist?.last_name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Session Time</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(sessionInfo.session_time)} ({sessionInfo.duration} minutes)
                      </div>
                    </div>
                  </div>

                  {sessionInfo.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-sm text-muted-foreground">
                          {sessionInfo.location}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Session Type</div>
                      <div className="text-sm text-muted-foreground">
                        {sessionInfo.session_type}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Crisis Hotline: 988
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Emergency Services: 911
              </Button>
              {sessionInfo?.therapist?.phone && (
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Phone className="h-4 w-4 mr-2" />
                  Therapist: {sessionInfo.therapist.phone}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
