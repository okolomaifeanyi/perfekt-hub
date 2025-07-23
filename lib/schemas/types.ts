export type FormState =
  | {
      errors?: {
        username?: string[];
        email?: string[];
        password?: string[];
        confirmPassword?: string;
        fullName?: string[];
        bio?: string[];
        interests?: string[];
        profilePicture?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;
