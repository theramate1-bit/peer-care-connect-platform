import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, CheckCircle } from 'lucide-react';

interface CPDCourse {
  id: string;
  title: string;
  description: string;
  duration_hours: number;
  course_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface CPDEnrollment {
  id: string;
  course_id: string;
  practitioner_id: string;
  enrollment_date: string;
  status: string;
  completion_date?: string;
  certificate_issued: boolean;
}

interface CPDCoursesProps {
  courses: CPDCourse[];
  enrollments: CPDEnrollment[];
  onEnroll?: (courseId: string) => void;
}

export function CPDCourses({ courses, enrollments, onEnroll }: CPDCoursesProps) {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const getEnrollmentStatus = (courseId: string) => {
    const enrollment = enrollments.find(e => e.course_id === courseId);
    return enrollment;
  };

  const handleEnroll = async (courseId: string) => {
    if (onEnroll) {
      await onEnroll(courseId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <Badge variant="default">Enrolled</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          CPD Courses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {courses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No CPD courses available at the moment.
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => {
              const enrollment = getEnrollmentStatus(course.id);
              const isEnrolled = enrollment && enrollment.status === 'enrolled';
              const isCompleted = enrollment && enrollment.status === 'completed';

              return (
                <div key={course.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    {enrollment && getStatusBadge(enrollment.status)}
                  </div>
                  
                  <p className="text-gray-600 mb-3">{course.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.duration_hours} hours
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(course.start_date).toLocaleDateString()} - {new Date(course.end_date).toLocaleDateString()}
                    </div>
                    <Badge variant="outline">{course.course_type}</Badge>
                  </div>

                  {enrollment && (
                    <div className="mb-3 p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 text-sm">
                        <span>Enrolled:</span>
                        <span>{new Date(enrollment.enrollment_date).toLocaleDateString()}</span>
                        {enrollment.completion_date && (
                          <>
                            <span>•</span>
                            <span>Completed:</span>
                            <span>{new Date(enrollment.completion_date).toLocaleDateString()}</span>
                          </>
                        )}
                        {enrollment.certificate_issued && (
                          <>
                            <span>•</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Certificate Issued</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {!enrollment && course.status === 'published' && (
                    <Button
                      onClick={() => handleEnroll(course.id)}
                      className="w-full"
                    >
                      Enroll in Course
                    </Button>
                  )}

                  {isEnrolled && (
                    <div className="text-center text-sm text-gray-600">
                      You are enrolled in this course
                    </div>
                  )}

                  {isCompleted && (
                    <div className="text-center text-sm text-green-600">
                      Course completed successfully!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
