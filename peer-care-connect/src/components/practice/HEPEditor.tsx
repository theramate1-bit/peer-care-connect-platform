import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Trash2, 
  Search, 
  AlertCircle,
  Info,
  Save,
  Edit,
  Sparkles
} from 'lucide-react';
import { HEPService, Exercise, ProgramExercise, HomeExerciseProgram } from '@/lib/hep-service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ExerciseMediaUpload } from '@/components/practice/ExerciseMediaUpload';

interface HEPEditorProps {
  programId: string;
  clientId: string;
  clientName: string;
  onProgramUpdated?: (programId: string) => void;
  onClose?: () => void;
}

export const HEPEditor: React.FC<HEPEditorProps> = ({
  programId,
  clientId,
  clientName,
  onProgramUpdated,
  onClose
}) => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<ProgramExercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [showCustomExerciseDialog, setShowCustomExerciseDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasCompletions, setHasCompletions] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);
  const [customExercise, setCustomExercise] = useState<Partial<Exercise> & { sets?: number; reps?: number }>({
    name: '',
    description: '',
    category: 'rehabilitation',
    instructions: '',
    difficulty_level: 'beginner',
    sets: 3,
    reps: 10
  });
  
  // Program details
  const [programTitle, setProgramTitle] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programInstructions, setProgramInstructions] = useState('');
  const [frequencyPerWeek, setFrequencyPerWeek] = useState(3);

  useEffect(() => {
    loadProgram();
    loadExercises();
  }, []);

  useEffect(() => {
    if (categoryFilter !== 'all' || difficultyFilter !== 'all' || searchTerm) {
      loadExercises();
    }
  }, [categoryFilter, difficultyFilter, searchTerm]);

  const loadProgram = async () => {
    setLoading(true);
    try {
      const programs = await HEPService.getPractitionerPrograms(user?.id || '', clientId);
      const program = programs.find(p => p.id === programId);
      
      if (program) {
        setProgramTitle(program.title);
        setProgramDescription(program.description || '');
        setProgramInstructions(program.instructions || '');
        setFrequencyPerWeek(program.frequency_per_week || 3);
        setSelectedExercises(program.exercises || []);
      } else {
        toast.error('Program not found');
        if (onClose) onClose();
        return;
      }

      // Check for existing completions
      const { data: completions, error } = await supabase
        .from('exercise_program_progress')
        .select('id')
        .eq('program_id', programId)
        .limit(1);

      if (!error && completions && completions.length > 0) {
        const { count } = await supabase
          .from('exercise_program_progress')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', programId);
        
        setHasCompletions(true);
        setCompletionCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading program:', error);
      toast.error('Failed to load program');
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    try {
      const data = await HEPService.getExercises({
        category: categoryFilter !== 'all' ? categoryFilter as Exercise['category'] : undefined,
        difficulty: difficultyFilter !== 'all' ? difficultyFilter as Exercise['difficulty_level'] : undefined,
        search: searchTerm || undefined
      });
      setExercises(data);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Failed to load exercises');
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    const programExercise: ProgramExercise = {
      ...exercise,
      sets: 3,
      reps: 10,
      frequency_per_week: frequencyPerWeek,
      media_attachments: [] // Initialize empty media attachments
    };
    setSelectedExercises([...selectedExercises, programExercise]);
    setShowExerciseDialog(false);
  };

  const handleCreateCustomExercise = () => {
    if (!customExercise.name?.trim()) {
      toast.error('Please enter an exercise name');
      return;
    }
    if (!customExercise.instructions?.trim()) {
      toast.error('Please enter exercise instructions');
      return;
    }

    const customProgramExercise: ProgramExercise = {
      id: undefined, // Custom exercises don't have library IDs
      name: customExercise.name,
      description: customExercise.description,
      category: customExercise.category || 'rehabilitation',
      instructions: customExercise.instructions,
      difficulty_level: customExercise.difficulty_level || 'beginner',
      sets: customExercise.sets ?? 3,
      reps: customExercise.reps ?? 10,
      frequency_per_week: frequencyPerWeek,
      media_attachments: [] // Initialize empty media attachments
    };

    setSelectedExercises([...selectedExercises, customProgramExercise]);
    setShowCustomExerciseDialog(false);
    setCustomExercise({
      name: '',
      description: '',
      category: 'rehabilitation',
      instructions: '',
      difficulty_level: 'beginner',
      sets: 3,
      reps: 10
    });
    toast.success('Custom exercise added to program');
  };

  const handleUpdateExerciseMedia = (index: number, media: any[]) => {
    handleUpdateExercise(index, { media_attachments: media });
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, updates: Partial<ProgramExercise>) => {
    setSelectedExercises(selectedExercises.map((ex, i) => 
      i === index ? { ...ex, ...updates } : ex
    ));
  };

  const handleUpdateProgram = async () => {
    if (!user) {
      toast.error('You must be logged in to update a program');
      return;
    }

    if (!programTitle.trim()) {
      toast.error('Please enter a program title');
      return;
    }

    if (selectedExercises.length === 0) {
      toast.error('Please add at least one exercise');
      return;
    }

    // Show confirmation if there are existing completions
    if (hasCompletions) {
      setShowConfirmDialog(true);
      return;
    }

    await performUpdate();
  };

  const performUpdate = async () => {
    setSaving(true);
    setShowConfirmDialog(false);
    
    try {
      const updates: Partial<HomeExerciseProgram> = {
        title: programTitle,
        description: programDescription,
        instructions: programInstructions,
        exercises: selectedExercises,
        frequency_per_week: frequencyPerWeek
      };

      const result = await HEPService.updateProgram(
        programId, 
        updates,
        user?.id,
        'Program updated via HEP Editor'
      );

      if (result.success) {
        toast.success('Program updated successfully!');
        if (onProgramUpdated) {
          onProgramUpdated(programId);
        }
        if (onClose) {
          onClose();
        }
      } else {
        toast.error(result.error || 'Failed to update program');
      }
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error('Failed to update program');
    } finally {
      setSaving(false);
    }
  };

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800'
  };

  const categoryColors = {
    strength: 'bg-blue-100 text-blue-800',
    flexibility: 'bg-purple-100 text-purple-800',
    cardio: 'bg-red-100 text-red-800',
    mobility: 'bg-teal-100 text-teal-800',
    balance: 'bg-indigo-100 text-indigo-800',
    rehabilitation: 'bg-orange-100 text-orange-800'
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading program...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Edit the home exercise program for {clientName}. {hasCompletions && (
            <span className="font-medium text-orange-600">
              Note: This program has {completionCount} existing completion{completionCount !== 1 ? 's' : ''}. 
              Historical completions will be preserved even if exercises are removed.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Program Details */}
      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>Update the basic information for the exercise program</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="program-title">Program Title *</Label>
            <Input
              id="program-title"
              value={programTitle}
              onChange={(e) => setProgramTitle(e.target.value)}
              placeholder="e.g., Post-Session Rehabilitation Program"
            />
          </div>

          <div>
            <Label htmlFor="program-description">Description</Label>
            <Textarea
              id="program-description"
              value={programDescription}
              onChange={(e) => setProgramDescription(e.target.value)}
              placeholder="Brief description of the program goals..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency (per week)</Label>
              <Select value={frequencyPerWeek.toString()} onValueChange={(v) => setFrequencyPerWeek(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day/week</SelectItem>
                  <SelectItem value="2">2 days/week</SelectItem>
                  <SelectItem value="3">3 days/week</SelectItem>
                  <SelectItem value="4">4 days/week</SelectItem>
                  <SelectItem value="5">5 days/week</SelectItem>
                  <SelectItem value="6">6 days/week</SelectItem>
                  <SelectItem value="7">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">General Instructions</Label>
            <Textarea
              id="instructions"
              value={programInstructions}
              onChange={(e) => setProgramInstructions(e.target.value)}
              placeholder="General instructions for the client (warm-up, cool-down, precautions, etc.)"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Selected Exercises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Selected Exercises ({selectedExercises.length})</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomExerciseDialog(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create Custom
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExerciseDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add from Library
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedExercises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No exercises selected yet</p>
              <p className="text-sm">Click "Add Exercise" to browse the exercise library</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedExercises.map((exercise, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{exercise.name}</h4>
                          <Badge className={difficultyColors[exercise.difficulty_level]}>
                            {exercise.difficulty_level}
                          </Badge>
                          <Badge className={categoryColors[exercise.category]}>
                            {exercise.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{exercise.description}</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.sets || 3}
                              onChange={(e) => handleUpdateExercise(index, { sets: parseInt(e.target.value) || 1 })}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              min="1"
                              value={exercise.reps || 10}
                              onChange={(e) => handleUpdateExercise(index, { reps: parseInt(e.target.value) || 1 })}
                              className="h-8"
                            />
                          </div>
                        </div>

                        {/* Exercise Media Upload */}
                        {user && (
                          <div className="mt-3 pt-3 border-t">
                            <ExerciseMediaUpload
                              practitionerId={user.id}
                              clientId={clientId}
                              programId={programId}
                              exerciseIndex={index}
                              existingMedia={exercise.media_attachments || []}
                              onMediaChange={(media) => handleUpdateExerciseMedia(index, media)}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExercise(index)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleUpdateProgram}
          disabled={saving || selectedExercises.length === 0 || !programTitle.trim()}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update Program
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Program Update</DialogTitle>
            <DialogDescription>
              This program has {completionCount} existing completion{completionCount !== 1 ? 's' : ''}. 
              Historical completions will be preserved even if exercises are removed or modified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={performUpdate} disabled={saving}>
              {saving ? 'Updating...' : 'Update Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Exercise Dialog */}
      <Dialog open={showCustomExerciseDialog} onOpenChange={setShowCustomExerciseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Exercise</DialogTitle>
            <DialogDescription>
              Create a personalized exercise for this program. This exercise will only be used in this program.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-name">Exercise Name *</Label>
              <Input
                id="custom-name"
                value={customExercise.name || ''}
                onChange={(e) => setCustomExercise({ ...customExercise, name: e.target.value })}
                placeholder="e.g., Custom Shoulder Stretch"
              />
            </div>

            <div>
              <Label htmlFor="custom-description">Description</Label>
              <Textarea
                id="custom-description"
                value={customExercise.description || ''}
                onChange={(e) => setCustomExercise({ ...customExercise, description: e.target.value })}
                placeholder="Brief description of the exercise..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-sets">Sets</Label>
                <Input
                  id="custom-sets"
                  type="number"
                  min={1}
                  value={customExercise.sets ?? 3}
                  onChange={(e) => setCustomExercise({ ...customExercise, sets: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="custom-reps">Reps</Label>
                <Input
                  id="custom-reps"
                  type="number"
                  min={1}
                  value={customExercise.reps ?? 10}
                  onChange={(e) => setCustomExercise({ ...customExercise, reps: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="custom-category">Category *</Label>
                <Select
                  value={customExercise.category || 'rehabilitation'}
                  onValueChange={(value) => setCustomExercise({ ...customExercise, category: value as Exercise['category'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="mobility">Mobility</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="custom-difficulty">Difficulty Level *</Label>
                <Select
                  value={customExercise.difficulty_level || 'beginner'}
                  onValueChange={(value) => setCustomExercise({ ...customExercise, difficulty_level: value as Exercise['difficulty_level'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="custom-instructions">Instructions *</Label>
              <Textarea
                id="custom-instructions"
                value={customExercise.instructions || ''}
                onChange={(e) => setCustomExercise({ ...customExercise, instructions: e.target.value })}
                placeholder="Step-by-step instructions for performing this exercise..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomExerciseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomExercise}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Library Dialog */}
      <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exercise Library</DialogTitle>
            <DialogDescription>
              Search and select exercises to add to the program
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="mobility">Mobility</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exercise List */}
            {loading ? (
              <div className="text-center py-8">Loading exercises...</div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No exercises found
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                {exercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleAddExercise(exercise)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{exercise.name}</h4>
                            <Badge className={difficultyColors[exercise.difficulty_level]}>
                              {exercise.difficulty_level}
                            </Badge>
                            <Badge className={categoryColors[exercise.category]}>
                              {exercise.category}
                            </Badge>
                          </div>
                          {exercise.description && (
                            <p className="text-sm text-muted-foreground">{exercise.description}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

