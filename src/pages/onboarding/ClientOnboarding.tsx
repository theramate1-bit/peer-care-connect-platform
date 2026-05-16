import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Heart,
  Calendar,
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

/** Canonical legal pages (must match mobile APP_CONFIG / website). */
const LEGAL_TERMS_URL = "https://theramate.co.uk/terms";
const LEGAL_PRIVACY_URL = "https://theramate.co.uk/privacy";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "personal",
    title: "Personal Information",
    description: "Tell us about yourself and your therapy goals",
    icon: <User className="h-6 w-6" />,
  },
  {
    id: "health",
    title: "Health Background",
    description: "Share relevant health information for better care",
    icon: <Heart className="h-6 w-6" />,
  },
  {
    id: "preferences",
    title: "Therapy Preferences",
    description: "Choose your preferred therapy types and scheduling",
    icon: <Calendar className="h-6 w-6" />,
  },
  {
    id: "goals",
    title: "Goals & Objectives",
    description: "Define what you want to achieve through therapy",
    icon: <Target className="h-6 w-6" />,
  },
  {
    id: "complete",
    title: "Complete Setup",
    description: "Review and finalize your profile",
    icon: <CheckCircle className="h-6 w-6" />,
  },
];

const ClientOnboarding: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",

    // Health Background
    medicalConditions: "",
    medications: "",
    allergies: "",
    previousTherapy: "",

    // Preferences
    preferredTherapyTypes: [] as string[],
    preferredGender: "",
    preferredLocation: "",
    preferredTime: "",
    maxTravelDistance: "",

    // Goals
    primaryGoal: "",
    secondaryGoals: [] as string[],
    timeline: "",
    budget: "",

    // Terms
    acceptTerms: false,
    acceptPrivacy: false,
    allowMarketing: false,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayChange = (
    field: string,
    value: string,
    checked: boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(
            (item) => item !== value,
          ),
    }));
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Update user profile in users table
      const { error } = await supabase
        .from("users")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          phone: formData.phone,
          emergency_contact: formData.emergencyContact,
          emergency_phone: formData.emergencyPhone,
          medical_conditions: formData.medicalConditions,
          medications: formData.medications,
          allergies: formData.allergies,
          previous_therapy: formData.previousTherapy,
          preferred_therapy_types: formData.preferredTherapyTypes,
          preferred_gender: formData.preferredGender,
          preferred_location: formData.preferredLocation,
          preferred_time: formData.preferredTime,
          max_travel_distance: formData.maxTravelDistance,
          primary_goal: formData.primaryGoal,
          secondary_goals: formData.secondaryGoals,
          timeline: formData.timeline,
          budget: formData.budget,
          onboarding_completed: true,
          onboarding_date: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Onboarding Complete!",
        description: "Welcome to Theramate. Your profile is now set up.",
      });

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Error",
        description:
          "There was an error completing your onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Personal Information
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    handleInputChange("dateOfBirth", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    handleInputChange("emergencyContact", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    handleInputChange("emergencyPhone", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        );

      case 1: // Health Background
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medicalConditions">Medical Conditions</Label>
              <Textarea
                id="medicalConditions"
                placeholder="Please list any relevant medical conditions..."
                value={formData.medicalConditions}
                onChange={(e) =>
                  handleInputChange("medicalConditions", e.target.value)
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medications">Current Medications</Label>
              <Textarea
                id="medications"
                placeholder="List any medications you're currently taking..."
                value={formData.medications}
                onChange={(e) =>
                  handleInputChange("medications", e.target.value)
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                placeholder="Any allergies we should know about?"
                value={formData.allergies}
                onChange={(e) => handleInputChange("allergies", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousTherapy">
                Previous Therapy Experience
              </Label>
              <Textarea
                id="previousTherapy"
                placeholder="Have you had therapy before? What was helpful?"
                value={formData.previousTherapy}
                onChange={(e) =>
                  handleInputChange("previousTherapy", e.target.value)
                }
                rows={3}
              />
            </div>
          </div>
        );

      case 2: // Preferences
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Therapy Types You're Interested In</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Sports Therapy",
                  "Massage Therapy",
                  "Osteopathy",
                  "Physiotherapy",
                  "Counselling",
                  "Other",
                ].map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.preferredTherapyTypes.includes(type)}
                      onCheckedChange={(checked) =>
                        handleArrayChange(
                          "preferredTherapyTypes",
                          type,
                          checked as boolean,
                        )
                      }
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredGender">
                  Preferred Therapist Gender
                </Label>
                <Select
                  value={formData.preferredGender}
                  onValueChange={(value) =>
                    handleInputChange("preferredGender", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_preference">No Preference</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredLocation">Preferred Location</Label>
                <Select
                  value={formData.preferredLocation}
                  onValueChange={(value) =>
                    handleInputChange("preferredLocation", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home Visit</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="gym">Gym/Sports Facility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferredTime">Preferred Time</Label>
                <Select
                  value={formData.preferredTime}
                  onValueChange={(value) =>
                    handleInputChange("preferredTime", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="weekend">Weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTravelDistance">Max Travel Distance</Label>
                <Select
                  value={formData.maxTravelDistance}
                  onValueChange={(value) =>
                    handleInputChange("maxTravelDistance", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="20">20 miles</SelectItem>
                    <SelectItem value="50">50+ miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3: // Goals
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryGoal">Primary Goal *</Label>
              <Textarea
                id="primaryGoal"
                placeholder="What is your main objective for seeking therapy?"
                value={formData.primaryGoal}
                onChange={(e) =>
                  handleInputChange("primaryGoal", e.target.value)
                }
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Secondary Goals</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Pain Relief",
                  "Injury Recovery",
                  "Stress Management",
                  "Flexibility",
                  "Strength Building",
                  "Mental Health",
                  "Performance Improvement",
                  "Prevention",
                ].map((goal) => (
                  <label key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.secondaryGoals.includes(goal)}
                      onCheckedChange={(checked) =>
                        handleArrayChange(
                          "secondaryGoals",
                          goal,
                          checked as boolean,
                        )
                      }
                    />
                    <span className="text-sm">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Select
                  value={formData.timeline}
                  onValueChange={(value) =>
                    handleInputChange("timeline", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="1_month">1 month</SelectItem>
                    <SelectItem value="3_months">3 months</SelectItem>
                    <SelectItem value="6_months">6 months</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range</Label>
                <Select
                  value={formData.budget}
                  onValueChange={(value) => handleInputChange("budget", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50-100">£50-100</SelectItem>
                    <SelectItem value="100-200">£100-200</SelectItem>
                    <SelectItem value="200-500">£200-500</SelectItem>
                    <SelectItem value="500+">£500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 4: // Complete
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Review Your Information</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span>{" "}
                  {formData.firstName} {formData.lastName}
                </div>
                <div>
                  <span className="font-medium">Phone:</span>{" "}
                  {formData.phone || "Not provided"}
                </div>
                <div>
                  <span className="font-medium">Primary Goal:</span>{" "}
                  {formData.primaryGoal}
                </div>
                <div>
                  <span className="font-medium">Preferred Types:</span>{" "}
                  {formData.preferredTherapyTypes.join(", ")}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) =>
                        handleInputChange("acceptTerms", checked)
                      }
                      required
                    />
                    <span className="text-sm">
                      I accept the{" "}
                      <a
                        href={LEGAL_TERMS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        Terms of Service
                      </a>{" "}
                      *
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.acceptPrivacy}
                      onCheckedChange={(checked) =>
                        handleInputChange("acceptPrivacy", checked)
                      }
                      required
                    />
                    <span className="text-sm">
                      I accept the{" "}
                      <a
                        href={LEGAL_PRIVACY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        Privacy Policy
                      </a>{" "}
                      *
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.allowMarketing}
                      onCheckedChange={(checked) =>
                        handleInputChange("allowMarketing", checked)
                      }
                    />
                    <span className="text-sm">
                      I agree to receive marketing communications (optional)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Personal Information
        return formData.firstName && formData.lastName && formData.dateOfBirth;
      case 1: // Health Background
        return true; // All optional
      case 2: // Preferences
        return formData.preferredTherapyTypes.length > 0;
      case 3: // Goals
        return formData.primaryGoal;
      case 4: // Complete
        return formData.acceptTerms && formData.acceptPrivacy;
      default:
        return false;
    }
  };

  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Theramate
          </h1>
          <p className="text-gray-600">
            Let's set up your profile to help you find the perfect therapist
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {ONBOARDING_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center space-y-2 ${
                index <= currentStep ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  index <= currentStep
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300"
                }`}
              >
                {step.icon}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {ONBOARDING_STEPS[currentStep].icon}
              {ONBOARDING_STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>
              {ONBOARDING_STEPS[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  Complete Setup
                  <CheckCircle className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboarding;
