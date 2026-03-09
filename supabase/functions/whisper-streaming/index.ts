import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, language } = await req.json()
    console.log('Received streaming transcription request')
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    // Process audio in chunks
    console.log('Processing audio chunk...')
    const binaryAudio = processBase64Chunks(audio)
    console.log(`Processed audio chunk size: ${binaryAudio.length} bytes`)
    
    // Validate Lemonfox API Key
    const lemonfoxApiKey = Deno.env.get('LEMONFOX_API_KEY')
    if (!lemonfoxApiKey) {
      console.error('LEMONFOX_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'LEMONFOX_API_KEY environment variable is not set. Please configure this in your Supabase project settings.' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare form data
    const formData = new FormData()
    const blob = new Blob([binaryAudio], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')
    formData.append('response_format', 'json')
    formData.append('language', language || 'english') // Use provided language or default to English

    console.log('Sending to Lemonfox.ai Whisper API for streaming...')
    console.log(`API Key present: ${lemonfoxApiKey ? 'Yes' : 'No'}`)
    console.log(`Audio chunk size: ${binaryAudio.length} bytes`)
    console.log(`Language: ${language || 'english'}`)
    
    // Send to Lemonfox.ai
    const response = await fetch('https://api.lemonfox.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lemonfoxApiKey}`,
        // Don't set Content-Type header - let browser set it with boundary for FormData
      },
      body: formData,
    })

    console.log(`Lemonfox.ai response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Lemonfox.ai API error details:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      let errorMessage = `Lemonfox.ai API error (${response.status}): ${errorText}`
      
      // Try to parse error JSON if possible
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = errorJson.error.message || errorJson.error || errorText
        }
      } catch {
        // Not JSON, use text as-is
      }
      
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('Streaming transcription completed successfully')
    console.log('Response structure:', Object.keys(result))

    // Handle response - Lemonfox.ai returns { text: "..." } format
    if (!result.text) {
      console.error('Unexpected response format:', result)
      throw new Error('Invalid response format from Lemonfox.ai API')
    }

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Streaming transcription error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

