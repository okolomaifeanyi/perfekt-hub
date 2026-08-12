export type SignupAlertVariant = "default" | "destructive";

export interface SignupFeedbackState {
  success?: boolean;
  message?: string;
}

export interface SignupAlertConfig {
  title: string;
  description: string;
  variant: SignupAlertVariant;
}

export declare function getSignupAlertConfig(
  state: SignupFeedbackState | undefined
): SignupAlertConfig | null;
