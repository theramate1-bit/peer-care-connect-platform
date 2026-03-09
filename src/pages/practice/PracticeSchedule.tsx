import React, { useState, useEffect } from 'react';
import { BookingCalendar } from "@/components/BookingCalendar";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

const PracticeSchedule = () => {
  const { user } = useAuth();
  const [bookingSlug, setBookingSlug] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadBookingSlug();
    }
  }, [user?.id]);

  const loadBookingSlug = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('booking_slug')
        .eq('id', user?.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setBookingSlug(data?.booking_slug || '');
    } catch (err) {
      console.error('Error loading booking slug:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBookingLink = (): string => {
    if (!bookingSlug) return '';
    return `${window.location.origin}/book/${bookingSlug}`;
  };

  const handleCopyLink = async () => {
    const link = getBookingLink();
    if (!link) {
      toast.error('No booking link available');
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Booking link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-200 p-4 md:p-8 min-h-screen">
      {/* Booking Link Card */}
      {!loading && bookingSlug && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Your Booking Link
              </Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  value={getBookingLink()}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 sm:mr-0 mr-2" />
                      <span className="sm:hidden">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 sm:mr-0 mr-2" />
                      <span className="sm:hidden">Copy Link</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link to allow clients to book directly with you
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <BookingCalendar userType="therapist" />
    </div>
  );
};

export default PracticeSchedule;

