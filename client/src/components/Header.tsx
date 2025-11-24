import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Video } from "lucide-react";

interface HeaderProps {
  onNewConversation?: () => void;
  onSettings?: () => void;
  demoMode?: boolean;
  onDemoModeToggle?: (enabled: boolean) => void;
}

export default function Header({ onNewConversation, onSettings, demoMode = false, onDemoModeToggle }: HeaderProps) {
  return (
    <header className="h-16 border-b flex items-center justify-between px-6" data-testid="header-main">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">CV</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-app-title">
          Cerebral-Voice Squad
        </h1>
        {demoMode && (
          <Badge variant="secondary" className="gap-1">
            <Video className="w-3 h-3" />
            Demo Mode
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="demo-mode" className="text-sm text-muted-foreground cursor-pointer">
            🎬 Demo Mode
          </label>
          <Switch
            id="demo-mode"
            checked={demoMode}
            onCheckedChange={onDemoModeToggle}
            data-testid="switch-demo-mode"
          />
        </div>
        <Button
          variant="default"
          size="default"
          onClick={onNewConversation}
          className="gap-2"
          data-testid="button-new-conversation"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettings}
          data-testid="button-settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
