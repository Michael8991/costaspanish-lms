export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function toDisplayLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toggleArrayValue<T>(current: T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((i) => i !== value)
    : [...current, value];
}

