import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 shadow-xl",
        "hover:bg-white/15 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}