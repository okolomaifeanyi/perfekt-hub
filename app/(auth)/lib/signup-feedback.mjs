export function getSignupAlertConfig(state) {
  if (!state?.message) {
    return null;
  }

  if (state.success) {
    return {
      title: "Check your email",
      description: state.message,
      variant: "default",
    };
  }

  return {
    title: "Signup Error",
    description: state.message,
    variant: "destructive",
  };
}
