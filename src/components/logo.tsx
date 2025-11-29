import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.06 18L10.5 13.5L6 10.94L11 9L13.5 13.5L18 16.06L13.06 18Z"
          fill="currentColor"
        />
        <path
          d="M10.5 13.5L13.06 18L18 16.06L13.5 13.5L10.5 13.5Z"
          fill="url(#spark-gradient)"
        />
        <defs>
          <linearGradient
            id="spark-gradient"
            x1="10.5"
            y1="13.5"
            x2="18"
            y2="16.06"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="hsl(var(--accent))" />
            <stop offset="1" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg font-semibold">SageSpark</span>
    </div>
  );
}
