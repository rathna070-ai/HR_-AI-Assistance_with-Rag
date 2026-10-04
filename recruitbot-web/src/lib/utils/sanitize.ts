// React escapes text it renders, and this app never uses
// dangerouslySetInnerHTML. escapeHtml is for any place that needs a string
// that is safe inside HTML (e.g. a title attribute built by hand).
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

// Collapses whitespace and cuts text to `max` characters with an ellipsis.
export const truncate = (value: string, max: number): string => {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};
