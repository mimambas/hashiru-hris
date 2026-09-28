"use client";

import * as React from "react";
import { cx } from "@/lib/format";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cx("block text-sm font-medium text-text", className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
