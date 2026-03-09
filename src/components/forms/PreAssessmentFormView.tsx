import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BodyMap } from './BodyMap';
import type { PreAssessmentForm } from '@/lib/pre-assessment-service';
import { Calendar, User, Phone, Mail, MapPin, FileText, Activity } from 'lucide-react';

interface PreAssessmentFormViewProps {
  form: PreAssessmentForm;
}

export const PreAssessmentFormView: React.FC<PreAssessmentFormViewProps> = ({ form }) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold">Pre-Assessment Form</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Completed {form.completed_at ? new Date(form.completed_at).toLocaleString() : 'N/A'}
          </p>
        </div>
        <Badge variant={form.is_guest_booking ? 'outline' : 'default'} className="w-fit">
          {form.is_guest_booking ? 'Guest Booking' : 'Client Booking'}
        </Badge>
      </div>

      {/* Background Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            Background Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {form.name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm">{form.name}</p>
              </div>
            )}
            {form.date_of_birth && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="text-sm">{new Date(form.date_of_birth).toLocaleDateString()}</p>
              </div>
            )}
            {form.contact_email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </label>
                <p className="text-sm">{form.contact_email}</p>
              </div>
            )}
            {form.contact_phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </label>
                <p className="text-sm">{form.contact_phone}</p>
              </div>
            )}
            {form.gp_name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">GP Name</label>
                <p className="text-sm">{form.gp_name}</p>
              </div>
            )}
            {form.gp_address && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  GP Address
                </label>
                <p className="text-sm whitespace-pre-line">{form.gp_address}</p>
              </div>
            )}
            {form.current_medical_conditions && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Current Medical Conditions</label>
                <p className="text-sm whitespace-pre-line">{form.current_medical_conditions}</p>
              </div>
            )}
            {form.past_medical_history && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Past Medical History</label>
                <p className="text-sm whitespace-pre-line">{form.past_medical_history}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Details */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
          {form.area_of_body && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Area of Body</label>
              <p className="text-sm">{form.area_of_body}</p>
            </div>
          )}
          {form.time_scale && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Time Scale</label>
              <p className="text-sm">{form.time_scale.replace(/_/g, ' ')}</p>
            </div>
          )}
          {form.how_issue_began && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">How Issue Began</label>
              <p className="text-sm whitespace-pre-line">{form.how_issue_began}</p>
            </div>
          )}
          {form.activities_affected && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Activities Affected</label>
              <p className="text-sm whitespace-pre-line">{form.activities_affected}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Body Map */}
      {form.body_map_markers && form.body_map_markers.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Body Map
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {form.body_map_markers.length} marker(s) placed
            </p>
            <BodyMap
              markers={form.body_map_markers}
              onMarkersChange={() => {}} // Read-only
              maxMarkers={5}
              disabled={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
