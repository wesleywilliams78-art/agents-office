# sitekit: building blocks for hospitality site visualisation, loaded into the Blender Studio session.
# Units are metres. The site's front (street side) runs along X at y = 0; Y goes back into the building; Z is up.
# Every object the kit makes carries obj["sitekit"], and the kit only ever replaces or deletes those, never your own.
# Calling a builder again with the same name replaces that object, so a layout script can be re-run after an edit.
import bpy, math
from mathutils import Vector

ROOT = "Site"
COLLECTIONS = ["Shell", "Zones", "Kitchen", "FOH", "Flow", "Labels", "Cameras", "Lights", "Cutters"]

BRAND = {"bone": "#F3F2F2", "ink": "#201E1D", "red": "#EC3013", "deep-red": "#B6240E", "grey": "#4A4644", "rule": "#D6D2CF"}
FINISH = {"wall": "#F3F2F2", "floor": "#D6D2CF", "steel": "#B9B7B4", "equip": "#8A8683", "cold": "#C9D6DC", "canopy": "#A9A6A3",
          "counter": "#4A4644", "ink": "#201E1D", "timber": "#9B7B5B", "seat": "#4A4644"}
# Zone and flow colours are functional (they have to tell areas apart on a plan), not brand colours.
ZONES = {"cook": "#EC3013", "prep": "#F2A541", "wash": "#3E8EDE", "storage": "#7FA37A", "cold": "#8FC7E8", "goods-in": "#A3A35E",
         "service": "#B6240E", "foh": "#D6D2CF", "bar": "#9C6B98", "waste": "#4A4644", "staff": "#9C8FBF", "wc": "#B0B0B0"}
FLOWS = {"food": "#EC3013", "dirty": "#3E8EDE", "waste": "#4A4644", "staff": "#9C8FBF", "customer": "#201E1D", "goods": "#A3A35E"}

# Typical footprints in metres (w along X, d along Y, h, finish, z off the floor). Indicative: check the client's spec sheets.
CATALOGUE = {
    "prep-counter": (1.8, 0.7, 0.9, "steel", 0), "pass": (1.8, 0.6, 0.9, "steel", 0), "bain-marie": (1.5, 0.7, 0.9, "equip", 0),
    "range": (0.9, 0.9, 0.9, "equip", 0), "fryer": (0.4, 0.8, 0.9, "equip", 0), "chargrill": (0.8, 0.8, 0.9, "equip", 0),
    "griddle": (0.8, 0.8, 0.9, "equip", 0), "combi-oven": (0.85, 0.8, 1.8, "equip", 0), "pizza-oven": (1.4, 1.4, 1.8, "equip", 0),
    "extraction-canopy": (3.0, 1.2, 0.5, "canopy", 2.0), "sink": (1.2, 0.7, 0.9, "steel", 0), "hand-basin": (0.45, 0.35, 0.3, "steel", 0.8),
    "mop-sink": (0.6, 0.6, 0.5, "steel", 0), "dishwasher": (0.65, 0.75, 1.5, "equip", 0), "dish-tabling": (1.2, 0.7, 0.9, "steel", 0),
    "reach-in-fridge": (0.7, 0.8, 2.0, "cold", 0), "reach-in-freezer": (0.7, 0.8, 2.0, "cold", 0), "undercounter-fridge": (1.4, 0.7, 0.85, "cold", 0),
    "walk-in": (2.4, 2.0, 2.3, "cold", 0), "shelving": (1.2, 0.5, 1.8, "steel", 0), "bin": (0.4, 0.4, 0.8, "ink", 0),
    "service-counter": (2.4, 0.8, 1.05, "counter", 0), "bar-counter": (3.0, 0.6, 1.1, "counter", 0), "back-bar": (3.0, 0.5, 0.9, "counter", 0),
    "pos": (0.4, 0.35, 0.15, "ink", 1.05), "coffee-machine": (0.8, 0.6, 0.5, "ink", 0.9), "display-chiller": (1.2, 0.8, 1.3, "cold", 0),
}
FOH_KINDS = {"service-counter", "bar-counter", "back-bar", "pos", "coffee-machine", "display-chiller"}


# ---------- plumbing ----------
def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _rgb(hexs):
    h = hexs.lstrip("#")
    return tuple(_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


def coll(name):
    scene = bpy.context.scene
    root = bpy.data.collections.get(ROOT) or bpy.data.collections.new(ROOT)
    if root.name not in scene.collection.children:
        scene.collection.children.link(root)
    if name == ROOT:
        return root
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in root.children:
        root.children.link(c)
    return c


def mat(name, hexs, rough=0.6, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    rgb = _rgb(hexs)
    if m.node_tree is None:
        try:
            m.use_nodes = True
        except Exception:
            pass
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.node_tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Alpha"].default_value = alpha
    m.diffuse_color = (*rgb, alpha)  # what the solid viewport and Workbench show
    m.roughness = rough
    if alpha < 1:
        for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(m, attr, val)
                break
            except Exception:
                pass
    return m


def _free(name):
    o = bpy.data.objects.get(name)
    if o is None:
        return
    if not o.get("sitekit"):
        raise ValueError(f'"{name}" is one of your own objects. Pick another name; the kit never replaces your objects.')
    data = o.data
    bpy.data.objects.remove(o, do_unlink=True)
    if data is not None and data.users == 0:
        for pool in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
            if data.name in pool and pool[data.name] == data:
                pool.remove(data)
                break


def _put(name, data, collection, kind, material=None):
    _free(name)
    o = bpy.data.objects.new(name, data)
    coll(collection).objects.link(o)
    o["sitekit"] = True
    o["kind"] = kind
    if material is not None and hasattr(data, "materials"):
        data.materials.append(material)
    return o


def _next(prefix):
    n = 1
    while bpy.data.objects.get(f"{prefix} {n}"):
        n += 1
    return f"{prefix} {n}"


def _box(name, w, d, h, ox=0.0, oy=0.0):
    me = bpy.data.meshes.new(name)
    v = [(ox, oy, 0), (ox + w, oy, 0), (ox + w, oy + d, 0), (ox, oy + d, 0), (ox, oy, h), (ox + w, oy, h), (ox + w, oy + d, h), (ox, oy + d, h)]
    me.from_pydata(v, [], [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    me.update()
    return me


def box(name, x, y, w, d, h, z=0.0, finish="equip", collection="Kitchen", kind="box"):
    """A plain block with its back-left-bottom corner at (x, y, z)."""
    o = _put(name, _box(name, w, d, h), collection, kind, mat("Site " + finish, FINISH.get(finish, finish)))
    o.location = (x, y, z)
    return o


# ---------- the setup ----------
def setup():
    """Metric units, the Site collections, Standard colour (so brand colours render true), light and a bone ground."""
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.unit_settings.scale_length = 1.0
    s.unit_settings.length_unit = "METERS"
    try:
        s.view_settings.view_transform = "Standard"
    except Exception:
        pass
    for c in COLLECTIONS:
        coll(c)
    coll("Cutters").hide_viewport = True
    coll("Cutters").hide_render = True
    if not bpy.data.objects.get("Sun"):
        sun = _put("Sun", bpy.data.lights.new("Sun", "SUN"), "Lights", "light")
        sun.data.energy = 3.0
        sun.rotation_euler = (math.radians(40), 0, math.radians(30))
    w = s.world or bpy.data.worlds.new("World")
    s.world = w
    w.color = _rgb(BRAND["bone"])
    if w.node_tree:
        bg = next((n for n in w.node_tree.nodes if n.type == "BACKGROUND"), None)
        if bg:
            bg.inputs["Color"].default_value = (*_rgb(BRAND["bone"]), 1)
            bg.inputs["Strength"].default_value = 1.0
    return "Site ready: metres, collections " + ", ".join(COLLECTIONS)


def clear(collection=None):
    """Delete the kit's objects (all, or one collection). Your own objects are never touched."""
    gone = [o for o in bpy.data.objects if o.get("sitekit") and (collection is None or any(c.name == collection for c in o.users_collection))]
    for o in gone:
        _free(o.name)
    return len(gone)


# ---------- the shell ----------
def floor(w, d, name="Floor"):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(0, 0, 0), (w, 0, 0), (w, d, 0), (0, d, 0)], [], [(0, 1, 2, 3)])
    return _put(name, me, "Shell", "floor", mat("Site floor", FINISH["floor"], 0.8))


def wall(name, x1, y1, x2, y2, h=3.0, t=0.15):
    """A wall centred on the line (x1, y1) to (x2, y2)."""
    L = math.hypot(x2 - x1, y2 - y1)
    o = _put(name, _box(name, L, t, h, 0, -t / 2), "Shell", "wall", mat("Site wall", FINISH["wall"], 0.9))
    o.location = (x1, y1, 0)
    o.rotation_euler = (0, 0, math.atan2(y2 - y1, x2 - x1))
    o["t"], o["h"] = t, h
    return o


def room(w, d, h=3.0, t=0.15):
    """Floor plus four walls whose inside faces sit on the w x d rectangle. Walls: Wall Front (y=0, street), Wall Back, Wall Left (x=0), Wall Right."""
    floor(w, d)
    o = t / 2
    return {
        "front": wall("Wall Front", -t, -o, w + t, -o, h, t), "back": wall("Wall Back", -t, d + o, w + t, d + o, h, t),
        "left": wall("Wall Left", -o, 0, -o, d, h, t), "right": wall("Wall Right", w + o, 0, w + o, d, h, t),
    }


def opening(wall_name, at, width, height=2.1, sill=0.0, name=None):
    """Cut a door or window into an axis-aligned wall. `at` is the site coordinate of the opening's start along the wall (x for front/back walls, y for side walls)."""
    wo = bpy.data.objects[wall_name]
    t = wo.get("t", 0.15)
    ang = round(math.degrees(wo.rotation_euler.z)) % 180
    name = name or _next(f"Opening {wall_name}")
    if ang == 0:
        c = box(name, at, wo.location.y - t, width, t * 2, height, sill, "ink", "Cutters", "cutter")
    elif ang == 90:
        c = box(name, wo.location.x - t, at, t * 2, width, height, sill, "ink", "Cutters", "cutter")
    else:
        raise ValueError("opening() works on walls that run along X or Y.")
    c.display_type = "WIRE"
    if wo.modifiers.get(name):
        wo.modifiers.remove(wo.modifiers[name])
    mod = wo.modifiers.new(name, "BOOLEAN")
    mod.operation, mod.object = "DIFFERENCE", c
    return c


def door(wall_name, at, width=0.9, name=None):
    return opening(wall_name, at, width, 2.1, 0.0, name or _next("Door"))


def window(wall_name, at, width, sill=0.9, height=1.2, name=None):
    return opening(wall_name, at, width, height, sill, name or _next("Window"))


def cutaway(height=1.2):
    """Drop every wall to `height` so an overview shows the inside, like an architect's model. cutaway(None) puts them back."""
    for o in coll("Shell").objects:
        if o.get("kind") == "wall":
            o.scale.z = 1.0 if height is None else min(1.0, height / o.get("h", 3.0))
    return "walls at full height" if height is None else f"walls cut at {height} m"


# ---------- equipment and furniture ----------
def item(kind, x, y, rot=0, name=None, w=None, d=None, h=None, z=None, finish=None, collection=None):
    """Place a catalogue item with its footprint's back-left corner at (x, y) as placed. rot 90 or 270 turns it (swaps w and d)."""
    if kind not in CATALOGUE:
        raise ValueError(f'Unknown kind "{kind}". Known: {", ".join(sorted(CATALOGUE))}. Or use box().')
    cw, cd, ch, cf, cz = CATALOGUE[kind]
    w, d, h, z, finish = w or cw, d or cd, h or ch, cz if z is None else z, finish or cf
    if rot % 180 == 90:
        w, d = d, w
    o = box(name or _next(kind), x, y, w, d, h, z, finish, collection or ("FOH" if kind in FOH_KINDS else "Kitchen"), kind)
    o["front"] = rot % 360
    if z >= 1.8:  # overhead (canopies): see-through in renders so the line below stays visible, left off plans
        o.data.materials[0] = mat("Site overhead", FINISH.get(finish, finish), 0.6, 0.3)
        o["overhead"] = True
    return o


def run(kind, x, y, count, rot=0, gap=0.0, along="x"):
    """A line of the same item, e.g. run("fryer", 0, 4, 2). Returns the objects."""
    out = []
    for i in range(count):
        o = item(kind, x, y, rot)
        out.append(o)
        if along == "x":
            x += o.dimensions.x + gap
        else:
            y += o.dimensions.y + gap
    return out


def _chair(name, x, y, face):
    """A chair centred at (x, y), its back away from `face` (the direction it looks, in degrees)."""
    m = mat("Site seat", FINISH["seat"])
    seat = box(name, x - 0.225, y - 0.225, 0.45, 0.45, 0.45, 0, "seat", "FOH", "chair")
    back = _put(name + " back", _box(name + " back", 0.45, 0.04, 0.4, -0.225, -0.02), "FOH", "chair-back", m)
    back.parent = seat
    a = math.radians(face + 180)  # the back sits on the side away from the table
    back.location = (0.225 + 0.205 * math.cos(a), 0.225 + 0.205 * math.sin(a), 0.45)
    back.rotation_euler = (0, 0, math.radians(face + 90))
    return seat


def table(x, y, seats=4, name=None, w=None, d=None):
    """A table centred at (x, y) with its chairs: 2 = 0.7 x 0.7, 4 = 0.8 x 0.8, 6 = 1.8 x 0.8, 8 = 2.4 x 0.9. Chairs are part of the footprint."""
    sizes = {1: (0.6, 0.6), 2: (0.7, 0.7), 4: (0.8, 0.8), 6: (1.8, 0.8), 8: (2.4, 0.9)}
    tw, td = w or sizes.get(seats, (0.8, 0.8))[0], d or sizes.get(seats, (0.8, 0.8))[1]
    name = name or _next("Table")
    top = box(name, x - tw / 2, y - td / 2, tw, td, 0.75, 0, "timber", "FOH", "table")
    top["seats"] = seats
    off = 0.35  # chair centre beyond the table edge
    spots = []
    if seats in (1, 2):
        spots = [(x, y - td / 2 - off, 90), (x, y + td / 2 + off, 270)][:seats]
    elif seats == 4 and tw < 1.2:
        spots = [(x, y - td / 2 - off, 90), (x, y + td / 2 + off, 270), (x - tw / 2 - off, y, 0), (x + tw / 2 + off, y, 180)]
    else:
        per = seats // 2 if seats < 6 else (seats - 2) // 2
        for i in range(per):
            cx = x - tw / 2 + tw * (i + 0.5) / per
            spots += [(cx, y - td / 2 - off, 90), (cx, y + td / 2 + off, 270)]
        if seats >= 6:
            spots += [(x - tw / 2 - off, y, 0), (x + tw / 2 + off, y, 180)]
    for i, (cx, cy, face) in enumerate(spots):
        _chair(f"{name} chair {i + 1}", cx, cy, face)
    return top


def banquette(x, y, length, d=0.6, name=None, along="x"):
    """Fixed bench seating, back-left corner at (x, y)."""
    w, dd = (length, d) if along == "x" else (d, length)
    return box(name or _next("Banquette"), x, y, w, dd, 0.45, 0, "seat", "FOH", "banquette")


# ---------- zones, flows and labels ----------
def zone(name, x, y, w, d, kind="prep", text=None, points=None):
    """A translucent floor area for a plan, coloured by kind (cook, prep, wash, storage, cold, goods-in, service, foh, bar, waste, staff, wc)."""
    pts = points or [(x, y), (x + w, y), (x + w, y + d), (x, y + d)]
    me = bpy.data.meshes.new(name)
    me.from_pydata([(px, py, 0) for px, py in pts], [], [tuple(range(len(pts)))])
    o = _put(name, me, "Zones", "zone", mat("Zone " + kind, ZONES.get(kind, kind), 0.9, 0.45))
    o.location.z = 0.004
    o["zone"] = kind
    if text is not False:
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        label(text or name.upper(), cx, cy, 0.25, name=name + " label", center=True)
    return o


def _arrow(name, tip, direction, size, m):
    me = bpy.data.meshes.new(name)
    n = 12
    v = [(0, 0, size * 2.2)] + [(size * math.cos(2 * math.pi * i / n), size * math.sin(2 * math.pi * i / n), 0) for i in range(n)]
    f = [(0, i + 1, (i + 1) % n + 1) for i in range(n)] + [tuple(range(n, 0, -1))]
    me.from_pydata(v, [], f)
    o = _put(name, me, "Flow", "arrow", m)
    o.location = Vector(tip) - Vector(direction).normalized() * size * 2.2
    o.rotation_euler = Vector(direction).to_track_quat("Z", "Y").to_euler()
    return o


def flow(name, points, kind="food", width=0.06, z=0.06):
    """A route on the floor (goods in to service, dirty plates back, waste out) with an arrowhead at the end."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = width / 2
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for p, (px, py) in zip(sp.points, points):
        p.co = (px, py, z, 1)
    m = mat("Flow " + kind, FLOWS.get(kind, kind), 0.5)
    o = _put(name, cu, "Flow", "flow", m)
    o["flow"] = kind
    (ax, ay), (bx, by) = points[-2], points[-1]
    _arrow(name + " arrow", (bx, by, z), (bx - ax, by - ay, 0), width * 1.6, m)
    return o


def label(text, x, y, size=0.3, z=0.01, name=None, color="ink", center=False, collection="Labels"):
    cu = bpy.data.curves.new(name or text, "FONT")
    cu.body = text
    cu.size = size
    if center:
        cu.align_x, cu.align_y = "CENTER", "CENTER"
    o = _put(name or _next("Label"), cu, collection, "label", mat("Label " + color, BRAND.get(color, color), 0.9))
    o.location = (x, y, z)
    return o


# ---------- checks ----------
def _aabb(o):
    bpy.context.view_layer.update()  # objects made in this call have no world matrix yet (cheap when nothing changed)
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (min(p.x for p in pts), min(p.y for p in pts), max(p.x for p in pts), max(p.y for p in pts))


def gap(a, b):
    """Clear floor distance in metres between two objects (by name or object). 0 when they touch or overlap."""
    a = bpy.data.objects[a] if isinstance(a, str) else a
    b = bpy.data.objects[b] if isinstance(b, str) else b
    ax0, ay0, ax1, ay1 = _aabb(a)
    bx0, by0, bx1, by1 = _aabb(b)
    dx, dy = max(bx0 - ax1, ax0 - bx1, 0), max(by0 - ay1, ay0 - by1, 0)
    return round(math.hypot(dx, dy) if dx and dy else max(dx, dy), 3)


def aisles(collection="Kitchen", minimum=1.0, walls=True):
    """The pinch points: floor-standing items (or a wall) facing each other across clear floor narrower than `minimum`,
    with nothing in between. Gaps under 0.3 m are slots between neighbouring units, listed apart (cleaning traps)."""
    objs = [o for o in coll(collection).objects if o.get("sitekit") and o.parent is None and o.location.z < 0.5 and o.get("kind") not in ("chair",)]
    solids = objs + ([o for o in coll("Shell").objects if o.get("kind") == "wall"] if walls else [])
    boxes = {o.name: _aabb(o) for o in solids}
    aisle, slots = [], []

    def blocked(a, b, lo, hi, axis):  # anything standing in the strip between a and b?
        for n, (x0, y0, x1, y1) in boxes.items():
            if n in (a, b):
                continue
            if axis == "x" and x0 < hi[0] and x1 > lo[0] and y0 < hi[1] and y1 > lo[1]:
                return True
            if axis == "y" and y0 < hi[1] and y1 > lo[1] and x0 < hi[0] and x1 > lo[0]:
                return True
        return False

    names = list(boxes)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if a not in [o.name for o in objs] and b not in [o.name for o in objs]:
                continue  # wall to wall is the room, not an aisle
            ax0, ay0, ax1, ay1 = boxes[a]
            bx0, by0, bx1, by1 = boxes[b]
            ovx, ovy = min(ax1, bx1) - max(ax0, bx0), min(ay1, by1) - max(ay0, by0)
            if ovy > 0.3:  # side by side along X
                g = max(bx0 - ax1, ax0 - bx1)
                lo, hi = (min(ax1, bx1), max(ay0, by0)), (max(ax0, bx0), min(ay1, by1))
                axis = "x"
            elif ovx > 0.3:  # facing across Y
                g = max(by0 - ay1, ay0 - by1)
                lo, hi = (max(ax0, bx0), min(ay1, by1)), (min(ax1, bx1), max(ay0, by0))
                axis = "y"
            else:
                continue
            if g <= 0.001 or g >= minimum or blocked(a, b, lo, hi, axis):
                continue
            (slots if g < 0.3 else aisle).append((a, b, round(g, 3)))
    return {"aisles": sorted(aisle, key=lambda r: r[2]), "slots": sorted(slots, key=lambda r: r[2])}


def report():
    """What is on site: items per collection with size and position, zone areas, seat count."""
    out = {"items": {}, "zones": {}, "seats": 0}
    for o in bpy.data.objects:
        if not o.get("sitekit") or o.parent is not None:
            continue
        k = o.get("kind")
        if k == "zone":
            me = o.data
            out["zones"][o.name] = round(sum(p.area for p in me.polygons), 2)
        elif k == "table":
            out["seats"] += int(o.get("seats", 0))
        if k not in ("zone", "label", "arrow", "cutter", "chair", "light", "camera", "flow"):
            c = o.users_collection[0].name
            dim = o.dimensions
            out["items"].setdefault(c, []).append(f"{o.name}: {dim.x:.2f} x {dim.y:.2f} x {dim.z:.2f} at ({o.location.x:.2f}, {o.location.y:.2f})")
    return out


# ---------- cameras and renders ----------
def bounds():
    objs = [o for o in bpy.data.objects if o.get("sitekit") and o.type in ("MESH", "CURVE", "FONT") and o.get("kind") not in ("cutter", "ceiling")
            and not any(c.name == "Context" for c in o.users_collection)]  # the surroundings never widen a plan
    if not objs:
        return (0, 0, 10, 10)
    bb = [_aabb(o) for o in objs]
    return (min(b[0] for b in bb), min(b[1] for b in bb), max(b[2] for b in bb), max(b[3] for b in bb))


def _camera(name, ortho):
    cam = bpy.data.cameras.new(name)
    cam.type = "ORTHO" if ortho else "PERSP"
    cam.clip_end = 500
    o = _put(name, cam, "Cameras", "camera")
    bpy.context.scene.camera = o
    return o


def cam_plan(margin=1.0, name="Cam Plan"):
    """Orthographic top-down plan over the whole site."""
    x0, y0, x1, y1 = bounds()
    o = _camera(name, True)
    s = bpy.context.scene.render
    aspect = s.resolution_x / s.resolution_y
    o.data.ortho_scale = max(x1 - x0 + margin * 2, (y1 - y0 + margin * 2) * aspect)
    o["plan"] = True
    o.location = ((x0 + x1) / 2, (y0 + y1) / 2, 30)
    o.rotation_euler = (0, 0, 0)
    return o


def cam_iso(side="front-right", margin=1.0, name="Cam Iso"):
    """Orthographic axonometric view from a corner: front-right, front-left, back-right or back-left."""
    x0, y0, x1, y1 = bounds()
    c = Vector(((x0 + x1) / 2, (y0 + y1) / 2, 1.0))
    yaw = {"front-right": 45, "front-left": -45, "back-left": -135, "back-right": 135}[side]
    o = _camera(name, True)
    o.rotation_euler = (math.radians(54.736), 0, math.radians(yaw))
    look = o.rotation_euler.to_matrix() @ Vector((0, 0, -1))
    o.location = c - look * 40
    o.data.ortho_scale = math.hypot(x1 - x0, y1 - y0) * 0.95 + margin * 2
    return o


def cam_eye(x, y, look_x, look_y, h=1.6, lens=24, name="Cam Eye"):
    """A person's view: standing at (x, y), eyes at h, looking at (look_x, look_y)."""
    o = _camera(name, False)
    o.data.lens = lens
    o.location = (x, y, h)
    o.rotation_euler = (Vector((look_x, look_y, h * 0.85)) - o.location).to_track_quat("-Z", "Y").to_euler()
    return o


def render(path, engine="workbench", width=1920, height=1080, samples=64, camera=None):
    """Render the scene camera (or `camera`) to a PNG. workbench = clean plan drawing; eevee = fast lit; cycles = final."""
    s = bpy.context.scene
    if camera:
        s.camera = bpy.data.objects[camera]
    if s.camera is None:
        raise ValueError("No camera. Make one with cam_plan(), cam_iso() or cam_eye().")
    r = s.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = width, height, 100
    r.image_settings.file_format = "PNG"
    r.filepath = path
    if engine == "workbench":
        r.engine = "BLENDER_WORKBENCH"
        sh = s.display.shading
        sh.light, sh.color_type, sh.show_object_outline = "FLAT", "MATERIAL", True
        sh.show_shadows = False
    elif engine == "eevee":
        for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
            try:
                r.engine = e
                break
            except TypeError:
                pass
        s.eevee.taa_render_samples = samples
    else:
        r.engine = "CYCLES"
        s.cycles.samples = samples
    # A plan leaves overhead items off and lifts the labels above the equipment, then puts both back.
    plan = bool(s.camera.get("plan"))
    over = [(o, o.hide_render) for o in bpy.data.objects if o.get("overhead")] if plan else []
    labels = [(o, o.location.z) for o in bpy.data.objects if o.get("kind") == "label"] if plan else []
    try:
        for o, _ in over:
            o.hide_render = True
        for o, z in labels:
            o.location.z = 2.95
        bpy.ops.render.render(write_still=True)
    finally:
        for o, was in over:
            o.hide_render = was  # put back what it was, not "visible"
        for o, z in labels:
            o.location.z = z
    return path
