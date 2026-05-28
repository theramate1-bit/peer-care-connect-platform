import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

/** Shim for pages that expect the shadcn `useToast` API. */
export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastInput) => {
      if (variant === "destructive") {
        sonnerToast.error(title ?? "Error", { description });
        return;
      }
      sonnerToast(title ?? "", { description });
    },
  };
}
