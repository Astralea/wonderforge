import './brandMark.css';

const WORDMARK_SRC = '/brand/wonderforge-wordmark.png';

/**
 * Spec 05 title-plate wordmark: the Vertex WONDER/FORGE lockup.
 * Catalog and cinematic chrome keep typeset WonderForge — this picture
 * is the heading on the home plate only.
 */
export function BrandMark() {
  return (
    <span className="brand-mark brand-mark--hero" data-testid="brand-mark-hero">
      <img src={WORDMARK_SRC} alt="WonderForge" draggable={false} />
    </span>
  );
}
