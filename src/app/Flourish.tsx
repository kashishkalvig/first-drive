/**
 * The gold scroll-and-heart divider the reference screens use above and below
 * each headline. Drawn as inline SVG so it scales with the stage and inherits
 * the type colour, rather than being another image to load.
 */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `flourish ${className}` : 'flourish'}
      viewBox="0 0 300 26"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 17c14-11 30-11 38-3 6 6 1 12-5 11-5-1-7-7-2-10 9-6 26-3 41 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M92 19h44" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M150 6c-3-5-11-5-13 1-2 5 4 10 13 15 9-5 15-10 13-15-2-6-10-6-13-1Z"
        fill="currentColor"
      />
      <path d="M164 19h44" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M292 17c-14-11-30-11-38-3-6 6-1 12 5 11 5-1 7-7 2-10-9-6-26-3-41 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
