import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  X, 
  Target, 
  Calendar,
  DollarSign,
  MapPin,
  MessageSquare,
  Users,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Therapist {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  specialization: string;
  hourly_rate: number;
  rating: number;
}

const ProjectCreator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: 0,
    start_date: '',
    end_date: '',
    goals: [''],
    success_metrics: [''],
    requirements: '',
    location_preference: 'in_person',
    scheduling_preference: 'flexible',
    therapist_id: '',
    communication_preference: 'email',
    additional_notes: ''
  });

  const totalSteps = 5;

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('is_active', true)
        .order('average_rating', { ascending: false });

      if (error) throw error;
      setTherapists(data || []);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      toast({
        title: "Error",
        description: "Failed to load therapists. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].map((item: any, i: number) => 
        i === index ? value : item
      )
    }));
  };

  const addArrayFieldItem = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field as keyof typeof prev], '']
    }));
  };

  const removeArrayFieldItem = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].filter((_: any, i: number) => i !== index)
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!formData.title || !formData.description || !formData.therapist_id) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Filter out empty goals and metrics
      const filteredGoals = formData.goals.filter(goal => goal.trim());
      const filteredMetrics = formData.success_metrics.filter(metric => metric.trim());

      if (filteredGoals.length === 0 || filteredMetrics.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one goal and success metric",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([{
          client_id: user?.id,
          title: formData.title,
          description: formData.description,
          budget: formData.budget,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          therapist_id: formData.therapist_id,
          goals: filteredGoals,
          success_metrics: filteredMetrics,
          requirements: formData.requirements,
          location_preference: formData.location_preference,
          scheduling_preference: formData.scheduling_preference,
          communication_preference: formData.communication_preference,
          additional_notes: formData.additional_notes,
          status: 'planning'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project created successfully!"
      });

      // Redirect to projects list
      navigate('/dashboard/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="e.g., Back Pain Treatment Plan"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Project Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe your therapy project and what you hope to achieve"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date (Optional)</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => handleInputChange('end_date', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Project Goals *</Label>
        <p className="text-sm text-muted-foreground">
          What specific outcomes do you want to achieve?
        </p>
        {formData.goals.map((goal, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={goal}
              onChange={(e) => handleArrayFieldChange('goals', index, e.target.value)}
              placeholder={`Goal ${index + 1}`}
            />
            {formData.goals.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeArrayFieldItem('goals', index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addArrayFieldItem('goals')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Success Metrics *</Label>
        <p className="text-sm text-muted-foreground">
          How will you measure the success of this project?
        </p>
        {formData.success_metrics.map((metric, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={metric}
              onChange={(e) => handleArrayFieldChange('success_metrics', index, e.target.value)}
              placeholder={`Metric ${index + 1}`}
            />
            {formData.success_metrics.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeArrayFieldItem('success_metrics', index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addArrayFieldItem('success_metrics')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Metric
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Specific Requirements</Label>
        <Textarea
          id="requirements"
          value={formData.requirements}
          onChange={(e) => handleInputChange('requirements', e.target.value)}
          placeholder="Any specific requirements, preferences, or constraints for this project"
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="budget">Budget (GBP) *</Label>
        <Input
          id="budget"
          type="number"
          value={formData.budget}
          onChange={(e) => handleInputChange('budget', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
        <p className="text-sm text-muted-foreground">
          Set your budget for this therapy project
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location_preference">Location Preference</Label>
        <Select
          value={formData.location_preference}
          onValueChange={(value) => handleInputChange('location_preference', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_person">In-Person Sessions</SelectItem>
            <SelectItem value="virtual">Virtual Sessions</SelectItem>
            <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduling_preference">Scheduling Preference</Label>
        <Select
          value={formData.scheduling_preference}
          onValueChange={(value) => handleInputChange('scheduling_preference', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flexible">Flexible Schedule</SelectItem>
            <SelectItem value="fixed">Fixed Weekly Schedule</SelectItem>
            <SelectItem value="intensive">Intensive (Multiple sessions/week)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="communication_preference">Communication Preference</Label>
        <Select
          value={formData.communication_preference}
          onValueChange={(value) => handleInputChange('communication_preference', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="in_app">In-App Messaging</SelectItem>
            <SelectItem value="video_call">Video Call</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Therapist Selection *</Label>
        <p className="text-sm text-muted-foreground">
          Choose a therapist for your project
        </p>
      </div>

      <div className="space-y-3">
        {therapists.map((therapist) => (
          <Card
            key={therapist.id}
            className={`cursor-pointer transition-colors ${
              formData.therapist_id === therapist.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
            }`}
            onClick={() => handleInputChange('therapist_id', therapist.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">
                      {therapist.first_name} {therapist.last_name}
                    </h4>
                    <Badge variant="outline">{therapist.specialization}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${therapist.hourly_rate}/hr
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {therapist.rating}/5
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {formData.therapist_id === therapist.id && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Selected
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {formData.therapist_id && (
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Selected Therapist</h4>
          {(() => {
            const selected = therapists.find(t => t.id === formData.therapist_id);
            return selected ? (
              <div className="flex items-center justify-between">
                <span>{selected.first_name} {selected.last_name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('therapist_id', '')}
                >
                  Change
                </Button>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="additional_notes">Additional Notes</Label>
        <Textarea
          id="additional_notes"
          value={formData.additional_notes}
          onChange={(e) => handleInputChange('additional_notes', e.target.value)}
          placeholder="Any additional information or special requests for your therapist"
          rows={4}
        />
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-3">Project Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Title:</span>
            <span className="font-medium">{formData.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Budget:</span>
            <span className="font-medium">${formData.budget}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Start Date:</span>
            <span className="font-medium">{formData.start_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Goals:</span>
            <span className="font-medium">{formData.goals.filter(g => g.trim()).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Therapist:</span>
            <span className="font-medium">
              {(() => {
                const selected = therapists.find(t => t.id === formData.therapist_id);
                return selected ? `${selected.first_name} ${selected.last_name}` : 'Not selected';
              })()}
            </span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Review your project details above. Click "Create Project" to submit.
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return "Basic Information";
      case 2:
        return "Goals & Requirements";
      case 3:
        return "Budget & Preferences";
      case 4:
        return "Choose Therapist";
      case 5:
        return "Review & Submit";
      default:
        return "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Create New Project</h1>
          <Badge variant="outline">Step {currentStep} of {totalSteps}</Badge>
        </div>
        
        <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{getStepTitle(currentStep)}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Project Setup</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentStep < totalSteps ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCreator;
