# PracticeClientManagement.tsx Refactoring Plan

## Current State
- **File Size**: 4,553 lines
- **Location**: `src/pages/practice/PracticeClientManagement.tsx`
- **Complexity**: Very High - Contains multiple distinct features in a single component

## Identified Sections for Extraction

### 1. Client List & Search (`ClientListSidebar.tsx`)
- **Lines**: ~300-600
- **Features**:
  - Client search functionality
  - Client list rendering
  - Client selection
  - Status filtering
- **State to Extract**:
  - `clients`, `searchTerm`, `statusFilter`, `selectedClient`
- **Props Needed**:
  - `clients`, `searchTerm`, `onSearchChange`, `statusFilter`, `onStatusFilterChange`, `selectedClient`, `onClientSelect`

### 2. Session Management (`SessionManagementTab.tsx`)
- **Lines**: ~600-1200
- **Features**:
  - Session list display
  - Session filtering
  - Session actions (view, edit, complete)
- **State to Extract**:
  - `sessions`, `treatmentNotesSearch`, `sessionsWithNotes`, `completedSessions`
- **Props Needed**:
  - `sessions`, `selectedClient`, `onSessionSelect`, `onOpenNoteModal`

### 3. SOAP/DAP Note Editor (`SOAPNoteEditor.tsx`)
- **Lines**: ~1200-2000
- **Features**:
  - SOAP note editing (Subjective, Objective, Assessment, Plan)
  - DAP note editing (Data, Assessment, Plan)
  - Template switching
  - Auto-save functionality
  - Completion status
- **State to Extract**:
  - `soapNote`, `dapNote`, `selectedTemplate`, `isSavingSOAP`, `hasUnsavedChanges`, `lastSavedTime`, `isNoteCompleted`
- **Props Needed**:
  - `session`, `onSave`, `onComplete`, `onClose`

### 4. Treatment Notes (`TreatmentNotesTab.tsx`)
- **Lines**: ~2000-2500
- **Features**:
  - Treatment notes display
  - Notes search
  - Notes completion tracking
- **State to Extract**:
  - `treatmentNotesSearch`, `viewingCompletedNote`, `completedNoteData`
- **Props Needed**:
  - `sessions`, `selectedClient`, `onNoteView`

### 5. Progress Tracking (`ProgressTrackingTab.tsx`)
- **Lines**: ~2500-3000
- **Features**:
  - Client progress display
  - Progress metrics
  - Progress history
- **State to Extract**:
  - `resolvedProgressClientId`, `resolvingProgressClientId`
- **Props Needed**:
  - `selectedClient`, `sessions`

### 6. Goals Management (`GoalsManagementTab.tsx`)
- **Lines**: ~3000-3500
- **Features**:
  - Goals display
  - Goal creation/editing
  - Goal tracking
- **Props Needed**:
  - `selectedClient`, `sessions`

### 7. Transcription & AI Tools (`TranscriptionTools.tsx`)
- **Lines**: ~3500-4000
- **Features**:
  - Audio recording
  - Transcription
  - SOAP note generation from transcription
  - AI feedback
- **State to Extract**:
  - `transcript`, `utterances`, `generatedSoap`, `loadingTranscribe`, `loadingSoap`, `recording`, `recordingTime`, `showAiTools`, `soapFeedback`, `autoProcessingStep`, `mediaRecorderRef`, `recordingTimerRef`, `chunksRef`, `language`, `diarization`
- **Props Needed**:
  - `session`, `onTranscriptionComplete`, `onSoapGenerated`

### 8. HEP Management (`HEPManagement.tsx`)
- **Lines**: ~4000-4200
- **Features**:
  - HEP creation
  - HEP progress tracking
- **Props Needed**:
  - `selectedClient`, `sessions`

### 9. Patient History Requests (`PatientHistoryRequests.tsx`)
- **Lines**: ~4200-4400
- **Features**:
  - History request creation
  - Request list display
- **Props Needed**:
  - `selectedClient`

### 10. Messaging (`ClientMessaging.tsx`)
- **Lines**: ~4400-4553
- **Features**:
  - Message sending
  - Message history
- **State to Extract**:
  - `isMessageModalOpen`, `messageText`
- **Props Needed**:
  - `selectedClient`, `onClose`

## Refactoring Strategy

### Phase 1: Extract UI Components (Low Risk)
1. Extract `ClientListSidebar` component
2. Extract `SessionManagementTab` component
3. Extract `SOAPNoteEditor` component

### Phase 2: Extract Feature Components (Medium Risk)
4. Extract `TreatmentNotesTab` component
5. Extract `ProgressTrackingTab` component
6. Extract `GoalsManagementTab` component

### Phase 3: Extract Complex Features (Higher Risk)
7. Extract `TranscriptionTools` component
8. Extract `HEPManagement` component
9. Extract `PatientHistoryRequests` component
10. Extract `ClientMessaging` component

### Phase 4: Consolidate & Optimize
11. Review and optimize prop drilling
12. Create shared hooks for common logic
13. Add unit tests for extracted components

## Benefits
- **Maintainability**: Smaller, focused components are easier to understand and modify
- **Testability**: Individual components can be tested in isolation
- **Reusability**: Components can be reused in other parts of the application
- **Performance**: Smaller components can be optimized independently
- **Developer Experience**: Easier to navigate and work with smaller files

## Risks & Mitigation
- **Risk**: Breaking existing functionality during extraction
  - **Mitigation**: Extract one component at a time, test thoroughly, use TypeScript for type safety
- **Risk**: Prop drilling becoming excessive
  - **Mitigation**: Use React Context for shared state, create custom hooks for shared logic
- **Risk**: State management complexity
  - **Mitigation**: Keep state local to components where possible, use Context API for shared state

## Implementation Notes
- Each extracted component should have its own file in `src/components/practice/`
- Maintain backward compatibility during extraction
- Use TypeScript interfaces for all props
- Add JSDoc comments to all exported components
- Ensure all extracted components are properly tested
