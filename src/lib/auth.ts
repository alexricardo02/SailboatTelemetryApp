import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { LoginCredentialsSchema } from './validation';
import { logSecurityEvent, logInfo } from './logger';
import { timingSafeEqualStrings } from './security';

// Default development hash for "father2024" if no AUTH_PASSWORD_HASH is provided:
const DEFAULT_DEV_HASH = '$2a$10$2pXKXOmvee76g5QwUFWG9OWyJymBLZqfJIE2lrdRqMFVD8YUtQZQC'; // "father2024"
const DEFAULT_DEV_USER = 'skipper';

// Dummy hash for timing equalization when username does not match
const DUMMY_HASH = '$2a$10$2pXKXOmvee76g5QwUFWG9OWyJymBLZqfJIE2lrdRqMFVD8YUtQZQC';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const ip = req?.headers?.['x-forwarded-for'] || '127.0.0.1';

        const parsed = LoginCredentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          logSecurityEvent({
            type: 'user_auth_failed',
            ip: String(ip),
            reason: 'invalid_credentials_format',
          });
          return null;
        }

        const expectedUser = process.env.AUTH_USERNAME || DEFAULT_DEV_USER;
        const expectedHash = process.env.AUTH_PASSWORD_HASH || DEFAULT_DEV_HASH;

        const { username, password } = parsed.data;

        // Timing-safe username comparison
        const isUserMatch = timingSafeEqualStrings(username, expectedUser);

        // Constant-time execution: always run bcrypt.compare to prevent side-channel username enumeration
        const targetHash = isUserMatch ? expectedHash : DUMMY_HASH;
        const isPasswordValid = await bcrypt.compare(password, targetHash);

        if (!isUserMatch || !isPasswordValid) {
          logSecurityEvent({
            type: 'user_auth_failed',
            ip: String(ip),
            reason: !isUserMatch ? 'wrong_username' : 'wrong_password',
          });
          return null;
        }

        logInfo('User authenticated successfully', { username, ip: String(ip) });

        return {
          id: 'single-user-id',
          name: username,
          email: `${username}@sailboat.local`,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev_secret_key_sailboat_telemetry_2024_secure_hash_min_32_chars',
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.name = token.name;
      }
      return session;
    },
  },
};
