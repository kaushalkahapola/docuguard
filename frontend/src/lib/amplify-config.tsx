'use client';

/**
 * AWS Amplify Configuration
 * This file initializes Amplify with our Cognito User Pool settings.
 * It is imported once at the root layout level.
 */
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
    },
  },
});

export default function AmplifyConfigProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
