import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Check, Loader2, LucideIcon } from "lucide-react";
import { useState } from "react";
import architectAvatar from "@assets/generated_images/architect_agent_avatar_icon.png";
import backendAvatar from "@assets/generated_images/backend_agent_avatar_icon.png";
import frontendAvatar from "@assets/generated_images/frontend_agent_avatar_icon.png";
import qaAvatar from "@assets/generated_images/qa_agent_avatar_icon.png";

export type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'complete';
export type AgentType = 'architect' | 'backend' | 'frontend' | 'qa';

interface AgentCardProps {
  agentType: AgentType;
  name: string;
  role: string;
  icon: LucideIcon;
  message?: string;
  status: AgentStatus;
  audioUrl?: string;
  isPlaying?: boolean;
  onPlayAudio?: () => void;
  onStopAudio?: () => void;
}

export default function AgentCard({ 
  agentType, 
  name, 
  role, 
  icon: Icon, 
  message, 
  status,
  audioUrl,
  isPlaying = false,
  onPlayAudio,
  onStopAudio
}: AgentCardProps) {
  const handlePlayPause = () => {
    if (isPlaying) {
      onStopAudio?.();
      console.log(`Stopping audio for ${name}`);
    } else {
      onPlayAudio?.();
      console.log(`Playing audio for ${name}`);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'thinking':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Thinking</Badge>;
      case 'complete':
        return <Badge variant="outline" className="gap-1"><Check className="w-3 h-3" />Complete</Badge>;
      default:
        return null;
    }
  };

  const agentColors = {
    architect: 'text-blue-600 dark:text-blue-400',
    backend: 'text-purple-600 dark:text-purple-400',
    frontend: 'text-pink-600 dark:text-pink-400',
    qa: 'text-green-600 dark:text-green-400',
  };

  const agentAvatars = {
    architect: architectAvatar,
    backend: backendAvatar,
    frontend: frontendAvatar,
    qa: qaAvatar,
  };

  return (
    <Card 
      className="h-80 flex flex-col transition-all duration-300"
      data-testid={`card-agent-${agentType}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
            <img 
              src={agentAvatars[agentType]} 
              alt={`${name} avatar`}
              className="w-full h-full object-cover"
              data-testid={`img-avatar-${agentType}`}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold" data-testid={`text-agent-name-${agentType}`}>{name}</h3>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {audioUrl && (
            <Button 
              size="default"
              variant={isPlaying ? "destructive" : "default"}
              onClick={handlePlayPause}
              data-testid={`button-audio-${agentType}`}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play
                </>
              )}
            </Button>
          )}
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      {message && (
        <CardContent className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 rounded-lg bg-muted p-4">
            <p className="text-sm leading-relaxed pr-4" data-testid={`text-agent-message-${agentType}`}>
              {message}
            </p>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
