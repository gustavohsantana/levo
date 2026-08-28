export function cidadeDoReverso(address: {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
} | null | undefined): string | null {
  const cidade =
    address?.city?.trim()
    || address?.town?.trim()
    || address?.village?.trim()
    || address?.municipality?.trim()
    || null;

  return cidade || null;
}
