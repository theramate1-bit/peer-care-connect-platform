import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export const BookingCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Booking Cancelled</CardTitle>
          <p className="text-muted-foreground">Your payment was not processed</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            No charges were made to your account. You can try booking again or browse other services.
          </p>

          <div className="flex gap-3">
            <Button onClick={() => navigate(-1)} className="flex-1">
              Try Again
            </Button>
            <Button onClick={() => navigate('/marketplace')} variant="outline" className="flex-1">
              Browse Services
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
