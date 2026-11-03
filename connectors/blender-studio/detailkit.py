# detailkit: finishes for a realistic walkthrough, on top of sitekit (load sitekit first; this uses its helpers).
# Real materials, glazed frontage, modelled furniture, pendant lights, ceiling, context buildings, sky and a camera path.
# exec(open(r"<repo>/connectors/blender-studio/detailkit.py").read()) inside a blender_exec call.
import bpy, bmesh, math
from mathutils import Vector

# ---------- materials ----------
def _tree(m):
    if m.node_tree is None:
        try:
            m.use_nodes = True
        except Exception:
            pass
    nt = m.node_tree
    b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if b is None:
        nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        b = nt.nodes.new("ShaderNodeBsdfPrincipled")
        nt.links.new(b.outputs[0], out.inputs[0])
    for n in [n for n in nt.nodes if n.label == "dk"]:  # rebuilt every call
        nt.nodes.remove(n)
    return nt, b


def _set(b, key, val):
    if key in b.inputs:
        b.inputs[key].default_value = val


def pbr(name, hexs, rough=0.5, metal=0.0, transmission=0.0, ior=1.45, emit=None, strength=0.0, coat=0.0, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    nt, b = _tree(m)
    rgb = _rgb(hexs)
    _set(b, "Base Color", (*rgb, 1))
    _set(b, "Roughness", rough)
    _set(b, "Metallic", metal)
    _set(b, "IOR", ior)
    _set(b, "Transmission Weight", transmission)
    _set(b, "Coat Weight", coat)
    _set(b, "Alpha", alpha)
    if alpha < 1:  # see-through glass: alpha reads right in EEVEE and Cycles, where EEVEE transmission goes milky
        for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(m, attr, val)
                break
            except Exception:
                pass
    _set(b, "Emission Color", (*_rgb(emit or "#000000"), 1))
    _set(b, "Emission Strength", strength)
    m.diffuse_color = (*rgb, 1)
    m.roughness = rough
    m.metallic = metal
    return m


def _node(nt, kind, **inputs):
    n = nt.nodes.new(kind)
    n.label = "dk"
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


def _coords(nt, vertical=False):
    """Object coordinates; vertical=True maps a wall's (x + y, z) so a pattern runs across both faces of a building."""
    tc = _node(nt, "ShaderNodeTexCoord")
    if not vertical:
        return tc.outputs["Object"]
    sep = _node(nt, "ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    add = _node(nt, "ShaderNodeMath")
    nt.links.new(sep.outputs["X"], add.inputs[0])
    nt.links.new(sep.outputs["Y"], add.inputs[1])
    comb = _node(nt, "ShaderNodeCombineXYZ")
    nt.links.new(add.outputs[0], comb.inputs["X"])
    nt.links.new(sep.outputs["Z"], comb.inputs["Y"])
    return comb.outputs[0]


def pattern(name, c1, c2, mortar, w, h, gap, rough=0.5, vertical=False, bump=0.2, offset=0.5):
    """Planks, bricks or paving from Blender's brick texture: w x h units with a `gap` joint."""
    m = pbr(name, c1, rough)
    nt, b = _tree(m)
    br = _node(nt, "ShaderNodeTexBrick", Color1=(*_rgb(c1), 1), Color2=(*_rgb(c2), 1), Mortar=(*_rgb(mortar), 1),
               Scale=1.0, **{"Mortar Size": gap, "Brick Width": w, "Row Height": h, "Bias": 0.0})
    br.offset = offset
    nt.links.new(_coords(nt, vertical), br.inputs["Vector"])
    noise = _node(nt, "ShaderNodeTexNoise", Scale=40.0, Detail=6.0)
    nt.links.new(_coords(nt, vertical), noise.inputs["Vector"])
    mix = _node(nt, "ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["Factor"].default_value = 0.12
    nt.links.new(br.outputs["Color"], mix.inputs[6])
    nt.links.new(noise.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    bp = _node(nt, "ShaderNodeBump", Strength=bump)
    nt.links.new(br.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def plaster(name, hexs, rough=0.85, bump=0.05):
    m = pbr(name, hexs, rough)
    nt, b = _tree(m)
    noise = _node(nt, "ShaderNodeTexNoise", Scale=18.0, Detail=8.0)
    nt.links.new(_coords(nt), noise.inputs["Vector"])
    bp = _node(nt, "ShaderNodeBump", Strength=bump)
    nt.links.new(noise.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def foliage(name, c1, c2):
    m = pbr(name, c1, 0.7)
    nt, b = _tree(m)
    noise = _node(nt, "ShaderNodeTexNoise", Scale=3.0, Detail=4.0)
    nt.links.new(_coords(nt), noise.inputs["Vector"])
    ramp = _node(nt, "ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*_rgb(c1), 1)
    ramp.color_ramp.elements[1].color = (*_rgb(c2), 1)
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    return m


def library():
    """The house set of finishes. Re-running updates them in place."""
    L = {
        "oak": pbr("DK oak", "#B08A5E", 0.45, coat=0.2), "oak-floor": pattern("DK oak floor", "#9A714B", "#A87C52", "#5E4430", 1.6, 0.19, 0.003, 0.4, bump=0.08),
        "resin": pbr("DK resin floor", "#8C8C88", 0.35, coat=0.3), "plaster": plaster("DK plaster", "#E8DCCB"), "ceiling": plaster("DK ceiling", "#2B2826", 0.9),
        "steel": pbr("DK steel", "#CFCFCC", 0.28, 1.0), "dark-steel": pbr("DK dark steel", "#3A3836", 0.35, 0.9), "black": pbr("DK black metal", "#201E1D", 0.4, 0.6),
        "stone": pbr("DK stone top", "#2B2826", 0.2, coat=0.6), "leather": pbr("DK red leather", "#B6240E", 0.45, coat=0.15), "fabric": pbr("DK ink fabric", "#2E2B29", 0.9),
        "glass": pbr("DK glass", "#DDE6E6", 0.03, alpha=0.14), "frame": pbr("DK frame", "#201E1D", 0.35, 0.7), "white": pbr("DK white cladding", "#F2F2EF", 0.25),
        "bulb": pbr("DK bulb", "#FFF1D6", 0.3, emit="#FFD9A0", strength=25.0), "heat": pbr("DK heat lamp", "#FF6A2A", 0.3, emit="#FF5A1E", strength=2.5),
        "brick": pattern("DK brick", "#6E2E1F", "#632819", "#7A6458", 0.5, 0.15, 0.01, 0.9, vertical=True, bump=0.12),
        "paving": pattern("DK paving", "#9D9A95", "#8B8883", "#6C6965", 0.6, 0.3, 0.006, 0.7, bump=0.15),
        "facade": plaster("DK facade stone", "#D8CDBB", 0.8, 0.1), "facade-2": plaster("DK facade ochre", "#C9A46A", 0.8, 0.1), "facade-3": plaster("DK facade grey", "#A8A6A0", 0.8, 0.1),
        "window": pbr("DK dark glazing", "#1B2125", 0.08, 0.8), "leaves": foliage("DK autumn leaves", "#B9772F", "#7A8C3A"), "bark": pbr("DK bark", "#4A3A2E", 0.9),
        "plant": foliage("DK plant", "#3F5E34", "#6E8B4A"), "pot": pbr("DK pot", "#4A4644", 0.6), "gold": pbr("DK clock", "#D9C27A", 0.3, 0.8), "copper": pbr("DK copper", "#6E9A86", 0.5, 0.4),
    }
    # The block-out finishes from sitekit become real ones, so kit equipment renders as steel, timber and so on.
    pbr("Site steel", "#CFCFCC", 0.28, 1.0)
    pbr("Site equip", "#9A9894", 0.3, 0.9)
    pbr("Site cold", "#E6E8E8", 0.3, 0.6)
    pbr("Site overhead", "#CFCFCC", 0.3, 1.0)
    pbr("Site counter", "#4A4644", 0.4)
    pbr("Site ink", "#201E1D", 0.4, 0.3)
    plaster("Site wall", "#EDE9E4")
    return L


# ---------- geometry helpers ----------
FACES = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]


def parts(name, boxes, mats, collection="FOH", kind="detail", bevel=0.0, loc=(0, 0, 0), rot=0.0):
    """One object from many boxes: (x, y, z, w, d, h, material index). Bevel rounds the edges for real highlights."""
    v, f, mi = [], [], []
    for x, y, z, w, d, h, m in boxes:
        b = len(v)
        v += [(x, y, z), (x + w, y, z), (x + w, y + d, z), (x, y + d, z), (x, y, z + h), (x + w, y, z + h), (x + w, y + d, z + h), (x, y + d, z + h)]
        for q in FACES:
            f.append(tuple(b + i for i in q))
            mi.append(m)
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    for mm in mats:
        me.materials.append(mm)
    for p, m in zip(me.polygons, mi):
        p.material_index = m
    o = _put(name, me, collection, kind)
    o.location, o.rotation_euler = loc, (0, 0, rot)
    if bevel:
        mod = o.modifiers.new("Bevel", "BEVEL")
        mod.width, mod.segments, mod.limit_method = bevel, 2, "ANGLE"
    return o


def _prim(name, build, mat, collection, kind, loc, rot=(0, 0, 0), smooth=True):
    bm = bmesh.new()
    build(bm)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    o = _put(name, me, collection, kind, mat)
    o.location, o.rotation_euler = loc, rot
    return o


def cylinder(name, r, h, mat, loc, collection="FOH", kind="detail", r2=None, segs=32, rot=(0, 0, 0)):
    def b(bm):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    o = _prim(name, b, mat, collection, kind, loc, rot, smooth=False)
    for p in o.data.polygons:
        p.use_smooth = abs(p.normal.z) < 0.9  # smooth sides, flat caps
    return o


def sphere(name, r, mat, loc, collection="FOH", kind="detail", subdiv=3):
    return _prim(name, lambda bm: bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r), mat, collection, kind, loc)


def slab(name, x, y, w, d, z, mat, collection="Shell", kind="floor", down=False):
    me = bpy.data.meshes.new(name)
    q = [(x, y, z), (x + w, y, z), (x + w, y + d, z), (x, y + d, z)]
    me.from_pydata(q, [], [(3, 2, 1, 0) if down else (0, 1, 2, 3)])
    return _put(name, me, collection, kind, mat)


def recolour(name, mat):
    o = bpy.data.objects[name]
    o.data.materials.clear()
    o.data.materials.append(mat)
    return o


# ---------- furniture ----------
def fchair(name, x, y, face, L):
    """A timber chair with an ink seat, centred at (x, y), looking toward `face` degrees (0 = +X, 90 = +Y)."""
    s, t = 0.21, 0.032
    bx = [(-s, -s + 0.02, 0, t, t, 0.44, 0), (s - t, -s + 0.02, 0, t, t, 0.44, 0), (-s, s - t, 0, t, t, 0.44, 0), (s - t, s - t, 0, t, t, 0.44, 0),
          (-0.225, -0.21, 0.44, 0.45, 0.43, 0.035, 1),
          (-s, -0.23, 0.44, t, t, 0.40, 0), (s - t, -0.23, 0.44, t, t, 0.40, 0), (-0.215, -0.235, 0.66, 0.43, 0.022, 0.16, 0)]
    return parts(name, bx, [L["oak"], L["fabric"]], "FOH", "chair", 0.004, (x, y, 0), math.radians(face) - math.pi / 2)


def ftable(name, x, y, w, d, L, h=0.75, legs=4):
    """A timber top on black steel legs, centred at (x, y)."""
    t, inset = 0.035, 0.06
    bx = [(-w / 2, -d / 2, h - t, w, d, t, 0)]
    xs = [-w / 2 + inset, w / 2 - inset - 0.04]
    ys = [-d / 2 + inset, d / 2 - inset - 0.04]
    if legs == 6:  # a long table gets a middle pair along its length
        (xs if w > d else ys).insert(1, -0.02)
    for lx in xs:
        for ly in ys:
            bx.append((lx, ly, 0, 0.04, 0.04, h - t, 1))
    o = parts(name, bx, [L["oak"], L["black"]], "FOH", "table", 0.004, (x, y, 0))
    return o


def fbanquette(name, x, y, length, L, depth=0.55):
    """Fixed upholstered seating against a wall at x (back to the wall), running along +Y from y."""
    bx = [(0, 0, 0, depth, length, 0.33, 0), (0.0, 0.02, 0.33, depth - 0.02, length - 0.04, 0.12, 1), (0.0, 0.02, 0.45, 0.13, length - 0.04, 0.55, 1)]
    return parts(name, bx, [L["oak"], L["leather"]], "FOH", "banquette", 0.02, (x, y, 0))


def pendant(name, x, y, L, z_ceiling=4.3, drop=1.9, watts=45):
    """A ceiling pendant: cord, black shade, glowing bulb, and the light itself."""
    zb = z_ceiling - drop
    for o in (cylinder(name + " cord", 0.004, drop, L["black"], (x, y, zb + 0.2), kind="lamp"),
              cylinder(name + " shade", 0.15, 0.2, L["black"], (x, y, zb), r2=0.04, kind="lamp"),
              sphere(name + " bulb", 0.045, L["bulb"], (x, y, zb + 0.03), kind="lamp", subdiv=2)):
        o["overhead"] = True  # left off plans
    li = _put(name + " light", bpy.data.lights.new(name + " light", "POINT"), "Lights", "light")
    li.data.energy, li.data.color, li.data.shadow_soft_size = watts, (1.0, 0.78, 0.55), 0.05
    li.location = (x, y, zb - 0.02)
    return li


def panel_light(name, x, y, z, w, d, watts=120, color=(1.0, 0.97, 0.92)):
    li = _put(name, bpy.data.lights.new(name, "AREA"), "Lights", "light")
    li.data.shape, li.data.size, li.data.size_y = "RECTANGLE", w, d
    li.data.energy, li.data.color = watts, color
    li.location = (x, y, z)
    return li


def _cluster(name, cx, cy, cz, spread, size, n, mat, collection, kind, seed, noise, strength):
    import random
    rnd = random.Random(seed)
    tex = bpy.data.textures.get("DK foliage " + kind) or bpy.data.textures.new("DK foliage " + kind, "CLOUDS")
    tex.noise_scale = noise
    out = []
    for i in range(n):
        a, rr = rnd.uniform(0, 2 * math.pi), spread * math.sqrt(rnd.random())
        loc = (cx + rr * math.cos(a), cy + rr * math.sin(a), cz + rnd.uniform(-0.5, 0.5) * spread)
        o = sphere(f"{name} {i + 1}", size * rnd.uniform(0.7, 1.15), mat, loc, collection, kind, subdiv=2)
        d = o.modifiers.new("Leaves", "DISPLACE")
        d.texture, d.strength = tex, strength
        out.append(o)
    return out


def plant(name, x, y, L, h=1.4, r=0.3):
    """A potted olive-style tree: pot, thin stem, a loose crown."""
    cylinder(name + " pot", r, 0.45, L["pot"], (x, y, 0), kind="plant")
    cylinder(name + " stem", 0.02, h * 0.6, L["bark"], (x, y, 0.45), kind="plant", segs=8)
    _cluster(name, x, y, 0.45 + h * 0.75, h * 0.18, h * 0.13, 9, L["plant"], "FOH", "plant", sum(map(ord, name)), 0.05, 0.05)


def tree(name, x, y, L, h=9.0, r=3.0):
    """A street tree in autumn: trunk, two limbs, a crown of clustered masses."""
    cylinder(name + " trunk", 0.22, h * 0.6, L["bark"], (x, y, 0), collection="Context", kind="tree", segs=12)
    _cluster(name, x, y, h * 0.68, r * 0.7, r * 0.42, 12, L["leaves"], "Context", "tree", sum(map(ord, name)), 0.35, 0.45)


def glazing(name, x0, x1, y, h, bays, L, door_bays=(), transom=3.1, door_head=2.4):
    """A full-height glazed shopfront on the line y, black frames, open door bays (doors held open)."""
    fw, fd = 0.06, 0.16
    bw = (x1 - x0) / bays
    frame, glass = [], []
    for i in range(bays + 1):
        frame.append((x0 + i * bw - fw / 2, y - fd / 2, 0, fw, fd, h, 1))
    frame += [(x0, y - fd / 2, h - 0.12, x1 - x0, fd, 0.12, 1), (x0, y - fd / 2, 0, x1 - x0, fd, 0.05, 1), (x0, y - fd / 2, transom, x1 - x0, fd, 0.06, 1)]
    for i in range(bays):
        a = x0 + i * bw + fw / 2
        w = bw - fw
        if i in door_bays:
            frame.append((a, y - fd / 2, door_head, w, fd, 0.06, 1))
            glass.append((a, y - 0.01, door_head + 0.06, w, 0.02, transom - door_head - 0.06, 0))
        else:
            glass.append((a, y - 0.01, 0.05, w, 0.02, transom - 0.05, 0))
        glass.append((a, y - 0.01, transom + 0.06, w, 0.02, h - transom - 0.18, 0))
    o = parts(name, glass + frame, [L["glass"], L["frame"]], "Shell", "wall")
    o["h"] = h  # so cutaway() lowers the shopfront with the walls
    return o


# ---------- context ----------
def block(name, x, y, w, d, h, mat, z=0.0, windows=None, face_y=None, L=None, collection="Context"):
    """A plain building mass; windows=(cols, rows, win_w, win_h, z0, gap_z) puts dark glazing on the face at y = face_y."""
    o = parts(name, [(x, y, z, w, d, h, 0)], [mat], collection, "building")
    if windows and L:
        cols, rows, ww, wh, z0, gz = windows
        sx = w / cols
        fy = y + d if face_y == "back" else y - 0.02
        bx = [(x + c * sx + (sx - ww) / 2, fy, z0 + r * gz, ww, 0.04, wh, 0) for c in range(cols) for r in range(rows)]
        parts(name + " windows", bx, [L["window"]], collection, "building")
    return o


def sky(toward=(1.0, 1.0), elevation=18, strength=0.35, sun=3.5):
    """Daylight: a sky texture and a sun lamp. `toward` is the (x, y) direction from the site to the sun."""
    azimuth = math.degrees(math.atan2(toward[0], toward[1]))  # from +Y toward +X
    s = bpy.context.scene
    w = s.world or bpy.data.worlds.new("World")
    s.world = w
    if w.node_tree is None:
        try:
            w.use_nodes = True
        except Exception:
            pass
    nt = w.node_tree
    bg = next((n for n in nt.nodes if n.type == "BACKGROUND"), None)
    sk = next((n for n in nt.nodes if n.type == "TEX_SKY"), None) or nt.nodes.new("ShaderNodeTexSky")
    for t in ("MULTIPLE_SCATTERING", "NISHITA", "HOSEK_WILKIE"):
        try:
            sk.sky_type = t
            break
        except Exception:
            pass
    for attr, val in (("sun_elevation", math.radians(elevation)), ("sun_rotation", math.radians(azimuth)), ("sun_disc", True)):
        try:
            setattr(sk, attr, val)
        except Exception:
            pass
    nt.links.new(sk.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    sunl = bpy.data.objects.get("Sun")
    if sunl:
        sunl.data.energy, sunl.data.angle = sun, math.radians(0.6)
        sunl.data.color = (1.0, 0.92, 0.82)
        e, a = math.radians(elevation), math.radians(azimuth)
        to_sun = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))
        sunl.rotation_euler = (-to_sun).to_track_quat("-Z", "Y").to_euler()  # the lamp shines along its -Z
    return "sky set"


# ---------- presentation and camera ----------
def presentation(on=True):
    """On: hide zones, flow lines and labels, full-height walls, filmic colour. Off: back to the planning view."""
    for c in ("Zones", "Flow", "Labels"):
        coll(c).hide_render = on
        coll(c).hide_viewport = on
    coll("Context").hide_render = not on  # the surroundings and the ceiling only get in the way of a plan
    coll("Context").hide_viewport = not on
    for o in bpy.data.objects:
        if o.get("kind") == "ceiling":
            o.hide_render = o.hide_viewport = not on
    cutaway(None)
    s = bpy.context.scene
    try:
        s.view_settings.view_transform = "AgX" if on else "Standard"
        s.view_settings.look = "AgX - Medium High Contrast" if on else "None"
        if not on:  # a plan shows the brand colours as they are
            s.view_settings.exposure = 0.0
            s.view_settings.use_white_balance = False
    except Exception:
        pass
    return "presentation " + ("on" if on else "off")


def eye(name, pos, look, lens=22):
    """A still camera at a 3D point looking at a 3D point (cam_eye only looks level)."""
    o = _camera(name, False)
    o.data.lens, o.data.sensor_width = lens, 36
    o.location = pos
    o.rotation_euler = (Vector(look) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return o


def walk(path, fps=25, lens=22, name="Cam Walk", height=1.62):
    """An animated walkthrough: path is [(second, (x, y), (look_x, look_y, look_z)), ...]. Eyes at `height`."""
    s = bpy.context.scene
    cam = _camera(name, False)
    cam.data.lens, cam.data.sensor_width = lens, 36
    tgt = bpy.data.objects.get(name + " target")
    if tgt is None or not tgt.get("sitekit"):
        tgt = _put(name + " target", None, "Cameras", "target")
    cam.animation_data_clear()
    tgt.animation_data_clear()
    con = cam.constraints.get("Look") or cam.constraints.new("TRACK_TO")
    con.name, con.target, con.track_axis, con.up_axis = "Look", tgt, "TRACK_NEGATIVE_Z", "UP_Y"
    for sec, (x, y), look in path:
        f = 1 + round(sec * fps)
        cam.location = (x, y, height)
        cam.keyframe_insert("location", frame=f)
        tgt.location = look
        tgt.keyframe_insert("location", frame=f)
    for ob in (cam, tgt):
        ad = ob.animation_data
        if ad and ad.action:
            for fc in _fcurves(ad):
                for k in fc.keyframe_points:
                    k.interpolation, k.easing = "BEZIER", "EASE_IN_OUT"
                    k.handle_left_type = k.handle_right_type = "AUTO_CLAMPED"
    s.render.fps = fps
    s.frame_start, s.frame_end = 1, 1 + round(path[-1][0] * fps)
    return f"{name}: {path[-1][0]} s, frames 1-{s.frame_end}"


def _fcurves(ad):
    act = ad.action
    if hasattr(act, "fcurves") and len(getattr(act, "fcurves", [])):
        return list(act.fcurves)
    out = []  # layered actions (Blender 4.4+): curves live in channelbags
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in getattr(strip, "channelbags", []):
                out += list(bag.fcurves)
    return out


def look_eevee(samples=48):
    """EEVEE with ray tracing for walkthrough frames."""
    s = bpy.context.scene
    for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            s.render.engine = e
            break
        except TypeError:
            pass
    ee = s.eevee
    for attr, val in (("taa_render_samples", samples), ("use_raytracing", True), ("ray_tracing_method", "SCREEN"), ("use_shadows", True),
                      ("shadow_ray_count", 2), ("use_fast_gi", True), ("fast_gi_method", "GLOBAL_ILLUMINATION"), ("use_volumetric_shadows", False)):
        try:
            setattr(ee, attr, val)
        except Exception:
            pass
    try:
        ee.ray_tracing_options.resolution_scale = "1"
    except Exception:
        pass
    return s.render.engine


def espresso(name, x, y, z, L, w=0.75):
    """A two-group espresso machine on a counter, back-left corner at (x, y, z), group heads toward -Y."""
    parts(name, [(0, 0.1, 0, w, 0.4, 0.42, 0), (0, 0.1, 0.42, w, 0.4, 0.03, 1), (0.03, -0.02, 0, w - 0.06, 0.12, 0.02, 1),
                 (0.08, 0.02, 0.36, w - 0.16, 0.08, 0.04, 1)], [L["steel"], L["black"]], "FOH", "machine", 0.006, (x, y, z))
    for i, gx in enumerate((0.22, w - 0.22)):
        cylinder(f"{name} group {i + 1}", 0.04, 0.06, L["steel"], (x + gx, y + 0.06, z + 0.24), kind="machine", segs=16)
        cylinder(f"{name} handle {i + 1}", 0.012, 0.16, L["black"], (x + gx, y + 0.02, z + 0.25), kind="machine", segs=8, rot=(math.radians(90), 0, 0))


def slats(name, x0, y0, y1, h, L, pitch=0.08, w=0.04, depth=0.03):
    """Vertical timber slats on a wall at x0, running from y0 to y1."""
    n = int((y1 - y0) / pitch)
    return parts(name, [(0, i * pitch, 0, depth, w, h, 0) for i in range(n)], [L["oak"]], "FOH", "detail", 0.003, (x0, y0, 0))


COOK = {"range", "chargrill", "griddle", "fryer"}


def dress_kitchen(L):
    """Fronts on the kit's kitchen boxes: knobs and cooking tops, oven doors, fridge doors and handles. Fronts face -Y."""
    win = pbr("DK oven glass", "#14181A", 0.05, 0.6)
    for o in [o for o in bpy.data.objects if o.get("sitekit") and o.get("kind") in COOK | {"combi-oven", "undercounter-fridge", "reach-in-fridge", "dishwasher"}]:
        if o.get("front", 0) % 180:
            continue  # turned items face sideways; leave them plain
        xs = [v.co.x for v in o.data.vertices]
        ys = [v.co.y for v in o.data.vertices]
        zs = [v.co.z for v in o.data.vertices]
        w, d, h = max(xs), max(ys), max(zs)
        k, bx = o.get("kind"), []
        if k in COOK:
            bx.append((0.03, 0.05, h, w - 0.06, d - 0.08, 0.012, 1))  # cooking top
            if k == "chargrill":
                bx += [(0.05 + i * 0.05, 0.08, h + 0.012, 0.015, d - 0.14, 0.012, 1) for i in range(int((w - 0.1) / 0.05))]
            n = max(2, int(w / 0.18))
            bx += [(w * (i + 0.5) / n - 0.02, -0.025, h - 0.12, 0.04, 0.025, 0.04, 1) for i in range(n)]  # knobs
            bx.append((0.02, -0.004, 0.05, w - 0.04, 0.004, h - 0.22, 0))  # oven or cupboard door
        elif k == "combi-oven":
            bx += [(0.06, -0.01, h * 0.35, w * 0.62, 0.01, h * 0.5, 2), (w * 0.72, -0.05, h * 0.4, 0.03, 0.05, h * 0.4, 1), (w * 0.78, -0.005, h * 0.55, w * 0.16, 0.005, h * 0.3, 1)]
        elif k in ("undercounter-fridge", "dishwasher"):
            doors = 2 if w > 1.0 else 1
            for i in range(doors):
                x0 = i * w / doors
                bx += [(x0 + 0.01, -0.004, 0.08, w / doors - 0.02, 0.004, h - 0.12, 0), (x0 + 0.08, -0.035, h - 0.12, w / doors - 0.16, 0.03, 0.02, 1)]
        elif k == "reach-in-fridge":
            bx += [(0.01, -0.004, 0.1, w - 0.02, 0.004, h - 0.15, 0), (w - 0.08, -0.04, 0.8, 0.025, 0.04, 0.6, 1)]
        parts(o.name + " front", bx, [L["dark-steel"] if k in COOK else L["steel"], L["black"], win], "Kitchen", "detail", 0.0, tuple(o.location))


def pos(name, x, y, z, L):
    """A till: a slim stand and a tilted screen facing -Y (the queue)."""
    parts(name, [(0, 0.05, 0, 0.18, 0.14, 0.012, 0), (0.07, 0.1, 0, 0.04, 0.04, 0.16, 0)], [L["black"]], "FOH", "machine", 0.003, (x, y, z))
    sc = parts(name + " screen", [(-0.16, -0.11, -0.005, 0.32, 0.22, 0.012, 0)], [L["black"]], "FOH", "machine", 0.003, (x + 0.09, y + 0.12, z + 0.2))
    sc.rotation_euler = (math.radians(-60), 0, 0)
    return sc


def gi_volume(name, x0, y0, x1, y1, h, res=(12, 20, 6)):
    """A light probe volume over the interior so EEVEE's sky light stops leaking through walls. Bake it with bake_gi()."""
    for t in ("VOLUME", "GRID"):
        try:
            data = bpy.data.lightprobes.new(name, t)
            break
        except Exception:
            data = None
    o = _put(name, data, "Lights", "probe")
    o.location = ((x0 + x1) / 2, (y0 + y1) / 2, h / 2)
    o.scale = ((x1 - x0) / 2, (y1 - y0) / 2, h / 2)
    for attr, val in zip(("resolution_x", "resolution_y", "resolution_z"), res):
        try:
            setattr(data, attr, val)
        except Exception:
            pass
    return o


def bake_gi():
    """Bake every probe volume (run in a background Blender: it is synchronous there)."""
    for o in bpy.data.objects:
        if o.get("kind") == "probe":
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
    with bpy.context.temp_override(active_object=bpy.context.view_layer.objects.active):
        bpy.ops.object.lightprobe_cache_bake(subset="ALL")
    return "baked"
