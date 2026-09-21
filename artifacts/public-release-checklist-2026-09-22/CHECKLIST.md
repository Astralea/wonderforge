# Public release runbook — prepared 2026-09-22

Everything code-side is done, committed and verified. What remains is four
actions you take yourself, in this order. The order matters: the site now links
to the repository, so the repository must be public before anyone follows that
link.

## 1. Make the repository public

GitHub → `Astralea/wonderforge` → Settings → General → Danger Zone → Change
visibility → Make public.

Already prepared for this: `README.md`, `LICENSE` (MIT for code, with the
generated-asset terms spelled out), and the fan-project disclaimer naming
Firaxis/2K.

Nothing sensitive was found in a credential scan of every committed file. Note
that `HANDOFF.md` and `artifacts/` are a candid record of how the project was
built — that becomes public too. Worth a skim if that matters to you.

## 2. Deploy the site

```bash
npm run deploy
```

The facts panel now carries a **Source on GitHub** link — it ships only when you
deploy. Check it on the live site afterwards: open any film, press
**About this wonder**, and confirm the link at the bottom of the panel opens the
repository.

## 3. Message the r/civ moderators

Sidebar → **Message Mods**. Rule 10 bans *unsolicited* self-promotion; this makes
it solicited. Join the subreddit first.

> Hi mods — I'd like to post a fan project and would rather ask first, given
> Rule 10.
>
> I've spent a few months rebuilding Civ VI's wonder construction movies as
> full-length films that run in a browser — three.js, all procedural geometry,
> no assets from the game. Four are finished: the Pyramids, Stonehenge, the
> Colosseum and the Eiffel Tower, all Civ VI wonders.
>
> It's free and non-commercial. No ads, no accounts, nothing to sell, no
> affiliation with Firaxis or 2K. I'd post it as a native video with Fan Works
> flair and put the link in the body rather than as a link post.
>
> Is that OK, and is Fan Works the right flair? Happy to adjust, or to leave the
> link out entirely.

## 4. Post to r/civ

Flair **Fan Works**. Upload the video natively — do not make it a link post.

Video: `artifacts/colosseum-moon-surface-2026-09-21/social/wonderforge-four-films-20s-moon-v2.mp4`
(20s, 17.4 MB, music only). An 8.4 MB variant sits beside it for anywhere with a
10 MB cap.

**Title**

> I rebuilt Civ VI's wonder movies as full browser films — you can watch every
> stone get quarried, hauled and levered into place

**Body**

> Civ VI plays a short movie when you complete a wonder. They're my favourite
> thing in the game, and I always wished they didn't end so fast — so I spent a
> few months rebuilding them as full films you can actually sit through.
>
> Four are done: the Pyramids, Stonehenge, the Colosseum and the Eiffel Tower.
>
> What to watch for in the clip: every block is an individual object. It gets
> quarried, dragged up a ramp on a sled, levered into position, and stays there.
> Nothing scales up out of the ground or fades in — if a stone is on the pyramid,
> workers put it there. The light runs dawn to dusk across the whole build, and
> the Colosseum carries on past sunset into moonrise.
>
> Runs in any browser, nothing to install. You can scrub the timeline, and
> there's optional narration on how each one was actually built.
>
> Made with three.js, all geometry procedural. No assets from the game, no ads,
> no account, nothing to buy — just a fan project, not affiliated with Firaxis
> or 2K.
>
> wonderforge.pages.dev
>
> Six more wonders are in the catalogue but not playable yet. Start with the
> Pyramids or the Colosseum — those two look best and load fastest.
>
> Which one reads best to you, and does it hold up on your phone? That's the
> feedback I actually want.

Then stay in the comments for the first couple of hours. Fan Works posts live or
die on the author answering "how did you do X".

## Notes and cautions

- **Point people at Giza or the Colosseum.** The entry bundle is light (496 KB
  gzipped) but the Eiffel film pulls roughly 33 MB of models and audio.
- **Don't cross-post to r/CivVI the same day.** Pick one; the other can wait a
  week if the first goes well.
- **Don't repost on X.** If you post there again, make it native video with the
  Civ hook and the link in a reply — not the same link post.
- **three.js forum** is still auto-held. Reply to the system PM asking for staff
  review. When it clears, the Showcase post should lead with technique — the
  determinism constraint, instancing, the construction state graph — not the
  pitch.
- Don't create a second account anywhere while a hold is pending.
