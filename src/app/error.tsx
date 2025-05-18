
"use client"; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-destructive mb-4">Oops! Something went wrong.</h1>
        <p className="text-lg mb-2">We encountered an unexpected error.</p>
        {error?.message && <p className="text-sm text-muted-foreground mb-6">Error: {error.message}</p>}
        
        <div className="space-x-4">
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            variant="default"
            size="lg"
          >
            Try Again
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/">
              Go to Homepage
            </Link>
          </Button>
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        If the problem persists, please contact support.
      </footer>
    </div>
  );
}
