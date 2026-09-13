#!/usr/bin/env python3
"""Send Utzon spherical-vault sail generation into the running Blender Lab MCP socket."""

from __future__ import annotations

import json
import socket
import sys

BLENDER_HOST = "127.0.0.1"
BLENDER_PORT = 9876
OUT = "/Users/hina/Documents/Experience-Intelligence-Domain/wonderforge/public/models/sydney"

# Blender 5.2 Lab addon: null-delimited JSON {type:execute, code, strict_json:true}
# The executed snippet must assign a dict to `result`.
CODE = r'''
import bpy
import bmesh
import math
import os
from mathutils import Vector

OUT = r"''' + OUT + r'''"
os.makedirs(OUT, exist_ok=True)
R = 75.0
THICKNESS = 0.85

# half_angle = vault opening from ridge; foot_phi = polar cut from +Z (radians).
# Pointed vaults, not latitude cards. Sizes from Spec 13 nested fans.
SAILS = [
    {"id": 0, "group": "concert", "half": 0.36, "foot": 1.08, "yaw": -0.38, "pos": (4.0, -28.0, 14.2)},
    {"id": 1, "group": "concert", "half": 0.31, "foot": 0.98, "yaw": -0.22, "pos": (10.0, -20.0, 14.2)},
    {"id": 2, "group": "concert", "half": 0.26, "foot": 0.88, "yaw": -0.08, "pos": (16.0, -10.0, 14.2)},
    {"id": 3, "group": "concert", "half": 0.21, "foot": 0.78, "yaw": 0.06, "pos": (20.0, 0.0, 14.2)},
    {"id": 4, "group": "opera", "half": 0.34, "foot": 1.04, "yaw": 0.60, "pos": (-12.0, -4.0, 14.2)},
    {"id": 5, "group": "opera", "half": 0.29, "foot": 0.94, "yaw": 0.78, "pos": (-18.0, 8.0, 14.2)},
    {"id": 6, "group": "opera", "half": 0.24, "foot": 0.84, "yaw": 0.94, "pos": (-22.0, 18.0, 14.2)},
    {"id": 7, "group": "restaurant", "half": 0.22, "foot": 0.80, "yaw": 0.18, "pos": (2.0, 12.0, 14.2)},
    {"id": 8, "group": "restaurant", "half": 0.17, "foot": 0.70, "yaw": 0.32, "pos": (10.0, 20.0, 14.2)},
]


def wipe():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)


def bisect(bm, co, no):
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(
        bm, geom=geom, dist=1e-4, plane_co=co, plane_no=no, clear_inner=True,
    )


def make_half_vault(radius, half_angle, foot_phi, segs=80, rings=40):
    mesh = bpy.data.meshes.new("vault_half")
    obj = bpy.data.objects.new("vault_half", mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=radius)
    origin = Vector((0.0, 0.0, 0.0))
    # Ridge in YZ (keep +X).
    bisect(bm, origin, Vector((-1.0, 0.0, 0.0)))
    # Outer great-circle rib at +half_angle from the ridge.
    bisect(bm, origin, Vector((math.cos(half_angle), -math.sin(half_angle), 0.0)))
    # Feet: keep the polar cap down to foot_phi.
    z_cut = radius * math.cos(foot_phi)
    bisect(bm, Vector((0.0, 0.0, z_cut)), Vector((0.0, 0.0, 1.0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    return obj


def apply_mod(obj, name):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=name)
    obj.select_set(False)


def finish_vault(obj, name):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
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
    # Sit feet on Z=0.
    lowest = min((obj.matrix_world @ Vector(v.co)).z for v in obj.data.vertices)
    obj.location.z -= lowest
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.name = name
    obj.data.name = name
    obj.select_set(False)
    return obj


def export_selected(path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="NONE",
        export_texcoords=True,
        export_normals=True,
    )


wipe()
mat = bpy.data.materials.new("sydney-tile")
mat.diffuse_color = (0.95, 0.93, 0.88, 1.0)

exported = []
seated = []
for spec in SAILS:
    half = make_half_vault(R, spec["half"], spec["foot"])
    obj = finish_vault(half, "sail-%d" % spec["id"])
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    # Blender Y-forward, Z-up. WonderForge X-right Y-up Z-forward.
    # Place seated preview: Blender (x, -z_world, y_up) with yaw around Z.
    obj.rotation_euler[2] = spec["yaw"]
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.select_set(False)
    wx, wz, wy = spec["pos"]
    obj.location = (wx, -wz, wy)
    seated.append(obj)
    # Export a copy at origin for Three.js (centroid origin, identity pose).
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    stored = obj.location.copy()
    obj.location = (0.0, 0.0, 0.0)
    path = os.path.join(OUT, "sail-%d.glb" % spec["id"])
    export_selected(path)
    obj.location = stored
    exported.append({"id": spec["id"], "file": path, "verts": len(obj.data.vertices), "faces": len(obj.data.polygons)})

# Combined seated house + podium for visual check in Blender.
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 7.1))
podium = bpy.context.object
podium.name = "podium"
podium.scale = (108.0, 92.0, 14.2)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.select_all(action="DESELECT")
for obj in seated:
    obj.select_set(True)
podium.select_set(True)
bpy.context.view_layer.objects.active = seated[0]
combo = os.path.join(OUT, "sydney-seated.glb")
export_selected(combo)

result = {
    "status": "ok",
    "radius": R,
    "exported": exported,
    "combo": combo,
    "object_count": len(bpy.data.objects),
}
'''


def main() -> int:
    payload = json.dumps({"type": "execute", "code": CODE, "strict_json": True}) + "\x00"
    sock = socket.socket()
    sock.settimeout(120)
    try:
        sock.connect((BLENDER_HOST, BLENDER_PORT))
        sock.sendall(payload.encode())
        buf = b""
        while True:
            chunk = sock.recv(65536)
            if not chunk:
                break
            buf += chunk
            if b"\x00" in buf:
                break
    except OSError as exc:
        print("blender_socket_fail", type(exc).__name__, exc, file=sys.stderr)
        return 1
    finally:
        sock.close()
    if not buf:
        print("no_response", file=sys.stderr)
        return 1
    body = buf.split(b"\x00")[0].decode()
    print(body)
    data = json.loads(body)
    if data.get("status") != "ok" and data.get("result", {}).get("status") != "ok":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
