import { LOGO_URL } from '../../utils/brand';

// Animated login illustration: an HRIS dashboard with floating employee,
// leave and payslip cards and colleagues talking in the office (speech
// bubbles take turns), drawn in the app greens
// (sidebar.css). Pure SVG +
// CSS keyframes from login.css (.li-*); the only image is the ADDESSA
// logo (public/img/addessa.jpg) on the dashboard, the shirts and an ID
// lanyard. The motion stops under prefers-reduced-motion.

// The round ADDESSA mark at (cx, cy) on a thin white ring; the clip trims
// the JPG's white corners. `mirror` cancels a flipped parent (scale(-1 1))
// so the logo never reads backwards.
const Logo = ({ cx, cy, r, mirror = false }) => (
  <g transform={mirror ? 'scale(-1 1)' : undefined}>
    <circle cx={mirror ? -cx : cx} cy={cy} r={r + 1} fill="#ffffff" />
    <image href={LOGO_URL} x={(mirror ? -cx : cx) - r} y={cy - r} width={r * 2} height={r * 2} clipPath="url(#li-logo-clip)" />
  </g>
);

// A company ID on a lanyard, hanging from the neck and swinging a little.
const IdLanyard = () => (
  <g className="li-swing">
    <path d="M-7 -84 L-3 -62 M7 -84 L3 -62" stroke="#c8102e" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="-8" y="-63" width="16" height="21" rx="2.5" fill="#ffffff" stroke="#d9f7be" />
    <Logo cx={0} cy={-55} r={4.5} />
    <rect x="-5" y="-47" width="10" height="2" rx="1" fill="#389e0d" />
  </g>
);
// A head facing +x: hair, face, eye and a small smile; `nod` animates it.
const Head = ({ skin, hair, nod }) => (
  <g className={`li-nod ${nod}`}>
    <circle cx="-1" cy="-99" r="13" fill={hair} />
    <circle cx="1" cy="-95" r="11.5" fill={skin} />
    <path d="M-11 -99 q4 -13 15 -12 q8 1 9 8 q-12 -5 -24 4z" fill={hair} />
    <circle cx="6.5" cy="-96" r="1.5" fill="#1f1209" />
    <path d="M4 -89 q3 2 6 -0.5" fill="none" stroke="#8a4b2a" strokeWidth="1.3" strokeLinecap="round" />
  </g>
);

// A standing person, feet on the floor at x, facing right (flip = left).
// The front arm gestures (`gesture`); children are held in that hand.
// The shirt carries the ADDESSA emblem, or `badge` the ID lanyard instead.
const Person = ({ x, flip = false, shirt, arm, pants, skin, hair, gesture, nod, badge = false, children }) => (
  <g transform={`translate(${x} 472)${flip ? ' scale(-1 1)' : ''}`}>
    <ellipse cx="0" cy="2" rx="20" ry="3.5" fill="rgba(0,0,0,0.25)" />
    <rect x="-10" y="-40" width="8" height="38" rx="4" fill={pants} />
    <rect x="2" y="-40" width="8" height="38" rx="4" fill={pants} />
    <rect x="-11" y="-5" width="13" height="5" rx="2.5" fill="#0b2406" />
    <rect x="1" y="-5" width="13" height="5" rx="2.5" fill="#0b2406" />
    <rect x="-20" y="-80" width="8" height="32" rx="4" fill={arm} />
    <circle cx="-16" cy="-48" r="4.5" fill={skin} />
    <rect x="-16" y="-84" width="32" height="48" rx="12" fill={shirt} />
    {badge ? <IdLanyard /> : <Logo cx={4} cy={-71} r={4} mirror={flip} />}
    <g className={`li-gesture ${gesture}`}>
      <rect x="10" y="-80" width="8" height="30" rx="4" fill={arm} />
      <circle cx="14" cy="-50" r="4.5" fill={skin} />
      {children}
    </g>
    <Head skin={skin} hair={hair} nod={nod} />
  </g>
);

// A speech bubble with typing dots; its tail points down at `tail`.
const Bubble = ({ className, x, y, tail }) => (
  <g className={className}>
    <rect x={x} y={y} width="54" height="24" rx="12" fill="#ffffff" />
    <path d={`M${tail - 5} ${y + 23} L${tail} ${y + 31} L${tail + 5} ${y + 23}z`} fill="#ffffff" />
    <circle className="li-dot" cx={x + 17} cy={y + 12} r="3" fill="#389e0d" />
    <circle className="li-dot li-dot--2" cx={x + 27} cy={y + 12} r="3" fill="#52c41a" />
    <circle className="li-dot li-dot--3" cx={x + 37} cy={y + 12} r="3" fill="#95de64" />
  </g>
);

const LoginIllustration = () => (
  <svg className="login-illustration" viewBox="0 0 560 490" role="img" aria-label="ADDESSA colleagues talking in the office around an HRIS dashboard">
    <defs>
      <clipPath id="li-logo-clip" clipPathUnits="objectBoundingBox">
        <circle cx="0.5" cy="0.5" r="0.47" />
      </clipPath>
    </defs>
    {/* dashboard window */}
    <g className="li-window">
      <rect x="110" y="70" width="340" height="260" rx="18" fill="#ffffff" />
      <rect x="110" y="70" width="340" height="40" rx="18" fill="#f6ffed" />
      <rect x="110" y="96" width="340" height="14" fill="#f6ffed" />
      <circle cx="134" cy="90" r="5" fill="#ff7875" />
      <circle cx="150" cy="90" r="5" fill="#ffc53d" />
      <circle cx="166" cy="90" r="5" fill="#73d13d" />
      <Logo cx={196} cy={90} r={9} />
      <text x="211" y="94.5" fontSize="12" fontWeight="700" fill="#1a4d0f">ADDESSA HRIS</text>

      {/* sidebar strip */}
      <rect x="126" y="126" width="64" height="188" rx="10" fill="#1d5512" />
      <rect x="138" y="142" width="40" height="8" rx="4" fill="#95de64" />
      <rect x="138" y="162" width="32" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="138" y="178" width="36" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="138" y="194" width="28" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="138" y="210" width="34" height="6" rx="3" fill="rgba(255,255,255,0.4)" />

      {/* stat tiles */}
      <rect x="204" y="126" width="72" height="44" rx="8" fill="#f6ffed" stroke="#d9f7be" />
      <rect x="214" y="136" width="30" height="6" rx="3" fill="#b7eb8f" />
      <rect x="214" y="150" width="44" height="10" rx="4" fill="#389e0d" />
      <rect x="286" y="126" width="72" height="44" rx="8" fill="#f6ffed" stroke="#d9f7be" />
      <rect x="296" y="136" width="30" height="6" rx="3" fill="#b7eb8f" />
      <rect x="296" y="150" width="36" height="10" rx="4" fill="#52c41a" />
      <rect x="368" y="126" width="68" height="44" rx="8" fill="#f6ffed" stroke="#d9f7be" />
      <rect x="378" y="136" width="30" height="6" rx="3" fill="#b7eb8f" />
      <rect x="378" y="150" width="40" height="10" rx="4" fill="#73d13d" />

      {/* bar chart: bars rise and fall */}
      <rect x="204" y="182" width="232" height="132" rx="10" fill="#fcfffa" stroke="#eef9e6" />
      <line x1="216" y1="298" x2="424" y2="298" stroke="#d9f7be" strokeWidth="2" />
      <rect className="li-bar li-bar--1" x="226" y="226" width="22" height="72" rx="5" fill="#b7eb8f" />
      <rect className="li-bar li-bar--2" x="260" y="206" width="22" height="92" rx="5" fill="#73d13d" />
      <rect className="li-bar li-bar--3" x="294" y="238" width="22" height="60" rx="5" fill="#95de64" />
      <rect className="li-bar li-bar--4" x="328" y="196" width="22" height="102" rx="5" fill="#389e0d" />
      <rect className="li-bar li-bar--5" x="362" y="218" width="22" height="80" rx="5" fill="#52c41a" />
      <rect className="li-bar li-bar--6" x="396" y="232" width="22" height="66" rx="5" fill="#b7eb8f" />
    </g>

    {/* employee card */}
    <g className="li-float li-float--a">
      <rect x="20" y="168" width="150" height="86" rx="14" fill="#ffffff" />
      <circle cx="54" cy="200" r="18" fill="#d9f7be" />
      <circle cx="54" cy="195" r="7" fill="#389e0d" />
      <path d="M41 212 a13 10 0 0 1 26 0 z" fill="#389e0d" />
      <rect x="82" y="190" width="70" height="8" rx="4" fill="#1a4d0f" />
      <rect x="82" y="204" width="50" height="6" rx="3" fill="#b7eb8f" />
      <rect x="36" y="230" width="58" height="14" rx="7" fill="#f6ffed" stroke="#b7eb8f" />
      <rect x="46" y="235" width="38" height="4" rx="2" fill="#52c41a" />
    </g>

    {/* leave / calendar card with a check */}
    <g className="li-float li-float--b">
      <rect x="398" y="32" width="132" height="104" rx="14" fill="#ffffff" />
      <rect x="398" y="32" width="132" height="26" rx="14" fill="#389e0d" />
      <rect x="398" y="46" width="132" height="12" fill="#389e0d" />
      <rect x="412" y="41" width="50" height="7" rx="3.5" fill="rgba(255,255,255,0.75)" />
      <g fill="#eef9e6">
        <rect x="412" y="68" width="18" height="14" rx="3" />
        <rect x="436" y="68" width="18" height="14" rx="3" />
        <rect x="460" y="68" width="18" height="14" rx="3" />
        <rect x="484" y="68" width="18" height="14" rx="3" />
        <rect x="412" y="88" width="18" height="14" rx="3" />
        <rect x="460" y="88" width="18" height="14" rx="3" />
        <rect x="484" y="88" width="18" height="14" rx="3" />
        <rect x="412" y="108" width="18" height="14" rx="3" />
        <rect x="436" y="108" width="18" height="14" rx="3" />
      </g>
      <rect x="436" y="88" width="18" height="14" rx="3" fill="#52c41a" />
      <circle className="li-pulse" cx="502" cy="118" r="14" fill="#52c41a" />
      <path className="li-check" d="M495 118 l5 5 l9 -10" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* payslip card */}
    <g className="li-float li-float--c">
      <rect x="380" y="282" width="150" height="104" rx="14" fill="#ffffff" />
      <circle cx="410" cy="312" r="15" fill="#f6ffed" stroke="#b7eb8f" />
      <text x="410" y="318" textAnchor="middle" fontSize="16" fontWeight="700" fill="#389e0d">₱</text>
      <rect x="434" y="304" width="78" height="8" rx="4" fill="#1a4d0f" />
      <rect x="434" y="318" width="52" height="6" rx="3" fill="#b7eb8f" />
      <rect x="396" y="340" width="118" height="5" rx="2.5" fill="#eef9e6" />
      <rect x="396" y="352" width="98" height="5" rx="2.5" fill="#eef9e6" />
      <rect x="396" y="366" width="60" height="9" rx="4.5" fill="#52c41a" />
    </g>

    {/* floor */}
    <line x1="24" y1="474" x2="536" y2="474" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" />

    {/* office chat: two colleagues on the left, a mug-holder talking to a
        colleague seated at a desk on the right; speech bubbles take turns */}
    <Person x={60} badge shirt="#ffffff" arm="#f0f0f0" pants="#b7eb8f" skin="#f1c27d" hair="#1f1209" gesture="li-gesture--1" nod="li-nod--1" />
    <Person x={142} flip shirt="#ffd666" arm="#f5c542" pants="#d9f7be" skin="#e0ac69" hair="#3b2314" gesture="li-gesture--2" nod="li-nod--2">
      <rect x="12" y="-60" width="18" height="24" rx="2.5" fill="#ffffff" stroke="#b7eb8f" strokeWidth="1.5" />
      <rect x="16" y="-54" width="10" height="3" rx="1.5" fill="#95de64" />
    </Person>
    <Person x={224} shirt="#95de64" arm="#73d13d" pants="#1d5512" skin="#c68642" hair="#2b1a10" gesture="li-gesture--3" nod="li-nod--3">
      <rect x="12" y="-58" width="10" height="12" rx="2" fill="#ffffff" />
      <path d="M22 -55 h3 a3 3 0 0 1 0 6 h-3" fill="none" stroke="#ffffff" strokeWidth="2" />
      <rect x="12" y="-58" width="10" height="3" fill="#8c5a3c" />
    </Person>

    {/* seated colleague, facing left toward the laptop and the mug-holder */}
    <g transform="translate(345 472) scale(-1 1)">
      <ellipse cx="-4" cy="2" rx="24" ry="3.5" fill="rgba(0,0,0,0.25)" />
      <rect x="-25" y="-68" width="8" height="40" rx="4" fill="#237804" />
      <rect x="-25" y="-32" width="34" height="6" rx="3" fill="#237804" />
      <rect x="-10" y="-26" width="4" height="23" fill="#237804" />
      <rect x="-20" y="-4" width="24" height="3" rx="1.5" fill="#237804" />
      <rect x="-12" y="-38" width="27" height="9" rx="4" fill="#1d5512" />
      <rect x="8" y="-38" width="9" height="34" rx="4" fill="#1d5512" />
      <rect x="8" y="-5" width="14" height="5" rx="2.5" fill="#0b2406" />
      <rect x="-16" y="-84" width="30" height="48" rx="12" fill="#ffffff" />
      <rect x="-2" y="-84" width="5" height="14" rx="2.5" fill="#389e0d" />
      <Logo cx={-9} cy={-71} r={4} mirror />
      <g className="li-type">
        <rect x="4" y="-74" width="26" height="8" rx="4" fill="#f0f0f0" />
        <circle cx="30" cy="-70" r="4.5" fill="#f1c27d" />
      </g>
      <Head skin="#f1c27d" hair="#5a3a22" nod="li-nod--4" />
    </g>

    {/* desk + laptop */}
    <rect x="262" y="406" width="128" height="7" rx="3" fill="#f6ffed" />
    <rect x="268" y="413" width="5" height="59" fill="#d9f7be" />
    <rect x="379" y="413" width="5" height="59" fill="#d9f7be" />
    <rect x="282" y="401" width="40" height="5" rx="2" fill="#bfbfbf" />
    <polygon points="281,404 288,404 280,370 273,370" fill="#f6ffed" stroke="#b7eb8f" strokeWidth="1.5" strokeLinejoin="round" />
    <rect className="li-tablet-line" x="279" y="377" width="3" height="20" rx="1.5" fill="#52c41a" transform="rotate(-13 280 387)" />

    {/* speech bubbles, one at a time */}
    <Bubble className="li-bubble li-bubble--1" x={20} y={318} tail={44} />
    <Bubble className="li-bubble li-bubble--2" x={116} y={334} tail={150} />
    <Bubble className="li-bubble li-bubble--3" x={198} y={334} tail={230} />
    <Bubble className="li-bubble li-bubble--4" x={318} y={336} tail={340} />

    {/* sparkles */}
    <circle className="li-spark li-spark--a" cx="78" cy="58" r="5" fill="#d9f7be" />
    <circle className="li-spark li-spark--b" cx="352" cy="44" r="4" fill="#95de64" />
    <circle className="li-spark li-spark--c" cx="30" cy="290" r="6" fill="#b7eb8f" />
    <circle className="li-spark li-spark--d" cx="300" cy="372" r="4" fill="#d9f7be" />
  </svg>
);

export default LoginIllustration;
