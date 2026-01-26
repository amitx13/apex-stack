import * as React from 'react';
import { Pressable } from 'react-native';
import { cn } from '../../lib/utils';

interface TabButtonProps extends React.ComponentPropsWithoutRef<typeof Pressable> {
  isActive?: boolean;
}

const TabButton = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  TabButtonProps
>(({ className, isActive, ...props }, ref) => {
  return (
    <Pressable
      ref={ref}
      className={cn(
        'flex-1 items-center justify-center py-2 active:opacity-70',
        isActive && 'scale-105',
        className
      )}
      android_ripple={{ color: 'hsl(var(--primary) / 0.15)', borderless: true }}
      {...props}
    />
  );
});
TabButton.displayName = 'TabButton';

export { TabButton };
