# Neronian aqueduct repair

Owner explicitly requests authored Blender models. Scope: the existing southeast
aqueduct; retain the rest of the Rome city for a later directed reconstruction.
The companion task redraws all ten SVG icons independently.

Art direction: slender semicircular brick arches with readable intrados, radial
arch courses, projecting springing ledges and a single continuous covered water
channel. Warm fired brick and restrained lime/stone cap color; intact AD 70s
architecture. No later Severan infill or ruined silhouette. Exact route/height
and conduit cover are authored, proportions are source-grounded.

Asset strategy: original Blender kit, exported GLB, merged vertex colors;
repeated spans/piers instanced, one continuous conduit. Desktop arch has ten
segments and a face brick ring; portrait has seven without subpixel facing
detail. No new lighting, VFX, textures, postprocessing or remote shadows.
Budget: remain inside 180k desktop / 120k portrait whole-scene submissions;
aqueduct portrait <=2,424 triangles (previous 2,280). Preserve GPU disposal.

References read: model-recipes, technical-art, implementation-blueprint,
render-recipes, visual-scorecard, procedural-model-quality and
performance-safe-visual-detail in project threejs-aaa-graphics-builder.
Also read project threejs-shaders and the shader cookbook before adding the
single antialiased brick-course material; no extra pass or texture is used.
Optional threejs-3d-generator and threejs-image-generator skills are absent
from project/global skill directories. Owner chose Blender authoring; no
external generation service is needed or claimed for this scoped support model.
No credential-unavailable claim or generation credential probe was made.

Verified local Blender bridge read-only on 9876: Blender 5.2.1 LTS, unsaved
Scene, three objects. Build/export/render in a separate background Blender
process; preserve that desktop scene. Source and captures stay in this folder.
CUA still reports no browser/app surfaces (native-pipe startup failure).
Asset renders and geometry tests are not browser/GPU acceptance.

Historical review: .factory/droids/material-culture-curator.md role.
Sources: https://www.sovraintendenzaroma.it/content/acquedotto-neroniano and
https://penelope.uchicago.edu/Thayer/E/Gazetteer/Places/Europe/Italy/Lazio/Roma/Rome/_Texts/PLATOP%2A/Arcus_Neroniani.html
Historic span 7.75 m, pier 2.30 by 2.10 m. Official surviving heights vary by
section; do not claim one exact elevation for the whole compressed backdrop.
