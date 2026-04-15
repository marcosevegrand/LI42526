import { cn } from '@/lib/utils/cn';

type Tab = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
};

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 rounded-lg bg-surface-low p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-surface-high text-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
