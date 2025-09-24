# 🎤 SOAP Notes with Speech-to-Text

## Overview

Our advanced SOAP Notes system combines real-time speech-to-text transcription with professional templates and AI-powered suggestions to revolutionize how therapists document their sessions. This feature enables practitioners to focus on their clients while automatically capturing detailed clinical notes.

## ✨ Key Features

### 🎙️ **Live Speech-to-Text Recording**
- **Real-time transcription** during live therapy sessions
- **Continuous recording** with pause/resume functionality
- **Audio level monitoring** for optimal recording quality
- **Automatic SOAP categorization** based on speech content
- **Multi-language support** (English, Spanish, French, German)

### 📋 **Professional SOAP Templates**
- **Deep Tissue Massage** - Chronic tension and postural assessment
- **Sports Therapy** - Injury rehabilitation and return-to-play protocols
- **Prenatal Massage** - Pregnancy-specific considerations and safety
- **Rehabilitation Therapy** - Functional assessment and goal setting
- **General Wellness** - Stress management and lifestyle recommendations

### 🤖 **AI-Powered Intelligence**
- **Smart categorization** of transcribed text into SOAP sections
- **Confidence scoring** for transcription accuracy
- **Contextual suggestions** for improved documentation
- **Keyword recognition** for therapy-specific terminology

### 📱 **User Experience**
- **Tabbed interface** for organized workflow
- **Real-time editing** alongside transcription
- **Session history** with search and filtering
- **Export capabilities** for clinical records
- **Mobile-responsive** design for all devices

## 🏗️ Architecture

### Components Structure
```
src/components/session/
├── LiveSOAPNotes.tsx          # Real-time recording & transcription
├── SOAPNotesTemplate.tsx      # Professional templates & AI suggestions
├── SOAPNotesDashboard.tsx     # Main dashboard & session management
├── SOAPNotesViewer.tsx        # View and review completed notes
└── SessionRecorder.tsx        # Legacy audio recording component
```

### Data Flow
1. **Audio Capture** → Microphone access via Web Audio API
2. **Speech Recognition** → Browser's Speech Recognition API
3. **Real-time Processing** → Text categorization and SOAP mapping
4. **Storage** → Supabase database with audio file storage
5. **Retrieval** → Dashboard for viewing and editing notes

## 🚀 Getting Started

### Prerequisites
- Modern browser with Speech Recognition support
- Microphone access permissions
- Supabase project configured
- Required database tables (see Database Schema)

### Installation
The SOAP Notes components are already integrated into your project. To use them:

1. **Import the dashboard** in your main app:
```tsx
import { SOAPNotesDashboard } from '@/components/session/SOAPNotesDashboard';
```

2. **Add to your routes**:
```tsx
<Route path="/soap-notes" element={<SOAPNotesDashboard />} />
```

3. **Configure database** (see Database Setup below)

## 🗄️ Database Schema

### Required Tables
```sql
-- Session recordings table
CREATE TABLE session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES client_sessions(id),
  practitioner_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES auth.users(id),
  audio_file_path TEXT,
  transcript TEXT,
  soap_subjective TEXT,
  soap_objective TEXT,
  soap_assessment TEXT,
  soap_plan TEXT,
  chief_complaint TEXT,
  session_notes TEXT,
  ai_summary TEXT,
  ai_key_points TEXT[],
  status TEXT DEFAULT 'draft',
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own recordings" ON session_recordings
  FOR SELECT USING (auth.uid() = practitioner_id OR auth.uid() = client_id);

CREATE POLICY "Practitioners can insert recordings" ON session_recordings
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their recordings" ON session_recordings
  FOR UPDATE USING (auth.uid() = practitioner_id);
```

### Storage Bucket
```sql
-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('session-recordings', 'session-recordings', false);

-- Storage policies
CREATE POLICY "Users can upload their own recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'session-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'session-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 💻 Usage Guide

### 1. **Starting a Live Session**
1. Navigate to SOAP Notes Dashboard
2. Click "New SOAP Notes"
3. Select "Live Recording" tab
4. Click "Start Recording" button
5. Grant microphone permissions when prompted

### 2. **During Recording**
- **Speak naturally** - The system captures everything you say
- **Use SOAP keywords** for automatic categorization:
  - **Subjective**: "patient reports", "client feels", "complains of"
  - **Objective**: "observed", "palpation", "range of motion"
  - **Assessment**: "diagnosis", "findings", "evaluation"
  - **Plan**: "treatment plan", "next steps", "recommendations"

### 3. **Managing Templates**
1. Switch to "Templates" tab
2. Choose therapy type (auto-selected based on session)
3. Apply template to get structured starting point
4. Customize content for specific client needs

### 4. **Reviewing and Editing**
1. Switch to "View Notes" tab
2. Review transcribed content
3. Edit any sections as needed
4. Save changes automatically

### 5. **Session Management**
1. Use "Session History" tab
2. Search and filter by client, type, or status
3. View, edit, or delete previous sessions
4. Export notes for clinical records

## 🔧 Configuration

### Speech Recognition Settings
```typescript
// Language selection
transcriptionLanguage: 'en-GB' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE'

// Confidence threshold (0.1 - 1.0)
confidenceThreshold: 0.7

// Auto-categorization keywords
const subjectiveKeywords = ['patient says', 'client reports', 'feels', 'experiences'];
const objectiveKeywords = ['observed', 'palpation', 'range of motion', 'strength'];
const assessmentKeywords = ['diagnosis', 'assessment', 'findings', 'conclusion'];
const planKeywords = ['treatment plan', 'next steps', 'recommendations', 'follow up'];
```

### Audio Recording Settings
```typescript
// Audio quality settings
const audioSettings = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 44100,
  channelCount: 1
};

// Recording format
mimeType: 'audio/webm;codecs=opus'
```

## 🎯 Best Practices

### For Therapists
1. **Speak clearly** and at a moderate pace
2. **Use consistent terminology** for better AI recognition
3. **Pause briefly** between SOAP sections
4. **Review and edit** transcribed content before finalizing
5. **Save frequently** to avoid data loss

### For Developers
1. **Test microphone permissions** before starting recording
2. **Handle speech recognition errors** gracefully
3. **Implement fallback** for unsupported browsers
4. **Optimize audio processing** for performance
5. **Secure audio storage** with proper access controls

## 🚨 Troubleshooting

### Common Issues

#### **Microphone Not Working**
- Check browser permissions
- Ensure HTTPS connection (required for microphone access)
- Test with browser's microphone settings

#### **Speech Recognition Errors**
- Verify browser support (Chrome, Edge, Safari)
- Check internet connection (required for some APIs)
- Clear browser cache and cookies

#### **Poor Transcription Quality**
- Adjust microphone positioning
- Reduce background noise
- Speak more clearly and slowly
- Lower confidence threshold

#### **Audio Recording Issues**
- Check available storage space
- Verify Supabase storage configuration
- Ensure proper RLS policies

### Browser Compatibility
| Browser | Speech Recognition | Audio Recording | Status |
|---------|-------------------|-----------------|---------|
| Chrome | ✅ Full Support | ✅ Full Support | 🟢 Recommended |
| Edge | ✅ Full Support | ✅ Full Support | 🟢 Recommended |
| Safari | ⚠️ Limited | ✅ Full Support | 🟡 Good |
| Firefox | ❌ Not Supported | ✅ Full Support | 🔴 Limited |

## 🔒 Security & Privacy

### Data Protection
- **Audio encryption** in transit and at rest
- **User isolation** via Row Level Security (RLS)
- **Access controls** based on user roles
- **Audit logging** for compliance

### HIPAA Compliance
- **Secure transmission** via HTTPS
- **Data encryption** at rest
- **Access logging** for audit trails
- **User authentication** required
- **Session timeout** for security

## 📈 Performance Optimization

### Audio Processing
- **Streaming transcription** for real-time feedback
- **Chunked recording** to prevent memory issues
- **Background processing** for AI suggestions
- **Lazy loading** of session history

### Database Optimization
- **Indexed queries** for fast search
- **Pagination** for large datasets
- **Caching** for frequently accessed data
- **Compression** for audio storage

## 🚀 Future Enhancements

### Planned Features
- **Advanced AI analysis** of session content
- **Voice command shortcuts** for common actions
- **Integration with EHR systems** via FHIR
- **Mobile app** for offline recording
- **Multi-user collaboration** for team practices

### AI Improvements
- **Custom vocabulary training** for therapy specialties
- **Sentiment analysis** of client responses
- **Treatment outcome prediction** based on notes
- **Automated follow-up scheduling**

## 📚 API Reference

### LiveSOAPNotes Component
```typescript
interface LiveSOAPNotesProps {
  sessionId: string;
  clientName: string;
  clientId: string;
  onSave?: (soapData: SOAPData) => void;
}

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chief_complaint: string;
  session_notes: string;
}
```

### SOAPNotesTemplate Component
```typescript
interface SOAPNotesTemplateProps {
  therapyType?: string;
  clientName?: string;
  onTemplateSelect?: (template: SOAPTemplate) => void;
  onSave?: (soapData: SOAPData) => void;
}
```

### SOAPNotesDashboard Component
```typescript
interface SOAPNotesDashboardProps {
  clientId?: string;
  sessionId?: string;
}
```

## 🤝 Contributing

### Development Setup
1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up Supabase** with required tables
4. **Configure environment variables**
5. **Run development server**: `npm run dev`

### Testing
- **Unit tests** for component logic
- **Integration tests** for API calls
- **E2E tests** for user workflows
- **Accessibility testing** for screen readers

## 📞 Support

### Getting Help
- **Documentation**: Check this README first
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Email**: Contact development team

### Resources
- **Speech Recognition API**: [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- **Web Audio API**: [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- **Supabase**: [Official Documentation](https://supabase.com/docs)

---

## 🎉 Conclusion

Our SOAP Notes with Speech-to-Text system represents a significant advancement in therapy documentation, combining cutting-edge technology with clinical best practices. By automating the note-taking process, therapists can focus more on their clients while maintaining comprehensive, accurate records.

The system is designed to be:
- **Easy to use** for practitioners of all technical levels
- **Secure and compliant** with healthcare regulations
- **Scalable** for practices of any size
- **Extensible** for future enhancements

Start using this powerful tool today to transform how you document your therapy sessions! 🚀
