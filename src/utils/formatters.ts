/**
 * Formatting utilities for consistent display across the game
 */

/**
 * Format a percentage value to a whole number (no decimals)
 * @param value The percentage value (e.g., 92.69)
 * @returns Formatted string (e.g., "93%")
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format a multiplier as a percentage (e.g., 0.15 → "15%")
 * @param multiplier The multiplier value (e.g., 0.15)
 * @returns Formatted string (e.g., "15%")
 */
export function formatMultiplierAsPercent(multiplier: number): string {
  return `${Math.round(multiplier * 100)}%`;
}

/**
 * Format a number to a whole number (no decimals)
 * @param value The number to format
 * @returns Whole number
 */
export function formatWholeNumber(value: number): number {
  return Math.round(value);
}
