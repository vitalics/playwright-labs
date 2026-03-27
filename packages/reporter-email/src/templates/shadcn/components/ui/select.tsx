/* @jsxImportSource react */
/**
 * Email-safe Select components.
 *
 * Radix UI's Select requires browser APIs and cannot run in server-side /
 * email rendering contexts.  These components reproduce the visual appearance
 * of the shadcn Select (trigger, content, item) as static HTML — no
 * interactivity, no JS, fully compatible with @react-email/render.
 */
import * as React from "react"
import { cn } from "../../lib/utils"

// ---------------------------------------------------------------------------
// SelectTrigger
// ---------------------------------------------------------------------------

export interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  placeholder?: string
}

function SelectTrigger({ className, children, placeholder, ...props }: SelectTriggerProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-full items-center rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-950",
        className,
      )}
      {...props}
    >
      {children || <span className="text-slate-500">{placeholder}</span>}
      {/* Chevron — inline so it always renders in email */}
      <span style={{ marginLeft: "auto", paddingLeft: "8px", opacity: 0.5, fontSize: "10px", lineHeight: 1 }}>
        ▼
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectValue
// ---------------------------------------------------------------------------

export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

function SelectValue({ className, children, placeholder, ...props }: SelectValueProps) {
  return (
    <span className={cn("flex-1 truncate", className)} {...props}>
      {children ?? placeholder}
    </span>
  )
}

// ---------------------------------------------------------------------------
// SelectContent
// ---------------------------------------------------------------------------

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function SelectContent({ className, children, ...props }: SelectContentProps) {
  return (
    <div
      className={cn(
        "mt-1 rounded-md border border-slate-200 bg-white shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectItem
// ---------------------------------------------------------------------------

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  selected?: boolean
}

function SelectItem({ className, children, selected, ...props }: SelectItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none",
        selected ? "bg-slate-100 font-medium text-slate-900" : "text-slate-700",
        className,
      )}
      {...props}
    >
      {selected && (
        <span style={{ marginRight: "8px", fontSize: "10px" }}>✓</span>
      )}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectLabel
// ---------------------------------------------------------------------------

export interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {}

function SelectLabel({ className, children, ...props }: SelectLabelProps) {
  return (
    <div
      className={cn("px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectSeparator
// ---------------------------------------------------------------------------

export interface SelectSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return (
    <div
      className={cn("my-1 h-[1px] bg-slate-100", className)}
      {...props}
    />
  )
}

export {
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
}
