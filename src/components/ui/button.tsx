import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] tracking-[-0.02em]",
  {
    variants: {
      variant: {
        default:
          "bg-[#141413] text-[#F3F0EE] rounded-[20px] border-[1.5px] border-[#141413] hover:bg-[#262627] active:scale-[0.98]",
        destructive:
          "bg-[#CF4500] text-white rounded-[24px] border-0 hover:bg-[#b53d00] active:scale-[0.98]",
        outline:
          "bg-white text-[#141413] rounded-[20px] border-[1.5px] border-[#141413] hover:bg-[#F3F0EE] active:scale-[0.98]",
        secondary:
          "bg-white text-[#141413] rounded-[20px] border-[1.5px] border-[#141413] hover:bg-[#F3F0EE] active:scale-[0.98]",
        ghost:
          "rounded-[20px] hover:bg-[#F3F0EE] hover:text-[#141413]",
        link: "text-[#3860BE] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-6 py-1.5 text-base has-[>svg]:px-4",
        xs: "h-6 gap-1 rounded-[12px] px-3 text-xs has-[>svg]:px-2",
        sm: "h-8 rounded-[16px] gap-1.5 px-4 text-sm has-[>svg]:px-3",
        lg: "h-11 rounded-[20px] px-8 text-base has-[>svg]:px-6",
        icon: "size-9 rounded-full",
        "icon-xs": "size-6 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
