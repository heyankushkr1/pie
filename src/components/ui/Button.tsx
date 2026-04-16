import React from "react";
import { cn } from "../../lib/utils";
import { motion, HTMLMotionProps } from "motion/react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "glass" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className,
  variant = "glass",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-[14px] font-medium transition-all focus:outline-none";
  
  const variants = {
    primary: "bg-white text-black hover:bg-gray-200",
    glass: "glass-pill text-white hover:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
    ghost: "text-white/70 hover:text-white hover:bg-white/10",
    danger: "text-white/90 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-[15px]",
    lg: "px-8 py-3.5 text-base"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
