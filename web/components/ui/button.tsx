import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? "span" : "button";

    const variants = {
      default: "bg-amber-600 text-white hover:bg-amber-700 border border-amber-700/50",
      outline: "border border-amber-600/30 text-amber-600 hover:bg-amber-600/10",
      ghost: "hover:bg-amber-600/10 text-amber-600",
      destructive: "bg-red-600 text-white hover:bg-red-700 border border-red-700/50",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3 text-sm",
      lg: "h-11 px-8 text-base",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...(asChild ? {} : props)}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
