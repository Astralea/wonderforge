import { BrandMark } from './BrandMark';

/** Spec 05 §Home: title plate over the ambient diorama. */
export function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <header className="flex h-full flex-col items-center justify-center px-6 text-center motion-safe:animate-[quote-in_1s_ease-out]">
      <h1 className="flex justify-center">
        <BrandMark />
      </h1>
      <button
        onClick={onEnter}
        className="mt-10 cursor-pointer rounded-full border border-gold/60 px-8 py-3 font-display text-sm tracking-[0.2em] text-gold uppercase transition-[color,background-color,transform] duration-300 hover:scale-[1.03] hover:bg-gold hover:text-umber-950 focus-visible:outline-2 focus-visible:outline-gold"
      >
        Choose a site
      </button>
    </header>
  );
}
