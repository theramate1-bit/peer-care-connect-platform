import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText } from 'lucide-react';
import { IntakeFormService, IntakeFormTemplate, IntakeFormData, IntakeFormField } from '@/lib/intake-form-service';

interface IntakeFormProps {
  serviceType: string;
  sessionId?: string;
  onComplete: (formData: IntakeFormData) => void;
  onBack?: () => void;
  onSkip?: () => void;
  initialData?: IntakeFormData;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({
  serviceType,
  sessionId,
  onComplete,
  onBack,
  onSkip,
  initialData
}) => {
  const [template, setTemplate] = useState<IntakeFormTemplate | null>(null);
  const [formData, setFormData] = useState<IntakeFormData>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({}); // Field-specific errors
  const [touched, setTouched] = useState<Record<string, boolean>>({}); // Track touched fields
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get form template based on service type
    const formTemplate = IntakeFormService.getFormTemplate(serviceType);
    setTemplate(formTemplate);

    // Load existing form data if sessionId provided
    if (sessionId && !initialData) {
      IntakeFormService.getIntakeForm(sessionId).then(data => {
        if (data) {
          setFormData(data);
        }
      });
    }
  }, [serviceType, sessionId, initialData]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Validate this specific field in real-time if it's been touched
    if (touched[fieldId] && template) {
      const field = template.fields.find(f => f.id === fieldId);
      if (field) {
        const fieldError = validateField(field, value);
        if (fieldError) {
          setErrors(prev => ({ ...prev, [fieldId]: fieldError }));
        } else {
          // Clear error for this field if it's now valid
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldId];
            return newErrors;
          });
        }
      }
    }
  };

  const handleFieldBlur = (fieldId: string) => {
    setTouched(prev => ({ ...prev, [fieldId]: true }));
    
    // Validate field on blur
    if (template) {
      const field = template.fields.find(f => f.id === fieldId);
      if (field) {
        const value = formData[fieldId];
        const fieldError = validateField(field, value);
        if (fieldError) {
          setErrors(prev => ({ ...prev, [fieldId]: fieldError }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldId];
            return newErrors;
          });
        }
      }
    }
  };

  // Validate a single field
  const validateField = (field: IntakeFormField, value: any): string | null => {
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        return `${field.label} is required`;
      }
      if (field.type === 'checkbox' && !value) {
        return `${field.label} must be accepted`;
      }
    }

    // Additional validation
    if (field.validation && value !== undefined && value !== null && value !== '') {
      if (field.type === 'number' && typeof value === 'number') {
        if (field.validation.min !== undefined && value < field.validation.min) {
          return field.validation.message || `Minimum value is ${field.validation.min}`;
        }
        if (field.validation.max !== undefined && value > field.validation.max) {
          return field.validation.message || `Maximum value is ${field.validation.max}`;
        }
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!template) return;

    // Mark all fields as touched when submitting
    const allTouched: Record<string, boolean> = {};
    template.fields.forEach(field => {
      allTouched[field.id] = true;
    });
    setTouched(allTouched);

    // Validate all fields
    const fieldErrors: Record<string, string> = {};
    template.fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        fieldErrors[field.id] = error;
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Scroll to first error
      const firstErrorFieldId = Object.keys(fieldErrors)[0];
      const firstErrorElement = document.getElementById(firstErrorFieldId);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorElement.focus();
      }
      return;
    }

    setLoading(true);
    
    // Don't save to database - just pass data to parent
    // The intake form data will be saved when the booking is completed
    onComplete(formData);
    setLoading(false);
  };

  const renderField = (field: IntakeFormField) => {
    const value = formData[field.id];
    const fieldError = errors[field.id];
    const hasError = Boolean(fieldError && touched[field.id]);

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              onBlur={() => handleFieldBlur(field.id)}
              placeholder={field.placeholder}
              rows={field.id === 'primary_concern' || field.id === 'session_goals' ? 4 : 3}
              className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${field.id}-error` : undefined}
            />
            {hasError && (
              <p id={`${field.id}-error`} className="text-sm text-red-600 mt-1" role="alert">
                {fieldError}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(val) => handleFieldChange(field.id, val)}
            >
              <SelectTrigger 
                className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                aria-invalid={hasError}
                aria-describedby={hasError ? `${field.id}-error` : undefined}
                onBlur={() => handleFieldBlur(field.id)}
              >
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p id={`${field.id}-error`} className="text-sm text-red-600 mt-1" role="alert">
                {fieldError}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-3">
            <Checkbox
              id={field.id}
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              onBlur={() => handleFieldBlur(field.id)}
              className={hasError ? 'border-red-500' : ''}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${field.id}-error` : undefined}
            />
            <Label htmlFor={field.id} className="cursor-pointer font-normal">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </Label>
            {hasError && (
              <p id={`${field.id}-error`} className="text-sm text-red-600 mt-1 ml-7" role="alert">
                {fieldError}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              onBlur={() => handleFieldBlur(field.id)}
              className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${field.id}-error` : undefined}
            />
            {hasError && (
              <p id={`${field.id}-error`} className="text-sm text-red-600 mt-1" role="alert">
                {fieldError}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={(value as number) || ''}
              onChange={(e) => handleFieldChange(field.id, parseInt(e.target.value) || 0)}
              onBlur={() => handleFieldBlur(field.id)}
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${field.id}-error` : undefined}
            />
            {hasError ? (
              <p id={`${field.id}-error`} className="text-sm text-red-600 mt-1" role="alert">
                {fieldError}
              </p>
            ) : field.validation?.message ? (
              <p className="text-xs text-muted-foreground">{field.validation.message}</p>
            ) : null}
          </div>
        );

      default: // text
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="text"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              onBlur={() => handleFieldBlur(field.id)}
              placeholder={field.placeholder}
              className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              aria-invalid={hasError}
              aria-describedby={hasError ? `${field.id}-error` : undefined}
            />
            {hasError && (
              <p id={`${field.id}-error`} className="text-sm text-red-600 mt-1" role="alert">
                {fieldError}
              </p>
            )}
          </div>
        );
    }
  };

  if (!template) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading form...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {template.name}
        </CardTitle>
        <CardDescription>
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors._general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors._general}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {template.fields.map(field => renderField(field))}
          </div>

          <div className="flex justify-between pt-6 border-t">
            <div className="flex gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  disabled={loading}
                >
                  Back
                </button>
              )}
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  disabled={loading}
                >
                  Skip
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </span>
              ) : (
                'Continue to Payment'
              )}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

