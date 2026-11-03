# Tales of Nirn kit: helpers for building and posing the puppet theatre in Blender.
# exec(open(r"<repo>/videos/tales-of-nirn/blender/tnkit.py").read()) inside a blender_exec call.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler, Quaternion

sc = bpy.context.scene
E = lambda x, y, z: Euler((math.radians(x), math.radians(y), math.radians(z)))

def col(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in sc.collection.children: sc.collection.children.link(c)
    return c

def rm(n):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)

def wc(n):
    """World-space centre of an object's vertices (most kit meshes keep their origin at the rig or the world origin)."""
    o = bpy.data.objects[n]
    if o.type != 'MESH' or not o.data.vertices: return o.matrix_world.translation.copy()
    c = sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices)
    return o.matrix_world @ c

def put(o, c, m=None, flat=False, bevel=0.0):
    for cc in o.users_collection: cc.objects.unlink(o)
    c.objects.link(o)
    if m: o.data.materials.clear(); o.data.materials.append(m)
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'
    if hasattr(o.data, 'polygons'):
        for p in o.data.polygons: p.use_smooth = not flat
    return o

def cube(name, size, loc, m, c, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); return put(o, c, m, flat=True, bevel=bevel)

def cyl(name, r, h, loc, m, c, rot=(0, 0, 0), v=24, r2=None, flat=False, bevel=0.0):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc, rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; return put(o, c, m, flat=flat, bevel=bevel)

def mesh_obj(name, c, m, build, flat=True, bevel=0.0, parent=None):
    """build(bm) fills a bmesh; the object sits at the origin (or the parent's origin when parented without inverse)."""
    me = bpy.data.meshes.new(name); b = bmesh.new(); build(b); b.to_mesh(me); b.free()
    o = bpy.data.objects.new(name, me); c.objects.link(o)
    if parent: o.parent = parent
    if m: me.materials.append(m)
    for p in me.polygons: p.use_smooth = not flat
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'
    return o

def sphere_into(b, r, at, scale=(1, 1, 1), seg=14, ring=10, rot=None):
    g = bmesh.ops.create_uvsphere(b, u_segments=seg, v_segments=ring, radius=r)
    M_ = Matrix.Translation(at) @ (rot.to_matrix().to_4x4() if rot else Matrix()) @ Matrix.Diagonal((*scale, 1))
    bmesh.ops.transform(b, matrix=M_, verts=g['verts'])

def box_into(b, size, at, rot=None, taper=None):
    g = bmesh.ops.create_cube(b, size=1); vs = g['verts']
    if taper:
        for v in vs:
            if v.co.z > 0: v.co.x *= taper[0]; v.co.y *= taper[1]
    M_ = Matrix.Translation(at) @ (rot.to_matrix().to_4x4() if rot else Matrix()) @ Matrix.Diagonal((*size, 1))
    bmesh.ops.transform(b, matrix=M_, verts=vs)

def limb_into(b, a, z, r1, r2=None, segs=10):
    """A tapered cylinder from point a to point z."""
    a, z = Vector(a), Vector(z); d = z - a
    g = bmesh.ops.create_cone(b, cap_ends=True, segments=segs, radius1=r1, radius2=r2 if r2 else r1, depth=d.length)
    q = Vector((0, 0, 1)).rotation_difference(d)
    bmesh.ops.transform(b, matrix=Matrix.Translation((a + z) / 2) @ q.to_matrix().to_4x4(), verts=g['verts'])

# ---------- the rig: an empty per joint, parts parented to the joint that moves them ----------
def joint(name, parent, local, rig, c):
    """An empty at rig-local position `local`, parented to `parent` with its world placement kept."""
    o = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if o.name not in c.objects: c.objects.link(o)
    o.empty_display_type = 'SPHERE'; o.empty_display_size = 0.03
    bpy.context.view_layer.update()
    mw = rig.matrix_world @ Matrix.Translation(Vector(local))
    o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted() if parent else Matrix()
    o.matrix_world = mw; o.rotation_mode = 'XYZ'
    return o

def reparent(o, new_parent):
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy(); o.parent = new_parent; o.matrix_parent_inverse = new_parent.matrix_world.inverted(); o.matrix_world = mw

# ---------- animation ----------
FPS = 12
def fr(t): return int(round(t * FPS)) + 1

def key(o, t, rot=None, loc=None, hide=None):
    """Keyframe an object at time t (seconds): rotation in degrees (XYZ), location in local units, visibility."""
    f = fr(t)
    if rot is not None:
        o.rotation_euler = E(*rot); o.keyframe_insert('rotation_euler', frame=f)
    if loc is not None:
        o.location = loc; o.keyframe_insert('location', frame=f)
    if hide is not None:
        o.hide_render = hide; o.hide_viewport = hide
        o.keyframe_insert('hide_render', frame=f); o.keyframe_insert('hide_viewport', frame=f)

def ease_all(objs, kind='BEZIER', easing='EASE_IN_OUT'):
    for o in objs:
        ad = o.animation_data
        if not ad or not ad.action: continue
        for fc in _fcurves(ad):
            for k in fc.keyframe_points:
                if fc.data_path.startswith('hide'): k.interpolation = 'CONSTANT'
                else: k.interpolation = kind; k.easing = easing

def _fcurves(ad):
    act = ad.action
    if hasattr(act, 'fcurves') and len(act.fcurves): return list(act.fcurves)
    out = []   # Blender 5 layered actions
    for layer in getattr(act, 'layers', []):
        for strip in layer.strips:
            for cb in strip.channelbags: out += list(cb.fcurves)
    return out
