import UploadForm from '@/components/UploadForm';

export default function Home() {
  return (
    <div>
      <section className="hero-header" style={{ textAlign: 'center', marginBottom: '25px' }}>
        <h1 className="hero-title" style={{ textAlign: 'center' }}>
          Upload &amp; Share <br />
          Your Pictures
        </h1>
      </section>

      <UploadForm />

    </div>
  );
}
