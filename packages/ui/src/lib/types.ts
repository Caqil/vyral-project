import { type ReactNode } from "react";

export interface BaseComponentProps {
  children?: ReactNode;
  className?: string;
}

export interface WithVariants<T> {
  variant?: T;
}

export type ComponentSize = "sm" | "md" | "lg" | "xl";
export type ComponentVariant = "default" | "primary" | "secondary" | "destructive" | "outline" | "ghost";