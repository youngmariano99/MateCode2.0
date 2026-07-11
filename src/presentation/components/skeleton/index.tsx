import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  className = "",
  ...props
}) => {
  const shapes = {
    text: "h-3.5 w-full rounded-md",
    circular: "h-12 w-12 rounded-full",
    rectangular: "h-32 w-full rounded-xl",
  };

  return (
    <div
      className={`animate-pulse bg-zinc-800/60 ${shapes[variant]} ${className}`}
      {...props}
    />
  );
};
