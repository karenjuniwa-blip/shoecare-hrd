// Shared period logic: Dashboard and Keuangan must use the same cutoff rules.
export const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const safeDate = (year, month, day) => new Date(year, month, Math.min(day, new Date(year, month+1, 0).getDate()))

export function payrollPeriod(today = new Date(), rawCutoff = 25) {
  const cutoff = Math.min(31, Math.max(1, Number(rawCutoff) || 25))
  const y = today.getFullYear(), m = today.getMonth()
  const currentCutoff = safeDate(y, m, cutoff)
  const previousCutoff = safeDate(y, m-1, cutoff)
  const end = localISO(today) <= localISO(currentCutoff) ? currentCutoff : safeDate(y, m+1, cutoff)
  const prior = localISO(today) <= localISO(currentCutoff) ? previousCutoff : currentCutoff
  const start = new Date(prior.getFullYear(), prior.getMonth(), prior.getDate()+1)
  return { dari: localISO(start), sampai: localISO(end), start, end }
}

export function paymentDate(end, rawCutoff, rawPayDay) {
  const cutoff = Math.min(31, Math.max(1, Number(rawCutoff) || 25))
  const day = Math.min(31, Math.max(1, Number(rawPayDay) || 27))
  return safeDate(end.getFullYear(), end.getMonth()+(day<=cutoff ? 1 : 0), day)
}
