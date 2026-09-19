#!/usr/bin/env python3
"""Author Utzon spherical-triangle sails, granite podium, and harbour prototypes.

Run via the connected Blender MCP or:
  blender --background --python scripts/generate-sydney-harbour-kit.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "models" / "sydney"
BLEND = ROOT / "artifacts" / "sydney-harbour-2026-09-18" / "blender" / "sydney-harbour.blend"
GLB = OUT / "harbour-kit.glb"

R = 75.0
THICKNESS = 0.85
PODIUM_DECK = 14.2

# Polar spherical lunes cut from the 75 m sphere, then tipped at the foot so
# the peak leans toward the mouth. height is the cap height before lean.
# World placement uses Three.js (x, y-up, z-south) → Blender (x, -z, y).
SAILS = [
    # Concert Hall — east cluster, largest south, nesting north.
    {"id": 0, "group": "concert", "half": 0.40, "height": 40.0, "lean": 0.22, "yaw": -0.32, "pos": (10.0, 20.0)},
    {"id": 1, "group": "concert", "half": 0.36, "height": 34.0, "lean": 0.24, "yaw": -0.24, "pos": (13.0, 10.0)},
    {"id": 2, "group": "concert", "half": 0.32, "height": 28.0, "lean": 0.26, "yaw": -0.16, "pos": (15.0, 0.0)},
    {"id": 3, "group": "concert", "half": 0.26, "height": 22.0, "lean": 0.28, "yaw": -0.08, "pos": (16.0, -8.0)},
    # Opera Theatre — west cluster.
    {"id": 4, "group": "opera", "half": 0.38, "height": 38.0, "lean": 0.22, "yaw": 0.56, "pos": (-10.0, 22.0)},
    {"id": 5, "group": "opera", "half": 0.34, "height": 32.0, "lean": 0.24, "yaw": 0.66, "pos": (-13.0, 12.0)},
    {"id": 6, "group": "opera", "half": 0.28, "height": 26.0, "lean": 0.26, "yaw": 0.74, "pos": (-15.0, 2.0)},
    # Restaurant shells — smaller, south of the halls.
    {"id": 7, "group": "restaurant", "half": 0.28, "height": 22.0, "lean": 0.24, "yaw": 0.12, "pos": (2.0, 30.0)},
    {"id": 8, "group": "restaurant", "half": 0.22, "height": 16.0, "lean": 0.26, "yaw": 0.22, "pos": (8.0, 36.0)},
]


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for datablock in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(datablock):
            datablock.remove(item)


def material(name: str, color: tuple[float, float, float], roughness: float, metalness: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metalness
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


def parent(child: bpy.types.Object, root: bpy.types.Object) -> None:
    child.parent = root
    child.matrix_parent_inverse = root.matrix_world.inverted()


def bisect(bm: bmesh.types.BMesh, co: Vector, no: Vector) -> None:
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-4, plane_co=co, plane_no=no, clear_inner=True)


def apply_mod(obj: bpy.types.Object, name: str) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=name)
    obj.select_set(False)


def make_vault(spec: dict, tile: bpy.types.Material) -> bpy.types.Object:
    """Polar spherical lune, tipped at the foot, origin at the foot centre."""
    name = f"sail-{spec['id']}"
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=80, v_segments=40, radius=R)
    origin = Vector((0.0, 0.0, 0.0))
    bisect(bm, origin, Vector((-1.0, 0.0, 0.0)))
    half = spec["half"]
    bisect(bm, origin, Vector((math.cos(half), -math.sin(half), 0.0)))
    height = min(R * 0.92, max(8.0, spec["height"]))
    foot_phi = math.acos(max(-1.0, min(1.0, 1.0 - height / R)))
    z_cut = R * math.cos(foot_phi)
    bisect(bm, Vector((0.0, 0.0, z_cut)), Vector((0.0, 0.0, 1.0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mirror = obj.modifiers.new("Mirror", "MIRROR")
    mirror.use_axis[0] = True
    mirror.use_clip = True
    apply_mod(obj, "Mirror")
    solid = obj.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = THICKNESS
    solid.offset = 0.0
    apply_mod(obj, "Solidify")

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    lowest = min((obj.matrix_world @ Vector(v.co)).z for v in obj.data.vertices)
    obj.location.z -= lowest
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    # Foot origin: centre of the lowest ring, not the bounding-box centroid.
    foot = Vector((0.0, 0.0, 0.0))
    count = 0
    for vert in obj.data.vertices:
        world = obj.matrix_world @ vert.co
        if world.z < 1.25:
            foot.x += world.x
            foot.y += world.y
            count += 1
    if count:
        foot.x /= count
        foot.y /= count
    bpy.context.scene.cursor.location = foot
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    obj.rotation_euler[0] = spec["lean"]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    lowest = min((obj.matrix_world @ Vector(v.co)).z for v in obj.data.vertices)
    obj.location.z -= lowest
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    obj.rotation_euler[2] = spec["yaw"]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)
    obj.data.materials.append(tile)
    return obj


def export_selected(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="NONE",
        export_texcoords=True,
        export_normals=True,
    )


def build_podium(granite: bpy.types.Material, step: bpy.types.Material) -> bpy.types.Object:
    root = bpy.data.objects.new("podium", None)
    bpy.context.collection.objects.link(root)
    mass = box("podium-mass-granite", Vector((108.0, 92.0, PODIUM_DECK)), Vector((2.0, 4.0, PODIUM_DECK * 0.5)), granite)
    parent(mass, root)
    deck = box("podium-deck-granite", Vector((104.0, 88.0, 0.45)), Vector((2.0, 4.0, PODIUM_DECK + 0.2)), granite)
    parent(deck, root)
    # Monumental steps face west-south-west (Circular Quay / harbour).
    for i in range(14):
        t = i / 13.0
        w = 38.0 - i * 0.55
        d = 4.2
        h = 0.95
        x = -46.0 - i * 2.35
        y = 6.0 - i * 1.15
        z = PODIUM_DECK - i * 0.92 - h * 0.5
        tread = box(f"podium-step-{i}-granite", Vector((d, w, h)), Vector((x, y, z)), step)
        parent(tread, root)
    # South forecourt terrace toward Circular Quay.
    terrace = box("podium-forecourt-granite", Vector((72.0, 18.0, 3.2)), Vector((4.0, 52.0, 1.6)), granite)
    parent(terrace, root)
    return root


def build_office(mats: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new("office-tower", None)
    bpy.context.collection.objects.link(root)
    body = box("office-body-stone", Vector((12.0, 9.6, 28.0)), Vector((0.0, 0.0, 14.0)), mats["sandstone"])
    parent(body, root)
    plinth = box("office-plinth-stone", Vector((12.6, 10.2, 1.2)), Vector((0.0, 0.0, 0.6)), mats["granite"])
    parent(plinth, root)
    crown = box("office-crown-stone", Vector((12.8, 10.4, 1.1)), Vector((0.0, 0.0, 28.4)), mats["granite"])
    parent(crown, root)
    for storey in range(7):
        y = 3.6 + storey * 3.4
        for x in (-3.4, 0.0, 3.4):
            for sign, depth in ((1, 4.85), (-1, -4.85)):
                win = box(
                    f"office-window-{storey}-{x}-{sign}",
                    Vector((2.2, 0.28, 2.0)),
                    Vector((x, depth, y)),
                    mats["void"],
                )
                parent(win, root)
    return root


def build_shed(mats: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new("quay-shed", None)
    bpy.context.collection.objects.link(root)
    hall = box("shed-hall-timber", Vector((18.0, 9.0, 7.2)), Vector((0.0, 0.0, 3.6)), mats["timber"])
    parent(hall, root)
    mesh = bpy.data.meshes.new("shed-roof-tile")
    hw, hd, hh = 9.6, 5.1, 3.4
    verts = [
        Vector((-hw, -hd, 0.0)),
        Vector((hw, -hd, 0.0)),
        Vector((hw, hd, 0.0)),
        Vector((-hw, hd, 0.0)),
        Vector((0.0, -hd, hh)),
        Vector((0.0, hd, hh)),
    ]
    mesh.from_pydata(verts, [], [(0, 1, 4), (1, 2, 5, 4), (2, 3, 5), (3, 0, 4, 5)])
    mesh.update()
    roof = new_object("shed-roof-tile", mesh, mats["roof"])
    roof.location = Vector((0.0, 0.0, 7.2))
    parent(roof, root)
    return root


def build_fig(mats: dict[str, bpy.types.Material]) -> bpy.types.Object:
    root = bpy.data.objects.new("moreton-bay-fig", None)
    bpy.context.collection.objects.link(root)
    trunk_mesh = bpy.data.meshes.new("fig-trunk-timber")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.85, radius2=0.42, depth=7.4)
    bm.to_mesh(trunk_mesh)
    bm.free()
    trunk = new_object("fig-trunk-timber", trunk_mesh, mats["timber"])
    trunk.location = Vector((0.0, 0.0, 3.7))
    parent(trunk, root)
    for i, (x, y, z, r) in enumerate((
        (0.0, 0.0, 8.4, 3.4),
        (-2.2, 0.8, 7.6, 2.6),
        (2.0, -0.6, 7.8, 2.4),
        (0.4, 2.1, 8.0, 2.2),
        (-0.6, -1.8, 7.5, 2.1),
    )):
        lobe_mesh = bpy.data.meshes.new(f"fig-crown-{i}-foliage")
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r)
        bm.to_mesh(lobe_mesh)
        bm.free()
        lobe = new_object(f"fig-crown-{i}-foliage", lobe_mesh, mats["foliage"])
        lobe.location = Vector((x, y, z))
        parent(lobe, root)
    return root


def place_sails(tile: bpy.types.Material) -> list[dict]:
    exported: list[dict] = []
    for spec in SAILS:
        obj = make_vault(spec, tile)
        dims = obj.dimensions
        obj.location = Vector((spec["pos"][0], -spec["pos"][1], PODIUM_DECK))
        bpy.context.view_layer.update()
        # Export a copy at the origin for Three.js instancing (foot origin, yaw baked).
        stored = obj.location.copy()
        obj.location = Vector((0.0, 0.0, 0.0))
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        export_selected(OUT / f"sail-{spec['id']}.glb")
        obj.location = stored
        exported.append({
            "id": spec["id"],
            "group": spec["group"],
            "verts": len(obj.data.vertices),
            "faces": len(obj.data.polygons),
            "dimensions": [round(dims.x, 2), round(dims.z, 2), round(dims.y, 2)],
            "world": spec["pos"],
        })
    return exported


def frame_preview_camera() -> None:
    cam_data = bpy.data.cameras.new("preview")
    cam = bpy.data.objects.new("preview", cam_data)
    bpy.context.collection.objects.link(cam)
    # East-southeast harbour hold, similar to the Wikimedia SE view.
    cam.location = Vector((210.0, -130.0, 58.0))
    direction = Vector((2.0, 2.0, PODIUM_DECK + 10.0)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam_data.lens = 35
    bpy.context.scene.camera = cam
    light_data = bpy.data.lights.new("key", "SUN")
    light_data.energy = 4.5
    light_data.angle = 0.04
    light = bpy.data.objects.new("key", light_data)
    bpy.context.collection.objects.link(light)
    light.rotation_euler = (0.7, 0.15, 0.9)
    world = bpy.data.worlds.new("harbour")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.45, 0.62, 0.82, 1.0)
        bg.inputs[1].default_value = 0.8
    bpy.context.scene.world = world


def export_kit() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(GLB),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
    )


def main() -> dict:
    reset_scene()
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    mats = {
        "tile": material("sydney-tile", (0.95, 0.93, 0.88), 0.38),
        "granite": material("sydney-granite", (0.62, 0.48, 0.42), 0.9),
        "step": material("sydney-step", (0.70, 0.54, 0.46), 0.88),
        "sandstone": material("sydney-sandstone", (0.72, 0.64, 0.52), 0.86),
        "void": material("sydney-void", (0.08, 0.12, 0.16), 0.2, 0.15),
        "timber": material("sydney-timber", (0.42, 0.30, 0.20), 0.9),
        "roof": material("sydney-roof", (0.38, 0.22, 0.16), 0.84),
        "foliage": material("sydney-foliage", (0.16, 0.32, 0.14), 0.92),
    }
    exported = place_sails(mats["tile"])
    podium = build_podium(mats["granite"], mats["step"])
    office = build_office(mats)
    shed = build_shed(mats)
    fig = build_fig(mats)
    office.location = Vector((220.0, 0.0, 0.0))
    shed.location = Vector((240.0, 0.0, 0.0))
    fig.location = Vector((258.0, 0.0, 0.0))
    office.hide_render = True
    shed.hide_render = True
    fig.hide_render = True
    frame_preview_camera()
    preview = ROOT / "artifacts" / "sydney-harbour-2026-09-18" / "blender" / "preview.png"
    preview.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 810
    scene.render.filepath = str(preview)
    scene.render.film_transparent = False
    bpy.ops.render.render(write_still=True)
    export_kit()
    result = {
        "status": "ok",
        "preview": str(preview),
        "blend": str(BLEND),
        "sails": exported,
        "objects": [obj.name for obj in bpy.data.objects],
        "podium": podium.name,
        "office": office.name,
        "shed": shed.name,
        "fig": fig.name,
    }
    print(result)
    return result


if __name__ == "__main__":
    result = main()
