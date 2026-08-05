"use client";

import { getCategoryIcon, colorClasses } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { createElement } from "react";

export function CategoryIcon({
  icon,
  color,
  className,
  size = "md",
}: {
  icon: string;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const IconComp = getCategoryIcon(icon);
  const cc = colorClasses(color);
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl shrink-0",
        cc.soft,
        cc.text,
        sizes[size],
        className
      )}
    >
      {createElement(IconComp, { className: iconSizes[size] })}
    </div>
  );
}
