import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional/duplicate resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
