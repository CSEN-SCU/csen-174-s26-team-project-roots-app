export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M16 3c1.5 4.2 4.5 6.4 8.5 7.4-2.5 1-4 2.6-5 5.1 2.6-.6 5-.2 7 1.7-3.4.4-5.6 2-7.1 4.7-1.5-2.7-3.7-4.3-7.1-4.7 2-1.9 4.4-2.3 7-1.7-1-2.5-2.5-4.1-5-5.1C11.5 9.4 14.5 7.2 16 3Z"
          fill="#3D7A36"
        />
        <path
          d="M16 21v8M12 27c1.4-.5 2.8-.5 4 0M11 30c1.7-.7 3.3-.7 5 0"
          stroke="#7E5424"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-2xl tracking-tight text-ink">
        Roots
      </span>
    </div>
  );
}
