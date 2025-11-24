import { useState } from "react";
import Header from "@/components/Header";
import VoiceInput from "@/components/VoiceInput";
import AgentCard, { type AgentStatus } from "@/components/AgentCard";
import CodeDisplay from "@/components/CodeDisplay";
import ConversationHistory from "@/components/ConversationHistory";
import ResearchSources from "@/components/ResearchSources";
import CommandHistory from "@/components/CommandHistory";
import { Compass, Database, Palette, Shield, ChevronLeft, ChevronRight, Code2, Download, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AgentState {
  status: AgentStatus;
  message: string;
  audioData?: string; // Base64 encoded MP3 audio
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface ResearchData {
  query: string;
  results: SearchResult[];
  allResults?: SearchResult[];
  totalAvailable?: number;
  summary: string;
}

interface Conversation {
  id: string;
  timestamp: Date;
  command: string;
  status: 'completed' | 'in-progress' | 'failed';
  agentStates?: Record<string, AgentState>;
  researchData?: ResearchData | null;
}

// Per-agent audio management for pause/resume support
const agentAudioMap = new Map<string, { audio: HTMLAudioElement; url: string }>();

// Stop and cleanup audio for a specific agent
function stopAgentAudio(agentType: string) {
  const audioData = agentAudioMap.get(agentType);
  if (audioData) {
    audioData.audio.pause();
    audioData.audio.currentTime = 0;
    URL.revokeObjectURL(audioData.url);
    agentAudioMap.delete(agentType);
  }
}

// Pause audio for a specific agent (keeps position)
function pauseAgentAudio(agentType: string) {
  const audioData = agentAudioMap.get(agentType);
  if (audioData) {
    audioData.audio.pause();
  }
}

// Resume audio for a specific agent (from current position)
function resumeAgentAudio(agentType: string) {
  const audioData = agentAudioMap.get(agentType);
  if (audioData) {
    audioData.audio.play().catch((error) => {
      console.warn('Audio resume failed:', error.message);
    });
  }
}

// Play or resume audio for a specific agent
function playOrResumeAudio(
  agentType: string,
  base64Audio: string, 
  onStart?: () => void, 
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    // Check if audio already exists (paused)
    const existingAudio = agentAudioMap.get(agentType);
    if (existingAudio) {
      // Resume from paused position
      if (onStart) onStart();
      resumeAgentAudio(agentType);
      return;
    }
    
    // Create new audio
    let url: string | null = null;
    
    try {
      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      url = URL.createObjectURL(blob);
      
      // Create and play audio element
      const audio = new Audio(url);
      agentAudioMap.set(agentType, { audio, url });
      
      if (onStart) onStart();
      
      const cleanup = () => {
        stopAgentAudio(agentType);
        if (onEnd) onEnd();
      };
      
      audio.onended = () => {
        cleanup();
        resolve();
      };
      
      audio.onerror = () => {
        console.warn('Audio playback error - continuing without audio');
        cleanup();
        resolve();
      };
      
      // Handle autoplay denials gracefully
      audio.play().catch((error) => {
        console.warn('Audio autoplay denied or failed - continuing without audio:', error.message);
        cleanup();
        resolve();
      });
    } catch (error) {
      console.warn('Audio processing error - continuing without audio:', error);
      if (url) {
        URL.revokeObjectURL(url);
      }
      if (onEnd) onEnd();
      resolve();
    }
  });
}

// Extract code blocks from agent responses
function extractCodeFromResponses(agentStates: Record<string, AgentState>): Array<{ code: string; language: string; filename: string }> {
  const codeBlocks: Array<{ code: string; language: string; filename: string }> = [];
  const allMessages = Object.values(agentStates).map(state => state.message).join('\n\n');
  
  // Match code blocks with language identifier
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(allMessages)) !== null) {
    const language = match[1] || 'typescript';
    const code = match[2].trim();
    
    // Try to extract filename from preceding text
    const beforeBlock = allMessages.substring(Math.max(0, match.index - 200), match.index);
    const filenameMatch = beforeBlock.match(/(?:file|create|in|as)\s*[:`]?([a-zA-Z0-9_/.-]+\.(tsx?|jsx?|css|json|md))[`]?/i);
    const filename = filenameMatch ? filenameMatch[1] : `code.${language}`;
    
    codeBlocks.push({ code, language, filename });
  }
  
  return codeBlocks;
}

export default function Home() {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [applyResearchToNext, setApplyResearchToNext] = useState(false);
  const [playingAgent, setPlayingAgent] = useState<'architect' | 'backend' | 'frontend' | 'qa' | null>(null);
  
  // Reset toggle when research is cleared (ensures fresh state)
  const handleToggleChange = (enabled: boolean) => {
    setApplyResearchToNext(enabled);
    if (!enabled) {
      console.log('User disabled "Apply Research" toggle');
    }
  };

  // Agent states
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({
    architect: { status: 'idle', message: '' },
    backend: { status: 'idle', message: '' },
    frontend: { status: 'idle', message: '' },
    qa: { status: 'idle', message: '' },
  });

  // Individual agent audio handlers with pause/resume support
  const handlePlayAgent = (agentType: 'architect' | 'backend' | 'frontend' | 'qa') => {
    const audioData = agentStates[agentType].audioData;
    if (!audioData) return;
    
    setPlayingAgent(agentType);
    playOrResumeAudio(
      agentType,
      audioData,
      () => setIsAudioPlaying(true),
      () => {
        setIsAudioPlaying(false);
        setPlayingAgent(null);
      }
    );
  };

  const handlePauseAgent = () => {
    if (playingAgent) {
      pauseAgentAudio(playingAgent);
      setIsAudioPlaying(false);
      setPlayingAgent(null);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || !conversation.agentStates) return;
    
    // Load the previous conversation's data
    setActiveConversation(conversationId);
    setTranscript(conversation.command);
    setAgentStates(conversation.agentStates);
    setResearchData(conversation.researchData || null);
    
    toast({
      title: "Conversation Loaded",
      description: "Viewing previous discussion",
    });
  };

  const handleDownloadAllCode = () => {
    const codeBlocks = extractCodeFromResponses(agentStates);
    
    if (codeBlocks.length === 0) {
      toast({
        title: "No Code Found",
        description: "No code blocks were generated in this conversation.",
        variant: "default",
      });
      return;
    }

    // Create a combined text file with all code blocks
    let combinedContent = `# Generated Code - ${new Date().toLocaleString()}\n`;
    combinedContent += `# Command: ${transcript}\n\n`;
    combinedContent += `${'='.repeat(80)}\n\n`;

    codeBlocks.forEach((block, index) => {
      combinedContent += `File: ${block.filename}\n`;
      combinedContent += `Language: ${block.language}\n`;
      combinedContent += `${'-'.repeat(80)}\n\n`;
      combinedContent += block.code;
      combinedContent += `\n\n${'='.repeat(80)}\n\n`;
    });

    // Download as a single file
    const blob = new Blob([combinedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-code-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Code Downloaded",
      description: `Downloaded ${codeBlocks.length} code block${codeBlocks.length > 1 ? 's' : ''} as a single file.`,
    });
  };

  const handleTranscript = async (text: string) => {
    setTranscript(text);
    setIsProcessing(true);
    
    const context: { role: string; message: string }[] = [];
    
    // Explicit UI toggle approach - no regex guessing!
    // If user clicked "Apply Research" toggle, pass research context to agents
    // This is 100% reliable with zero false positives
    const isFollowUpImplementation = Boolean(applyResearchToNext && researchData !== null);
    let previousResearch: ResearchData | null = isFollowUpImplementation ? researchData : null;
    
    if (isFollowUpImplementation) {
      console.log('✅ User enabled "Apply Research" - passing research context to agents');
    } else if (researchData) {
      console.log('ℹ️ Research exists but "Apply Research" not enabled - starting fresh conversation');
    }

    try {
      // Architect Agent
      setAgentStates(prev => ({
        ...prev,
        architect: { status: 'thinking', message: '' }
      }));

      const architectResponse = await fetch('/api/agents/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text, 
          agentRole: 'architect',
          context,
          demoMode,
          previousResearch // Include research from Step 2 if available
        })
      });
      
      if (!architectResponse.ok) {
        throw new Error(`Architect API error: ${architectResponse.status}`);
      }
      
      const architectData = await architectResponse.json();
      context.push({ role: 'Architect', message: architectData.message });
      
      // Store research data if available
      if (architectData.researchData) {
        setResearchData(architectData.researchData);
        
        // If this is JUST research (not a follow-up implementation), STOP HERE
        if (!isFollowUpImplementation) {
          setAgentStates(prev => ({
            ...prev,
            architect: { 
              status: 'complete', 
              message: architectData.message || "Error generating response",
              audioData: architectData.audioData
            }
          }));
          
          toast({
            title: "🔍 Research Completed",
            description: `Found ${architectData.researchData.results.length} relevant sources. Enable "Apply Research" and send another request to implement.`,
            duration: 6000,
          });
          
          setIsProcessing(false);
          
          // Auto-play architect audio for research results
          if (architectData.audioData) {
            setPlayingAgent('architect');
            playOrResumeAudio(
              'architect',
              architectData.audioData,
              () => setIsAudioPlaying(true),
              () => {
                setIsAudioPlaying(false);
                setPlayingAgent(null);
              }
            );
          }
          
          return; // STOP - don't process other agents yet
        }
        
        // If we reach here, it's a follow-up implementation request
        toast({
          title: "🔍 Implementing Research",
          description: `Using ${architectData.researchData.results.length} sources to implement your request`,
          duration: 4000,
        });
      }
      
      // Show warning if prompt was too large or truncated (unless in Demo Mode)
      if (architectData.warning && !demoMode) {
        toast({
          title: architectData.truncated ? "⚠️ Response Truncated" : "⚠️ Complex Request",
          description: architectData.warning,
          variant: "destructive",
          duration: 8000,
        });
      }
      
      // Update architect UI and show message immediately
      setAgentStates(prev => ({
        ...prev,
        architect: { 
          status: 'complete', 
          message: architectData.message || "Error generating response",
          audioData: architectData.audioData
        },
        backend: { status: 'thinking', message: '' },
        frontend: { status: 'thinking', message: '' },
        qa: { status: 'thinking', message: '' }
      }));

      // Auto-play architect audio (NON-BLOCKING - don't await!)
      if (architectData.audioData) {
        setPlayingAgent('architect');
        playOrResumeAudio(
          'architect',
          architectData.audioData,
          () => setIsAudioPlaying(true),
          () => {
            setIsAudioPlaying(false);
            setPlayingAgent(null);
            // Mark architect complete after audio finishes
            setAgentStates(prev => ({
              ...prev,
              architect: { ...prev.architect, status: 'complete' }
            }));
          }
        );
      }

      // START ALL REMAINING AGENTS IMMEDIATELY (while Architect is still speaking!)
      // Backend/Frontend/QA all run in parallel
      const [backendResponse, frontendResponse, qaResponse] = await Promise.all([
        fetch('/api/agents/discuss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript: text, 
            agentRole: 'backend',
            context,
            demoMode,
            previousResearch
          })
        }),
        fetch('/api/agents/discuss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript: text, 
            agentRole: 'frontend',
            context,
            demoMode,
            previousResearch
          })
        }),
        fetch('/api/agents/discuss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript: text, 
            agentRole: 'qa',
            context,
            demoMode,
            previousResearch
          })
        })
      ]);
      
      // Check all responses
      if (!backendResponse.ok) throw new Error(`Backend API error: ${backendResponse.status}`);
      if (!frontendResponse.ok) throw new Error(`Frontend API error: ${frontendResponse.status}`);
      if (!qaResponse.ok) throw new Error(`QA API error: ${qaResponse.status}`);
      
      // Parse all responses in parallel
      const [backendData, frontendData, qaData] = await Promise.all([
        backendResponse.json(),
        frontendResponse.json(),
        qaResponse.json()
      ]);
      
      // Update context
      context.push({ role: 'Backend', message: backendData.message });
      context.push({ role: 'Frontend', message: frontendData.message });
      
      // Show warnings (unless Demo Mode)
      if (backendData.warning && !demoMode) {
        toast({
          title: backendData.truncated ? "⚠️ Response Truncated" : "⚠️ Complex Request",
          description: backendData.warning,
          variant: "destructive",
          duration: 8000,
        });
      }
      if (frontendData.warning && !demoMode) {
        toast({
          title: frontendData.truncated ? "⚠️ Response Truncated" : "⚠️ Complex Request",
          description: frontendData.warning,
          variant: "destructive",
          duration: 8000,
        });
      }
      if (qaData.warning && !demoMode) {
        toast({
          title: qaData.truncated ? "⚠️ Response Truncated" : "⚠️ Complex Request",
          description: qaData.warning,
          variant: "destructive",
          duration: 8000,
        });
      }
      
      // Mark ALL agents as complete with Play buttons available
      setAgentStates(prev => ({
        ...prev,
        backend: { 
          status: 'complete', 
          message: backendData.message || "Error generating response",
          audioData: backendData.audioData
        },
        frontend: { 
          status: 'complete', 
          message: frontendData.message || "Error generating response",
          audioData: frontendData.audioData
        },
        qa: { 
          status: 'complete', 
          message: qaData.message || "Error generating response",
          audioData: qaData.audioData
        }
      }));

      // Save conversation to history with agent states (use actual response data, not React state)
      const newConversation: Conversation = {
        id: Date.now().toString(),
        timestamp: new Date(),
        command: text,
        status: 'completed',
        agentStates: {
          architect: { 
            status: 'complete', 
            message: architectData.message || "Error generating response",
            audioData: architectData.audioData
          },
          backend: { 
            status: 'complete', 
            message: backendData.message || "Error generating response",
            audioData: backendData.audioData
          },
          frontend: { 
            status: 'complete', 
            message: frontendData.message || "Error generating response",
            audioData: frontendData.audioData
          },
          qa: { 
            status: 'complete', 
            message: qaData.message || "Error generating response",
            audioData: qaData.audioData
          }
        },
        researchData: architectData.researchData || null
      };
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation.id);
      
      // Save command to MongoDB
      try {
        await apiRequest('POST', '/api/commands', {
          transcript: text,
          agentResponses: [
            { role: 'architect', message: architectData.message || '' },
            { role: 'backend', message: backendData.message || '' },
            { role: 'frontend', message: frontendData.message || '' },
            { role: 'qa', message: qaData.message || '' }
          ]
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/commands/recent/5'] });
      } catch (saveError) {
        console.error('Failed to save command to MongoDB:', saveError);
        toast({
          title: "Failed to save command",
          description: "Command history could not be saved to database",
          variant: "destructive"
        });
      }
      
      // Clear research data and toggle after follow-up implementation (Step 3) completes
      // This prevents stale research from contaminating future unrelated requests
      if (isFollowUpImplementation) {
        console.log('Clearing research data and toggle after follow-up implementation');
        setResearchData(null);
        setApplyResearchToNext(false);
      }
      
      // If user made a fresh request while toggle was on (didn't use research), clear toggle
      if (!isFollowUpImplementation && applyResearchToNext) {
        console.log('Clearing "Apply Research" toggle - user started new conversation without using research');
        setApplyResearchToNext(false);
      }

    } catch (error) {
      console.error('Error during agent discussion:', error);
      
      // Save failed conversation
      const failedConversation: Conversation = {
        id: Date.now().toString(),
        timestamp: new Date(),
        command: text,
        status: 'failed'
      };
      setConversations(prev => [failedConversation, ...prev]);
      
      setAgentStates({
        architect: { status: 'idle', message: '' },
        backend: { status: 'idle', message: '' },
        frontend: { status: 'idle', message: '' },
        qa: { status: 'idle', message: 'Error: Failed to connect to AI agents. Please try again.' },
      });
      
      // Clear toggle on error to prevent stale research on retry
      if (applyResearchToNext) {
        console.log('Clearing "Apply Research" toggle due to error');
        setApplyResearchToNext(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        demoMode={demoMode}
        onDemoModeToggle={(enabled) => {
          setDemoMode(enabled);
          toast({
            title: enabled ? "🎬 Demo Mode Enabled" : "✨ Production Mode Enabled",
            description: enabled 
              ? "Using Gemini 2.5 Flash for faster responses (~10-15s per agent)" 
              : "Using Gemini 3 Pro for highest quality responses (~30-60s per agent)",
          });
        }}
        onNewConversation={() => {
          console.log('New conversation');
          setTranscript("");
          setResearchData(null);
          setAgentStates({
            architect: { status: 'idle', message: '' },
            backend: { status: 'idle', message: '' },
            frontend: { status: 'idle', message: '' },
            qa: { status: 'idle', message: '' },
          });
        }}
        onSettings={() => console.log('Settings')}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* History Sidebar */}
        <div className={`border-r transition-all duration-300 ${showHistory ? 'w-64' : 'w-0'} overflow-hidden`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-semibold">History</h2>
            </div>
            <ScrollArea className="flex-1 p-4">
              <ConversationHistory 
                conversations={conversations}
                activeId={activeConversation || ''}
                onSelectConversation={handleSelectConversation}
              />
            </ScrollArea>
          </div>
        </div>

        {/* Toggle History Button */}
        {!showHistory && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-20 z-10"
            onClick={() => setShowHistory(true)}
            data-testid="button-show-history"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {showHistory && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-64 top-20 z-10 -ml-10"
            onClick={() => setShowHistory(false)}
            data-testid="button-hide-history"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              {/* Command History */}
              <CommandHistory />
              
              {/* Voice Input */}
              {!transcript && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-4xl font-bold">Start with Your Voice</h2>
                    <p className="text-muted-foreground">Speak your coding request and let our AI agents collaborate</p>
                  </div>
                  <VoiceInput 
                    onTranscript={handleTranscript}
                    isProcessing={isProcessing}
                  />
                </div>
              )}

              {/* User Transcript */}
              {transcript && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Your Request:</p>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-lg" data-testid="text-user-transcript">{transcript}</p>
                  </div>
                </div>
              )}

              {/* Research Sources */}
              {researchData && (
                <div className="space-y-3">
                  <ResearchSources data={researchData} />
                  
                  {/* Apply Research Toggle */}
                  <Card className="border-primary/50 bg-primary/5" data-testid="card-apply-research-toggle">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Lightbulb className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <Label 
                              htmlFor="apply-research-toggle" 
                              className="text-sm font-medium cursor-pointer"
                            >
                              Apply research to next request
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Enable to implement based on the research findings above
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="apply-research-toggle"
                          checked={applyResearchToNext}
                          onCheckedChange={handleToggleChange}
                          data-testid="switch-apply-research"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Agent Cards */}
              {transcript && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold">Agent Discussion</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AgentCard
                      agentType="architect"
                      name="Architect Agent"
                      role="System Design & Architecture"
                      icon={Compass}
                      message={agentStates.architect.message}
                      status={agentStates.architect.status}
                      audioUrl={agentStates.architect.audioData ? "available" : undefined}
                      isPlaying={playingAgent === 'architect'}
                      onPlayAudio={() => handlePlayAgent('architect')}
                      onStopAudio={handlePauseAgent}
                    />
                    
                    <AgentCard
                      agentType="backend"
                      name="Backend Agent"
                      role="API & Database Design"
                      icon={Database}
                      message={agentStates.backend.message}
                      status={agentStates.backend.status}
                      audioUrl={agentStates.backend.audioData ? "available" : undefined}
                      isPlaying={playingAgent === 'backend'}
                      onPlayAudio={() => handlePlayAgent('backend')}
                      onStopAudio={handlePauseAgent}
                    />
                    
                    <AgentCard
                      agentType="frontend"
                      name="Frontend Agent"
                      role="UI/UX Implementation"
                      icon={Palette}
                      message={agentStates.frontend.message}
                      status={agentStates.frontend.status}
                      audioUrl={agentStates.frontend.audioData ? "available" : undefined}
                      isPlaying={playingAgent === 'frontend'}
                      onPlayAudio={() => handlePlayAgent('frontend')}
                      onStopAudio={handlePauseAgent}
                    />
                    
                    <AgentCard
                      agentType="qa"
                      name="QA Agent"
                      role="Testing & Quality Assurance"
                      icon={Shield}
                      message={agentStates.qa.message}
                      status={agentStates.qa.status}
                      audioUrl={agentStates.qa.audioData ? "available" : undefined}
                      isPlaying={playingAgent === 'qa'}
                      onPlayAudio={() => handlePlayAgent('qa')}
                      onStopAudio={handlePauseAgent}
                    />
                  </div>
                </div>
              )}

              {/* Generated Code */}
              {transcript && agentStates.qa.status === 'complete' && (() => {
                const codeBlocks = extractCodeFromResponses(agentStates);
                return codeBlocks.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-semibold flex items-center gap-2">
                        <Code2 className="w-6 h-6" />
                        Generated Code
                      </h3>
                      <Button 
                        onClick={handleDownloadAllCode}
                        variant="default"
                        size="sm"
                        className="gap-2"
                        data-testid="button-download-all-main"
                      >
                        <Download className="w-4 h-4" />
                        Download All ({codeBlocks.length} file{codeBlocks.length > 1 ? 's' : ''})
                      </Button>
                    </div>
                    {codeBlocks.map((block, index) => (
                      <CodeDisplay 
                        key={index}
                        code={block.code}
                        language={block.language}
                        filename={block.filename}
                      />
                    ))}
                  </div>
                );
              })()}

              {/* Follow-up Voice Input */}
              {transcript && agentStates.qa.status === 'complete' && (
                <div className="space-y-4 pt-8 border-t">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-semibold">Ask a Follow-Up Question</h3>
                    <p className="text-muted-foreground">
                      Want to research best practices or request modifications? Use your voice to continue.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <VoiceInput 
                      onTranscript={handleTranscript}
                      isProcessing={isProcessing}
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Code Preview Sidebar */}
        <div className={`border-l transition-all duration-300 ${showCode && transcript ? 'w-96' : 'w-0'} overflow-hidden`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between gap-2">
              <h2 className="font-semibold">Code Preview</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAllCode}
                  data-testid="button-download-code"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCode(false)}
                  data-testid="button-hide-code"
                  title="Hide code preview"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              {agentStates.qa.status === 'complete' && (() => {
                const codeBlocks = extractCodeFromResponses(agentStates);
                return codeBlocks.map((block, index) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <CodeDisplay 
                      code={block.code}
                      language={block.language}
                      filename={block.filename}
                    />
                  </div>
                ));
              })()}
            </ScrollArea>
          </div>
        </div>

        {/* Toggle Code Button */}
        {!showCode && transcript && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-20 z-10"
            onClick={() => setShowCode(true)}
            data-testid="button-show-code"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
