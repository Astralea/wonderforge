/** Spec 05 §Home: title plate over the ambient diorama. */
export function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <header className="flex h-full flex-col items-center justify-center px-6 text-center motion-safe:animate-[quote-in_1s_ease-out]">
      <p className="font-display text-5xl font-bold tracking-[0.16em] text-parchment drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)] md:text-7xl">
        WonderForge
      </p>
      <h1 className="mt-6 font-display text-xl tracking-wide text-gold md:text-2xl">
        World wonders, built before your eyes
      </h1>
      <p className="mt-4 max-w-xl text-parchment/80">
        Ten Civilization VI-style construction cinematics, rebuilt as
        procedural 3D dioramas — from bare ground to glory in one minute.
      </p>
      <button
        onClick={onEnter}
        className="mt-10 cursor-pointer rounded-full border border-gold/60 px-8 py-3 font-display text-sm tracking-[0.2em] text-gold uppercase transition-[color,background-color,transform] duration-300 hover:scale-[1.03] hover:bg-gold hover:text-umber-950 focus-visible:outline-2 focus-visible:outline-gold"
      >
        Enter the gallery
      </button>
    </header>
  );
}
