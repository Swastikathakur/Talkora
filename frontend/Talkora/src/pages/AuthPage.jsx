import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';

export const AuthPage = ({ mode = 'login' }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md flex justify-center">
        {mode === 'login' ? (
          <SignIn routing="path" path="/login" signUpUrl="/signup" fallbackRedirectUrl="/" />
        ) : (
          <SignUp routing="path" path="/signup" signInUrl="/login" fallbackRedirectUrl="/" />
        )}
      </div>
    </div>
  );
};
