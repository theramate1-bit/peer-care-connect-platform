import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  User, 
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Shield,
  Award,
  CreditCard,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { VerificationManager, VerificationDashboardData } from '@/lib/verification';
import { toast } from 'sonner';

export const RealVerificationDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<VerificationDashboardData[]>([]);
  const [selectedUser, setSelectedUser] = useState<VerificationDashboardData | null>(null);
  const [userDocuments, setUserDocuments] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [filterStatus]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const data = await VerificationManager.getVerificationDashboard(100, 0, status);
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDocuments = async (userId: string) => {
    try {
      const documents = await VerificationManager.getUserDocuments(userId);
      setUserDocuments(documents);
    } catch (error) {
      console.error('Error loading user documents:', error);
      toast.error('Failed to load user documents');
    }
  };

  const handleApproveDocument = async (tableName: string, documentId: string) => {
    try {
      await VerificationManager.approveDocument(
        tableName as any,
        documentId,
        adminNotes || undefined
      );
      toast.success('Document approved successfully');
      if (selectedUser) {
        await loadUserDocuments(selectedUser.user_id);
      }
      await loadDashboardData();
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error('Failed to approve document');
    }
  };

  const handleRejectDocument = async (tableName: string, documentId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await VerificationManager.rejectDocument(
        tableName as any,
        documentId,
        rejectionReason,
        adminNotes || undefined
      );
      toast.success('Document rejected');
      setRejectionReason('');
      if (selectedUser) {
        await loadUserDocuments(selectedUser.user_id);
      }
      await loadDashboardData();
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Failed to reject document');
    }
  };

  const filteredData = dashboardData.filter(user =>
    user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'not_started':
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="h-3 w-3 mr-1" />Not Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVerificationScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading verification data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Verification Dashboard</h1>
          <p className="text-muted-foreground">Review and approve professional credentials</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{dashboardData.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData.filter(u => u.verification_status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {dashboardData.filter(u => u.verification_status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Not Started</p>
                <p className="text-2xl font-bold text-gray-600">
                  {dashboardData.filter(u => u.verification_status === 'not_started').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Verification Queue</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Status</option>
                    <option value="not_started">Not Started</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  filteredData.map((user) => (
                    <div
                      key={user.user_id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedUser?.user_id === user.user_id ? 'bg-primary/10 border-primary/20' : ''
                      }`}
                      onClick={() => {
                        setSelectedUser(user);
                        loadUserDocuments(user.user_id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {user.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{user.user_name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{user.user_role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(user.verification_status)}
                          <span className={`text-sm font-medium ${getVerificationScoreColor(user.verification_score)}`}>
                            {user.verification_score}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Pending: {user.pending_count}</span>
                        <span>Approved: {user.approved_count}</span>
                        <span>Rejected: {user.rejected_count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Details */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <Card>
              <CardHeader>
                <CardTitle>User Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedUser.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{selectedUser.user_name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{selectedUser.user_role}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Verification Score:</span>
                    <span className={`font-medium ${getVerificationScoreColor(selectedUser.verification_score)}`}>
                      {selectedUser.verification_score}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedUser.verification_status)}
                  </div>
                </div>

                {userDocuments && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Documents</h4>
                    
                    {/* Licenses */}
                    {userDocuments.licenses.map((license: any) => (
                      <div key={license.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">{license.license_type}</span>
                          </div>
                          <Badge variant={license.verification_status === 'approved' ? 'default' : 'secondary'}>
                            {license.verification_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {license.issuing_authority} • {license.license_number}
                        </p>
                        {license.verification_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveDocument('professional_licenses', license.id)}
                              className="text-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDocument('professional_licenses', license.id)}
                              className="text-xs"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Insurance */}
                    {userDocuments.insurance.map((policy: any) => (
                      <div key={policy.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span className="text-sm font-medium">{policy.insurance_provider}</span>
                          </div>
                          <Badge variant={policy.verification_status === 'approved' ? 'default' : 'secondary'}>
                            {policy.verification_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Policy: {policy.policy_number} • Expires: {new Date(policy.expiry_date).toLocaleDateString()}
                        </p>
                        {policy.verification_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveDocument('insurance_policies', policy.id)}
                              className="text-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDocument('insurance_policies', policy.id)}
                              className="text-xs"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Background Checks */}
                    {userDocuments.backgroundChecks.map((check: any) => (
                      <div key={check.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm font-medium">{check.check_type}</span>
                          </div>
                          <Badge variant={check.verification_status === 'approved' ? 'default' : 'secondary'}>
                            {check.verification_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {check.check_provider} • Result: {check.result}
                        </p>
                        {check.verification_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveDocument('background_checks', check.id)}
                              className="text-xs"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDocument('background_checks', check.id)}
                              className="text-xs"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin Notes */}
                <div className="space-y-2">
                  <Label htmlFor="admin-notes">Admin Notes</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Add notes about this user..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Rejection Reason */}
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a user to view their verification details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
