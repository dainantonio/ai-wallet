import { toast } from "@/hooks/use-toast";

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function friendlyErrorMessage(): string {
  return GENERIC_ERROR;
}

export function notifyApiError(title = "Request failed") {
  toast({
    title,
    description: GENERIC_ERROR,
    variant: "destructive",
  });
}
