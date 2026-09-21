# Freight v5 reeving source correction

Actual SHA256`c50b253ebecadfb0250e7a5ad7375f449f4180089f9f733ddf63972b859b4ebe`,315 meshes. The initial bounded filenames `audit-v4.*`/`rope-v4.*` refer to this SHA and therefore to **parent source version V5**, not archived V4(e4b44…). Their source hashes remove the naming ambiguity.

The compound rest-rope AABB initially overlapped the197m deck/frame. Refining to individual actual rope-triangle bounds versus old source triangles removes both false positives:1220 rope triangles yield no old tower/platform conflict. The rest rope must still shorten/follow the future moving carrier; it is not a permanent obstacle occupying the entire load column.

Actual rope-triangle versus own-frame/sheave-triangle checks find one non-contact structural conflict: `fixed_guide_upper_arm002`. Its surface crossings with the horizontal rope span occupyX3.68661..4.02368,Y206.81201..206.82800,Z−4.40693..−4.39307. Other hits are at the fixed/head sheave grooves and the upper rope-eye termination, classified as intended contact locations rather than a blanket full-reeving pass. Detailed pair/point evidence is in `rope-v5-frame.json` and `rope-v5-arm-contact.json`.

Parent will author V6 by spreading the two support-arm planes and adding real start/end crossbars, keeping the four guide centres unchanged. V5 is not accepted as a complete reeving layout. No production geometry changed by this audit.
