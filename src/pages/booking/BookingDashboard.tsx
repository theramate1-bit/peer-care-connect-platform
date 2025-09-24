import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { AvailabilityManager } from '@/components/booking/AvailabilityManager';
import { SessionManager } from '@/components/booking/SessionManager';
import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { Calendar, Clock, Settings, Users, TrendingUp, AlertCircle } from 'lucide-react';

const BookingDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const isTherapist = userProfile?.user_role === 'therapist';

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p>Please log in to access the booking dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Booking Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {isTherapist 
            ? 'Manage your availability and client sessions' 
            : 'Book sessions with therapists and manage your appointments'
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">£2,450</p>
                <p className="text-sm text-muted-foreground">Revenue This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isTherapist && <TabsTrigger value="availability">Availability</TabsTrigger>}
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Schedule
                </CardTitle>
                <CardDescription>
                  Your sessions and appointments for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SessionManager view="today" />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isTherapist ? (
                  <>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Set Availability
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      View Client List
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Book New Session
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      View Upcoming Sessions
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Find Therapists
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">New booking confirmed for tomorrow at 2:00 PM</span>
                  <Badge variant="secondary" className="ml-auto">2 min ago</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Session completed with Sarah Johnson</span>
                  <Badge variant="secondary" className="ml-auto">1 hour ago</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Payment received for session #1234</span>
                  <Badge variant="secondary" className="ml-auto">3 hours ago</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab (Therapists Only) */}
        {isTherapist && (
          <TabsContent value="availability">
            <AvailabilityManager />
          </TabsContent>
        )}

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Management
              </CardTitle>
              <CardDescription>
                {isTherapist 
                  ? 'Manage all your client sessions and appointments'
                  : 'View and manage your booked sessions'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionManager view="all" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar View
              </CardTitle>
              <CardDescription>
                {isTherapist 
                  ? 'View your schedule and manage appointments'
                  : 'Browse available time slots and book sessions'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTherapist ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Therapist Calendar View</p>
                  <p>Use the Sessions tab to manage your appointments</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Client Booking Calendar</p>
                  <p>Use the Find Therapists page to book new sessions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {isTherapist ? (
                  <>
                    <p>• <strong>Set Availability:</strong> Use the Availability tab to set your working hours and available time slots</p>
                    <p>• <strong>Manage Sessions:</strong> Use the Sessions tab to view, confirm, and manage client appointments</p>
                    <p>• <strong>Client Communication:</strong> Use the messaging system to communicate with clients about their sessions</p>
                    <p>• <strong>Payment Tracking:</strong> Monitor payment status and revenue in the Sessions tab</p>
                  </>
                ) : (
                  <>
                    <p>• <strong>Book Sessions:</strong> Use the Find Therapists page to discover and book sessions with therapists</p>
                    <p>• <strong>Manage Bookings:</strong> Use the Sessions tab to view and manage your upcoming appointments</p>
                    <p>• <strong>Communication:</strong> Use the messaging system to communicate with your therapists</p>
                    <p>• <strong>Payment:</strong> Complete payments to confirm your session bookings</p>
                  </>
                )}
                <p className="mt-3">For additional support, please contact our help desk or refer to the help documentation.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingDashboard;
