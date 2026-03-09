import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, CheckCircle, Clock, FileText, MapPin, Shield } from "lucide-react";
import { generateMapsUrl } from "@/emails/utils/maps";
import { canBookClinic, canRequestMobile } from "@/lib/booking-flow-type";
import {
  PublicPractitionerProfile,
  formatProfessionalBody,
  formatQualificationType,
  formatRoleDisplayName,
  getPublicLocationDisplay,
} from "@/lib/public-practitioner-profile";
import { getServiceLabel } from "@/lib/service-defaults";

interface PublicPractitionerProfileContentProps {
  profile: PublicPractitionerProfile;
  showCredits?: boolean;
  hideBookButton?: boolean;
  onBook?: () => void;
  compact?: boolean;
}

export const PublicPractitionerProfileContent = ({
  profile,
  showCredits = false,
  hideBookButton = false,
  onBook,
  compact = false,
}: PublicPractitionerProfileContentProps) => {
  const locationDisplay = getPublicLocationDisplay(profile);
  const getDocumentDisplayName = (fileName: string) => fileName.replace(/\.[^.]+$/, "");

  const products = profile.products.filter((p) => p.is_active);
  const canClinicBook = canBookClinic({
    therapist_type: profile.therapist_type ?? null,
    mobile_service_radius_km: profile.mobile_service_radius_km ?? null,
    base_latitude: profile.base_latitude ?? null,
    base_longitude: profile.base_longitude ?? null,
    products,
  });
  const canMobileRequest = canRequestMobile({
    therapist_type: profile.therapist_type ?? null,
    mobile_service_radius_km: profile.mobile_service_radius_km ?? null,
    base_latitude: profile.base_latitude ?? null,
    base_longitude: profile.base_longitude ?? null,
    products,
  });
  const servicesFallback = products.length === 0 ? (profile.services_offered ?? []) : [];
  const hasServicesSection = products.length > 0 || servicesFallback.length > 0;

  const professionalBody = formatProfessionalBody(profile.professional_body, profile.professional_body_other);
  const qualifications = profile.qualifications ?? [];
  const hasQualificationRows = qualifications.length > 0;
  const legacyQualification = !hasQualificationRows
    ? formatQualificationType(profile.qualification_type)
    : null;
  const hasRegistrationSection = !!professionalBody || !!profile.registration_number;
  const hasQualificationSection = hasQualificationRows || !!legacyQualification;
  const hasQualificationDocuments = profile.qualificationDocuments.length > 0;

  return (
    <div className="space-y-8">
      <section className={compact ? "space-y-4" : "space-y-5"}>
        <div className="flex items-start gap-4">
          <Avatar className={compact ? "h-16 w-16" : "h-20 w-20"}>
            <AvatarImage src={profile.profile_photo_url || undefined} />
            <AvatarFallback className="text-xl">
              {profile.first_name?.[0] || ""}
              {profile.last_name?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className={compact ? "text-xl font-bold" : "text-2xl font-bold"}>
              {profile.first_name} {profile.last_name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200">
                {formatRoleDisplayName(profile.user_role)}
              </span>
              {profile.experience_years != null && (
                <span className="inline-flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-1" />
                  {profile.experience_years} years of experience
                </span>
              )}
              {locationDisplay.summary && (
                <span className="inline-flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-1" />
                  {locationDisplay.mapAddress ? (
                    <a
                      href={generateMapsUrl(locationDisplay.mapAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {locationDisplay.summary}
                    </a>
                  ) : (
                    locationDisplay.summary
                  )}
                </span>
              )}
              {profile.has_liability_insurance && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Liability Insured
                </Badge>
              )}
            </div>
          </div>
        </div>
      </section>

      {hasServicesSection && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide">Pricing / Services</h3>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{product.name}</p>
                    <span className="text-xs font-semibold bg-gray-900 text-white rounded-full px-2 py-0.5 whitespace-nowrap">
                      £{(product.price_amount / 100).toFixed(2)}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-1">{product.description}</p>
                  )}
                  {product.duration_minutes != null && (
                    <p className="text-xs text-muted-foreground mt-2">{product.duration_minutes} minutes</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {servicesFallback.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                >
                  {getServiceLabel(service)}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {profile.bio && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">About / Bio</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
        </section>
      )}

      {(hasRegistrationSection || hasQualificationSection || hasQualificationDocuments) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-wide">Registration & Qualifications</h3>
          </div>

          {hasRegistrationSection && (
            <div className="space-y-2">
              {professionalBody && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Professional Body</p>
                  <p className="text-sm font-medium">{professionalBody}</p>
                </div>
              )}
              {profile.registration_number && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registration Number</p>
                  <p className="text-sm font-medium font-mono">{profile.registration_number}</p>
                </div>
              )}
            </div>
          )}

          {hasQualificationSection && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qualifications</p>
              {hasQualificationRows ? (
                <div className="space-y-2">
                  {qualifications.map((qualification) => (
                    <div key={qualification.id} className="rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{qualification.name}</p>
                        {qualification.verified === true && (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      {(qualification.institution || qualification.year_obtained) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {[qualification.institution, qualification.year_obtained].filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                legacyQualification && <p className="text-sm">{legacyQualification}</p>
              )}
            </div>
          )}
          {hasQualificationDocuments && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qualification Documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.qualificationDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{getDocumentDisplayName(doc.file_name)}</p>
                      </div>
                    </div>

                    {(doc.file_type?.toLowerCase().includes("pdf") ||
                      doc.file_name.toLowerCase().endsWith(".pdf")) && (
                      <iframe
                        src={`${doc.file_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                        title={`Preview ${doc.file_name}`}
                        className="w-full h-72 rounded-lg border border-gray-200"
                        loading="lazy"
                      />
                    )}

                    {((doc.file_type?.toLowerCase().startsWith("image/") ?? false) ||
                      /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(doc.file_name)) && (
                      <img
                        src={doc.file_url}
                        alt={doc.file_name}
                        className="w-full h-72 object-contain rounded-lg border border-gray-200 bg-gray-50"
                        loading="lazy"
                      />
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {!hideBookButton && onBook && (
        <section>
          <Button className="w-full" size="lg" onClick={onBook}>
            <Calendar className="h-4 w-4 mr-2" />
            {canClinicBook && canMobileRequest
              ? "Choose Booking Type"
              : canMobileRequest
                ? "Request Mobile Session"
                : "Book at Clinic"}
          </Button>
        </section>
      )}
    </div>
  );
};
