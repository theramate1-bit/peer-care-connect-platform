import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, MessageSquare, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  client_name: string;
}

export interface ReviewsModalPractitioner {
  id: string;
  first_name: string;
  last_name: string;
  average_rating?: number | null;
  total_reviews?: number | null;
}

interface ReviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practitioner: ReviewsModalPractitioner | null;
}

export function ReviewsModal({
  open,
  onOpenChange,
  practitioner,
}: ReviewsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !practitioner?.id) return;
    let cancelled = false;
    setLoading(true);
    setReviews([]);

    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("therapist_id", practitioner.id)
        .in("review_status", ["approved", "published"])
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setLoading(false);
        return;
      }

      setReviews(
        (data || []).map((r) => ({
          id: r.id,
          rating: r.overall_rating || 0,
          title: r.title || "",
          comment: r.comment || "",
          is_anonymous: r.is_anonymous,
          created_at: r.created_at,
          client_name: r.is_anonymous ? "Anonymous" : "Client",
        }))
      );
      setLoading(false);
    };

    fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [open, practitioner?.id]);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? "fill-amber-400 text-amber-400"
            : "text-gray-200"
        }`}
      />
    ));

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const name =
    practitioner?.first_name && practitioner?.last_name
      ? `${practitioner.first_name} ${practitioner.last_name}`
      : "Practitioner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 gap-0 border-gray-200 bg-white shadow-xl rounded-2xl overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
          <DialogTitle className="text-lg font-semibold text-gray-900 pr-8">
            Reviews for {name}
          </DialogTitle>
          {/* Use fetched reviews so header and list never disagree (e.g. pending vs published) */}
          {!loading && reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="flex items-center gap-0.5" aria-hidden>
                {renderStars(
                  reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
                )}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {(
                  reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
                ).toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">
                · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Loading reviews…
            </p>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">No reviews yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Be the first to leave a review after a session.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="flex gap-3 py-3 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <Avatar className="h-9 w-9 rounded-full flex-shrink-0 border border-gray-100">
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                      {review.is_anonymous ? (
                        <UserIcon className="h-4 w-4" />
                      ) : (
                        review.client_name.charAt(0)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {review.client_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {renderStars(review.rating)}
                    </div>
                    {review.title && (
                      <p className="text-sm font-medium text-gray-800 mt-1.5">
                        {review.title}
                      </p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
