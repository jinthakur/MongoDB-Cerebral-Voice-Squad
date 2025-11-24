import { Mic, Square, AlertCircle, Volume2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isProcessing?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceInput({ onTranscript, isProcessing = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isAutoRestarting, setIsAutoRestarting] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [showMicTest, setShowMicTest] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullTranscriptRef = useRef<string>("");
  const isStoppedByUserRef = useRef<boolean>(false);
  const restartCountRef = useRef<number>(0);
  const resultIndexRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.log("Not secure context");
      setIsSupported(false);
      setErrorMessage("Voice input requires HTTPS or localhost");
      return;
    }

    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.log("No SpeechRecognition support");
      setIsSupported(false);
      setErrorMessage("Browser not supported");
      return;
    }

    console.log("Speech Recognition supported!");

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("Recognition started");
      setIsListening(true);
      setIsAutoRestarting(false); // Clear auto-restart flag when actually started
      // Only reset on fresh start (not auto-restart)
      if (restartCountRef.current === 0 && !fullTranscriptRef.current) {
        setInterimTranscript("");
        fullTranscriptRef.current = "";
        resultIndexRef.current = 0;
      }
    };

    recognition.onresult = (event: any) => {
      console.log("🎉 GOT SPEECH! Recognition result event:", event.results.length);
      
      // Reset restart counter - we got speech!
      restartCountRef.current = 0;
      
      let newFinalTranscript = '';
      let interimTranscript = '';
      
      // Only process NEW results (skip already processed ones)
      // This prevents duplicates when Chrome auto-restarts
      for (let i = resultIndexRef.current; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          console.log("Final result:", transcript);
          newFinalTranscript += transcript + ' ';
          resultIndexRef.current = i + 1; // Track that we processed this result
        } else {
          console.log("Interim result:", transcript);
          interimTranscript += transcript + ' ';
        }
      }

      // Combine accumulated final + new interim for display
      const displayText = (fullTranscriptRef.current + ' ' + newFinalTranscript + ' ' + interimTranscript).trim();
      console.log("Display transcript:", displayText);
      
      // Update display with combined text
      setInterimTranscript(displayText);
      
      // Store accumulated final text in ref (this is what gets sent)
      if (newFinalTranscript) {
        fullTranscriptRef.current = (fullTranscriptRef.current + ' ' + newFinalTranscript).trim();
        console.log("Accumulated final transcript:", fullTranscriptRef.current);
      }
    };

    recognition.onerror = (event: any) => {
      console.log("Recognition error:", event.error);
      
      // Handle 'no-speech' by auto-restarting (Chrome is impatient!)
      if (event.error === 'no-speech') {
        console.log("No speech detected, auto-restarting...");
        
        // Don't restart if user manually stopped
        if (isStoppedByUserRef.current) {
          console.log("User stopped manually, not restarting");
          return;
        }
        
        // Limit restarts to prevent infinite loop
        if (restartCountRef.current < 3) {
          restartCountRef.current++;
          console.log(`Auto-restart attempt ${restartCountRef.current}/3`);
          
          // Restart after a brief delay
          setTimeout(() => {
            if (recognitionRef.current && !isStoppedByUserRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log("Could not restart:", e);
              }
            }
          }, 500);
          return;
        } else {
          console.log("Max restart attempts reached - microphone may not be working");
          toast({
            title: "No Speech Detected",
            description: "Your microphone may not be working properly. Try the Mic Test below.",
            variant: "destructive",
          });
        }
      }
      
      // Ignore 'aborted' errors
      if (event.error === 'aborted') {
        return;
      }
      
      // For other errors, clean up
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setIsListening(false);
      setInterimTranscript("");
      restartCountRef.current = 0;
      
      // Cleanup media stream on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      let errorMessage = "Voice recognition error";
      
      switch (event.error) {
        case 'audio-capture':
          errorMessage = "Microphone not found. Please check your device.";
          break;
        case 'not-allowed':
          errorMessage = "Microphone access denied. Please enable microphone permissions.";
          break;
        case 'network':
          errorMessage = "Network error. Please check your connection.";
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      toast({
        title: "Voice Input Error",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      console.log("Final transcript:", fullTranscriptRef.current);
      console.log("Stopped by user:", isStoppedByUserRef.current);
      
      // If we're auto-restarting due to no-speech, don't process yet
      if (restartCountRef.current > 0 && !isStoppedByUserRef.current) {
        console.log("Auto-restart in progress, not processing yet");
        return;
      }
      
      // AUTO-RESTART if user didn't manually stop AND we have content
      // This prevents Chrome from auto-ending when you pause while speaking
      if (!isStoppedByUserRef.current && fullTranscriptRef.current.trim()) {
        console.log("⚡ Chrome auto-ended, but user is still speaking - restarting!");
        setIsAutoRestarting(true); // Show "Auto-restarting..." indicator
        // CRITICAL: Reset result index so new results are captured after restart
        resultIndexRef.current = 0;
        try {
          recognitionRef.current?.start();
          return; // Don't process yet - keep listening!
        } catch (e) {
          console.log("Could not restart:", e);
          setIsAutoRestarting(false);
          // If restart fails, fall through to send what we have
        }
      }
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setIsListening(false);
      setIsAutoRestarting(false);
      restartCountRef.current = 0;
      
      // Send the accumulated transcript if we have one
      const finalTranscript = fullTranscriptRef.current.trim();
      if (finalTranscript) {
        console.log("Sending transcript to parent:", finalTranscript);
        setInterimTranscript("");
        fullTranscriptRef.current = "";
        resultIndexRef.current = 0; // Reset result index for next session
        
        // Cleanup media stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        
        onTranscript(finalTranscript);
      } else {
        console.log("No transcript to send");
        setInterimTranscript("");
        fullTranscriptRef.current = "";
        resultIndexRef.current = 0; // Reset result index
        
        // Cleanup media stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      }
      
      // Reset the flag
      isStoppedByUserRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((err) => {
          console.log("AudioContext cleanup error (safe to ignore):", err);
        });
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTranscript, toast]);

  const startAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, average));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error("Error setting up audio monitoring:", error);
    }
  };

  const stopAudioLevelMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch((err) => {
        console.log("AudioContext close error (safe to ignore):", err);
      });
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const handleStart = async () => {
    if (isProcessing || !isSupported) return;

    try {
      console.log("Requesting microphone access...");
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      console.log("Microphone access granted");
      
      // Start audio level monitoring
      startAudioLevelMonitoring(stream);
      
      // Reset state
      fullTranscriptRef.current = "";
      isStoppedByUserRef.current = false;
      restartCountRef.current = 0;
      
      // Start speech recognition
      console.log("Starting recognition...");
      recognitionRef.current?.start();
      
      // Auto-stop after 60 seconds max (increased to allow longer complex requests)
      timeoutRef.current = setTimeout(() => {
        console.log("60 second timeout - stopping");
        isStoppedByUserRef.current = true;
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        stopAudioLevelMonitoring();
      }, 60000);
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      
      let errorMsg = "Failed to access microphone.";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = "Microphone permission denied. Please allow microphone access and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMsg = "No microphone found. Please connect a microphone and try again.";
      }
      
      toast({
        title: "Microphone Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleStop = () => {
    console.log("User stopped recording");
    isStoppedByUserRef.current = true;
    restartCountRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    recognitionRef.current?.stop();
    stopAudioLevelMonitoring();
  };

  const handleMicTest = async () => {
    if (showMicTest) {
      // Stop test
      setShowMicTest(false);
      stopAudioLevelMonitoring();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    } else {
      // Start test
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setShowMicTest(true);
        startAudioLevelMonitoring(stream);
        
        toast({
          title: "Mic Test Active",
          description: "Speak into your microphone - you should see the meter move!",
        });
      } catch (error) {
        console.error("Mic test error:", error);
        toast({
          title: "Microphone Error",
          description: "Could not access microphone for testing.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md" data-testid="voice-input-container">
      <button
        onClick={isListening ? handleStop : handleStart}
        disabled={isProcessing || !isSupported || showMicTest}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300
          ${isListening 
            ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 animate-pulse scale-105' 
            : isProcessing || !isSupported || showMicTest
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover-elevate active-elevate-2 shadow-md'
          }
        `}
        data-testid="button-voice-toggle"
      >
        {!isSupported ? (
          <AlertCircle className="w-8 h-8" />
        ) : isListening ? (
          <Square className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
        
        {isListening && (
          <span className="absolute -inset-1 rounded-full border-4 border-destructive animate-ping opacity-75" />
        )}
      </button>
      
      <div className="text-center min-h-[3rem] w-full px-4">
        {!isSupported ? (
          <p className="text-sm text-destructive" data-testid="text-voice-status">
            {errorMessage}
          </p>
        ) : isAutoRestarting ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary animate-pulse" data-testid="text-auto-restart">
              🔄 Auto-restarting... Keep speaking!
            </p>
            <p className="text-xs text-muted-foreground">
              (Brief pause detected - ready for more)
            </p>
          </div>
        ) : interimTranscript ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground italic" data-testid="text-interim-transcript">
              "{interimTranscript}"
            </p>
            {isListening && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleStop}
                data-testid="button-done"
              >
                Done Speaking
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="text-voice-status">
            {isProcessing ? 'Processing...' : isListening ? 'Listening... Start speaking now!' : 'Click microphone to start'}
          </p>
        )}
      </div>

      {/* Audio Level Meter */}
      {(isListening || showMicTest) && (
        <div className="w-full px-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Audio Level</span>
              <span>{Math.round(audioLevel)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
            {audioLevel < 2 && (isListening || showMicTest) && (
              <p className="text-xs text-muted-foreground">
                Waiting for speech...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mic Test Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleMicTest}
        disabled={isListening || isProcessing || !isSupported}
        className="gap-2"
        data-testid="button-mic-test"
      >
        <Volume2 className="w-4 h-4" />
        {showMicTest ? 'Stop Mic Test' : 'Test Microphone'}
      </Button>

      {showMicTest && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Microphone Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Speak into your microphone. The meter should move if it's working.
            </p>
            <p className="text-xs text-muted-foreground">
              If you don't see movement:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>Check if the correct microphone is selected in your browser</li>
              <li>Increase your microphone volume in system settings</li>
              <li>Make sure your microphone isn't muted</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
