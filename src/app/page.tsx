import UploadForm from '@/components/UploadForm';

export default function Home() {
  return (
    <div>
      <section className="hero">
        <span className="eyebrow">Shared photo archive</span>
        <h1 className="hero-title">Everyone&rsquo;s photos, in one place.</h1>
        <p className="hero-sub">
          Add yours in a couple of taps — no account needed. Open a gallery and share the
          link when you want to collect everyone else&rsquo;s.
        </p>
      </section>

      <UploadForm />
    </div>
  );
}
