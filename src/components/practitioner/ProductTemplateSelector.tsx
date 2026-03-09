/**
 * Product Template Selector Component
 * Allows practitioners to select and customize product templates
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, FileText, Clock, PoundSterling, X } from 'lucide-react';
import { ProductTemplate, getTemplatesForService } from '@/lib/product-templates';
import { getServiceLabel } from '@/lib/service-defaults';
import { toast } from 'sonner';

interface ProductTemplateSelectorProps {
  serviceCategory: string;
  practitionerId: string;
  hourlyRate: number;
  onTemplateSelect: (template: ProductTemplate) => void;
  onCancel: () => void;
}

export const ProductTemplateSelector: React.FC<ProductTemplateSelectorProps> = ({
  serviceCategory,
  practitionerId,
  hourlyRate,
  onTemplateSelect,
  onCancel,
}) => {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [serviceCategory, practitionerId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const result = await getTemplatesForService(serviceCategory, practitionerId);
      
      if (result.success && result.templates) {
        setTemplates(result.templates);
      } else {
        toast.error(result.error || 'Failed to load templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: ProductTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate);
    }
  };

  const calculatePrice = (template: ProductTemplate, duration?: number): number => {
    const dur = duration || template.default_duration_minutes;
    if (template.pricing_type === 'hourly') {
      // If template has suggested_price_per_hour, it's already in pence
      // If not, use hourlyRate which is in pounds, so convert to pence (multiply by 100)
      const suggestedPrice = template.suggested_price_per_hour || (hourlyRate * 100);
      return Math.round((suggestedPrice * dur) / 60);
    }
    // For fixed pricing, suggested_price_per_hour is already in pence
    return template.suggested_price_per_hour || 0;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading templates...</div>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Templates Available</CardTitle>
          <CardDescription>
            No templates found for {getServiceLabel(serviceCategory)}. You can create a product from scratch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Create from Scratch
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Choose a Template
            </CardTitle>
            <CardDescription>
              Select a template for {getServiceLabel(serviceCategory)} to get started quickly
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {templates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              const price = calculatePrice(template);
              const priceInPounds = price / 100;

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-[border-color,background-color] duration-200 ease-out hover:border-primary ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{template.template_name}</h4>
                          {template.is_platform_template && (
                            <Badge variant="secondary" className="text-xs">
                              Platform
                            </Badge>
                          )}
                          {!template.is_platform_template && (
                            <Badge variant="outline" className="text-xs">
                              Custom
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{template.default_duration_minutes} min</span>
                          </div>
                          {price > 0 && (
                            <div className="flex items-center gap-1">
                              <PoundSterling className="h-4 w-4" />
                              <span>~£{priceInPounds.toFixed(2)}</span>
                            </div>
                          )}
                        </div>

                        {template.description_template && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description_template
                              .replace(/{duration}/g, template.default_duration_minutes.toString())
                              .replace(/{service}/g, getServiceLabel(template.service_category))
                              .replace(/{service_lower}/g, getServiceLabel(template.service_category).toLowerCase())}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleConfirm}
            disabled={!selectedTemplate}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            Use Template
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Create from Scratch
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

