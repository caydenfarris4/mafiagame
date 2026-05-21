import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  characterId?: string;
};

const password = process.env.SESSION_SECRET;
if (!password || password.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set and at least 32 characters long (see .env.example).",
  );
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "mafia_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
