import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className={`max-w-lg mx-auto px-4 py-6 animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
