import { MeshStandardMaterial } from 'three';
import { COLOSSEUM_AQUEDUCT as A } from '../../data/colosseumAqueduct';

/** Fired-brick courses without texture downloads or extra geometry. Fine joints
 * fade below a pixel so the distant arcade does not shimmer in an orbit. */
export function createAqueductMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .94 });
  material.customProgramCacheKey = () => 'wf-neronian-brick-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vAqueductWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', `
      #include <project_vertex>
      vec4 aqueductWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        aqueductWorld = instanceMatrix * aqueductWorld;
      #endif
      vAqueductWorld = (modelMatrix * aqueductWorld).xyz;
    `);
    shader.fragmentShader = 'varying vec3 vAqueductWorld;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float aqAlong = dot(vAqueductWorld.xz - vec2(${A.start[0].toFixed(1)}, ${A.start[1].toFixed(1)}), vec2(${A.direction[0]}, ${A.direction[1]}));
      float aqHeight = vAqueductWorld.y - ${A.springingHeight} - aqAlong * ${A.grade};
      float aqLocalX = mod(aqAlong, ${(A.clearSpan + A.pierWidth).toFixed(2)}) - ${(A.clearSpan + A.pierWidth) / 2};
      float aqRadius = length(vec2(aqLocalX, aqHeight));
      float aqRing = step(0.0, aqHeight) * step(${A.archRise - .02}, aqRadius) * (1.0 - step(${A.archRise + .66}, aqRadius));
      vec2 aqUv = mix(vec2(aqAlong, vAqueductWorld.y), vec2(atan(aqHeight, aqLocalX) * ${A.archRise}, aqRadius), aqRing) / vec2(0.48, 0.10);
      vec2 aqFootprint = max(fwidth(aqUv), vec2(0.0001));
      aqUv.x += mod(floor(aqUv.y), 2.0) * 0.5;
      vec2 aqEdge = min(fract(aqUv), 1.0 - fract(aqUv));
      vec2 aqMortar = vec2(1.0) - smoothstep(vec2(0.014, 0.035), vec2(0.014, 0.035) + aqFootprint, aqEdge);
      float aqDetail = 1.0 - smoothstep(0.3, 1.2, max(aqFootprint.x, aqFootprint.y));
      float aqJoint = max(aqMortar.x, aqMortar.y) * aqDetail;
      float aqTone = fract(sin(dot(floor(aqUv), vec2(127.1,311.7))) * 43758.5453);
      // The light cap stays plain; its form and material read at a distance.
      float aqMasonry = 1.0 - step(${A.spandrelTop + A.channelHeight - .01}, aqHeight);
      diffuseColor.rgb *= 1.0 + aqMasonry * aqDetail * (aqTone - 0.5) * 0.12;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.72 + vec3(0.075,0.066,0.051), aqJoint * aqMasonry * 0.6);
    `);
  };
  return material;
}
