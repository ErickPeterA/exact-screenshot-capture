export function safeJourneyAdminNext(value: string | null): string {
  const hasControlCharacter = value
    ? Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
      })
    : false;
  if (!value || value.includes("\\") || hasControlCharacter) return "/gestao";
  if (value.includes("?") || value.includes("#")) return "/gestao";
  try {
    if (decodeURIComponent(value) !== value) return "/gestao";
    const parsed = new URL(value, "http://journey.internal");
    if (parsed.origin !== "http://journey.internal" || parsed.pathname !== value) return "/gestao";
    if (value !== "/gestao" && !value.startsWith("/gestao/")) return "/gestao";
    return value;
  } catch {
    return "/gestao";
  }
}
