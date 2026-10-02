import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        // The site's white button for opening, switching, cancelling and
        // going back: white, a strong grey border and ink text, set here
        // once so every outline button looks the same. On hover it stays
        // white and lifts: a dark border and a soft shadow. A grey fill
        // would look like the hovered table row behind it, and the pale
        // red tint means "selected" or "you are here" (the open row, the
        // active tab), not "pointed at". At rest it lies flat, so the
        // shadow only ever means "pointed at".
        outline:
          "border border-line-strong bg-background text-ink hover:border-ink-2 hover:text-ink hover:shadow-[0_1px_2px_rgb(22_24_29_/_0.10),0_3px_8px_rgb(22_24_29_/_0.12)] dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // A negative step that cannot be undone (return a parcel, record a
        // failed delivery): caution yellow with ink text, so it warns
        // without looking like the red "next step" button. Its focus ring
        // is dark, as a pale ring would vanish against the yellow.
        warning:
          "bg-highlight text-ink hover:bg-highlight-strong focus-visible:ring-ink/70",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-9 px-4 py-2 has-[>svg]:px-3",
        "sm": "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        "lg": "h-10 rounded-md px-6 has-[>svg]:px-4",
        "icon": "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
        // Table row actions (Edit, Assign...): 32px tall for a mouse, and
        // 44px on touch screens (iPads) so they are easy to tap.
        "row": "h-8 pointer-coarse:h-11 rounded-md gap-1.5 px-3 text-[13px] font-bold has-[>svg]:px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
