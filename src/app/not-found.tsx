import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="state-narrow">
      <span className="eyebrow">Not found</span>
      <h1 className="state-title">There&apos;s nothing at this address.</h1>
      <p className="state-text">
        If you were following a gallery link, check the code was copied whole —
        they are eight characters long, and none of them are the letter O or the
        digit 0.
      </p>
      <Link href="/" className="btn btn-primary">
        Go to the homepage
      </Link>
    </div>
  );
}
