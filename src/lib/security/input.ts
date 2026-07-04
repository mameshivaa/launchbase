const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export const INPUT_LIMITS = {
  email: 254,
  shortText: 120,
  title: 160,
  version: 40,
  source: 80,
  description: 2000,
  changelogBody: 8000,
} as const;

function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function normalizeSingleLine(value: string, maxLength: number): string {
  return stripControlCharacters(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeSingleLineForValidation(value: string): string {
  return stripControlCharacters(value).replace(/\s+/g, " ").trim();
}

export function normalizeMultiline(value: string, maxLength: number): string {
  return stripControlCharacters(value)
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function normalizeMultilineForValidation(value: string): string {
  return stripControlCharacters(value).replace(/\r\n?/g, "\n").trim();
}

export function normalizeEmail(value: string): string {
  return normalizeSingleLineForValidation(value).toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return value.length <= INPUT_LIMITS.email && EMAIL_PATTERN.test(value);
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

export function getRequiredTextError(
  label: string,
  value: string,
  maxLength: number
): string | null {
  if (!value) {
    return `${label} is required.`;
  }

  if (value.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer.`;
  }

  return null;
}

export function getOptionalTextError(
  label: string,
  value: string,
  maxLength: number
): string | null {
  if (value.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer.`;
  }

  return null;
}

export function getGenericMutationError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "A matching record already exists.";
  }

  if (
    lower.includes("check constraint") ||
    lower.includes("violates row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("not authorized")
  ) {
    return "The request could not be saved. Check your input and permissions.";
  }

  return "The request could not be completed. Please try again.";
}
