import { supabase } from '@/integrations/supabase/client';

export interface Utterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionResponse {
  id: string;
  status: string;
  text: string | null;
  utterances?: Utterance[] | null;
}

export async function transcribeFile(input: string, opts?: { speakerLabels?: boolean; languageCode?: string; isStoragePath?: boolean }) {
  const { data, error } = await supabase.functions.invoke('transcribe-file', {
    body: {
      ...(opts?.isStoragePath ? { storage_path: input } : { audio_url: input }),
      speaker_labels: !!opts?.speakerLabels,
      language_code: opts?.languageCode,
    },
  });
  
  if (error) {
    // Log error details for debugging
    console.error('[transcribeFile] Error:', {
      message: error?.message,
      status: error?.status,
      context: error?.context,
    });
    
    // Extract detailed error message if available
    let errorMessage = error?.message || 'Transcription failed';
    
    // Handle specific error types
    if (error?.status === 401) {
      errorMessage = 'Authentication failed. Please sign in again.';
    } else if (error?.status === 403) {
      errorMessage = 'Pro plan required. Please upgrade to use transcription.';
    } else if (error?.context?.response) {
      try {
        const response = error.context.response;
        let responseBody: any;
        
        if (response instanceof Response) {
          const responseToRead = response.clone ? response.clone() : response;
          try {
            responseBody = await responseToRead.json();
          } catch {
            const text = await responseToRead.text();
            try {
              responseBody = JSON.parse(text);
            } catch {
              responseBody = { error: text };
            }
          }
        } else if (typeof response === 'object') {
          responseBody = response;
        }
        
        if (responseBody?.error) {
          errorMessage = responseBody.error;
          if (responseBody.details) {
            errorMessage += `: ${responseBody.details}`;
          }
        }
      } catch (e) {
        console.warn('[transcribeFile] Failed to parse error response:', e);
      }
    }
    
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).status = error.status;
    throw enhancedError;
  }
  
  // Extract utterances from response if available
  const response = data as { id: string; status: string; text: string | null; utterances?: Utterance[] | null };
  
  return {
    id: response.id,
    status: response.status,
    text: response.text,
    utterances: response.utterances || null,
  } as TranscriptionResponse;
}

/**
 * Extracts detailed error message from FunctionsHttpError or other error types
 * Also detects common error types and provides user-friendly messages
 */
async function extractErrorDetails(error: any): Promise<string> {
  let errorMessage = 'SOAP generation failed';
  let errorDetails = '';

  // Try multiple methods to extract error details
  // 1. Try to extract from FunctionsHttpError context.response
  if (error?.context?.response) {
    try {
      const response = error.context.response;
      let responseBody: any;
      
      // Handle Response object (needs to be read, and can only be read once)
      if (response instanceof Response) {
        // Clone the response if possible to avoid "already read" errors
        const responseToRead = response.clone ? response.clone() : response;
        try {
          responseBody = await responseToRead.json();
        } catch {
          // If JSON parsing fails, try text
          const text = await responseToRead.text();
          try {
            responseBody = JSON.parse(text);
          } catch {
            responseBody = { error: text };
          }
        }
      } else if (typeof response === 'string') {
        responseBody = JSON.parse(response);
      } else if (typeof response === 'object') {
        // Already parsed object
        responseBody = response;
      }
      
      if (responseBody?.error) {
        errorMessage = responseBody.error;
        if (responseBody.details) {
          errorDetails = typeof responseBody.details === 'string' 
            ? responseBody.details 
            : JSON.stringify(responseBody.details);
        }
      }
    } catch (e) {
      console.warn('[extractErrorDetails] Failed to parse error response:', e);
    }
  }
  
  // 2. Try error.context.message (some Supabase errors use this)
  if ((!errorMessage || errorMessage === 'SOAP generation failed') && error?.context?.message) {
    try {
      const contextMessage = typeof error.context.message === 'string' 
        ? JSON.parse(error.context.message) 
        : error.context.message;
      if (contextMessage?.error) {
        errorMessage = contextMessage.error;
        if (contextMessage.details) {
          errorDetails = typeof contextMessage.details === 'string' 
            ? contextMessage.details 
            : JSON.stringify(contextMessage.details);
        }
      }
    } catch (e) {
      // Not JSON, use as-is
      if (typeof error.context.message === 'string') {
        errorMessage = error.context.message;
      }
    }
  }

  // 3. Fallback to error.message if available
  if (!errorMessage || errorMessage === 'SOAP generation failed') {
    if (error?.message) {
      errorMessage = error.message;
    }
  }

  // Detect common error types based on message content
  const lowerMessage = errorMessage.toLowerCase();
  
  // Missing API key errors
  if (lowerMessage.includes('groq_api_key') || lowerMessage.includes('api key') || lowerMessage.includes('api_key')) {
    errorMessage = 'AI service configuration error. Please contact support.';
  }
  
  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    errorMessage = 'Authentication failed. Please sign in again.';
  }
  
  // Pro plan errors
  if (lowerMessage.includes('pro plan') || lowerMessage.includes('subscription')) {
    errorMessage = 'Pro plan required. Please upgrade to use AI SOAP notes generation.';
  }
  
  // Validation errors
  if (lowerMessage.includes('transcript') && (lowerMessage.includes('required') || lowerMessage.includes('invalid'))) {
    errorMessage = 'Invalid transcript. Please ensure your transcript is not empty and properly formatted.';
  }

  // Combine message and details
  if (errorDetails) {
    return `${errorMessage}: ${errorDetails}`;
  }

  // Add status code if available
  if (error?.status) {
    return `${errorMessage} (Status: ${error.status})`;
  }

  return errorMessage;
}

export async function generateSoapNotes(
  transcript: string, 
  ctx?: { 
    sessionType?: string; 
    chiefComplaint?: string;
    clientId?: string;
    sessionId?: string;
  }
) {
  const { data, error } = await supabase.functions.invoke('soap-notes', {
    body: {
      transcript,
      session_type: ctx?.sessionType,
      chief_complaint: ctx?.chiefComplaint,
      client_id: ctx?.clientId,
      session_id: ctx?.sessionId,
    },
  });
  
  if (error) {
    // Log full error structure for debugging
    console.error('[generateSoapNotes] Full error structure:', {
      message: error?.message,
      name: error?.name,
      status: error?.status,
      context: error?.context,
      contextKeys: error?.context ? Object.keys(error.context) : [],
      responseType: error?.context?.response ? typeof error.context.response : 'none',
      isResponse: error?.context?.response instanceof Response,
    });
    
    // Extract detailed error message (async to handle Response objects)
    const errorMessage = await extractErrorDetails(error);
    
    // Create enhanced error with original error attached
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).status = error.status;
    (enhancedError as any).context = error.context;
    
    throw enhancedError;
  }
  
  // Check if data contains error (sometimes Edge Functions return errors in data with 200 status)
  if (data && (data as any).error) {
    const errorMessage = (data as any).error;
    const errorDetails = (data as any).details;
    throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
  }
  
  return data as { subjective: string; objective: string; assessment: string; plan: string };
}

export async function uploadAudioReturnPath(blob: Blob): Promise<string> {
  const fileName = `mic-${Date.now()}.webm`;
  const bucket = 'recordings';
  const { data: upload, error: upErr } = await supabase.storage.from(bucket).upload(fileName, blob, {
    contentType: 'audio/webm',
    upsert: false,
  });
  if (upErr) throw upErr;
  return `${bucket}/${upload.path}`;
}

import { supabase } from '@/integrations/supabase/client';

export interface TranscriptionOptions {
  diarization?: boolean;
  languageCode?: string;
}

export async function transcribeAudioUrl(audioUrl: string, options: TranscriptionOptions = {}) {
  const { data, error } = await supabase.functions.invoke('ai-soap-transcribe', {
    body: {
      audio_url: audioUrl,
      diarization: !!options.diarization,
      language_code: options.languageCode,
    },
  });
  if (error) throw new Error(error.message || 'Transcription failed');
  if (!data?.success) throw new Error(data?.error || 'Transcription incomplete');
  return data as { success: true; id: string; text: string; words?: any[]; utterances?: any[] };
}

export interface SoapResponse {
  success: boolean;
  soap?: { Subjective: string; Objective: string; Assessment: string; Plan: string };
}

export async function generateSoapFromTranscript(transcript: string, chiefComplaint?: string) {
  const { data, error } = await supabase.functions.invoke('soap-notes', {
    body: { transcript, chief_complaint: chiefComplaint },
  });
  
  if (error) {
    // Extract detailed error message (async to handle Response objects)
    const errorMessage = await extractErrorDetails(error);
    
    // Create enhanced error with original error attached
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).status = error.status;
    (enhancedError as any).context = error.context;
    
    throw enhancedError;
  }
  
  // Check if data contains error (sometimes Edge Functions return errors in data with 200 status)
  if (data && (data as any).error) {
    const errorMessage = (data as any).error;
    const errorDetails = (data as any).details;
    throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
  }
  
  return data as SoapResponse;
}


