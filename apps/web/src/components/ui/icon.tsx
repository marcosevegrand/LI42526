import { cn } from '@/lib/utils/cn';

type IconProps = {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, size = 24, filled = false, className }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', className)}
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
      }}
    >
      {name}
    </span>
  );
}
