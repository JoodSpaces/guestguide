"use client";

/** Pick who a job is assigned to from the active team. If the current value is someone no longer on the list, it stays selectable. */
export function TeamPicker({
  value, onChange, team, style,
}: {
  value: string; onChange: (v: string) => void; team: string[]; style?: React.CSSProperties;
}) {
  const names = value && !team.includes(value) ? [value, ...team] : team;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={style} aria-label="Assigned to">
      <option value="">Unassigned</option>
      {names.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}
