import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Calendar,
  Clock,
  User,
  MapPin,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Payment } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

interface PaymentWithDetails extends Payment {
  session?: {
    id: string;
    session_date: string;
    session_time: string;
    duration: number;
    status: string;
    session_type: string;
    location?: string;
  };
  therapist?: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
    email?: string;
    phone?: string;
  };
}

interface PaymentDetailsModalProps {
  payment: PaymentWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadReceipt?: (payment: PaymentWithDetails) => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  payment,
  isOpen,
  onClose,
  onDownloadReceipt
}) => {
  const { toast } = useToast();

  if (!payment) return null;

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const formattedAmount = (amount / 100).toFixed(2);
    return `${currency} ${formattedAmount}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return 'Sports Therapist';
      case 'massage_therapist':
        return 'Massage Therapist';
      case 'osteopath':
        return 'Osteopath';
      default:
        return 'Therapist';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`
    });
  };

  const openStripeDashboard = () => {
    if (payment.stripe_payment_intent_id) {
      const stripeUrl = `https://dashboard.stripe.com/payments/${payment.stripe_payment_intent_id}`;
      window.open(stripeUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this payment transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {getStatusIcon(payment.status)}
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge className={`text-sm ${getStatusColor(payment.status)}`}>
                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </Badge>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {formatAmount(payment.amount, payment.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(payment.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Information */}
          {payment.session && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Session Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.session.session_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(payment.session.session_time)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.session.duration} minutes
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.session.session_type}
                    </p>
                  </div>
                </div>

                {payment.session.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.session.location}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Therapist Information */}
          {payment.therapist && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Therapist Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.therapist.first_name} {payment.therapist.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Specialization</p>
                  <p className="text-sm text-muted-foreground">
                    {getRoleDisplayName(payment.therapist.user_role)}
                  </p>
                </div>
                {payment.therapist.email && (
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.therapist.email}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Payment ID</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground font-mono">
                    {payment.id.slice(0, 8)}...{payment.id.slice(-8)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(payment.id, 'Payment ID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {payment.stripe_payment_intent_id && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Stripe Payment ID</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground font-mono">
                      {payment.stripe_payment_intent_id.slice(0, 8)}...
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(payment.stripe_payment_intent_id!, 'Stripe Payment ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openStripeDashboard}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm font-medium">
                    {formatAmount(payment.amount, payment.currency)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.payment_method || 'Card'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Transaction Date</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(payment.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              {payment.status === 'completed' && onDownloadReceipt && (
                <Button
                  variant="outline"
                  onClick={() => onDownloadReceipt(payment)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              )}
            </div>
            
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
