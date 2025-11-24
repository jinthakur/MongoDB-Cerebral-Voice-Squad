import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CodeDisplayProps {
  code: string;
  language: string;
  filename?: string;
}

export default function CodeDisplay({ code, language, filename }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    console.log('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden" data-testid="card-code-display">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 py-3 px-4 bg-muted/50">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono">
            {language}
          </Badge>
          {filename && (
            <span className="text-xs text-muted-foreground font-mono">{filename}</span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCopy}
          data-testid="button-copy-code"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="p-4 overflow-x-auto bg-gray-950 dark:bg-gray-900">
          <code className="text-sm font-mono text-gray-100" data-testid="text-code-content">
            {code}
          </code>
        </pre>
      </CardContent>
    </Card>
  );
}
