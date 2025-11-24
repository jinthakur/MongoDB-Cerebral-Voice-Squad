import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Clock } from "lucide-react";
import { format } from "date-fns";

interface Command {
  _id?: string;
  transcript: string;
  timestamp: Date;
  agentResponses: Array<{
    role: string;
    message: string;
  }>;
}

export default function CommandHistory() {
  const { data: commands, isLoading } = useQuery<Command[]>({
    queryKey: ['/api/commands/recent/10'],
  });

  if (isLoading) {
    return (
      <Card className="mb-6" data-testid="card-command-history-loading">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading command history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!commands || commands.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6" data-testid="card-command-history">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5" />
          <h3 className="font-semibold">Recent commands fetched from MongoDB</h3>
          <span className="text-xs text-muted-foreground">
            (Last {commands.length})
          </span>
        </div>
        <ScrollArea className="h-32">
          <div className="space-y-2">
            {commands.map((command, index) => (
              <div
                key={command._id || index}
                className="flex items-start gap-3 p-2 rounded-md hover-elevate bg-muted/50"
                data-testid={`command-item-${index}`}
              >
                <Clock className="w-3 h-3 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-command-${index}`}>
                    {command.transcript}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(command.timestamp), 'MMM d, h:mm a')}
                    {command.agentResponses.length > 0 && (
                      <span className="ml-2">
                        • {command.agentResponses.length} agent{command.agentResponses.length > 1 ? 's' : ''} responded
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
