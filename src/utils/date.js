export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function isPastDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
