import { supabase } from '@/integrations/supabase/client';

export interface ProfessionalLicense {
  id: string;
  user_id: string;
  license_type: string;
  license_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string | null;
  license_document_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalQualification {
  id: string;
  user_id: string;
  qualification_name: string;
  institution: string;
  completion_date: string;
  certificate_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsurancePolicy {
  id: string;
  user_id: string;
  insurance_provider: string;
  policy_number: string;
  coverage_amount: number | null;
  expiry_date: string;
  policy_document_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackgroundCheck {
  id: string;
  user_id: string;
  check_type: string;
  check_provider: string;
  check_reference: string;
  check_date: string;
  expiry_date: string | null;
  result: 'clear' | 'consider' | 'unclear';
  document_url: string | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationStatus {
  user_role: string;
  is_fully_verified: boolean;
  missing_requirements: string[];
  verification_score: number;
}

export interface VerificationDashboardData {
  user_id: string;
  user_name: string;
  user_role: string;
  verification_status: string;
  verification_score: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  last_updated: string;
}

export class VerificationManager {
  /**
   * Check user's verification status
   */
  static async getVerificationStatus(userId: string): Promise<VerificationStatus | null> {
    try {
      const { data, error } = await supabase
        .rpc('check_verification_status', { p_user_id: userId });

      if (error) {
        console.error('Error getting verification status:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting verification status:', error);
      return null;
    }
  }

  /**
   * Get verification dashboard data for admins
   */
  static async getVerificationDashboard(
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<VerificationDashboardData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_verification_dashboard_data', {
          p_limit: limit,
          p_offset: offset,
          p_status: status || null
        });

      if (error) {
        console.error('Error getting verification dashboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting verification dashboard:', error);
      return [];
    }
  }

  /**
   * Upload professional license
   */
  static async uploadLicense(
    userId: string,
    licenseData: Omit<ProfessionalLicense, 'id' | 'user_id' | 'verification_status' | 'verified_by' | 'verified_at' | 'rejection_reason' | 'admin_notes' | 'created_at' | 'updated_at'>,
    documentFile?: File
  ): Promise<string> {
    try {
      let documentUrl = null;

      // Upload document if provided
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `licenses/${userId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, documentFile);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        documentUrl = urlData.publicUrl;
      }

      // Insert license record
      const { data, error } = await supabase
        .from('professional_licenses')
        .insert({
          user_id: userId,
          ...licenseData,
          license_document_url: documentUrl
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data.id;
    } catch (error) {
      console.error('Error uploading license:', error);
      throw error;
    }
  }

  /**
   * Upload professional qualification
   */
  static async uploadQualification(
    userId: string,
    qualificationData: Omit<ProfessionalQualification, 'id' | 'user_id' | 'verification_status' | 'verified_by' | 'verified_at' | 'rejection_reason' | 'created_at' | 'updated_at'>,
    certificateFile?: File
  ): Promise<string> {
    try {
      let certificateUrl = null;

      // Upload certificate if provided
      if (certificateFile) {
        const fileExt = certificateFile.name.split('.').pop();
        const fileName = `qualifications/${userId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, certificateFile);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        certificateUrl = urlData.publicUrl;
      }

      // Insert qualification record
      const { data, error } = await supabase
        .from('professional_qualifications')
        .insert({
          user_id: userId,
          ...qualificationData,
          certificate_url: certificateUrl
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data.id;
    } catch (error) {
      console.error('Error uploading qualification:', error);
      throw error;
    }
  }

  /**
   * Upload insurance policy
   */
  static async uploadInsurance(
    userId: string,
    insuranceData: Omit<InsurancePolicy, 'id' | 'user_id' | 'verification_status' | 'verified_by' | 'verified_at' | 'rejection_reason' | 'created_at' | 'updated_at'>,
    policyFile?: File
  ): Promise<string> {
    try {
      let policyUrl = null;

      // Upload policy document if provided
      if (policyFile) {
        const fileExt = policyFile.name.split('.').pop();
        const fileName = `insurance/${userId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, policyFile);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        policyUrl = urlData.publicUrl;
      }

      // Insert insurance record
      const { data, error } = await supabase
        .from('insurance_policies')
        .insert({
          user_id: userId,
          ...insuranceData,
          policy_document_url: policyUrl
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data.id;
    } catch (error) {
      console.error('Error uploading insurance:', error);
      throw error;
    }
  }

  /**
   * Upload background check
   */
  static async uploadBackgroundCheck(
    userId: string,
    checkData: Omit<BackgroundCheck, 'id' | 'user_id' | 'verification_status' | 'verified_by' | 'verified_at' | 'rejection_reason' | 'admin_notes' | 'created_at' | 'updated_at'>,
    documentFile?: File
  ): Promise<string> {
    try {
      let documentUrl = null;

      // Upload document if provided
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop();
        const fileName = `background-checks/${userId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, documentFile);

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        documentUrl = urlData.publicUrl;
      }

      // Insert background check record
      const { data, error } = await supabase
        .from('background_checks')
        .insert({
          user_id: userId,
          ...checkData,
          document_url: documentUrl
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data.id;
    } catch (error) {
      console.error('Error uploading background check:', error);
      throw error;
    }
  }

  /**
   * Get user's verification documents
   */
  static async getUserDocuments(userId: string): Promise<{
    licenses: ProfessionalLicense[];
    qualifications: ProfessionalQualification[];
    insurance: InsurancePolicy[];
    backgroundChecks: BackgroundCheck[];
  }> {
    try {
      const [licensesResult, qualificationsResult, insuranceResult, backgroundChecksResult] = await Promise.all([
        supabase.from('professional_licenses').select('*').eq('user_id', userId),
        supabase.from('professional_qualifications').select('*').eq('user_id', userId),
        supabase.from('insurance_policies').select('*').eq('user_id', userId),
        supabase.from('background_checks').select('*').eq('user_id', userId)
      ]);

      return {
        licenses: licensesResult.data || [],
        qualifications: qualificationsResult.data || [],
        insurance: insuranceResult.data || [],
        backgroundChecks: backgroundChecksResult.data || []
      };
    } catch (error) {
      console.error('Error getting user documents:', error);
      return {
        licenses: [],
        qualifications: [],
        insurance: [],
        backgroundChecks: []
      };
    }
  }

  /**
   * Approve verification document (admin only)
   */
  static async approveDocument(
    tableName: 'professional_licenses' | 'professional_qualifications' | 'insurance_policies' | 'background_checks',
    documentId: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({
          verification_status: 'approved',
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', documentId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error approving document:', error);
      throw error;
    }
  }

  /**
   * Reject verification document (admin only)
   */
  static async rejectDocument(
    tableName: 'professional_licenses' | 'professional_qualifications' | 'insurance_policies' | 'background_checks',
    documentId: string,
    rejectionReason: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({
          verification_status: 'rejected',
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null
        })
        .eq('id', documentId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      throw error;
    }
  }
}
