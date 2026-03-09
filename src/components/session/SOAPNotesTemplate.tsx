import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Stethoscope, 
  Lightbulb, 
  Copy, 
  Save, 
  Download,
  Sparkles,
  Clock,
  User as UserIcon,
  Target,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  JOINTS,
  MOVEMENTS,
  PAIN_AREAS,
  STRENGTH_GRADES
} from '@/lib/constants';

interface SOAPTemplate {
  id: string;
  name: string;
  category: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  keywords: string[];
}

interface SOAPNotesTemplateProps {
  therapyType?: string;
  clientName?: string;
  isCompleted?: boolean;
  onTemplateSelect?: (template: SOAPTemplate) => void;
  onSave?: (soapData: SOAPData, status?: 'draft' | 'completed' | 'archived') => void;
}

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chief_complaint: string;
  session_notes: string;
}

export const SOAPNotesTemplate: React.FC<SOAPNotesTemplateProps> = ({
  therapyType = 'general',
  clientName = 'Client',
  isCompleted = false,
  onTemplateSelect,
  onSave
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<SOAPTemplate | null>(null);
  const [soapData, setSoapData] = useState<SOAPData>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    chief_complaint: '',
    session_notes: ''
  });
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Suggested Prompts State
  const [painArea, setPainArea] = useState('');
  const [painScore, setPainScore] = useState<string>('');
  const [romJoint, setRomJoint] = useState('');
  const [romSide, setRomSide] = useState<'right' | 'left' | 'bilateral'>('right');
  const [romMovement, setRomMovement] = useState('');
  const [romDegrees, setRomDegrees] = useState('');
  const [strengthJoint, setStrengthJoint] = useState('');
  const [strengthSide, setStrengthSide] = useState<'right' | 'left' | 'bilateral'>('right');
  const [strengthMovement, setStrengthMovement] = useState('');
  const [strengthGrade, setStrengthGrade] = useState('');

  // Pre-built SOAP templates for different therapy types
  const soapTemplates: SOAPTemplate[] = [
    {
      id: 'deep-tissue',
      name: 'Deep Tissue Massage',
      category: 'Massage Therapy',
      subjective: `Client reports ${clientName} reports chronic tension in [specific area] with pain rated [X/10]. 
      Symptoms have been present for [duration] and are aggravated by [activities]. 
      Previous treatments include [list treatments] with [describe effectiveness].`,
      objective: `Assessment reveals [specific findings]:
      • Muscle tension: [describe location and severity]
      • Range of motion: [describe limitations]
      • Palpation findings: [describe tenderness, knots, etc.]
      • Postural observations: [describe posture issues]`,
      assessment: `Primary diagnosis: [specific condition]
      Contributing factors: [list factors]
      Severity: [mild/moderate/severe]
      Prognosis: [expected outcome]`,
      plan: `Treatment approach:
      • Immediate: [today's treatment focus]
      • Short-term: [next 1-2 sessions]
      • Long-term: [ongoing care plan]
      • Home care: [exercises, self-care recommendations]`,
      keywords: ['deep tissue', 'chronic tension', 'muscle tension', 'range of motion', 'posture']
    },
    {
      id: 'sports-therapy',
      name: 'Sports Therapy',
      category: 'Sports Therapy',
      subjective: `Athlete reports [specific injury/condition] sustained during [activity/event] on [date]. 
      Pain level: [X/10], affecting [describe impact on performance]. 
      Previous injuries: [list relevant history].`,
      objective: `Physical assessment:
      • Injury site: [describe location and appearance]
      • Functional testing: [describe tests performed and results]
      • Strength assessment: [describe findings]
      • Mobility testing: [describe range of motion]`,
      assessment: `Injury classification: [specific diagnosis]
      Severity: [grade/level]
      Recovery timeline: [estimated duration]
      Return to play criteria: [list requirements]`,
      plan: `Rehabilitation protocol:
      • Phase 1: [immediate care, next 48-72 hours]
      • Phase 2: [early rehabilitation, next 1-2 weeks]
      • Phase 3: [progressive loading, next 2-4 weeks]
      • Phase 4: [return to sport preparation]`,
      keywords: ['sports injury', 'rehabilitation', 'return to play', 'functional testing', 'strength']
    },
    {
      id: 'prenatal',
      name: 'Prenatal Massage',
      category: 'Specialized Massage',
      subjective: `Client is [X] weeks pregnant with [number] pregnancy. 
      Reports [specific symptoms] including [describe discomfort]. 
      Previous pregnancy complications: [list if any]. 
      Current trimester: [1st/2nd/3rd].`,
      objective: `Assessment findings:
      • Postural changes: [describe pregnancy-related posture]
      • Common pregnancy symptoms: [list observed symptoms]
      • Comfort level: [assess positioning comfort]
      • Vital signs: [if monitored]`,
      assessment: `Pregnancy status: [normal/high-risk]
      Primary concerns: [list main issues]
      Contraindications: [list any]
      Safety considerations: [list precautions]`,
      plan: `Prenatal care plan:
      • Current session: [focus areas for today]
      • Frequency: [recommended session schedule]
      • Positioning: [comfortable positions for client]
      • Home care: [safe self-care recommendations]`,
      keywords: ['prenatal', 'pregnancy', 'posture', 'comfort', 'safety']
    },
    {
      id: 'rehabilitation',
      name: 'Rehabilitation Therapy',
      category: 'Physical Therapy',
      subjective: `Patient reports [specific condition] affecting [describe functional limitations]. 
      Pain: [X/10], interfering with [daily activities]. 
      Medical history: [relevant conditions, surgeries, medications].`,
      objective: `Clinical assessment:
      • Functional limitations: [describe specific activities affected]
      • Strength deficits: [quantify where possible]
      • Range of motion: [measure and document]
      • Balance and coordination: [assess if relevant]`,
      assessment: `Clinical diagnosis: [specific condition]
      Functional level: [describe current abilities]
      Prognosis: [expected recovery timeline]
      Risk factors: [list any]`,
      plan: `Rehabilitation program:
      • Goals: [specific, measurable objectives]
      • Interventions: [treatment techniques]
      • Progression criteria: [when to advance]
      • Home program: [exercises and self-care]`,
      keywords: ['rehabilitation', 'functional limitations', 'strength', 'range of motion', 'goals']
    },
    {
      id: 'general-wellness',
      name: 'General Wellness',
      category: 'Wellness',
      subjective: `Client seeks [type of session] for [primary goal]. 
      Current stress level: [X/10], affecting [describe impact]. 
      Lifestyle factors: [sleep, exercise, diet, work stress].`,
      objective: `Wellness assessment:
      • Stress indicators: [physical and emotional signs]
      • Energy levels: [describe observations]
      • Sleep quality: [if discussed]
      • Overall presentation: [appearance, demeanor]`,
      assessment: `Wellness status: [overall assessment]
      Primary needs: [main areas for improvement]
      Stress factors: [identify sources]
      Coping mechanisms: [current strategies]`,
      plan: `Wellness approach:
      • Session focus: [today's treatment goals]
      • Lifestyle recommendations: [stress management, self-care]
      • Follow-up: [maintenance schedule]
      • Long-term goals: [sustainable wellness practices]`,
      keywords: ['wellness', 'stress management', 'lifestyle', 'self-care', 'prevention']
    }
  ];

  useEffect(() => {
    // Auto-select template based on therapy type
    const matchingTemplate = soapTemplates.find(t => 
      t.keywords.some(keyword => 
        therapyType.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (matchingTemplate) {
      setSelectedTemplate(matchingTemplate);
      applyTemplate(matchingTemplate);
    }
  }, [therapyType]);

  const applyTemplate = (template: SOAPTemplate) => {
    setSelectedTemplate(template);
    setSoapData({
      subjective: template.subjective.replace(/\[.*?\]/g, ''),
      objective: template.objective.replace(/\[.*?\]/g, ''),
      assessment: template.assessment.replace(/\[.*?\]/g, ''),
      plan: template.plan.replace(/\[.*?\]/g, ''),
      chief_complaint: '',
      session_notes: ''
    });

    if (onTemplateSelect) {
      onTemplateSelect(template);
    }

    toast.success(`Applied ${template.name} template`);
  };

  const generateAISuggestions = async () => {
    setIsGeneratingSuggestions(true);
    
    try {
      // Simulate AI suggestions (in real implementation, this would call your AI service)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const suggestions = [
        "Consider adding specific pain scale measurements",
        "Include range of motion measurements if applicable",
        "Document any contraindications or precautions",
        "Add follow-up recommendations with timeline",
        "Include home exercise program details"
      ];
      
      setAiSuggestions(suggestions);
      toast.success('AI suggestions generated');
    } catch (error) {
      toast.error('Failed to generate AI suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleManualEdit = (field: keyof SOAPData, value: string) => {
    setSoapData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPainScore = () => {
    if (!painArea || !painScore) return;
    const textToAdd = `${painArea} Pain (VAS): ${painScore}/10`;
    const escapedArea = painArea.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapedArea} Pain \\(VAS\\): \\d+\\/10`, 'g');
    let newObjective = soapData.objective;
    if (regex.test(soapData.objective)) {
      newObjective = soapData.objective.replace(regex, textToAdd);
    } else {
      newObjective = soapData.objective ? `${soapData.objective}\n${textToAdd}` : textToAdd;
    }
    handleManualEdit('objective', newObjective);
    setPainArea('');
    setPainScore('');
    toast.success('Pain score added to Objective');
  };

  const addRom = () => {
    if (!romJoint || !romMovement || !romDegrees) return;
    const sideText = romSide === 'bilateral' ? 'bilateral' : romSide === 'right' ? 'right' : 'left';
    const textToAdd = `ROM: ${sideText} ${romJoint} ${romMovement} - ${romDegrees}°`;
    handleManualEdit('objective', soapData.objective ? `${soapData.objective}\n${textToAdd}` : textToAdd);
    setRomJoint('');
    setRomSide('right');
    setRomMovement('');
    setRomDegrees('');
    toast.success('ROM added to Objective');
  };

  const addStrength = () => {
    if (!strengthJoint || !strengthMovement || !strengthGrade) return;
    const gradeObj = STRENGTH_GRADES.find(g => g.value === strengthGrade);
    const gradeName = gradeObj ? gradeObj.label : strengthGrade;
    const sideText = strengthSide === 'bilateral' ? 'bilateral' : strengthSide === 'right' ? 'right' : 'left';
    const textToAdd = `Strength Testing: ${sideText} ${strengthJoint} ${strengthMovement} - Grade ${strengthGrade}/5 (${gradeName})`;
    handleManualEdit('objective', soapData.objective ? `${soapData.objective}\n${textToAdd}` : textToAdd);
    setStrengthJoint('');
    setStrengthSide('right');
    setStrengthMovement('');
    setStrengthGrade('');
    toast.success('Strength test added to Objective');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSave = () => {
    if (onSave) {
      onSave(soapData, 'draft');
    }
    toast.success('SOAP notes saved');
  };

  const handleComplete = () => {
    if (confirm('Are you sure you want to complete this note? You will not be able to edit it afterwards.')) {
      if (onSave) {
        onSave(soapData, 'completed');
      }
      toast.success('SOAP notes completed and locked');
    }
  };

  const exportToPDF = () => {
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Set up PDF styling
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;
      
      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        // Split text into lines that fit the page width
        const lines = doc.splitTextToSize(text, contentWidth);
        
        // Check if we need a new page
        if (yPosition + (lines.length * fontSize * 0.4) > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Add the text
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * fontSize * 0.4 + 5;
      };
      
      // Header
      addText('SOAP NOTES', 18, true);
      addText(`Client: ${clientName}`, 14, true);
      addText(`Date: ${new Date().toLocaleDateString()}`, 12);
      addText(`Therapist: [Your Name]`, 12);
      addText(`Session Type: ${selectedTemplate?.name || 'General Session'}`, 12);
      
      yPosition += 10; // Add some space
      
      // Chief Complaint
      if (soapData.chief_complaint) {
        addText('CHIEF COMPLAINT', 14, true);
        addText(soapData.chief_complaint, 12);
        yPosition += 5;
      }
      
      // Subjective
      if (soapData.subjective) {
        addText('SUBJECTIVE', 14, true);
        addText(soapData.subjective, 12);
        yPosition += 5;
      }
      
      // Objective
      if (soapData.objective) {
        addText('OBJECTIVE', 14, true);
        addText(soapData.objective, 12);
        yPosition += 5;
      }
      
      // Assessment
      if (soapData.assessment) {
        addText('ASSESSMENT', 14, true);
        addText(soapData.assessment, 12);
        yPosition += 5;
      }
      
      // Plan
      if (soapData.plan) {
        addText('PLAN', 14, true);
        addText(soapData.plan, 12);
        yPosition += 5;
      }
      
      // Session Notes
      if (soapData.session_notes) {
        addText('SESSION NOTES', 14, true);
        addText(soapData.session_notes, 12);
        yPosition += 5;
      }
      
      // Footer
      yPosition = doc.internal.pageSize.getHeight() - 30;
      addText(`Generated on ${new Date().toLocaleString()}`, 10);
      addText('TheraMate - Professional Healthcare Exchange Platform', 10);
      
      // Generate filename
      const fileName = `SOAP_Notes_${clientName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Save the PDF
      doc.save(fileName);
      
      toast.success('SOAP notes exported to PDF successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            SOAP Notes Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {soapTemplates.map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-[border-color,background-color] duration-200 ease-out ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => applyTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{template.name}</h4>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.keywords.slice(0, 3).join(', ')}...
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Copy className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateAISuggestions} 
            disabled={isGeneratingSuggestions}
            className="w-full"
          >
            {isGeneratingSuggestions ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating Suggestions...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate AI Suggestions
              </>
            )}
          </Button>

          {aiSuggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Suggestions:</h4>
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SOAP Notes Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            SOAP Notes Editor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subjective" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="subjective">Subjective</TabsTrigger>
              <TabsTrigger value="objective">Objective</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="plan">Plan</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="subjective" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Chief Complaint</label>
                <Textarea
                  value={soapData.chief_complaint}
                  onChange={(e) => handleManualEdit('chief_complaint', e.target.value)}
                  placeholder="Patient's main concern..."
                  className="mt-2"
                  disabled={isCompleted}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subjective</label>
                <Textarea
                  value={soapData.subjective}
                  onChange={(e) => handleManualEdit('subjective', e.target.value)}
                  placeholder="Patient's reported symptoms and history..."
                  className="mt-2"
                  rows={6}
                  disabled={isCompleted}
                />
              </div>
            </TabsContent>

            <TabsContent value="objective" className="space-y-4">
              {/* Suggested Prompts Section */}
              <div className={`bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4 ${isCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Suggested Prompts</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pain Score */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Pain Score (VAS)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select onValueChange={setPainArea} value={painArea}>
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue placeholder="Area of Pain" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAIN_AREAS.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={setPainScore} value={painScore}>
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue placeholder="Score (0-10)" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(11)].map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i} - {i === 0 ? 'No Pain' : i === 10 ? 'Worst' : i < 4 ? 'Mild' : i < 7 ? 'Mod' : 'Severe'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addPainScore} size="sm" variant="secondary" className="w-full" disabled={!painArea || !painScore}>
                      <Plus className="h-3 w-3 mr-1" /> Add to Objective
                    </Button>
                  </div>

                  {/* Range of Motion */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Range of Motion (ROM)</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <Select onValueChange={(value) => { setRomJoint(value); setRomMovement(''); }} value={romJoint}>
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue placeholder="Body Part" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOINTS.map((joint) => (
                            <SelectItem key={joint} value={joint}>
                              {joint}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={(value: any) => setRomSide(value)} value={romSide}>
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="bilateral">Bilateral</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select onValueChange={setRomMovement} value={romMovement} disabled={!romJoint}>
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue placeholder="Movement" />
                        </SelectTrigger>
                        <SelectContent>
                          {romJoint && MOVEMENTS[romJoint]?.map((movement) => (
                            <SelectItem key={movement} value={movement}>
                              {movement}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="relative">
                        <Input 
                          placeholder="Deg" 
                          type="number"
                          value={romDegrees}
                          onChange={(e) => setRomDegrees(e.target.value)}
                          className="bg-background pr-6 h-9 text-sm"
                        />
                        <span className="absolute right-2 top-2 text-muted-foreground text-xs">°</span>
                      </div>
                    </div>
                    <Button onClick={addRom} size="sm" variant="secondary" className="w-full" disabled={!romJoint || !romMovement || !romDegrees}>
                      <Plus className="h-3 w-3 mr-1" /> Add to Objective
                    </Button>
                  </div>

                  {/* Strength Testing */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Strength Testing</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <Select onValueChange={(value) => { setStrengthJoint(value); setStrengthMovement(''); }} value={strengthJoint}>
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue placeholder="Body Part" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOINTS.map((joint) => (
                            <SelectItem key={joint} value={joint}>
                              {joint}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={(value: any) => setStrengthSide(value)} value={strengthSide}>
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="bilateral">Bilateral</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select onValueChange={setStrengthMovement} value={strengthMovement} disabled={!strengthJoint}>
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue placeholder="Movement" />
                        </SelectTrigger>
                        <SelectContent>
                          {strengthJoint && MOVEMENTS[strengthJoint]?.map((movement) => (
                            <SelectItem key={movement} value={movement}>
                              {movement}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={setStrengthGrade} value={strengthGrade}>
                        <SelectTrigger className="bg-background h-9">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {STRENGTH_GRADES.map((grade) => (
                            <SelectItem key={grade.value} value={grade.value}>
                              {grade.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addStrength} size="sm" variant="secondary" className="w-full" disabled={!strengthJoint || !strengthMovement || !strengthGrade}>
                      <Plus className="h-3 w-3 mr-1" /> Add to Objective
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Objective Findings</label>
                <Textarea
                  value={soapData.objective}
                  onChange={(e) => handleManualEdit('objective', e.target.value)}
                  placeholder="Observations, palpation findings, range of motion. Include: Pain score (VAS 0-10), Range of motion measurements (e.g., knee flexion 90°, shoulder abduction 120°), strength testing, special tests..."
                  className="mt-2"
                  rows={6}
                  disabled={isCompleted}
                />
              </div>
            </TabsContent>

            <TabsContent value="assessment" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Assessment</label>
                <Textarea
                  value={soapData.assessment}
                  onChange={(e) => handleManualEdit('assessment', e.target.value)}
                  placeholder="Clinical findings, diagnosis, evaluation..."
                  className="mt-2"
                  rows={6}
                  disabled={isCompleted}
                />
              </div>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Treatment Plan</label>
                <Textarea
                  value={soapData.plan}
                  onChange={(e) => handleManualEdit('plan', e.target.value)}
                  placeholder="Treatment approach, exercises, follow-up..."
                  className="mt-2"
                  rows={6}
                  disabled={isCompleted}
                />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Session Notes</label>
                <Textarea
                  value={soapData.session_notes}
                  onChange={(e) => handleManualEdit('session_notes', e.target.value)}
                  placeholder="Additional session observations and notes..."
                  className="mt-2"
                  rows={6}
                  disabled={isCompleted}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-6">
            <Button onClick={handleSave} className="flex-1" disabled={isCompleted}>
              <Save className="h-4 w-4 mr-2" />
              Save Notes
            </Button>
            {!isCompleted && (
              <Button onClick={handleComplete} variant="outline" className="flex-1 border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700">
                <Target className="h-4 w-4 mr-2" />
                Complete Note
              </Button>
            )}
            {isCompleted && (
              <Button disabled variant="outline" className="flex-1 border-green-600 text-green-600 bg-green-50 opacity-100">
                <Target className="h-4 w-4 mr-2" />
                Note Completed
              </Button>
            )}
            <Button onClick={exportToPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" onClick={() => copyToClipboard(soapData.subjective)}>
              <Copy className="h-5 w-5 mb-1" />
              <span className="text-xs">Copy Subjective</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => copyToClipboard(soapData.objective)}>
              <Copy className="h-5 w-5 mb-1" />
              <span className="text-xs">Copy Objective</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => copyToClipboard(soapData.assessment)}>
              <Copy className="h-5 w-5 mb-1" />
              <span className="text-xs">Copy Assessment</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => copyToClipboard(soapData.plan)}>
              <Copy className="h-5 w-5 mb-1" />
              <span className="text-xs">Copy Plan</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


