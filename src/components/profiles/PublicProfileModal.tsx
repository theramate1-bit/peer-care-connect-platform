import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { UnifiedBookingModal } from "@/components/booking/UnifiedBookingModal";
import { PublicPractitionerProfileContent } from "@/components/profiles/PublicPractitionerProfileContent";
import {
  PublicPractitionerProfile,
  fetchPublicPractitionerProfile,
} from "@/lib/public-practitioner-profile";

interface PublicProfileModalProps {
  therapistId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hideBookButton?: boolean; // Hide Book button for peer treatment exchange (uses Send Request instead)
  showCredits?: boolean; // Show credits instead of money prices (for peer treatment exchange)
}

export const PublicProfileModal = ({ therapistId, open, onOpenChange, hideBookButton = false, showCredits = false }: PublicProfileModalProps) => {
  const [therapist, setTherapist] = useState<PublicPractitionerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    if (open && therapistId) {
      fetchTherapist(therapistId);
    }
  }, [open, therapistId]);

  const fetchTherapist = async (id: string) => {
    try {
      setLoading(true);
      const data = await fetchPublicPractitionerProfile(id);
      setTherapist(data);
    } catch (error) {
      console.error('Error fetching therapist:', error);
      setTherapist(null);
    } finally {
      setLoading(false);
    }
  };
  if (!therapistId) return null;

  return (
    <>
      <style>{`
        .profile-modal-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .profile-modal-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .profile-modal-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .profile-modal-scrollbar::-webkit-scrollbar-thumb {
          background-color: #4b5563;
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden border-gray-100 dark:border-gray-700 rounded-3xl shadow-2xl bg-white dark:bg-gray-800 [&>button]:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900"></div>
            </div>
          ) : therapist ? (
            <div className="bg-white dark:bg-gray-800 flex flex-col max-h-[90vh]">
              <div className="flex items-start justify-end p-6 pb-2 shrink-0 border-b border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="overflow-y-auto p-6 pt-2 space-y-8 profile-modal-scrollbar">
                <PublicPractitionerProfileContent
                  profile={therapist}
                  showCredits={showCredits}
                  hideBookButton={hideBookButton}
                  onBook={() => setBookingModalOpen(true)}
                  compact
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p className="text-sm">Profile not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {therapist && (
        <UnifiedBookingModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          therapist={{
            id: therapist.id,
            first_name: therapist.first_name,
            last_name: therapist.last_name,
            user_role: therapist.user_role,
            bio: therapist.bio,
            location: therapist.location,
            experience_years: therapist.experience_years ?? undefined,
            specializations: therapist.specializations
          }}
          onBookingComplete={(sessionId) => {
            setBookingModalOpen(false);
          }}
        />
      )}
    </>
  );
};

