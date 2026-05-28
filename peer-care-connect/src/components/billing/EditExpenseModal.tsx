import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  taxDeductible: boolean;
}

interface EditExpenseModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
}

const EXPENSE_CATEGORIES = [
  'Equipment',
  'Supplies',
  'Training',
  'Insurance',
  'Marketing',
  'Office Rent',
  'Utilities',
  'Professional Fees',
  'Travel',
  'Software',
  'Other'
];

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date(),
    taxDeductible: false
  });

  useEffect(() => {
    if (expense && isOpen) {
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        date: new Date(expense.date),
        taxDeductible: expense.taxDeductible
      });
    }
  }, [expense, isOpen]);

  const handleSave = async () => {
    if (!formData.category || !formData.description || !formData.amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const updatedExpense: Expense = {
        id: expense?.id || Date.now(),
        category: formData.category,
        description: formData.description,
        amount: amount,
        date: formData.date.toISOString().split('T')[0],
        taxDeductible: formData.taxDeductible
      };

      // In a real implementation, you would save to the database here
      // For now, we'll just call the onSave callback
      onSave(updatedExpense);

      toast({
        title: "Expense Updated",
        description: "Your expense has been updated successfully"
      });

      onClose();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({
        title: "Error",
        description: "Failed to update expense. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;

    try {
      setLoading(true);

      // In a real implementation, you would delete from the database here
      // For now, we'll just close the modal
      toast({
        title: "Expense Deleted",
        description: "The expense has been removed"
      });

      onClose();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription>
            Update the expense details below. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select expense category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the expense..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (£) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                  disabled={isDateDisabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tax Deductible */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="taxDeductible"
              checked={formData.taxDeductible}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, taxDeductible: !!checked }))}
            />
            <Label htmlFor="taxDeductible" className="text-sm font-normal">
              This expense is tax deductible
            </Label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {expense && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
