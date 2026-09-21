# Wide short-film equipment shadow detail

The actual mobile150s counter capture submits34,728 shadow triangles through
batches containing only small first-floor/relay equipment. The new rule omits
these batches' shadow pass at cinematic camera distance>=400m from[0,156,0].
It retains the existing .08m² major-section criterion: compute each source
mesh's local bounding dimensions times world scale, sort its transport dimensions,
and retain the entire existing batch if any member's two smallest dimensions
multiply to>=.08. The carried actual tower member always retains its shadow.
No material batch splitting or per-instance visibility mutation is used.

Mixed bridge/deck and support batches retain all their source casters. The
mobile saved capture predicts15,820 removed first-floor triangles plus18,908
relay triangles. This is a prediction from actual per-mesh counter evidence;
parent's composed post-build capture must verify the resulting frame budget.
The hidden steam-drive caster, onward equipment, hoist ropes, tower, and city
are not changed by this rule. It affects castShadow only; main geometry,
attributes, matrix transforms, batch counts and shadow reception remain intact.

Tests in equipment-shadow-tests.log:12pass across three files. New tests load
the actual accepted mobile/relay GLBs, match the capture's34,728 contribution,
retain actual payload/mixed batches, compare every source and batch matrix
through forward/reverse poses, restore full shadows in close/Detailed views,
and retain a detail preference set before asynchronous load completion.
Typecheck of this combined working tree reported only concurrent unused parent
imports in eiffelFilmEdit.ts and eiffel-film-edit.test.ts; parent notified.
No dist build or browser actions performed by this subtask.
