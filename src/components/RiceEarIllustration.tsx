/**
 * RiceEarIllustration – SVG illustration showing:
 *   • A rice panicle with paddy grains (still in husk)
 *   • A few grains with the husk removed (white/cream)
 *   • A small pile of empty husks at the base
 */
export default function RiceEarIllustration() {
  return (
    <div className="relative flex justify-center items-end w-full h-full select-none" aria-label="Épi de riz illustré">
      <svg
        viewBox="0 0 340 520"
        width="100%"
        height="100%"
        style={{ maxHeight: '420px' }}
        fill="none"
        aria-hidden="true"
      >
        {/* ── STEM ── */}
        <path
          d="M170 490 C168 430 164 360 160 290 C155 220 152 150 156 80"
          stroke="#2f6b43"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* ── LEAVES ── */}
        {/* left leaf */}
        <path
          d="M162 310 C130 280 90 275 60 255"
          stroke="#2f6b43"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M162 310 C132 296 100 288 72 274"
          stroke="#1f4d30"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* right leaf */}
        <path
          d="M155 220 C188 195 210 185 232 165"
          stroke="#2f6b43"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M155 220 C185 206 205 197 226 180"
          stroke="#1f4d30"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* ── PANICLE BRANCHES with HUSKED GRAINS (golden) ── */}
        {[
          // [branchFromX, branchFromY, branchToX, branchToY, grainCX, grainCY, rot]
          [156,  82, 130,  62, 123,  52, -25],
          [157,  90, 128,  74, 120,  65, -20],
          [158, 100, 126,  88, 118,  80, -15],
          [158, 110, 125, 100, 116,  92, -12],
          [159, 122, 126, 114, 116, 106, -10],
          [159,  82, 186,  60, 193,  50,  25],
          [159,  91, 187,  73, 195,  63,  22],
          [159, 101, 188,  87, 196,  78,  18],
          [159, 111, 187,  99, 195,  90,  15],
          [159, 123, 187, 113, 195, 104,  12],
        ].map(([fx, fy, tx, ty, cx, cy, rot], i) => (
          <g key={i}>
            <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="#2f6b43" strokeWidth="1.5" strokeLinecap="round" />
            {/* golden husk outer */}
            <ellipse cx={cx} cy={cy} rx="7" ry="13" transform={`rotate(${rot} ${cx} ${cy})`} fill="#f2c12e" />
            {/* husk inner shadow */}
            <ellipse cx={cx+1} cy={cy} rx="4" ry="9" transform={`rotate(${rot} ${cx} ${cy})`} fill="#d3a61f" opacity="0.55" />
            {/* centre vein */}
            <line
              x1={cx} y1={cy - 11 * Math.cos((rot * Math.PI) / 180)}
              x2={cx} y2={cy + 10 * Math.cos((rot * Math.PI) / 180)}
              stroke="#fffdf6"
              strokeWidth="0.8"
              opacity="0.4"
              transform={`rotate(${rot} ${cx} ${cy})`}
            />
          </g>
        ))}

        {/* ── DEHUSKED GRAINS (cream/white) floating to the right ── */}
        {[
          [240, 130,  15],
          [258, 165,  30],
          [270, 205,  45],
        ].map(([cx, cy, rot], i) => (
          <g key={`dh-${i}`} opacity={0.92 - i * 0.06}>
            {/* small connecting dashed line */}
            <line
              x1={200 + i * 8} y1={cy - 10}
              x2={cx - 10} y2={cy}
              stroke="#2f6b43"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.35"
            />
            {/* grain body */}
            <ellipse cx={cx} cy={cy} rx="9" ry="15" transform={`rotate(${rot} ${cx} ${cy})`} fill="#fffdf6" />
            <ellipse cx={cx + 1} cy={cy} rx="5" ry="10" transform={`rotate(${rot} ${cx} ${cy})`} fill="#eae0ba" opacity="0.7" />
            {/* label tag */}
            <rect x={cx + 14} y={cy - 8} width={52} height={16} rx={4} fill="#1c2a20" opacity="0.7" />
            <text x={cx + 17} y={cy + 3} fill="#fffdf6" fontSize="8" fontFamily="IBM Plex Mono, monospace" fontWeight="500">
              {i === 0 ? 'grain blanc' : i === 1 ? 'sans coque' : 'riz décortiqué'}
            </text>
          </g>
        ))}

        {/* ── PILE OF EMPTY HUSKS at the base ── */}
        {/* ground shadow */}
        <ellipse cx="148" cy="500" rx="75" ry="8" fill="#1c2a20" opacity="0.06" />

        {/* scattered husks */}
        {[
          [100, 490, -50, 0.9],
          [118, 483, -30, 0.85],
          [133, 487, -10, 0.95],
          [148, 481,  10, 1],
          [163, 486,  30, 0.85],
          [176, 490,  50, 0.8],
          [190, 494,  65, 0.7],
          [110, 498, -45, 0.6],
          [140, 495,   5, 0.75],
          [162, 497,  35, 0.65],
        ].map(([cx, cy, rot, op], i) => (
          <g key={`husk-${i}`} opacity={op}>
            <ellipse cx={cx} cy={cy} rx="6" ry="12" transform={`rotate(${rot} ${cx} ${cy})`} fill="#f2c12e" />
            <ellipse cx={cx + 0.5} cy={cy} rx="3.5" ry="8" transform={`rotate(${rot} ${cx} ${cy})`} fill="#d3a61f" opacity="0.5" />
          </g>
        ))}

        {/* label "coques vides" */}
        <text x="200" y="495" fill="#7f610a" fontSize="10" fontFamily="IBM Plex Mono, monospace" fontWeight="500" opacity="0.8">
          coques vides
        </text>
        <line x1="198" y1="491" x2="190" y2="484" stroke="#7f610a" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  );
}
