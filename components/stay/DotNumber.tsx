/**
 * A number drawn in dots, like a small LED display. Each digit is a 5 by 7 grid of dots; lit dots are bright, the rest faint.
 * Plain SVG, so it is crisp at any size and needs no font.
 */
const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

export function DotNumber({ value, dot = 9, gap = 5, lit = "#FFFFFF", dim = "rgba(255,255,255,.14)", label }: {
  value: string | number; dot?: number; gap?: number; lit?: string; dim?: string; label?: string;
}) {
  const chars = String(value).split("").filter((c) => FONT[c]);
  const step = dot + gap;
  const digitW = 5 * step - gap;
  const pad = 14;
  const width = chars.length * digitW + (chars.length - 1) * pad;
  const height = 7 * step - gap;
  return (
    <svg role="img" aria-label={label ?? String(value)} width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", maxWidth: "100%" }}>
      {chars.map((c, di) =>
        FONT[c].flatMap((row, y) =>
          row.split("").map((bit, x) => (
            <circle
              key={`${di}-${x}-${y}`}
              cx={di * (digitW + pad) + x * step + dot / 2}
              cy={y * step + dot / 2}
              r={dot / 2}
              fill={bit === "1" ? lit : dim}
            />
          )),
        ),
      )}
    </svg>
  );
}
