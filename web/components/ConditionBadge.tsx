"use client";

import { Badge, Shield, AlertTriangle, XCircle } from "lucide-react";

interface ConditionBadgeProps {
  condition: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const conditionConfig = {
  Excellent: {
    label: "Like New",
    description: "Minimal to no wear, pristine condition",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-300",
    icon: Badge,
  },
  Good: {
    label: "Minor Wear",
    description: "Light signs of use, fully functional",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40",
    textColor: "text-blue-300",
    icon: Badge,
  },
  Fair: {
    label: "Noticeable Wear",
    description: "Visible wear, but still functional",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
    textColor: "text-amber-300",
    icon: AlertTriangle,
  },
  Poor: {
    label: "Significant Damage",
    description: "Heavy wear or damage, may need repair",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
    textColor: "text-red-300",
    icon: XCircle,
  },
  "Like New": {
    label: "Like New",
    description: "Minimal to no wear, pristine condition",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-300",
    icon: Badge,
  },
  New: {
    label: "Brand New",
    description: "Never used, in original packaging",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-300",
    icon: Shield,
  },
};

export function ConditionBadge({
  condition,
  size = "md",
  showIcon = true,
  className = "",
}: ConditionBadgeProps) {
  const config =
    conditionConfig[condition as keyof typeof conditionConfig] ||
    conditionConfig.Good;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${config.bgColor} ${config.borderColor} border ${sizeClasses[size]} rounded-full ${config.textColor} font-medium ${className}`}
      title={config.description}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </div>
  );
}
