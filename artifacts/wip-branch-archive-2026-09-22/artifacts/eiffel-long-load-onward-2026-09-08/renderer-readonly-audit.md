# Renderer-side motion audit, intermediate sampler snapshot

Read-only probes bundle the actual pure sampler without modifying or bypassing
its validation. These are intermediate findings sent to the engine owner, not
claims about a later corrected build. Bundled probe .mjs files preserve the
examined source snapshot and .json files preserve measured results.

1. `renderer-continuity-probe.json`: sampling each phase/bolt boundary at±1µs
finds deck-rigger body jumps0.981m at134.5s,0.714m at141s,1.691m at147.5s.
These come from switching the station from the previous bolt to the next stored
bolt. Hands/wrench jump0.349m at the end of each five-second fastening action.
Upper hands jump1.088m at154/198s and1.383m at186s as ladder contact branches
switch, plus0.464m at180s. Continuous joint targets/transfers are needed.

2. Both deck-rigger feet follow cart X with constant floor Y during212–272s;
they slide6.5m by242s and13m by272s. The hatch worker similarly translates both
floor-contact feet with the moving handle through~1.83m during closure. The
existing main pusher uses distance-driven planted/swing steps and did not show
this issue. Reuse continuous planted foot trajectories for the additional crew.

3. `renderer-shoulder-probe.json`: moving the shoulder alone toward an unreachable
hand keeps arm segment lengths legal but detaches the upper arm from the torso.
At186s the rigger upper-arm proximal endpoint is0.196m outside the torso box;
subtracting the arm radius still leaves a visible gap. A supported torso/hand
pose correction is needed, not independent shoulder relocation.

Root already owns review of bolt vertical paths, rung toe contact, hatch-grip
rotation, chock carrying and rope/drum coupling; those were not duplicated here.
