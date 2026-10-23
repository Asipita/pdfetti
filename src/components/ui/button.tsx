import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      primary: "ui-button--primary",
      secondary: "ui-button--secondary",
      outline: "ui-button--outline",
      ghost: "ui-button--ghost",
      destructive: "ui-button--destructive",
    },
    size: {
      default: "ui-button--default",
      sm: "ui-button--sm",
      icon: "ui-button--icon",
    },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode;
    loading?: boolean;
    asChild?: boolean;
  };

export function Button({
  variant,
  size,
  className,
  loading,
  asChild = false,
  children,
  disabled,
  ...props
}: Props) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={clsx(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </Component>
  );
}
