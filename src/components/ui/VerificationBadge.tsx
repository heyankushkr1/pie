import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle, ShieldCheck, Star } from 'lucide-react';
import { Badge as BadgeType } from '../../context/AuthContext';

interface BadgeProps {
  type: BadgeType;
  className?: string;
}

export function VerificationBadge({ type, className }: BadgeProps) {
  if (type === 'none') return null;

  const styleMap = {
    gold: {
      color: "text-black",
      glow: "badge-glow-gold",
      icon: Star,
      bg: "badge-glow-gold"
    },
    silver: {
      color: "text-black",
      glow: "badge-glow-silver",
      icon: ShieldCheck,
      bg: "badge-glow-silver"
    },
    purple: {
      color: "text-white",
      glow: "badge-glow-purple",
      icon: ShieldCheck,
      bg: "badge-glow-purple"
    },
    blue: {
      color: "text-white",
      glow: "badge-glow-blue",
      icon: CheckCircle,
      bg: "badge-glow-blue"
    },
    green: {
      color: "text-black",
      glow: "badge-glow-green",
      icon: CheckCircle,
      bg: "badge-glow-green"
    }
  };

  const config = styleMap[type];
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center justify-center rounded-full p-1", config.bg, className)}>
      <Icon className={cn("w-3.5 h-3.5", config.color)} />
    </div>
  );
}
