# Picture/narration alignment correction

The first short edit kept joint work wide while the narration said “Up close”.
The revised edit reallocates only seconds 56–82: fast earlier deliveries remain
wide, dolly 60–64, actual campaign seconds 116–126 occupy edit seconds 64–74,
and recover 74–78. The joint narration moves to 64–72; its 3.390113-second clip
fits that eight-second window. The later narration remains 74–82.

`eiffelFilmEdit.ts` SHA256:
`4dd9e8f815f7da9ab71b9d2e382da58cf805a1e63838fbce17fbdb1fb758ec63`.
This supersedes the initial mapper hash in README.md. No detailed source-film
or other short-edition passage keys changed. Duration remains 180 seconds.

`joint-edit-tests.log`: six tests in two files pass; `joint-typecheck.log`: exit
0. Checks cover the actual source fastening interval during every sampled cue
pose, accepted detailed-shot agreement within 1e-10, continuous camera/time,
inverse/reverse, and every .1 s through all three short close-up approaches
against completed-tower solid bounds on desktop and portrait. Browser visual
review remains separate; recommended frames are edit seconds 66, 70, 76, 80.
