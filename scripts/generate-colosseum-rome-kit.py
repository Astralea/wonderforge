#!/usr/bin/env python3
"""Author Flavian Rome midground prototypes and export a GLB kit.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/generate-colosseum-rome-kit.py
"""
from __future__ import annotations

from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
BLEND = ROOT / "artifacts/colosseum-rome-2026-09-18/blender/colosseum-rome.blend"
GLB = ROOT / "public/models/colosseum-rome/rome-kit.glb"


def reset_scene() -> None:
    bpy.ops.wm.read_homefile(app_template="")
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)


def material(name: str, color: tuple[float, float, float], roughness: float, metal: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metal
    mat.diffuse_color = (*color, 1.0)
    return mat


def new_object(name: str, mesh: bpy.types.Mesh, mat: bpy.types.Material | None = None) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if mat:
        obj.data.materials.append(mat)
    return obj


def box(name: str, size: Vector, location: Vector, mat: bpy.types.Material) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = new_object(name, mesh, mat)
    obj.location = location
    return obj


def cylinder(name: str, radius: float, depth: float, location: Vector, mat: bpy.types.Material, segs: int = 10) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=radius,
        radius2=radius,
        depth=depth,
    )
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = new_object(name, mesh, mat)
    obj.location = location
    return obj


def cone(name: str, radius: float, depth: float, location: Vector, mat: bpy.types.Material, segs: int = 8) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=radius,
        radius2=0.02,
        depth=depth,
    )
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = new_object(name, mesh, mat)
    obj.location = location
    return obj


def ico(name: str, radius: float, location: Vector, scale: Vector, mat: bpy.types.Material, subdiv: int = 1) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = new_object(name, mesh, mat)
    obj.location = location
    return obj


def hip_roof(name: str, width: float, depth: float, height: float, location: Vector, mat: bpy.types.Material) -> bpy.types.Object:
    """Terracotta hip roof: four slopes to a short ridge, not a cone."""
    mesh = bpy.data.meshes.new(name)
    hw, hd, hh = width * 0.52, depth * 0.52, height
    ridge = min(width, depth) * 0.18
    verts = [
        Vector((-hw, -hd, 0.0)),
        Vector((hw, -hd, 0.0)),
        Vector((hw, hd, 0.0)),
        Vector((-hw, hd, 0.0)),
        Vector((-ridge, 0.0, hh)),
        Vector((ridge, 0.0, hh)),
    ]
    faces = [
        (0, 1, 5, 4),
        (1, 2, 5),
        (2, 3, 4, 5),
        (3, 0, 4),
    ]
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = new_object(name, mesh, mat)
    obj.location = location
    return obj


def parent(child: bpy.types.Object, root: bpy.types.Object) -> None:
    child.parent = root
    child.matrix_parent_inverse = root.matrix_world.inverted()


def build_insula(mats: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new("insula", None)
    bpy.context.collection.objects.link(root)
    w, d, h, thick = 10.2, 8.4, 8.8, 2.2
    north = box("insula-body-north", Vector((w, thick, h)), Vector((0, d / 2 - thick / 2, h * 0.5)), mats["brick"])
    south = box("insula-body-south", Vector((w, thick, h)), Vector((0, -(d / 2 - thick / 2), h * 0.5)), mats["brick"])
    east = box("insula-body-east", Vector((thick, d - thick * 2, h)), Vector((w / 2 - thick / 2, 0, h * 0.5)), mats["brick"])
    west = box("insula-body-west", Vector((thick, d - thick * 2, h)), Vector((-(w / 2 - thick / 2), 0, h * 0.5)), mats["brick"])
    for wing in (north, south, east, west):
        parent(wing, root)
    plinth = box("insula-plinth-stone", Vector((w + 0.45, d + 0.45, 0.48)), Vector((0, 0, 0.24)), mats["stone"])
    parent(plinth, root)
    cornice = box("insula-cornice-stone", Vector((w + 0.38, d + 0.38, 0.16)), Vector((0, 0, h - 0.1)), mats["stone"])
    parent(cornice, root)
    court = box(
        "insula-court-stone",
        Vector((w - thick * 2 - 0.15, d - thick * 2 - 0.15, 0.12)),
        Vector((0, 0, 0.16)),
        mats["stone"],
    )
    parent(court, root)
    for y in (1.95, 4.65):
        north_course = box(
            f"insula-course-north-{y}",
            Vector((w + 0.22, thick + 0.2, 0.12)),
            Vector((0, d / 2 - thick / 2, y)),
            mats["brick-warm"],
        )
        south_course = box(
            f"insula-course-south-{y}",
            Vector((w + 0.22, thick + 0.2, 0.12)),
            Vector((0, -(d / 2 - thick / 2), y)),
            mats["brick-warm"],
        )
        east_course = box(
            f"insula-course-east-{y}",
            Vector((thick + 0.2, d - thick * 2, 0.12)),
            Vector((w / 2 - thick / 2, 0, y)),
            mats["brick-warm"],
        )
        west_course = box(
            f"insula-course-west-{y}",
            Vector((thick + 0.2, d - thick * 2, 0.12)),
            Vector((-(w / 2 - thick / 2), 0, y)),
            mats["brick-warm"],
        )
        for course in (north_course, south_course, east_course, west_course):
            parent(course, root)
    for y in (2.3, 5.0, 7.4):
        for x in (-3.1, 0.0, 3.1):
            for sign in (1, -1):
                win = box(
                    f"insula-window-{y}-{x}-{sign}",
                    Vector((0.95, 0.14, 1.2)),
                    Vector((x, sign * (d * 0.5 + 0.05), y)),
                    mats["void"],
                )
                parent(win, root)
        for z in (-1.55, 1.55):
            for sign in (1, -1):
                win = box(
                    f"insula-end-window-{y}-{z}-{sign}",
                    Vector((0.14, 0.85, 1.15)),
                    Vector((sign * (w * 0.5 + 0.05), z, y)),
                    mats["void"],
                )
                parent(win, root)
    door = box("insula-void-door", Vector((1.2, 0.16, 2.2)), Vector((0.0, d * 0.5 + 0.06, 1.1)), mats["void"])
    parent(door, root)
    north_roof = hip_roof("insula-roof-north", w + 0.7, thick + 0.9, 1.7, Vector((0, d / 2 - thick / 2, h)), mats["tile"])
    south_roof = hip_roof("insula-roof-south", w + 0.7, thick + 0.9, 1.7, Vector((0, -(d / 2 - thick / 2), h)), mats["tile"])
    east_roof = hip_roof("insula-roof-east", thick + 0.9, d - thick, 1.55, Vector((w / 2 - thick / 2, 0, h)), mats["tile"])
    west_roof = hip_roof("insula-roof-west", thick + 0.9, d - thick, 1.55, Vector((-(w / 2 - thick / 2), 0, h)), mats["tile"])
    for roof in (north_roof, south_roof, east_roof, west_roof):
        parent(roof, root)
    return root


def build_palace(mats: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new("palace-wing", None)
    bpy.context.collection.objects.link(root)
    w, d, h = 16.0, 9.2, 7.2
    body = box("palace-body", Vector((w, d, h)), Vector((0, 0, h * 0.5)), mats["brick-warm"])
    parent(body, root)
    plinth = box("palace-plinth-stone", Vector((w + 0.8, d + 0.8, 0.7)), Vector((0, 0, 0.35)), mats["stone"])
    parent(plinth, root)
    cornice = box("palace-cornice-stone", Vector((w + 0.55, d + 0.55, 0.28)), Vector((0, 0, h - 0.1)), mats["stone"])
    parent(cornice, root)
    for x in (-5.4, -1.8, 1.8, 5.4):
        arch = box(f"palace-arch-{x}", Vector((1.6, 0.22, 2.4)), Vector((x, d * 0.5 + 0.08, 2.4)), mats["void"])
        parent(arch, root)
        col = cylinder(
            f"palace-stone-column-{x}",
            0.26,
            3.5,
            Vector((x, d * 0.5 + 0.42, 2.15)),
            mats["stone"],
            segs=8,
        )
        parent(col, root)
    roof = hip_roof("palace-roof", w + 1.2, d + 1.2, 2.8, Vector((0, 0, h)), mats["tile"])
    parent(roof, root)
    eaves = box("palace-roof-eaves", Vector((w + 1.25, d + 1.25, 0.12)), Vector((0, 0, h + 0.05)), mats["tile"])
    parent(eaves, root)
    return root


def build_pine(mats: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new("umbrella-pine", None)
    bpy.context.collection.objects.link(root)
    trunk = cylinder("pine-trunk", 0.28, 9.2, Vector((0, 0, 4.6)), mats["timber"], segs=8)
    parent(trunk, root)
    layers = (
        (0.0, 9.05, Vector((3.8, 3.8, 0.52))),
        (0.55, 9.45, Vector((2.9, 2.7, 0.46))),
        (-0.45, 9.55, Vector((2.7, 3.0, 0.44))),
        (0.15, 9.95, Vector((1.7, 1.7, 0.4))),
        (-0.2, 10.25, Vector((1.05, 1.1, 0.32))),
    )
    for i, (x, z, scale) in enumerate(layers):
        crown = ico(f"pine-crown-{i}", 1.0, Vector((x, 0.15 if i % 2 else -0.1, z)), scale, mats["foliage"], subdiv=2)
        parent(crown, root)
    return root


def build_cypress(mats: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new("cypress", None)
    bpy.context.collection.objects.link(root)
    trunk = cylinder("cypress-trunk", 0.16, 2.2, Vector((0, 0, 1.1)), mats["timber"], segs=7)
    parent(trunk, root)
    for i, (z, radius, depth) in enumerate(((3.4, 1.15, 4.4), (6.2, 0.78, 3.2), (8.4, 0.42, 2.0))):
        foliage = cone(f"cypress-foliage-{i}", radius, depth, Vector((0, 0, z)), mats["foliage"], segs=8)
        parent(foliage, root)
    return root


def apply_world() -> None:
    for obj in bpy.context.scene.objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for obj in bpy.context.scene.objects:
        obj.select_set(False)


def export_glb() -> None:
    GLB.parent.mkdir(parents=True, exist_ok=True)
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB),
        export_format="GLB",
        export_apply=True,
        export_texcoords=False,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
    )


def main() -> None:
    reset_scene()
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    mats = {
        "brick": material("rome-brick", (0.42, 0.27, 0.22), 0.92),
        "brick-warm": material("rome-brick-warm", (0.50, 0.32, 0.24), 0.9),
        "tile": material("rome-tile", (0.38, 0.18, 0.12), 0.86),
        "stone": material("rome-stone", (0.62, 0.54, 0.44), 0.88),
        "void": material("rome-void", (0.12, 0.09, 0.08), 0.95),
        "timber": material("rome-timber", (0.32, 0.22, 0.14), 0.84),
        "foliage": material("rome-foliage", (0.18, 0.32, 0.16), 0.9),
    }
    insula = build_insula(mats)
    palace = build_palace(mats)
    pine = build_pine(mats)
    cypress = build_cypress(mats)
    insula.location = Vector((0, 0, 0))
    palace.location = Vector((24, 0, 0))
    pine.location = Vector((40, 0, 0))
    cypress.location = Vector((52, 0, 0))
    apply_world()
    export_glb()
    result = {"blend": str(BLEND), "glb": str(GLB), "objects": [obj.name for obj in bpy.data.objects]}
    print(result)


if __name__ == "__main__":
    main()
