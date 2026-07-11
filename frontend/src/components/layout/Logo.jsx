export default function Logo({ size = 22, dark = true }) {
  const stroke = dark ? '#0a0a0a' : '#ffffff';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M16 4 L27 10.5 L27 21.5 L16 28 L5 21.5 L5 10.5 Z"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="16" cy="16" r="2.6" fill={stroke} />
      <circle cx="16" cy="16" r="6.4" stroke={stroke} strokeOpacity="0.35" strokeWidth="1" fill="none" />
      <circle cx="16" cy="16" r="10.2" stroke={stroke} strokeOpacity="0.18" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function Wordmark({ size = 18, dark = true }) {
  return (
    <div className="flex items-center gap-2">
      <Logo size={size + 4} dark={dark} />
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: size, letterSpacing: '-0.02em', color: dark ? '#0a0a0a' : '#ffffff' }}
      >
        EpiCast
      </span>
    </div>
  );
}
