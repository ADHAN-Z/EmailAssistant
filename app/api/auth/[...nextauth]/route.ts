// app/api/auth/[...nextauth].ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { JWT } from "next-auth/jwt";

// Extend JWT to include Google tokens
interface GoogleJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

async function refreshAccessToken(token: GoogleJWT): Promise<GoogleJWT> {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken!,
    });

    const response = await fetch(url, {
      method: "POST",
      body: params,
    });

    const refreshedTokens: {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    } = await response.json();

    if (!response.ok) throw refreshedTokens;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error: unknown) {
    logger.error("Error refreshing access token", error as Error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
        },
      },
      httpOptions: { timeout: 10000 },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      const customToken = token as GoogleJWT;

      if (account) {
        customToken.accessToken = account.access_token;
        customToken.refreshToken = account.refresh_token;
        customToken.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        
        // Only log successful OAuth setup
        logger.info("OAuth authentication completed", {
          provider: account.provider
        });
      }

      // Refresh token if expired
      if (Date.now() > (customToken.accessTokenExpires || 0)) {
        return await refreshAccessToken(customToken);
      }

      return customToken;
    },

    async session({ session, token }) {
      const customToken = token as GoogleJWT;
      if (session.user) {
        session.user.id = token.sub!;
        session.accessToken = customToken.accessToken;
        session.refreshToken = customToken.refreshToken ?? "";
      }
      // Remove routine session creation logs
      return session;
    },

    async signIn({ user, account }) {
      try {
        // Only log authentication attempts in development or on failure
        if (process.env.NODE_ENV === "development") {
          logger.debug("Sign in attempt", {
            provider: account?.provider,
          });
        }
        return true;
      } catch (error) {
        logger.error("Sign in error", error as Error);
        return false;
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Only log significant events (new users or errors)
      if (isNewUser) {
        logger.info("New user registration", {
          provider: account?.provider,
        });
      }
    },
    async signOut({ token }) {
      // Only log signout in development for debugging
      if (process.env.NODE_ENV === "development") {
        logger.debug("User signed out");
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };