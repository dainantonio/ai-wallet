import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    
    // Fallback for uncontrolled usage if needed, but primarily controlled
    const [internalChecked, setInternalChecked] = React.useState(checked || false);
    
    const isChecked = checked !== undefined ? checked : internalChecked;

    const handleToggle = () => {
      if (disabled) return;
      const newValue = !isChecked;
      setInternalChecked(newValue);
      onCheckedChange?.(newValue);
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-success" : "bg-muted",
          className
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            isChecked ? "translate-x-5" : "translate-x-0"
          )}
        />
        <input
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          onChange={() => {}}
          ref={ref}
          {...props}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
