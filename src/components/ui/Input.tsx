import React from "react";
import { cn } from "../../lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-white/10 backdrop-blur-[20px] border border-white/20 rounded-[20px] px-6 py-[14px] text-[15px] text-white placeholder-white/60 outline-none focus:ring-1 focus:ring-white/30 transition-all",
            icon && "pl-[44px]",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
