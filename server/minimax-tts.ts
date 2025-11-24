import fetch from 'node-fetch';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;
// Use official API domain (no GroupId needed in URL for new API structure)
const MINIMAX_BASE_URL = 'https://api.minimax.io/v1/t2a_v2';

export interface VoiceConfig {
  voiceId?: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
  speed?: number;
}

export interface MinimaxTTSOptions {
  text: string;
  model?: 'speech-02-hd' | 'speech-02-turbo';
  voiceConfig?: VoiceConfig;
}

// Agent-specific voice configurations
// Using Minimax's actual voice IDs (male-qn-qingse, female-shaonv, etc.)
export const AGENT_VOICES: Record<string, VoiceConfig> = {
  architect: {
    voiceId: 'male-qn-qingse', // Professional male voice
    emotion: 'neutral',
    speed: 0.95, // Slightly slower, more thoughtful
  },
  backend: {
    voiceId: 'male-qn-qingse', // Technical male voice (deeper tone)
    emotion: 'neutral',
    speed: 1.1, // Slightly faster, technical precision
  },
  frontend: {
    voiceId: 'female-shaonv', // Young female voice, energetic
    emotion: 'happy',
    speed: 1.05, // Slightly faster, more energetic
  },
  qa: {
    voiceId: 'male-qn-jingying', // Mature professional male voice
    emotion: 'neutral',
    speed: 0.98, // Careful, deliberate pace
  },
};

export async function generateSpeech(options: MinimaxTTSOptions): Promise<Buffer | null> {
  if (!MINIMAX_API_KEY) {
    console.warn('[Minimax TTS] API key not configured, skipping TTS generation');
    return null;
  }

  if (!MINIMAX_GROUP_ID) {
    console.warn('[Minimax TTS] GroupId not configured, skipping TTS generation');
    return null;
  }

  try {
    const { text, model = 'speech-02-turbo', voiceConfig = {} } = options;

    console.log(`[Minimax TTS] Generating speech: ${text.substring(0, 50)}...`);
    console.log(`[Minimax TTS] Model: ${model}, Voice: ${voiceConfig.voiceId || 'male-qn-qingse'}`);

    // Use CORRECT Minimax API structure with nested objects
    const requestBody: any = {
      model,
      text,
      stream: false,
      voice_setting: {
        voice_id: voiceConfig.voiceId || 'male-qn-qingse',
        speed: voiceConfig.speed || 1.0,
        vol: 1.0,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    };

    console.log('[Minimax TTS] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(MINIMAX_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Minimax TTS] API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json() as any;

    // Check for error response first
    if (data.base_resp && data.base_resp.status_code !== 0) {
      console.error('[Minimax TTS] API error:', data.base_resp.status_msg);
      console.error('[Minimax TTS] Full error response:', JSON.stringify(data, null, 2));
      return null;
    }

    // Minimax returns HEX encoded audio in data.audio field (not base64!)
    let audioHex: string | null = null;
    
    if (data.data && data.data.audio) {
      audioHex = data.data.audio;
    } else if (data.audio) {
      audioHex = data.audio;
    } else if (data.extra_info && data.extra_info.audio_file) {
      audioHex = data.extra_info.audio_file;
    }
    
    if (audioHex) {
      // Minimax returns HEX, not base64 - convert from hex to buffer
      const audioBuffer = Buffer.from(audioHex, 'hex');
      console.log(`[Minimax TTS] Generated ${audioBuffer.length} bytes of audio from hex`);
      return audioBuffer;
    } else {
      console.error('[Minimax TTS] No audio data in response');
      console.error('[Minimax TTS] Response keys:', Object.keys(data));
      console.error('[Minimax TTS] Full response:', JSON.stringify(data, null, 2).substring(0, 1000));
      return null;
    }
  } catch (error: any) {
    console.error('[Minimax TTS] Error generating speech:', error.message);
    return null;
  }
}

// Truncate text to prevent excessively long audio generation
function truncateTextForTTS(text: string, maxChars: number = 1000): string {
  if (text.length <= maxChars) {
    return text;
  }
  
  // Truncate at sentence boundary if possible
  const truncated = text.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  if (lastSentenceEnd > maxChars * 0.7) {
    // Found a sentence boundary in reasonable range
    return text.substring(0, lastSentenceEnd + 1);
  }
  
  // No good sentence boundary, just truncate
  return truncated + '...';
}

export async function generateAgentSpeech(agentRole: string, text: string): Promise<Buffer | null> {
  const voiceConfig = AGENT_VOICES[agentRole] || AGENT_VOICES.architect;
  
  // Safeguard: Truncate extremely long text to prevent slow generation
  const truncatedText = truncateTextForTTS(text, 1000);
  
  if (truncatedText.length < text.length) {
    console.warn(`[Minimax TTS] Truncated text from ${text.length} to ${truncatedText.length} chars for TTS generation`);
  }
  
  return generateSpeech({
    text: truncatedText,
    model: 'speech-02-turbo', // Fast model for real-time demo
    voiceConfig,
  });
}
