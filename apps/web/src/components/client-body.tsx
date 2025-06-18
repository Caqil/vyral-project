// components/client-body.tsx
"use client";

import { cn } from "@vyral/ui/lib";


interface ClientBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ClientBody({ children, className }: ClientBodyProps) {
  return <body className={cn(className)}>{children}</body>;
}
