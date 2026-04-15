import { cn } from '@/lib/utils/cn';

import { Icon } from './icon';

type FeedItem = {
  id: string;
  icon: string;
  text: string;
  time: string;
  highlight?: boolean;
};

type ActivityFeedProps = {
  items: FeedItem[];
  className?: string;
};

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
            item.highlight
              ? 'bg-primary-container/20'
              : 'hover:bg-surface-high/50',
          )}
        >
          <Icon
            name={item.icon}
            size={18}
            className={cn(
              'mt-0.5 shrink-0',
              item.highlight ? 'text-primary' : 'text-on-surface-variant',
            )}
          />
          <p className="flex-1 text-sm text-on-surface leading-snug">
            {item.text}
          </p>
          <span className="shrink-0 text-xs text-on-surface-variant">
            {item.time}
          </span>
        </div>
      ))}
    </div>
  );
}

export type { FeedItem };
