import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const BookingLinkManager: React.FC = () => {
  const { user } = useAuth();
  const [bookingSlug, setBookingSlug] = useState<string>('');
  const [originalSlug, setOriginalSlug] = useState<string>('');
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

      if (fetchError) throw fetchError;

      const slug = data?.booking_slug || '';
      setBookingSlug(slug);
      setOriginalSlug(slug);
    } catch (err) {
      console.error('Error loading booking slug:', err);
      toast.error('Failed to load booking link');
    } finally {
      setLoading(false);
    }
  };

  const getBookingLink = (): string => {
    const slug = bookingSlug || originalSlug;
    if (!slug) return '';
    return `${window.location.origin}/book/${slug}`;
  };

  const handleCopyLink = async () => {
    const link = getBookingLink();
    if (!link) {
      toast.error('No booking link available. Please save a slug first.');
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Direct Booking Link
        </CardTitle>
        <CardDescription>
          Share this link in your social media bio to allow clients to book directly with you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Booking Link */}
        {originalSlug && (
          <div className="space-y-2">
            <Label>Your Booking Link</Label>
            <div className="flex items-center gap-2">
              <Input
                value={getBookingLink()}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="icon"
                disabled={!originalSlug}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy this link and share it on your website, social media, or business cards
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

