import type { NitipUserProfile } from "@nitip/domain";
import type { User } from "firebase/auth";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export const apiConfigured = apiBaseUrl.length > 0;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getMe(user: User): Promise<NitipUserProfile> {
  if (!apiConfigured) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const idToken = await user.getIdToken();
  const response = await fetch(`${apiBaseUrl}/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  const body = (await response.json()) as {
    data?: NitipUserProfile;
    message?: string;
    error?: string;
  };

  if (!response.ok || !body.data) {
    throw new ApiError(
      body.message ?? body.error ?? "Nitip API request failed",
      response.status,
    );
  }

  return body.data;
}
