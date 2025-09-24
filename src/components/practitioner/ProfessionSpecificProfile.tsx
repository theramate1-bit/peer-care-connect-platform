import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, Award, Shield } from 'lucide-react';

interface ProfessionSpecificProfileProps {
  practitioner: {
    id: string;
    user_role: string;
    professional_body?: string;
    membership_number?: string;
    registration_number?: string;
    qualification_type?: string;
    qualification_expiry?: string;
    itmmif_status?: boolean;
    atmmif_status?: boolean;
    pitch_side_trauma?: boolean;
    goc_registration?: boolean;
    cnhc_registration?: boolean;
  };
}

export function ProfessionSpecificProfile({ practitioner }: ProfessionSpecificProfileProps) {
  const getProfessionSpecificInfo = () => {
    switch (practitioner.user_role) {
      case 'sports_therapist':
        return {
          title: 'Sports Therapy Qualifications',
          qualifications: [
            { name: 'ITMMIF Status', status: practitioner.itmmif_status, icon: <Award className="h-4 w-4" /> },
            { name: 'ATMMIF Status', status: practitioner.atmmif_status, icon: <Award className="h-4 w-4" /> },
            { name: 'Pitch-Side Trauma Training', status: practitioner.pitch_side_trauma, icon: <Shield className="h-4 w-4" /> },
          ],
          professionalBodies: ['SST', 'BASRaT', 'CSP']
        };
      case 'osteopath':
        return {
          title: 'Osteopathic Qualifications',
          qualifications: [
            { name: 'GOC Registration', status: practitioner.goc_registration, icon: <Shield className="h-4 w-4" /> },
          ],
          professionalBodies: ['GOC', 'BOA', 'Institute of Osteopathy']
        };
      case 'massage_therapist':
        return {
          title: 'Massage Therapy Qualifications',
          qualifications: [
            { name: 'CNHC Registration', status: practitioner.cnhc_registration, icon: <Shield className="h-4 w-4" /> },
          ],
          professionalBodies: ['CNHC', 'FHT', 'Massage Therapy Institute']
        };
      default:
        return {
          title: 'Professional Qualifications',
          qualifications: [],
          professionalBodies: []
        };
    }
  };

  const professionInfo = getProfessionSpecificInfo();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          {professionInfo.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Professional Body */}
        {practitioner.professional_body && (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium">Professional Body:</span>
            <Badge variant="outline">{practitioner.professional_body}</Badge>
          </div>
        )}

        {/* Membership Number */}
        {practitioner.membership_number && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Membership Number:</span>
            <span className="text-sm text-gray-600">{practitioner.membership_number}</span>
          </div>
        )}

        {/* Registration Number */}
        {practitioner.registration_number && (
          <div className="flex items-center gap-2">
            <span className="font-medium">Registration Number:</span>
            <span className="text-sm text-gray-600">{practitioner.registration_number}</span>
          </div>
        )}

        {/* Qualification Type */}
        {practitioner.qualification_type && (
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-green-600" />
            <span className="font-medium">Qualification:</span>
            <span className="text-sm text-gray-600">{practitioner.qualification_type}</span>
          </div>
        )}

        {/* Qualification Expiry */}
        {practitioner.qualification_expiry && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-600" />
            <span className="font-medium">Qualification Expiry:</span>
            <span className="text-sm text-gray-600">{practitioner.qualification_expiry}</span>
          </div>
        )}

        {/* Profession-Specific Qualifications */}
        {professionInfo.qualifications.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Specialized Qualifications:</h4>
            <div className="grid grid-cols-1 gap-2">
              {professionInfo.qualifications.map((qual, index) => (
                <div key={index} className="flex items-center gap-2">
                  {qual.icon}
                  <span className="text-sm">{qual.name}:</span>
                  {qual.status ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professional Bodies Info */}
        <div className="pt-2 border-t">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Relevant Professional Bodies:</h4>
          <div className="flex flex-wrap gap-1">
            {professionInfo.professionalBodies.map((body, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {body}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
