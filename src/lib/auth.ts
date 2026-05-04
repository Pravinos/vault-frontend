// Token is managed exclusively via HttpOnly cookies set by the backend.
// The frontend never reads or writes the token directly.

export async function logout(): Promise<void> {
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function refreshToken(): Promise<boolean> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
    }
  );
  return res.ok;
}