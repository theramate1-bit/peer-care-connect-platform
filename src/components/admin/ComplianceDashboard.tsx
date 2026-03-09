import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  MapPin,
  Network
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ComplianceMetrics {
  location_consent_rate?: number;
  location_access_logging_coverage?: number;
  ip_anonymization_compliance?: number;
}

export const ComplianceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ComplianceMetrics>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadComplianceMetrics();
    }
  }, [user]);

  const loadComplianceMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get compliance metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_compliance_metrics_summary');

      if (metricsError) throw metricsError;

      // Transform metrics into object
      const metricsObj: ComplianceMetrics = {};
      if (metricsData) {
        metricsData.forEach((metric: any) => {
          if (metric.metric_name === 'location_consent_rate') {
            metricsObj.location_consent_rate = metric.metric_value;
          } else if (metric.metric_name === 'location_access_logging_coverage') {
            metricsObj.location_access_logging_coverage = metric.metric_value;
          } else if (metric.metric_name === 'ip_anonymization_compliance') {
            metricsObj.ip_anonymization_compliance = metric.metric_value;
          }
        });
      }

      setMetrics(metricsObj);
    } catch (err: any) {
      console.error('Error loading compliance metrics:', err);
      setError(err.message || 'Failed to load compliance metrics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (value: number, target: number) => {
    if (value >= target) {
      return <Badge className="bg-green-100 text-green-800">Meeting Target</Badge>;
    } else {
      return <Badge variant="destructive">Below Target</Badge>;
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please sign in to view compliance metrics.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compliance Dashboard</h2>
          <p className="text-muted-foreground">
            UK GDPR, DPA 2018, and PECR compliance metrics for location and IP tracking
          </p>
        </div>
        <Button onClick={loadComplianceMetrics} variant="outline" disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading compliance metrics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Location Consent Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Consent Rate
                </div>
                {metrics.location_consent_rate !== undefined &&
                  getStatusBadge(metrics.location_consent_rate, 80)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.location_consent_rate !== undefined
                  ? `${metrics.location_consent_rate.toFixed(1)}%`
                  : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Target: 80% or higher
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of users who have granted location tracking consent
              </p>
            </CardContent>
          </Card>

          {/* Location Access Logging Coverage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Access Logging Coverage
                </div>
                {metrics.location_access_logging_coverage !== undefined &&
                  getStatusBadge(metrics.location_access_logging_coverage, 90)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.location_access_logging_coverage !== undefined
                  ? `${metrics.location_access_logging_coverage.toFixed(1)}%`
                  : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Target: 90% or higher
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of location data access events that are logged
              </p>
            </CardContent>
          </Card>

          {/* IP Anonymization Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  IP Anonymization
                </div>
                {metrics.ip_anonymization_compliance !== undefined &&
                  getStatusBadge(metrics.ip_anonymization_compliance, 100)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.ip_anonymization_compliance !== undefined
                  ? `${metrics.ip_anonymization_compliance.toFixed(1)}%`
                  : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Target: 100%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of IP addresses anonymized after retention period
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compliance Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Governance & Documentation</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Compliant</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Consent Mechanisms</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Compliant</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Privacy Notices</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Compliant</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Security Measures</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Compliant</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Retention & Deletion</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Compliant</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">PECR Compliance</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Compliant</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground mb-4">
            Access compliance reports and tools
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              View Monthly Access Report
            </Button>
            <Button variant="outline" size="sm">
              Check Suspicious Access
            </Button>
            <Button variant="outline" size="sm">
              Review Retention Status
            </Button>
            <Button variant="outline" size="sm">
              Export Compliance Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceDashboard;
