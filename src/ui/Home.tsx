import { Gallery } from './Gallery';
import { Hero } from './Hero';

export function Home() {
  return (
    <>
      <Hero />
      <Gallery />
      <footer className="border-t border-parchment/10 px-6 py-10 text-center text-xs text-parchment/45">
        <p>
          WonderForge is a fan-made homage. Not affiliated with or endorsed by
          Firaxis Games or 2K. All geometry is procedural; no game assets are
          used.
        </p>
      </footer>
    </>
  );
}
