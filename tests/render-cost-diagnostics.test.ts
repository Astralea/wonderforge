import { describe, expect, it, vi } from 'vitest';
import { Mesh, Scene, Group, Line, Points } from 'three';
import { measureSceneRenderCosts } from '../src/render/three/RenderPipeline';

describe('opt-in per-mesh draw accounting', () => {
  it('counts repeated main/shadow draws, leaves postprocessing separate and restores callbacks', () => {
    const scene = new Scene(), parent = new Group(), mesh = new Mesh();
    parent.name = 'eiffel-work'; mesh.name = 'iron'; scene.add(parent); parent.add(mesh);
    const original = { before: vi.fn(), after: vi.fn(), beforeShadow: vi.fn(), afterShadow: vi.fn() };
    mesh.onBeforeRender = original.before; mesh.onAfterRender = original.after;
    mesh.onBeforeShadow = original.beforeShadow; mesh.onAfterShadow = original.afterShadow;
    const info = { render: { calls: 5, triangles: 100 } };
    // Distinct argument lists verify pass-specific signatures and original receivers.
    const mainArgs = [1, 2, 3, 4, 5, 6] as unknown as Parameters<Mesh['onBeforeRender']>;
    const shadowArgs = [1, 2, 3, 4, 5, 6, 7] as unknown as Parameters<Mesh['onBeforeShadow']>;
    const result = measureSceneRenderCosts(scene, info, () => {
      for (let i = 0; i < 2; i++) {
        mesh.onBeforeShadow(...shadowArgs); info.render.calls += 1; info.render.triangles += 60; mesh.onAfterShadow(...shadowArgs);
      }
      mesh.onBeforeRender(...mainArgs); info.render.calls += 2; info.render.triangles += 240; mesh.onAfterRender(...mainArgs);
      info.render.calls += 3; info.render.triangles += 6;
    });
    expect(result.total).toEqual({ calls: 7, triangles: 366 });
    expect(result.untracked).toEqual({ calls: 3, triangles: 6 });
    expect(result.meshes).toEqual([{ id: mesh.id, name: 'iron', path: 'eiffel-work/iron',
      main: { calls: 2, triangles: 240 }, shadow: { calls: 2, triangles: 120 } }]);
    expect(original.before).toHaveBeenCalledWith(...mainArgs); expect(original.before.mock.contexts[0]).toBe(mesh);
    expect(original.beforeShadow).toHaveBeenCalledWith(...shadowArgs); expect(original.beforeShadow.mock.contexts[0]).toBe(mesh);
    expect(original.after).toHaveBeenCalledOnce(); expect(original.afterShadow).toHaveBeenCalledTimes(2);
    expect(mesh.onBeforeRender).toBe(original.before); expect(mesh.onAfterRender).toBe(original.after);
    expect(mesh.onBeforeShadow).toBe(original.beforeShadow); expect(mesh.onAfterShadow).toBe(original.afterShadow);
  });
  it('never wraps hidden trees or non-Mesh callbacks, even during the measured render', () => {
    const scene = new Scene(), hiddenParent = new Group(), child = new Mesh(), hidden = new Mesh();
    const visible = new Mesh(), group = new Group(), line = new Line(), points = new Points();
    hiddenParent.visible = false; hidden.visible = false; hiddenParent.add(child);
    scene.add(hiddenParent, hidden, visible, group, line, points);
    const omitted = [scene, hiddenParent, child, hidden, group, line, points].map(object => ({
      object, callbacks: [object.onBeforeRender, object.onAfterRender, object.onBeforeShadow, object.onAfterShadow],
    }));
    const visibleBefore = visible.onBeforeRender;
    const unchanged = () => {
      for (const { object, callbacks } of omitted) {
        expect(object.onBeforeRender).toBe(callbacks[0]); expect(object.onAfterRender).toBe(callbacks[1]);
        expect(object.onBeforeShadow).toBe(callbacks[2]); expect(object.onAfterShadow).toBe(callbacks[3]);
      }
    };
    const result = measureSceneRenderCosts(scene, { render: { calls: 0, triangles: 0 } }, () => {
      unchanged(); expect(visible.onBeforeRender).not.toBe(visibleBefore);
    });
    unchanged(); expect(visible.onBeforeRender).toBe(visibleBefore);
    expect(result.meshes).toEqual([]);
  });
  it('restores wrappers after a failed render without overwriting an intentional callback replacement', () => {
    const scene = new Scene(), mesh = new Mesh(); scene.add(mesh);
    const after = mesh.onAfterRender, nextBefore = vi.fn();
    mesh.onBeforeRender = function () { this.onBeforeRender = nextBefore; };
    expect(() => measureSceneRenderCosts(scene, { render: { calls: 0, triangles: 0 } }, () => {
      mesh.onBeforeRender(...[] as unknown as Parameters<Mesh['onBeforeRender']>); throw new Error('render failure');
    })).toThrow('render failure');
    expect(mesh.onBeforeRender).toBe(nextBefore); expect(mesh.onAfterRender).toBe(after);
  });
});
