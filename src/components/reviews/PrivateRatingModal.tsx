import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, StarOff, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PrivateRatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  therapistId: string;
  clientId: string;
  therapistName?: string;
  onSubmitted?: () => void;
}

export const PrivateRatingModal: React.FC<PrivateRatingModalProps> = ({
  open,
  onOpenChange,
  sessionId,
  therapistId,
  clientId,
  therapistName,
  onSubmitted,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const renderStars = (value: number, onChange: (v: number) => void) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="focus:outline-none">
          {i <= value ? (
            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarOff className="w-6 h-6 text-gray-300 hover:text-yellow-400" />
          )}
        </button>
      ))}
    </div>
  );

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: 'Rating required', description: 'Please provide a star rating.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // First, check if a rating already exists for this session
      const { data: existingRating, error: checkError } = await supabase
        .from('practitioner_ratings')
        .select('id')
        .eq('session_id', sessionId)
        .eq('client_id', clientId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing rating:', checkError);
      }

      // Use upsert to insert or update rating (unique constraint ensures one rating per session per client)
      const isUpdate = !!existingRating;
      const { error } = await supabase
        .from('practitioner_ratings')
        .upsert({
          session_id: sessionId,
          client_id: clientId,
          practitioner_id: therapistId,
          rating: rating,
          review_text: comments || null,
          status: 'active',
        }, {
          onConflict: 'session_id,client_id',
          ignoreDuplicates: false
        });

      if (error) {
        // If table missing or other error, write to session_feedback as private fallback
        if ((error.message || '').includes('does not exist') || error.code === 'PGRST116') {
          // Check if feedback already exists
          const { data: existingFeedback } = await supabase
            .from('session_feedback')
            .select('id')
            .eq('session_id', sessionId)
            .eq('client_id', clientId)
            .maybeSingle();

          if (existingFeedback) {
            const { error: fbUpdateError } = await supabase
              .from('session_feedback')
              .update({
                rating,
                comments,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingFeedback.id);

            if (fbUpdateError) {
              console.error('Fallback session_feedback update error:', fbUpdateError);
              throw fbUpdateError;
            }
          } else {
            const { error: fbError } = await supabase.from('session_feedback').insert({
              session_id: sessionId,
              client_id: clientId,
              therapist_id: therapistId,
              rating,
              comments,
              is_public: false,
              created_at: new Date().toISOString(),
            });
            if (fbError) {
              console.error('Fallback session_feedback error:', fbError);
              throw fbError;
            }
          }
        } else {
          console.error('practitioner_ratings error:', error);
          throw error;
        }
      }

      toast({ 
        title: isUpdate ? 'Rating updated' : 'Rating submitted', 
        description: isUpdate 
          ? 'Your rating has been updated successfully.' 
          : 'Thank you for your rating! It will be visible on the marketplace.' 
      });
      onSubmitted?.();
      onOpenChange(false);
      // Reset form
      setRating(0);
      setComments('');
    } catch (e: any) {
      console.error('Private rating error:', e);
      toast({ title: 'Error', description: 'Could not submit feedback. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex items-start justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Rate Your Session</CardTitle>
            <p className="text-sm text-muted-foreground">Your rating will be visible on the marketplace to help others choose.</p>
            {therapistName && (
              <p className="text-sm mt-1">For: {therapistName}</p>
            )}
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Overall Rating *</Label>
            {renderStars(rating, setRating)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="comments">Comments (optional)</Label>
            <Textarea id="comments" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Share any private feedback about your session" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting || rating === 0}>{submitting ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivateRatingModal;


