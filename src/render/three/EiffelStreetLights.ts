import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Color, Float32BufferAttribute,
  Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial,
} from 'three';
import { EIFFEL_STREET_LAMPS, EIFFEL_STREET_LAMP_POOL_RADIUS,
  EIFFEL_STREET_PAVING_LIFT, eiffelStreetLampAmount } from '../../engine/eiffelStreetLights';
import { eiffelTerrainHeightAt } from '../../engine/eiffelTerrain';

// The optical halo sits just in front of the opaque authored glass in view
// space, so its bright core is not swallowed by the lamp housing depth.
function glowMaterial(billboard: boolean): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { amount: { value: 0 }, tint: { value: new Color('#ffd08a') } },
    vertexShader: `varying vec2 glowUv;
      void main() {
        glowUv = uv;
        ${billboard
          ? 'vec4 center = modelViewMatrix * instanceMatrix * vec4(0.,0.,0.,1.); gl_Position = projectionMatrix * (center + vec4(position.xy,.4,0.));'
          : 'gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);'}
      }`,
    fragmentShader: `uniform float amount; uniform vec3 tint; varying vec2 glowUv;
      void main() {
        float r = length(glowUv * 2. - 1.);
        float falloff = pow(max(0., 1. - r * r), 3.);
        gl_FragColor = vec4(tint, amount * falloff);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
  });
}

/** Three static batches illuminate the existing city asset's eighteen lamps.
 * No point lights, shadow passes, duplicate standards, or per-frame matrices.
 */
export class EiffelStreetLights {
  readonly group = new Group();
  private readonly apertureMaterial = new MeshBasicMaterial({
    color: '#ffe1a3', transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
  });
  private readonly haloMaterial = glowMaterial(true);
  private readonly poolMaterial = glowMaterial(false);
  private readonly geometries: BufferGeometry[] = [];
  private cityAvailable = false;
  private nightAmount = 0;
  private disposed = false;

  constructor() {
    this.group.name = 'eiffel-street-lights';
    const apertureGeometry = new BoxGeometry(.456, .556, .456);
    const haloGeometry = new PlaneGeometry(5.2, 5.2);
    const apertures = new InstancedMesh(apertureGeometry, this.apertureMaterial, EIFFEL_STREET_LAMPS.length);
    const halos = new InstancedMesh(haloGeometry, this.haloMaterial, EIFFEL_STREET_LAMPS.length);
    apertures.name = 'eiffel-gas-apertures'; halos.name = 'eiffel-gas-halos';
    // Billboard offsets live in view space; a static bound based only on the
    // plane's authored orientation would be dishonest under camera rotation.
    halos.frustumCulled = false;
    const matrix = new Matrix4();
    EIFFEL_STREET_LAMPS.forEach((lamp, index) => {
      matrix.makeTranslation(lamp.base[0], lamp.apertureY, lamp.base[2]);
      apertures.setMatrixAt(index, matrix); halos.setMatrixAt(index, matrix);
    });
    for (const mesh of [apertures, halos]) {
      mesh.count = EIFFEL_STREET_LAMPS.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false; mesh.receiveShadow = false;
    }
    // Small pools stay wholly within the 3m sidewalk, following the same
    // terrain sampler as its exported paving. A 1.4cm offset avoids z-fighting.
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const segments = 16, rings = 3;
    for (const lamp of EIFFEL_STREET_LAMPS) {
      const start = positions.length / 3;
      for (let ring = 0; ring <= rings; ring++) for (let segment = 0; segment < segments; segment++) {
        const a = segment * Math.PI * 2 / segments;
        const dx = Math.cos(a) * ring / rings, dz = Math.sin(a) * ring / rings;
        const x = lamp.base[0] + dx * EIFFEL_STREET_LAMP_POOL_RADIUS;
        const z = lamp.base[2] + dz * EIFFEL_STREET_LAMP_POOL_RADIUS;
        positions.push(x, eiffelTerrainHeightAt(x, z) + EIFFEL_STREET_PAVING_LIFT + .014, z);
        uvs.push(dx * .5 + .5, dz * .5 + .5);
        if (ring < rings) {
          const here = start + ring * segments + segment;
          const next = start + ring * segments + (segment + 1) % segments;
          if (ring > 0) indices.push(here, next, here + segments);
          indices.push(next, next + segments, here + segments);
        }
      }
    }
    const poolGeometry = new BufferGeometry();
    poolGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    poolGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    poolGeometry.setIndex(indices); poolGeometry.computeBoundingSphere();
    const pools = new Mesh(poolGeometry, this.poolMaterial); pools.name = 'eiffel-gas-ground-pools';
    this.geometries.push(apertureGeometry, haloGeometry, poolGeometry);
    this.group.add(apertures, halos, pools);
    this.update(0);
  }

  setCityAvailable(available: boolean): void {
    this.cityAvailable = available;
    this.update(this.nightAmount);
  }

  update(rawNightAmount: number): void {
    this.nightAmount = eiffelStreetLampAmount(rawNightAmount);
    this.apertureMaterial.opacity = this.nightAmount;
    this.haloMaterial.uniforms.amount!.value = this.nightAmount * .65;
    this.poolMaterial.uniforms.amount!.value = this.nightAmount * .2;
    this.group.visible = !this.disposed && this.cityAvailable && this.nightAmount > 0;
    Object.assign(this.group.userData, { count: EIFFEL_STREET_LAMPS.length,
      cityAvailable: this.cityAvailable, nightAmount: this.nightAmount,
      apertureOpacity: this.apertureMaterial.opacity,
      haloOpacity: this.haloMaterial.uniforms.amount!.value,
      poolOpacity: this.poolMaterial.uniforms.amount!.value, batches: 3 });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const object of this.group.children) if (object instanceof InstancedMesh) object.dispose();
    this.geometries.forEach(geometry => geometry.dispose());
    this.apertureMaterial.dispose(); this.haloMaterial.dispose(); this.poolMaterial.dispose();
    this.group.visible = false; this.group.clear();
  }
}
