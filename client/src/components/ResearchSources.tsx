import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SiBrave } from "react-icons/si";

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

interface ResearchSourcesProps {
  data: ResearchData;
}

export default function ResearchSources({ data }: ResearchSourcesProps) {
  const displayCount = data.results.length;
  const totalCount = data.totalAvailable || data.results.length;
  
  return (
    <Card className="mb-4" data-testid="card-research-sources">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Research Sources</CardTitle>
          <Badge variant="secondary" className="ml-auto flex items-center gap-1.5" data-testid="badge-brave-search">
            <SiBrave className="w-3.5 h-3.5" />
            <span>Brave Search</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground italic">
          Query: "{data.query}"
        </p>
        
        <div className="space-y-2">
          {data.results.map((result, index) => (
            <a
              key={index}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-md border bg-card hover-elevate active-elevate-2 group"
              data-testid={`link-research-result-${index}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">
                      {index + 1}. {result.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {result.description}
                  </p>
                  <p className="text-xs text-primary mt-1 truncate">
                    {result.url}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
