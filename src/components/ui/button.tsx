import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-[background-color,border-color,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/85 hover:shadow-[var(--shadow-medium)] focus-visible:ring-primary/40",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-soft)] hover:bg-destructive/90 hover:shadow-[var(--shadow-medium)] focus-visible:ring-destructive/40",
        outline:
          "border border-border/70 bg-card/95 text-foreground hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-primary/30",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--shadow-soft)] hover:bg-secondary/80 hover:shadow-[var(--shadow-medium)] focus-visible:ring-secondary/40",
        ghost: "text-foreground hover:bg-primary/10 focus-visible:ring-primary/30",
        link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary/30",
        hero: "wellness-gradient text-primary-foreground hover:shadow-wellness-medium focus-visible:ring-primary/40",
        wellness: "bg-accent text-accent-foreground shadow-[var(--shadow-soft)] hover:bg-accent/90 hover:shadow-[var(--shadow-medium)] focus-visible:ring-accent/40",
        credit: "hero-gradient text-white border-0 hover:shadow-wellness-strong focus-visible:ring-primary/40",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-full px-3 text-sm",
        lg: "h-12 rounded-full px-6 text-base",
        icon: "h-11 w-11 rounded-full",
        xs: "h-8 rounded-full px-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
