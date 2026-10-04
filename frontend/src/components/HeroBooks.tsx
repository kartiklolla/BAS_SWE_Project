// Decorative storybook illustration for the home hero: a patterned book stack on a sky
// blob, with leaves, a pen, a potted plant and twinkling sparkles. Pure SVG, no assets.

type Pattern = 'diamonds' | 'hex' | 'bands' | 'lattice' | 'stripes' | 'sun';
interface B { x: number; y: number; w: number; h: number; c: string; a: string; r: number; p: Pattern; ribbon?: boolean }

// Bottom to top.
const STACK: B[] = [
  { x: 128, y: 372, w: 336, h: 60, c: '#EF6F6C', a: '#F8B4B1', r: -1.2, p: 'diamonds' },
  { x: 146, y: 316, w: 306, h: 54, c: '#F4B740', a: '#B9802A', r: 1.6, p: 'hex' },
  { x: 122, y: 260, w: 326, h: 56, c: '#1F9E89', a: '#7FD3C2', r: -2, p: 'bands' },
  { x: 160, y: 213, w: 292, h: 47, c: '#26324D', a: '#E3B65A', r: 1.2, p: 'lattice', ribbon: true },
  { x: 170, y: 170, w: 268, h: 43, c: '#F39243', a: '#FBC490', r: -1, p: 'bands' },
  { x: 186, y: 133, w: 236, h: 37, c: '#EF6F6C', a: '#F8B4B1', r: 2.4, p: 'stripes' },
  { x: 172, y: 88, w: 262, h: 45, c: '#2E86A8', a: '#F4B740', r: -2.2, p: 'sun' },
];

const STAR = 'M0-20C2.5-6 6-2.5 20 0 6 2.5 2.5 6 0 20-2.5 6-6 2.5-20 0-6-2.5-2.5-6 0-20Z';
const SPARKLES: [number, number, number, string, number][] = [
  [108, 92, 1.35, '#6CC4DF', 0],
  [452, 66, 0.75, '#6CC4DF', 1.2],
  [506, 128, 1.05, '#6CC4DF', 0.6],
  [530, 200, 0.55, '#FFFFFF', 1.8],
  [66, 214, 0.6, '#FFFFFF', 2.2],
  [506, 268, 0.5, '#FFFFFF', 0.9],
  [146, 38, 0.45, '#6CC4DF', 2.6],
];
const DOTS: [number, number, number][] = [[156, 72, 4], [416, 36, 3], [524, 336, 4], [58, 318, 3], [478, 300, 3]];

function pattern({ x, y, w, h, a, p }: B, spineEnd: number) {
  const cy = y + h / 2;
  const across = (step: number, from = x + 30) => {
    const out: number[] = [];
    for (let cx = from; cx < spineEnd - 12; cx += step) out.push(cx);
    return out;
  };
  switch (p) {
    case 'bands':
      return [x + w * 0.1, x + w * 0.42].map((bx) => <rect key={bx} x={bx} y={y} width={12} height={h} fill={a} />);
    case 'stripes':
      return [0.32, 0.5, 0.68].map((t) => (
        <line key={t} x1={x + 16} x2={spineEnd} y1={y + h * t} y2={y + h * t} stroke={a} strokeWidth={3} strokeLinecap="round" />
      ));
    case 'diamonds':
      return (
        <g stroke={a} strokeWidth={2.5} fill="none" strokeLinejoin="round">
          <line x1={x + 14} x2={spineEnd} y1={y + 9} y2={y + 9} />
          <line x1={x + 14} x2={spineEnd} y1={y + h - 11} y2={y + h - 11} />
          {across(30).map((cx) => <path key={cx} d={`M${cx} ${cy - 11}L${cx + 11} ${cy}L${cx} ${cy + 11}L${cx - 11} ${cy}Z`} />)}
        </g>
      );
    case 'hex':
      return (
        <g stroke={a} strokeWidth={2.5} fill="none">
          {across(46, x + 40).map((cx) => (
            <path
              key={cx}
              d={Array.from({ length: 6 }, (_, i) => {
                const t = (Math.PI / 3) * i;
                return `${i ? 'L' : 'M'}${cx + 12 * Math.cos(t)} ${cy + 12 * Math.sin(t)}`;
              }).join('') + 'Z'}
            />
          ))}
          <rect x={x + 12} y={y} width={7} height={h} fill={a} stroke="none" />
        </g>
      );
    case 'lattice':
      return (
        <g stroke={a} strokeWidth={2} strokeLinecap="round">
          {across(22).map((cx) => (
            <g key={cx}>
              <line x1={cx - 6} y1={cy - 9} x2={cx + 6} y2={cy + 9} />
              <line x1={cx + 6} y1={cy - 9} x2={cx - 6} y2={cy + 9} />
            </g>
          ))}
          <line x1={x + 14} x2={spineEnd} y1={y + 7} y2={y + 7} />
          <line x1={x + 14} x2={spineEnd} y1={y + h - 7} y2={y + h - 7} />
        </g>
      );
    case 'sun': {
      const sx = x + w * 0.3;
      return (
        <g fill={a} stroke={a} strokeWidth={2.5} strokeLinecap="round">
          <circle cx={sx} cy={cy} r={8} stroke="none" />
          {Array.from({ length: 8 }, (_, i) => {
            const t = (Math.PI / 4) * i;
            return <line key={i} x1={sx + 11 * Math.cos(t)} y1={cy + 11 * Math.sin(t)} x2={sx + 16 * Math.cos(t)} y2={cy + 16 * Math.sin(t)} />;
          })}
          <rect x={x + w * 0.08} y={y} width={9} height={h} stroke="none" />
          <rect x={spineEnd - 22} y={y} width={9} height={h} stroke="none" />
        </g>
      );
    }
  }
}

function Book(b: B) {
  const { x, y, w, h, c, r } = b;
  const pageX = x + w * 0.6;
  const pageW = w * 0.37;
  return (
    <g transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx={9} fill={c} />
      <rect x={pageX} y={y + 6} width={pageW} height={h - 12} rx={3} fill="#FFFBF0" />
      {[0.32, 0.5, 0.68].map((t) => (
        <line key={t} x1={pageX + 5} x2={pageX + pageW - 5} y1={y + h * t} y2={y + h * t} stroke="#E6D9BC" strokeWidth={1.5} strokeLinecap="round" />
      ))}
      {pattern(b, pageX - 8)}
      <rect x={x} y={y + h - 7} width={w} height={7} rx={3} fill="#000" opacity={0.08} />
      {b.ribbon && (
        <path d={`M${x + w * 0.72} ${y + h - 4}h14v38l-7-8-7 8z`} fill="#F4B740" />
      )}
    </g>
  );
}

export function HeroBooks({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 500" className={className} aria-hidden="true" focusable="false">
      <path
        d="M300 34C404 26 506 92 526 202C546 312 492 424 376 458C260 492 118 474 64 378C10 282 36 150 116 88C176 42 236 39 300 34Z"
        fill="#BFE6F2"
      />
      <ellipse cx="300" cy="450" rx="215" ry="26" fill="#9AD4E6" />

      {/* leaves behind the stack */}
      <g fill="#8CC3D6">
        <path d="M96 336C92 272 104 212 132 160" stroke="#7FB2C6" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="110" cy="284" rx="10" ry="28" transform="rotate(-32 110 284)" />
        <ellipse cx="94" cy="236" rx="9" ry="25" transform="rotate(24 94 236)" />
        <ellipse cx="126" cy="196" rx="9" ry="24" transform="rotate(-38 126 196)" />
        <path d="M486 336C498 272 490 220 464 178" stroke="#7FB2C6" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse cx="500" cy="280" rx="10" ry="27" transform="rotate(30 500 280)" />
        <ellipse cx="478" cy="226" rx="9" ry="23" transform="rotate(-26 478 226)" />
      </g>

      {SPARKLES.map(([cx, cy, s, fill, delay]) => (
        <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) scale(${s})`}>
          <path d={STAR} fill={fill} className="twinkle" style={{ animationDelay: `${delay}s` }} />
        </g>
      ))}
      {DOTS.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#6CC4DF" />)}

      <g className="bob">
        {STACK.map((b) => <Book key={b.y} {...b} />)}
      </g>

      {/* pen */}
      <g transform="rotate(-12 150 452)">
        <rect x="62" y="446" width="156" height="12" rx="6" fill="#26324D" />
        <rect x="90" y="442" width="44" height="4" rx="2" fill="#F4B740" />
        <rect x="196" y="446" width="9" height="12" fill="#F4B740" />
        <path d="M218 446L242 452L218 458Z" fill="#F4B740" />
      </g>

      {/* potted plant */}
      <g>
        <path d="M499 420C480 384 478 350 496 322C512 352 514 388 499 420Z" fill="#1F9E89" />
        <path d="M496 422C462 408 446 380 450 352C476 366 492 392 496 422Z" fill="#178573" />
        <path d="M502 422C536 408 552 380 548 350C522 364 506 392 502 422Z" fill="#178573" />
        <path d="M464 430L534 430L524 474Q499 482 474 474Z" fill="#F39243" />
        <rect x="458" y="418" width="82" height="14" rx="6" fill="#E07C2E" />
      </g>
    </svg>
  );
}
