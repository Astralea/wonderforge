import { useMemo } from 'react';
import { captionsFor, type CaptionPlace } from '../data/captions';
import type { Wonder } from '../data/types';
import { captionStateAt } from '../engine/captions';
import { usePlaybackStore } from '../store/playback';
import { useCaptionVoice } from './useCaptionVoice';
import { sampleEiffelGroundLiftPilot } from '../engine/eiffelGroundLiftPilot';
import { sampleEiffelJointCampaign } from '../engine/eiffelJointCampaign';
import { eiffelChapterCaptionAt, eiffelChapterCaptionOpacityAt, eiffelFactCaptionsForEdit } from './eiffelChapterCaptions';
import { eiffelFilmEditDuration, sampleEiffelFilmEdit } from '../engine/eiffelFilmEdit';

const PLACE_CLASSES: Record<CaptionPlace, string> = {
  'lower-right': 'bottom-[calc(6vh+11rem)] right-6 text-right md:right-10',
  'upper-left': 'top-72 left-6 text-left md:top-80 md:left-10',
  'upper-right': 'top-[calc(6vh+1rem)] right-6 text-right md:right-10',
};

/**
 * Spec 05 §Caption layer: authored lower-thirds over the playing movie.
 * Renders at 1× while playing or paused — chrome may stay visible; captions
 * never take the quote card's lower-left corner, and a lower-right beat sits
 * above the control rail. The envelope is a pure function of t: scrubbing
 * and pausing freeze a caption mid-fade. Optional narration plays the
 * bundled ElevenLabs clip for the active beat, or stays silent.
 */
export function CaptionLayer({ wonder }: { wonder: Wonder }) {
  const t = usePlaybackStore((s) => s.t);
  const status = usePlaybackStore((s) => s.status);
  const speed = usePlaybackStore((s) => s.speed);
  const eiffelEdit = usePlaybackStore((s) => s.eiffelEdit);
  const beats = useMemo(() => wonder.id === 'eiffel-tower'
    ? eiffelFactCaptionsForEdit(captionsFor(wonder), eiffelEdit) : captionsFor(wonder), [wonder, eiffelEdit]);
  const film = wonder.id === 'eiffel-tower' ? sampleEiffelFilmEdit(eiffelEdit, t) : null;
  const editSeconds = t * eiffelFilmEditDuration(eiffelEdit);
  const detailed = !film || eiffelEdit === 'detailed';
  const captionT = t;
  const captionVisible = speed === 1 && (status === 'playing' || status === 'paused');
  const chapterCaption = film && captionVisible ? eiffelChapterCaptionAt(editSeconds, eiffelEdit) : null;
  const caption =
    detailed && !chapterCaption && (!film || (film.chapter === 'main' && film.cutOpacity === 0)) && captionVisible
      ? captionStateAt(beats, captionT)
      : null;

  useCaptionVoice(
    wonder.id,
    chapterCaption?.id ?? caption?.id ?? null,
    chapterCaption?.text ?? caption?.text ?? null,
    (chapterCaption !== null || caption !== null) && status === 'playing',
    film ? editSeconds / 60 : captionT,
    chapterCaption ? chapterCaption.fromSeconds / 60 : film ? (caption?.from ?? 0) * eiffelFilmEditDuration(eiffelEdit) / 60 : caption?.from ?? 0,
  );

  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-0 z-20">
      {chapterCaption && (
        <figure data-testid="eiffel-chapter-caption" data-caption-id={chapterCaption.id} aria-atomic="true" className="eiffel-chapter-caption" style={{ opacity: eiffelChapterCaptionOpacityAt(chapterCaption, editSeconds) }}>
          <div className="mb-2 h-px w-10 bg-gold/80" aria-hidden />
          <p className="text-[10px] font-semibold tracking-[.2em] text-gold uppercase md:text-[11px]">{chapterCaption.kicker}</p>
          <p className="eiffel-chapter-caption-text mt-2 font-display text-parchment">{chapterCaption.text}</p>
        </figure>
      )}
      {detailed && !chapterCaption && captionVisible && film?.chapter === 'ground-lift' && (
        <div data-testid="eiffel-ground-lift-caption" className="eiffel-chapter-caption">
          <p className="text-[11px] tracking-[.22em] text-gold uppercase">From the ground to the tower</p>
          <p className="eiffel-chapter-caption-text mt-2 font-display text-parchment">{{
            'cart-arrival':'Bring the iron section into the lifting bay',
            'rigging':'Attach the slings while the load rests on the cart',
            'hoist':'Lift vertically from the ground',
            'rotation':'Turn the suspended section',
            'slew':'Guide the section toward its joint',
            'lower':'Lower onto the completed ironwork',
            'unrigging':'Release the slings after seating',
            'hook-recovery':'Recover the empty hook',
          }[sampleEiffelGroundLiftPilot(film.pilotSeconds).phase]}</p>
        </div>
      )}
      {detailed && !chapterCaption && captionVisible && film?.chapter === 'joint-campaign' && (
        <div data-testid="eiffel-joint-campaign-caption" className="eiffel-chapter-caption">
          <p className="text-[11px] tracking-[.22em] text-gold uppercase">Two deliveries · one supported joint</p>
          <p className="eiffel-chapter-caption-text mt-2 font-display text-parchment">{({
            'cart-arrival':'Bring the next iron section from the ground stock',
            'rigging':'Attach the slings while the cart supports the iron',
            'hoist':'Hoist the delivered section clear of the cart',
            'rotation':'Turn the suspended section into alignment',
            'slew':'Guide the load toward the temporary bearing',
            'lower-beside-joint':'Lower beside the completed ironwork',
            'slide-seat':'Seat the section on its supporting joints',
            'fastening':'Slide the delivered plates across the joint and fasten them',
            'unrigging':'Release the slings after the load is supported',
            'hook-recovery':'Recover the empty hook',
            'empty-hook-transfer':'Return the empty hook for the second ground delivery',
          } as Record<string,string>)[sampleEiffelJointCampaign(film.campaignSeconds).campaignPhase]}</p>
        </div>
      )}
      {caption && (
        <figure
          data-testid="live-caption"
          className={`absolute max-w-md ${PLACE_CLASSES[caption.place]} ${film && caption.place === 'lower-right' ? 'eiffel-fact-caption' : ''}`}
          style={{ opacity: film ? eiffelChapterCaptionOpacityAt({ ...caption,
            fromSeconds: caption.from * eiffelFilmEditDuration(eiffelEdit),
            toSeconds: caption.until * eiffelFilmEditDuration(eiffelEdit),
          }, editSeconds) : caption.opacity }}
        >
          <div className="mb-2 h-px w-10 bg-gold/80" aria-hidden />
          <p className="text-[11px] font-semibold tracking-[0.26em] text-gold/90 uppercase">
            {caption.kicker}
          </p>
          <p className="mt-2 font-display text-base leading-relaxed text-parchment/95 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)] md:text-lg">
            {caption.text}
          </p>
        </figure>
      )}
    </div>
  );
}
