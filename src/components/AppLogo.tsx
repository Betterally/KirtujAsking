
import Link from 'next/link';

export function AppLogo() {
  return (
    <Link href="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors" aria-label="KirtujAsking Home">
      KirtujAsking
    </Link>
  );
}
