import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LiveSOAPNotes } from './LiveSOAPNotes';

// Mock the dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'mock-metric-id' },
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: {
            subjective: '',
            objective: '',
            assessment: '',
            plan: '',
            chief_complaint: '',
            session_notes: ''
          },
          error: null
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            error: null
          }))
        }))
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => ({ error: null }))
      }))
    },
    auth: {
      getSession: jest.fn(() => ({ data: { session: {} } }))
    },
    functions: {
      invoke: jest.fn(() => ({ data: {}, error: null }))
    }
  }
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'mock-practitioner-id' }
  })
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Mic: () => <div data-testid="icon-mic" />,
  MicOff: () => <div data-testid="icon-mic-off" />,
  Square: () => <div data-testid="icon-square" />,
  Play: () => <div data-testid="icon-play" />,
  Pause: () => <div data-testid="icon-pause" />,
  Save: () => <div data-testid="icon-save" />,
  FileText: () => <div data-testid="icon-file-text" />,
  Clock: () => <div data-testid="icon-clock" />,
  User: () => <div data-testid="icon-user" />,
  Stethoscope: () => <div data-testid="icon-stethoscope" />,
  Eye: () => <div data-testid="icon-eye" />,
  Target: () => <div data-testid="icon-target" />,
  Clipboard: () => <div data-testid="icon-clipboard" />,
  Volume2: () => <div data-testid="icon-volume-2" />,
  VolumeX: () => <div data-testid="icon-volume-x" />,
  Settings: () => <div data-testid="icon-settings" />,
  Zap: () => <div data-testid="icon-zap" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Loader2: () => <div data-testid="icon-loader-2" />,
  Plus: () => <div data-testid="icon-plus" />
}));

describe('LiveSOAPNotes Component', () => {
  const mockOnSave = jest.fn();
  const defaultProps = {
    sessionId: 'mock-session-id',
    clientName: 'John Doe',
    clientId: 'mock-client-id',
    onSave: mockOnSave
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.skip('renders correctly and shows suggested prompts in Objective tab', async () => {
    const user = userEvent.setup();
    render(<LiveSOAPNotes {...defaultProps} />);
    
    // Switch to Objective tab
    const objectiveTab = screen.getByRole('tab', { name: /Objective/i });
    await user.click(objectiveTab);
    
    // Check for Suggested Prompts section
    await waitFor(() => {
      expect(screen.getByText('Suggested Prompts (Optional)')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Pain Score (VAS)')).toBeInTheDocument();
    expect(screen.getByText('Range of Motion (ROM)')).toBeInTheDocument();
    expect(screen.getByText('Strength Testing')).toBeInTheDocument();
  });

  it('calls onSave with completed status when Complete Note is clicked', async () => {
    const user = userEvent.setup();
    render(<LiveSOAPNotes {...defaultProps} />);
    
    const completeButton = screen.getByText('Complete Note');
    await user.click(completeButton);
    
    // Should call onSave with 'completed'
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        subjective: expect.any(String),
        objective: expect.any(String)
      }),
      'completed'
    );
  });
  
  it('disables editing when isCompleted is true', () => {
    render(<LiveSOAPNotes {...defaultProps} isCompleted={true} />);
    
    // Save button should be disabled
    const saveButton = screen.getByText('Save Note');
    expect(saveButton).toBeDisabled();
    
    // Check main textareas using correct placeholder
    const subjectiveInput = screen.getByPlaceholderText("Patient's reported symptoms and history...");
    expect(subjectiveInput).toBeDisabled();
  });
});
