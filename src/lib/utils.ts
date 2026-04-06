import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return `₪${price.toFixed(2)}`
}

export function calculateVAT(amount: number, vatRate: number = 0.17): number {
  return amount * vatRate
}

export function calculateTotal(amount: number, vatRate: number = 0.17): number {
  return amount + calculateVAT(amount, vatRate)
}
