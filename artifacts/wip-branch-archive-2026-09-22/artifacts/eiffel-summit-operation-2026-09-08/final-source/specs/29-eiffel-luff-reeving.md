# Summit luff reeving candidate

The separate pure luff solver uses yaw-local XY coordinates: drum[-.15,.60,0], reference pitch radius.06m; fixed top guide[-.20,1.13,0], radius.08m; moving block at pitch-local[5.25,.34,0], radius.07m; and head becket[.16,1.0,0]. The pitch pivot is yaw-local[.30,0,0]. A positive block connection runs to the boom at pitch-local[5.25,.19,0], retaining0.15m separation. This is source positioning, not a capacity certification.

The top guide at the previously proposedX+.12 is rejected: the incoming and outgoing tangent directions cross as the boom rises, forcing a fixed wrap branch through zero/full-turn. Moving the guide toX−.20 gives a continuous clockwise wrap for the0–90° candidate boom range. No shortest-arc switching is allowed.

The path contains drum-to-guide tangent, top-guide circular arc, outbound fall tangent, moving-block circular arc, and return tangent to the positive becket. Deployed rope length is the exact sum of straight lengths and radius times arc angle. Relative drum rotation about local+Z is `(referenceDeployedLength−deployedLength)/.06`; increasing deployed length pays rope out with negative rotation. The reference pitch and optional total rope inventory are explicit inputs. When total inventory is supplied, stored+deployed must equal that total exactly and negative storage must fail.

The fixed-radius drive relation is a reference single-layer calculation. Until actual drum width, winding and fleet contact are proven, visual winding admission stays false. The solver does not imply a human-operated worm drive, verified full cargo operation or structural capacity. Actual GLB rope/support/worker clearance remains a separate gate.
