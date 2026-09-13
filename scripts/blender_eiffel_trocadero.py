#!/usr/bin/env python3
"""Wipe the Blender Lab scene and author the 1878 Palais du Trocadéro for Eiffel."""

from __future__ import annotations

import json
import math
import socket
import sys

BLENDER_HOST = "127.0.0.1"
BLENDER_PORT = 9876
OUT = "/Users/hina/Documents/Experience-Intelligence-Domain/wonderforge/public/models/eiffel"

CODE = r'''
import bpy
import math
import os
from mathutils import Vector

OUT = r"''' + OUT + r'''"
os.makedirs(OUT, exist_ok=True)


def terrain(x, z):
    champ = math.exp(-(x ** 2 + (z - 20) ** 2) / (2 * 140 ** 2)) * -0.35
    river = max(0.0, (-z - 90.0) / 80.0) * -1.8
    ecole = math.exp(-(x ** 2 + (z - 280) ** 2) / (2 * 90 ** 2)) * 6.5
    troc = math.exp(-(x ** 2 + (z + 240) ** 2) / (2 * 70 ** 2)) * 14.0
    east = math.exp(-((x - 150) ** 2 + (z - 40) ** 2) / (2 * 50 ** 2)) * 1.4
    return champ + river + ecole + troc + east


def y_at(x, z, half):
    return terrain(x, z) + half


def loc(x, y, z):
    return (x, -z, y)


def wipe():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam)


def mat(name, color):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.92
    return material


def apply_scale(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.select_set(False)


def cube(name, cx, cy, cz, sx, sy, sz, yaw=0.0, material=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc(cx, cy, cz))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (sx, sz, sy)
    obj.rotation_euler[2] = yaw
    apply_scale(obj)
    if material:
        obj.data.materials.append(material)
    return obj


def cylinder(name, cx, cy, cz, radius, height, material=None, segs=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segs, radius=radius, depth=height, location=loc(cx, cy, cz),
    )
    obj = bpy.context.object
    obj.name = name
    apply_scale(obj)
    if material:
        obj.data.materials.append(material)
    return obj


def cone(name, cx, cy, cz, radius, height, vertices=4, material=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices, radius1=radius, radius2=0.0, depth=height, location=loc(cx, cy, cz),
    )
    obj = bpy.context.object
    obj.name = name
    apply_scale(obj)
    if material:
        obj.data.materials.append(material)
    return obj


def hemisphere(name, cx, cy, cz, radius, material=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16, ring_count=10, radius=radius, location=loc(cx, cy, cz),
    )
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.bisect(plane_co=loc(cx, cy, cz), plane_no=(0.0, 0.0, -1.0), clear_inner=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    apply_scale(obj)
    if material:
        obj.data.materials.append(material)
    return obj


def yaw_xz(x, z, yaw):
    c = math.cos(yaw)
    s = math.sin(yaw)
    return x * c - z * s, x * s + z * c


wipe()
ochre = mat("palais-ochre", (0.659, 0.565, 0.439))
arcade = mat("palais-arcade", (0.478, 0.416, 0.345))
zinc = mat("palais-zinc", (0.361, 0.353, 0.329))
glass = mat("palais-glass", (0.086, 0.078, 0.110))

wing_x = 76.0
tower_x = 66.0
wing_yaw = 0.28

cube("eiffel-trocadero-esplanade", 0.0, y_at(0.0, -256.0, 0.8), -256.0, 96.0, 1.6, 12.0, 0.0, ochre)
cube("eiffel-trocadero-terrace", 0.0, y_at(0.0, -228.0, 1.6), -228.0, 44.0, 3.2, 10.0, 0.0, ochre)
cube("eiffel-trocadero-garden-l", -28.0, y_at(-28.0, -234.0, 1.2), -234.0, 16.0, 2.4, 10.0, 0.0, ochre)
cube("eiffel-trocadero-garden-r", 28.0, y_at(28.0, -234.0, 1.2), -234.0, 16.0, 2.4, 10.0, 0.0, ochre)
cube("eiffel-trocadero-parapet", 0.0, y_at(0.0, -236.0, 1.2), -236.0, 72.0, 2.4, 1.4, 0.0, ochre)

wings = []
for side, suffix in ((-1, "l"), (1, "r")):
    yaw = side * wing_yaw
    cx = side * wing_x
    cz = -246.0
    cube("eiffel-trocadero-plinth-%s" % suffix, cx, y_at(cx, cz, 2.2), cz, 34.0, 4.4, 24.0, yaw, arcade)
    body = cube("eiffel-trocadero-wing-%s" % suffix, cx, y_at(cx, cz, 10.0), cz, 32.0, 20.0, 22.0, yaw, ochre)
    cube("eiffel-trocadero-belt-%s" % suffix, cx, y_at(cx, cz, 10.0), cz, 33.2, 1.8, 23.2, yaw, arcade)
    cube("eiffel-trocadero-cornice-%s" % suffix, cx, y_at(cx, cz, 19.2), cz, 33.6, 1.4, 23.4, yaw, arcade)
    cone("eiffel-trocadero-wing-roof-%s" % suffix, cx, y_at(cx, cz, 24.2), cz, 16.0, 8.4, 4, zinc)
    bpy.data.objects["eiffel-trocadero-wing-roof-%s" % suffix].rotation_euler[2] = yaw
    tx, tz = yaw_xz(side * 14.4, 0.0, yaw)
    cylinder("eiffel-trocadero-turret-%s" % suffix, cx + tx, y_at(cx + tx, cz + tz, 12.0), cz + tz, 3.6, 12.4, ochre)
    cone("eiffel-trocadero-turret-cap-%s" % suffix, cx + tx, terrain(cx + tx, cz + tz) + 20.2, cz + tz, 5.2, 7.2, 8, zinc)
    wings.append((yaw, cx, cz, body))

cylinder("eiffel-trocadero-tower-l", -tower_x, y_at(-tower_x, -250.0, 9.0), -250.0, 7.0, 18.0, ochre, 16)
cylinder("eiffel-trocadero-tower-r", tower_x, y_at(tower_x, -250.0, 9.0), -250.0, 7.0, 18.0, ochre, 16)
hemisphere("eiffel-trocadero-dome-l", -tower_x, terrain(-tower_x, -250.0) + 18.0, -250.0, 8.8, zinc)
hemisphere("eiffel-trocadero-dome-r", tower_x, terrain(tower_x, -250.0) + 18.0, -250.0, 8.8, zinc)

cube("eiffel-trocadero-hall", 0.0, y_at(0.0, -266.0, 4.0), -266.0, 16.0, 8.0, 12.0, 0.0, ochre)
cube("eiffel-trocadero-hall-roof", 0.0, y_at(0.0, -266.0, 9.2), -266.0, 20.0, 2.4, 14.0, 0.0, zinc)
cube("eiffel-trocadero-colonnade", 0.0, y_at(0.0, -278.0, 18.8), -278.0, 58.0, 1.8, 3.2, 0.0, ochre)

# Camera-facing arcade wall, then punch round-headed bays so it is not a CAD slab.
wall = cube("eiffel-trocadero-arcade-wall", 0.0, y_at(0.0, -278.0, 8.0), -278.0, 62.0, 16.0, 3.0, 0.0, arcade)
cutters = []
for i in range(-4, 4):
    x = (i + 0.5) * 7.2
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=14,
        radius=3.15,
        depth=8.0,
        location=loc(x, y_at(x, -278.0, 14.4), -278.0),
        rotation=(math.pi / 2.0, 0.0, 0.0),
    )
    cutter = bpy.context.object
    cutter.name = "cutter-%d" % (i + 4)
    apply_scale(cutter)
    cutters.append(cutter)
    bpy.ops.mesh.primitive_cube_add(
        size=1.0,
        location=loc(x, y_at(x, -278.0, 7.2), -278.0),
    )
    slot = bpy.context.object
    slot.scale = (6.3, 3.2, 14.4)
    apply_scale(slot)
    cutters.append(slot)

bpy.context.view_layer.objects.active = wall
wall.select_set(True)
for cutter in cutters:
    mod = wall.modifiers.new("bool-%s" % cutter.name, "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "FLOAT"
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
for cutter in cutters:
    bpy.data.objects.remove(cutter, do_unlink=True)
wall.name = "eiffel-trocadero-arcade"

posts = []
for i in range(-4, 5):
    x = i * 7.2
    post = cube("eiffel-trocadero-post-%d" % (i + 4), x, y_at(x, -278.0, 7.2), -278.0, 2.4, 14.4, 2.4, 0.0, arcade)
    posts.append(post)
    if i == 0:
        post.name = "eiffel-trocadero-arch-post"

# Named round arch (half-cylinder) for the center bay, matching Spec 14.
bpy.ops.mesh.primitive_cylinder_add(
    vertices=14,
    radius=3.5,
    depth=2.4,
    location=loc(3.6, y_at(3.6, -278.0, 14.4), -278.0),
    rotation=(math.pi / 2.0, 0.0, 0.0),
)
arch = bpy.context.object
arch.name = "eiffel-trocadero-arch"
apply_scale(arch)
arch.data.materials.append(arcade)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.bisect(plane_co=arch.location, plane_no=(0.0, 0.0, -1.0), clear_inner=True)
bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.mesh.primitive_cylinder_add(
    vertices=14,
    radius=3.15,
    depth=1.2,
    location=loc(3.6, y_at(3.6, -278.0, 14.4), -279.2),
    rotation=(math.pi / 2.0, 0.0, 0.0),
)
hole = bpy.context.object
hole.name = "eiffel-trocadero-arch-glass"
apply_scale(hole)
hole.data.materials.append(glass)

# Wing-face round arches + glass.
named_wing_arch = False
for yaw, cx, cz, _body in wings:
    base = y_at(cx, cz, 10.0)
    for i in range(-1, 2):
        ax, az = yaw_xz(i * 7.4, -11.2, yaw)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12,
            radius=2.4,
            depth=1.6,
            location=loc(cx + ax, base + 1.2, cz + az),
            rotation=(math.pi / 2.0, yaw, 0.0),
        )
        span = bpy.context.object
        if cx < 0 and i == 0:
            span.name = "eiffel-trocadero-wing-arch"
            named_wing_arch = True
        else:
            span.name = "eiffel-trocadero-wing-arch-%s-%d" % ("l" if cx < 0 else "r", i)
        apply_scale(span)
        span.data.materials.append(arcade)
        hx, hz = yaw_xz(i * 7.4, -11.65, yaw)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=12,
            radius=2.15,
            depth=0.9,
            location=loc(cx + hx, base + 1.2, cz + hz),
            rotation=(math.pi / 2.0, yaw, 0.0),
        )
        pane = bpy.context.object
        pane.name = "eiffel-trocadero-wing-glass-%s-%d" % ("l" if cx < 0 else "r", i)
        apply_scale(pane)
        pane.data.materials.append(glass)

hall_y = y_at(0.0, -266.0, 4.0)
for i in range(-1, 2):
    cube(
        "eiffel-trocadero-hall-window-%d" % (i + 1),
        i * 5.2, hall_y + 0.4, -272.2, 4.2, 2.2, 0.5, 0.0, glass,
    )
for x in (-tower_x, tower_x):
    base = y_at(x, -250.0, 9.0)
    face_z = -257.0
    for dx, dy, n in ((-3.2, -2.8, "a"), (3.2, -2.8, "b"), (-3.2, 3.6, "c"), (3.2, 3.6, "d")):
        cube(
            "eiffel-trocadero-tower-window-%s-%s" % ("l" if x < 0 else "r", n),
            x + dx, base + dy, face_z, 4.4, 2.6, 0.5, 0.0, glass,
        )

# Terrace statues: figure + capital, not a chorus of identical boxes.
for i in range(-4, 5):
    x = i * 8.4
    z = -226.0
    h = 3.6 + ((i * 17) % 10) * 0.16
    cube("eiffel-trocadero-statue" if i == 0 else "eiffel-trocadero-statue-%d" % (i + 4), x, y_at(x, z, h / 2.0), z, 1.2, h, 1.15, 0.0, arcade)
    cube("eiffel-trocadero-capital-%d" % (i + 4), x, y_at(x, z, h + 0.55), z, 1.6, 1.1, 1.6, 0.0, arcade)

# Parent groups so Three.js can find the Spec 14 names.
def empty(name):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    obj = bpy.context.object
    obj.name = name
    return obj

windows = empty("eiffel-trocadero-windows")
statues = empty("eiffel-trocadero-statues")
arcade_group = empty("eiffel-trocadero-arcade-posts")
root = empty("eiffel-palais-trocadero")

for obj in list(bpy.data.objects):
    if obj.type != "MESH":
        continue
    n = obj.name
    if "window" in n or "glass" in n or n.endswith("-arch") or "wing-arch" in n:
        obj.parent = windows
    elif n.startswith("eiffel-trocadero-statue") or n.startswith("eiffel-trocadero-capital"):
        obj.parent = statues
    elif n.startswith("eiffel-trocadero-post") or n == "eiffel-trocadero-arcade-wall" or n == "eiffel-trocadero-arch-post":
        obj.parent = arcade_group
    else:
        obj.parent = root
windows.parent = root
statues.parent = root
arcade_group.parent = root
arcade_group.name = "eiffel-trocadero-arcade"

bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for obj in bpy.data.objects:
    if obj.type == "MESH" or obj.name in ("eiffel-trocadero-windows", "eiffel-trocadero-statues", "eiffel-trocadero-arcade"):
        obj.select_set(True)
bpy.context.view_layer.objects.active = root
path = os.path.join(OUT, "palais-trocadero.glb")
bpy.ops.export_scene.gltf(
    filepath=path,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_extras=False,
    export_animations=False,
    export_skins=False,
)

names = sorted(o.name for o in bpy.data.objects)
result = {
    "status": "ok",
    "path": path,
    "bytes": os.path.getsize(path),
    "object_count": len(bpy.data.objects),
    "mesh_count": len([o for o in bpy.data.objects if o.type == "MESH"]),
    "names": names,
    "named_wing_arch": named_wing_arch,
}
'''


def main() -> int:
    payload = json.dumps({"type": "execute", "code": CODE, "strict_json": True}) + "\x00"
    sock = socket.socket()
    sock.settimeout(180)
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
    inner = data.get("result", data)
    if inner.get("status") != "ok" and data.get("status") != "ok":
        return 1
    if inner.get("status") == "error" or data.get("status") == "error":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
