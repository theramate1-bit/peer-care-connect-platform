import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Download, 
  Eye, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { PaymentsService, Payment } from '@/lib/database';
// import { StripePaymentService } from '@/lib/stripe'; // TEMPORARILY DISABLED
import { PDFReceiptGenerator } from '@/lib/pdf-generator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PaymentDetailsModal } from './PaymentDetailsModal';
import { supabase } from '@/integrations/supabase/client';

interface PaymentHistoryProps {
  className?: string;
}

interface PaymentWithDetails extends Payment {
  session?: {
    id: string;
    session_date: string;
    session_time: string;
    duration: number;
    status: string;
  };
  therapist?: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
  };
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      
      // Get payments from database
      const userPayments = await PaymentsService.getPayments(user?.id || '');
      
      if (userPayments.length === 0) {
        setPayments([]);
        return;
      }

      // Fetch session and therapist details for each payment
      const paymentsWithDetails = await Promise.all(
        userPayments.map(async (payment) => {
          // Fetch session details
          const { data: session } = await supabase
            .from('client_sessions')
            .select('id, session_date, session_time, duration, status')
            .eq('id', payment.session_id)
            .single();

          // Fetch therapist details
          const { data: therapist } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_role')
            .eq('id', payment.therapist_id)
            .single();

          return {
            ...payment,
            session: session || undefined,
            therapist: therapist || undefined
          };
        })
      );

      setPayments(paymentsWithDetails);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({
        title: "Error",
        description: "Failed to load payment history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
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
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownloadReceipt = async (payment: PaymentWithDetails) => {
    try {
      if (payment.receipt_url) {
        // Open receipt URL in new tab
        window.open(payment.receipt_url, '_blank');
      } else {
        // Generate receipt if not available
        toast({
          title: "Generating Receipt",
          description: "Please wait while we generate your receipt..."
        });
        
        // Create receipt data
        const receiptData = PDFReceiptGenerator.createReceiptData(
          payment.session || {},
          payment,
          user?.user_metadata || {},
          payment.therapist || {}
        );
        
        // Generate and download PDF
        await PDFReceiptGenerator.downloadReceipt(
          receiptData,
          `receipt-${payment.id.slice(0, 8)}.pdf`,
          {
            includeLogo: true,
            includeQRCode: true,
            includeTerms: true,
            watermark: 'TheraMate'
          }
        );
        
        toast({
          title: "Receipt Generated",
          description: "Your receipt has been downloaded successfully."
        });
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (payment: PaymentWithDetails) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
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

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment History
          </CardTitle>
          <CardDescription>Your payment records and receipts</CardDescription>
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
          <CreditCard className="h-5 w-5 text-primary" />
          Payment History
        </CardTitle>
        <CardDescription>Your payment records and receipts</CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <h3 className="font-medium">
                        {payment.therapist ? 
                          `${payment.therapist.first_name} ${payment.therapist.last_name}` : 
                          'Unknown Therapist'
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {payment.therapist ? getRoleDisplayName(payment.therapist.user_role) : 'Therapist'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatAmount(payment.amount, payment.currency)}
                    </p>
                    <Badge className={`text-xs ${getStatusColor(payment.status)}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                {payment.session && (
                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(payment.session.session_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(payment.session.session_time)}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Payment ID: {payment.id.slice(0, 8)}...
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(payment)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {payment.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payment)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Payment History</h3>
            <p className="text-sm text-muted-foreground">
              You haven't made any payments yet. Book a session to see your payment history here.
            </p>
          </div>
        )}
      </CardContent>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        payment={selectedPayment}
        isOpen={showPaymentModal}
        onClose={handleCloseModal}
        onDownloadReceipt={handleDownloadReceipt}
      />
    </Card>
  );
};
