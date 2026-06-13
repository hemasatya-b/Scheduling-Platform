import { useState } from 'react';
import { Check, Clock, Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EventType } from '@/types';

export interface EventTypeCardProps {
  eventType: EventType;
  username: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyLink: (slug: string) => void;
}

export function EventTypeCard({ eventType, username, onEdit, onDelete, onCopyLink }: EventTypeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyLink(eventType.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePreview = () => {
    const url = `${import.meta.env.VITE_BASE_URL}/${username}/${eventType.slug}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{eventType.title}</h3>
          <span className="truncate text-sm text-muted-foreground">/{username}/{eventType.slug}</span>
        </div>
        {eventType.description && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{eventType.description}</p>
        )}
        <div className="mt-2">
          <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
            <Clock className="h-3 w-3" />
            {eventType.durationMinutes}m
          </Badge>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
        <Button variant="ghost" size="icon" title="Copy booking link" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span className="sr-only">Copy booking link</span>
        </Button>
        <Button variant="ghost" size="icon" title="Preview booking page" onClick={handlePreview}>
          <ExternalLink className="h-4 w-4" />
          <span className="sr-only">Preview booking page</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="More options">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(eventType.id)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(eventType.id)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
