// ===== Subtask Parser =====
export function parseSubtasks(raw) {
  try {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    const val = JSON.parse(raw);
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}
