import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  timestamp: Date;
  command: string;
  status: 'completed' | 'in-progress' | 'failed';
}

interface ConversationHistoryProps {
  conversations: Conversation[];
  onSelectConversation?: (id: string) => void;
  activeId?: string;
}

export default function ConversationHistory({ 
  conversations, 
  onSelectConversation,
  activeId 
}: ConversationHistoryProps) {
  const getStatusBadge = (status: Conversation['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-xs">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="text-xs">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-2" data-testid="container-conversation-history">
      {conversations.map((conv) => (
        <Card
          key={conv.id}
          className={`p-3 cursor-pointer transition-all hover-elevate ${
            activeId === conv.id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onSelectConversation?.(conv.id)}
          data-testid={`card-conversation-${conv.id}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2" data-testid={`text-command-${conv.id}`}>
                {conv.command}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{formatTime(conv.timestamp)}</span>
                {getStatusBadge(conv.status)}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
