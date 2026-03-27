/* @jsxImportSource react */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium no-underline",
  {
    variants: {
      variant: {
        default:     "bg-slate-900 text-slate-50",
        destructive: "bg-red-500 text-white",
        outline:     "border border-slate-200 bg-white text-slate-900",
        secondary:   "bg-slate-100 text-slate-900",
        ghost:       "text-slate-900",
        link:        "text-slate-900 underline underline-offset-4",
      },
      size: {
        default: "px-4 py-2",
        sm:      "px-3 py-1.5 text-xs",
        lg:      "px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {
  href?: string;
}

/** Email-safe Button: renders as <a> (no browser APIs, no Radix Slot). */
function Button({ className, variant, size, href = "#", children, ...props }: ButtonProps) {
  return (
    <a href={href} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </a>
  )
}

export { Button, buttonVariants }
