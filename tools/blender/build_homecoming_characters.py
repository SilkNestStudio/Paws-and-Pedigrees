"""Original Homecoming characters. Blender 5, background, no external assets.

Blender +Y forward; the web viewer rotates exported -Z to +Z.
Run: blender --background --python tools/blender/build_homecoming_characters.py
Use render_homecoming_characters.py for a studio contact sheet of the exports.
"""
import sys
import math
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True
from build_milestone import clear, material, ellipsoid, segment, cube, join, OUT, SOURCE


def organic(parts, name, voxel=.014):
    obj = join(parts, name)
    mod = obj.modifiers.new('Continuous sculpted surface', 'REMESH')
    mod.mode = 'VOXEL'
    mod.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Relax sculpt', 'SMOOTH')
    mod.factor = .8
    mod.iterations = 5
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Mobile topology budget', 'DECIMATE')
    mod.ratio = .38
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def rig_from(bones, name):
    bpy.ops.object.armature_add()
    rig = bpy.context.object
    rig.name = name
    bpy.ops.object.mode_set(mode='EDIT')
    rig.data.edit_bones.remove(rig.data.edit_bones[0])
    for name, head, tail, parent in bones:
        bone = rig.data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = rig.data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def skin(obj, bone):
    obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    return obj


def blend_skin(obj, weights):
    groups = {}
    for vertex in obj.data.vertices:
        values = weights(obj.matrix_world @ vertex.co)
        total = sum(values.values())
        for name, value in values.items():
            if value <= 0:
                continue
            if name not in groups:
                groups[name] = obj.vertex_groups.new(name=name)
            groups[name].add([vertex.index], value / total, 'REPLACE')


def smoothstep(lo, hi, value):
    t = max(0, min(1, (value - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)


def place_bone(bone, start, end):
    start, end = Vector(start), Vector(end)
    rest = bone.bone
    direction = end - start
    rotation = (rest.tail_local - rest.head_local).rotation_difference(direction) @ rest.matrix_local.to_quaternion()
    bone.matrix = Matrix.Translation(start) @ rotation.to_matrix().to_4x4() @ Matrix.Diagonal((1, direction.length / rest.length, 1, 1))
    bpy.context.view_layer.update()


def limb_knee(hip, ankle, upper_length, lower_length, bend):
    hip, ankle = Vector(hip), Vector(ankle)
    delta = ankle-hip
    distance = max(.001, delta.length)
    direction = delta / distance
    along = max(.01, min(upper_length-.001, (upper_length**2-lower_length**2+distance**2)/(2*distance)))
    height = math.sqrt(max(.00001, upper_length**2-along**2))
    perpendicular = Vector((0, -direction.z, direction.y)).normalized()
    return hip+direction*along+perpendicular*height*bend


def bind(parts, rig, name):
    # glTF exports one vertex-color semantic for the joined mesh. Non-toned
    # details must be white, not Blender's black default for missing attributes.
    if any(obj.data.color_attributes.get('CoatTone') for obj in parts):
        for obj in parts:
            if not obj.data.color_attributes.get('CoatTone'):
                colors = obj.data.color_attributes.new(name='CoatTone', type='FLOAT_COLOR', domain='POINT')
                for color in colors.data:
                    color.color = (1, 1, 1, 1)
    mesh = join(parts, name)
    mesh.parent = rig
    modifier = mesh.modifiers.new('Deforming character skeleton', 'ARMATURE')
    modifier.object = rig
    return mesh


def animate(rig, clips, pose_fn):
    rig.animation_data_create()
    bpy.context.scene.render.fps = 30
    for clip, duration in clips:
        action = bpy.data.actions.new(clip)
        rig.animation_data.action = action
        for frame in range(1, duration + 2, 2):
            bpy.context.scene.frame_set(frame)
            t = (frame - 1) / duration * math.tau
            for bone in rig.pose.bones:
                bone.rotation_mode = 'XYZ'
                bone.rotation_euler = (0, 0, 0)
                bone.location = (0, 0, 0)
                bone.scale = (1, 1, 1)
            pose_fn(rig.pose.bones, clip, t)
            for bone in rig.pose.bones:
                bone.keyframe_insert('rotation_euler', frame=frame, group=bone.name)
                bone.keyframe_insert('location', frame=frame, group=bone.name)
                bone.keyframe_insert('scale', frame=frame, group=bone.name)
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        track.strips.new(clip, 1, action)
        track.mute = True
        rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)
    bpy.context.scene.frame_set(1)


def export(rig, mesh, filename):
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / (filename + '.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT / (filename + '.glb')), use_selection=True,
                              export_format='GLB', export_animation_mode='ACTIONS',
                              export_anim_single_armature=True, export_force_sampling=True)
    print('CHARACTER', filename, 'triangles', sum(len(p.vertices)-2 for p in mesh.data.polygons),
          'bones', len(rig.data.bones), 'materials', len(mesh.data.materials))


def make_dog(stocky=False):
    clear()
    coat = material('Warm sable coat', (.48, .265, .11) if not stocky else (.27, .125, .064), .9)
    cream = material('Soft muzzle', (.60, .43, .25), .95)
    dark = material('Nose lips and pads', (.014, .019, .024), .43)
    iris = material('Warm brown iris', (.20, .085, .022), .23)
    highlight = material('Eye reflections', (.95, .94, .87), .15)
    collar = material('Woven indigo collar', (.032, .095, .15), .9)
    brass = material('Engraved brass tag', (.53, .34, .11), .38, .65)
    width = .26 if stocky else .215
    h = .72 if stocky else .79
    head = 1.02 if stocky else 1.11
    muzzle = .16 if stocky else .215
    torso = [ellipsoid('Thorax', (0, .1, h), (width, .44, .27), coat, 28, 18),
             ellipsoid('Tucked waist', (0, -.24, h+.025), (width*.76, .30, .18), coat, 24, 16),
             ellipsoid('Haunch', (0, -.43, h-.025), (width, .23, .245), coat, 24, 16),
             ellipsoid('Brisket', (0, .32, h-.09), (width*.86, .21, .26), coat, 24, 16),
             ellipsoid('Neck', (0, .44, h+.16), (.18, .225, .28), coat, 24, 16),
             ellipsoid('Skull', (0, .63, head), (.172 if stocky else .153, .195, .18), coat, 28, 18),
             ellipsoid('Face bridge', (0, .805, head-.035), (.12, muzzle, .105), coat, 24, 16),
             ellipsoid('Jaw', (0, .83, head-.115), (.112, muzzle*.9, .06), coat, 24, 16)]
    for side in [-1, 1]:
        torso.append(ellipsoid('Cheek', (side*.085, .735, head-.065), (.075, .12, .095), coat, 24, 16))
    legs = {}
    bones = [('Root', (0, 0, .05), (0, 0, .2), None),
             ('Spine', (0, -.3, h), (0, .3, h), 'Root'),
             ('Head', (0, .39, h+.13), (0, .7, head), 'Spine'),
             ('Tail', (0, -.58, h), (0, -.91, h+.08), 'Spine'),
             ('TailTip', (0, -.91, h+.08), (0, -1.23, h+.12), 'Tail')]
    for label, side, front in [('FL', -1, True), ('FR', 1, True), ('BL', -1, False), ('BR', 1, False)]:
        x = side * width * .78
        hip = (x, .31 if front else -.41, h-.01)
        knee = (x, .275 if front else -.23, .39)
        ankle = (x, .36 if front else -.49, .16)
        foot = (x, .43 if front else -.38, .065)
        legs[label] = (hip, knee, ankle, foot)
        bones.extend([(label, hip, knee, 'Spine'), (label+'_Lower', knee, ankle, label),
                      (label+'_Paw', ankle, (foot[0], foot[1]+.09, foot[2]), label+'_Lower')])
        torso.extend([ellipsoid('Shoulder' if front else 'Thigh', hip, (.1 if front else .12, .15 if front else .2, .225), coat, 24, 16),
                      segment('Upper limb', hip, knee, .085 if front else .105, coat, .056, 18),
                      ellipsoid('Joint', knee, (.059, .078, .074), coat, 20, 12),
                      segment('Lower limb', knee, ankle, .056, coat, .037, 18),
                      segment('Wrist', ankle, foot, .039, coat, .06, 18),
                      ellipsoid('Paw', foot, (.082, .129, .066), coat, 24, 16)])
    body = organic(torso, 'Sculpted canine anatomy', .015)
    def body_weights(p):
        head_w = smoothstep(.29, .65, p.y) * smoothstep(h-.03, h+.27, p.z)
        leg_w = (1-smoothstep(.43, h+.04, p.z)) * smoothstep(.045, width*.66, abs(p.x))
        label = ('F' if p.y > -.03 else 'B') + ('L' if p.x < 0 else 'R')
        lower = 1-smoothstep(.29, .49, p.z)
        paw = 1-smoothstep(.1, .2, p.z)
        return {'Head': head_w*(1-leg_w), 'Spine': (1-head_w)*(1-leg_w), label: leg_w*(1-lower),
                label+'_Lower': leg_w*lower*(1-paw), label+'_Paw': leg_w*lower*paw}
    blend_skin(body, body_weights)
    # Subtle vertex tones preserve the shape without per-frame shader effects or fur cards.
    color = body.data.color_attributes.new(name='CoatTone', type='FLOAT_COLOR', domain='POINT')
    for vertex in body.data.vertices:
        p = body.matrix_world @ vertex.co
        back = smoothstep(.65, 1.04, p.z)*(1-smoothstep(.42, .7, p.y))
        underside = (1-smoothstep(.43, .72, p.z))*(1-smoothstep(.12, .25, abs(p.x)))
        shade = 1 - back*.22 + underside*.12
        base = coat.diffuse_color
        color.data[vertex.index].color = (base[0]*shade, base[1]*shade*.97, base[2]*shade*.92, 1)
    body_material = coat.copy()
    body_material.name = 'Sable body with natural tonal variation'
    body.data.materials[0] = body_material
    vertex_color = body_material.node_tree.nodes.new('ShaderNodeVertexColor')
    vertex_color.layer_name = 'CoatTone'
    body_material.node_tree.links.new(vertex_color.outputs['Color'], body_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    parts = [body]
    def attach(obj, bone='Head'):
        parts.append(skin(obj, bone))
        return obj
    nose_y = .805 + muzzle*.94
    attach(ellipsoid('Nasal leather', (0, nose_y, head-.025), (.073, .055, .047), dark, 28, 18))
    attach(ellipsoid('Chin', (0, .83, head-.135), (.09, muzzle*.82, .036), cream, 24, 16))
    for side in [-1, 1]:
        attach(ellipsoid('Nostril', (side*.043, nose_y+.045, head-.017), (.018, .008, .01), dark, 16, 10))
        attach(ellipsoid('Lip seam', (side*.092, .87, head-.105), (.011, .105, .011), dark, 18, 10))
        x = side*(.133 if not stocky else .149)
        attach(ellipsoid('Eyelid', (x, .736, head+.048), (.031, .023, .025), dark, 24, 16))
        attach(ellipsoid('Iris', (x, .754, head+.05), (.021, .01, .019), iris, 24, 16))
        attach(ellipsoid('Pupil', (x, .762, head+.05), (.011, .005, .015), dark, 18, 12))
        attach(ellipsoid('Eye glint', (x-.006, .766, head+.057), (.004, .003, .004), highlight, 12, 8))
        attach(ellipsoid('Brow ridge', (x, .724, head+.079), (.037, .046, .012), coat, 24, 16))
        ear = organic([ellipsoid('Ear root', (side*.176, .59, head+.087), (.079, .106, .088), coat, 24, 16),
                       ellipsoid('Ear fold', (side*.222, .56, head-.025), (.048, .123, .135), coat, 24, 16),
                       ellipsoid('Ear tip', (side*.218, .586, head-.136), (.04, .079, .069), coat, 24, 16)], 'Soft folded ear', .01)
        attach(ear)
    tail = organic([segment('Tail root', (0, -.55, h+.015), (0, -.89, h+.10), .068, coat, .044, 20),
                    segment('Tail tip', (0, -.87, h+.09), (0, -1.20, h+.17), .045, coat, .012, 20),
                    ellipsoid('Tail end', (0, -1.2, h+.17), (.013, .019, .013), coat)], 'Tapered tail', .012)
    blend_skin(tail, lambda p: {'Tail': smoothstep(-1.02, -.79, p.y), 'TailTip': 1-smoothstep(-1.02, -.79, p.y)})
    parts.append(tail)
    bpy.ops.mesh.primitive_torus_add(major_radius=.172, minor_radius=.022, major_segments=36, minor_segments=8,
                                    location=(0, .442, h+.17), rotation=(math.pi/2-.4, 0, 0))
    ring = bpy.context.object
    ring.data.materials.append(collar)
    attach(ring)
    attach(ellipsoid('Brass identity tag', (0, .626, h+.04), (.028, .008, .036), brass, 18, 12))
    rig = rig_from(bones, 'Homecoming canine rig')
    mesh = bind(parts, rig, 'Homecoming companion')
    def pose(b, clip, t):
        b['Tail'].rotation_euler.y = math.sin(t*2)*.12
        b['TailTip'].rotation_euler.y = math.sin(t*2-.55)*.14
        b['Head'].rotation_euler.y = math.sin(t)*.025
        if clip in ['Walk', 'Run']:
            b['Spine'].location.z = abs(math.sin(t))*.012
        elif clip == 'Sniff':
            b['Head'].rotation_euler.x = -.72 + math.sin(t*2)*.025
            b['Head'].rotation_euler.y = math.sin(t)*.1
            b['Spine'].rotation_euler.x = -.07
        elif clip == 'Sit':
            place_bone(b['Spine'], (0, -.35, .40 if stocky else .44), (0, .25, .64 if stocky else .69))
            b['Head'].rotation_euler.x = -.34
        else:
            b['Spine'].scale.x = 1+math.sin(t)*.008
        # Bake planted paws and articulated knees into each clip. Pure hip
        # rotations made the previous sit float and the walk skate on tiptoe.
        bpy.context.view_layer.update()
        spine_delta = b['Spine'].matrix @ b['Spine'].bone.matrix_local.inverted()
        for label, (hip, knee, ankle, foot) in legs.items():
            front = label.startswith('F')
            posed_hip = spine_delta @ Vector(hip)
            posed_ankle = Vector(ankle)
            if clip in ['Walk', 'Run']:
                phase = t + (math.pi if label in ['FR', 'BL'] else 0)
                posed_ankle.y += math.sin(phase)*(.15 if clip == 'Walk' else .21)
                posed_ankle.z += max(0, -math.cos(phase))*(.065 if clip == 'Walk' else .11)
            elif clip == 'Sit' and not front:
                posed_ankle.y = -.43
                posed_ankle.z = .13
            upper_length = (Vector(knee)-Vector(hip)).length
            lower_length = (Vector(ankle)-Vector(knee)).length
            joint = limb_knee(posed_hip, posed_ankle, upper_length, lower_length, -1 if front else 1)
            place_bone(b[label], posed_hip, joint)
            place_bone(b[label+'_Lower'], joint, posed_ankle)
            paw = b[label+'_Paw'].bone
            place_bone(b[label+'_Paw'], posed_ankle, posed_ankle+(paw.tail_local-paw.head_local))
    animate(rig, [('Idle', 90), ('Walk', 30), ('Run', 24), ('Sniff', 90), ('Sit', 90)], pose)
    export(rig, mesh, 'homecoming_stocky' if stocky else 'homecoming_companion')


def make_keeper():
    clear()
    shirt = material('Indigo cotton', (.047, .10, .16), .93)
    seam = material('Worn blue seams', (.09, .18, .255), .95)
    skinmat = material('Warm skin', (.52, .295, .177), .88)
    pants = material('Stone canvas trousers', (.22, .245, .235), .96)
    leather = material('Oiled leather boots', (.075, .048, .033), .8)
    sole = material('Rubber soles', (.022, .029, .029), .95)
    hair = material('Chestnut hair', (.047, .027, .017), .97)
    eyes = material('Brown eyes', (.042, .034, .025), .25)
    white = material('Eye whites', (.73, .70, .61), .65)
    brass = material('Brass fastenings', (.45, .29, .09), .45, .6)
    bones = [('Root', (0, 0, 0), (0, 0, .15), None), ('Pelvis', (0, 0, .83), (0, 0, 1.02), 'Root'),
             ('Chest', (0, 0, 1.02), (0, 0, 1.44), 'Pelvis'), ('Head', (0, 0, 1.48), (0, 0, 1.78), 'Chest')]
    limbs = {}
    for side, label in [(-1, 'L'), (1, 'R')]:
        hip, knee, ankle = (side*.105, 0, .90), (side*.12, .012, .48), (side*.12, -.025, .12)
        shoulder, elbow, wrist = (side*.215, 0, 1.37), (side*.273, .035, 1.12), (side*.30, .065, .88)
        bones.extend([(label+'Thigh', hip, knee, 'Pelvis'), (label+'Shin', knee, ankle, label+'Thigh'),
                      (label+'Foot', ankle, (side*.12, .18, .065), label+'Shin'),
                      (label+'Arm', shoulder, elbow, 'Chest'), (label+'Forearm', elbow, wrist, label+'Arm'),
                      (label+'Hand', wrist, (side*.30, .07, .76), label+'Forearm')])
        limbs[label] = (hip, knee, ankle, shoulder, elbow, wrist)
    parts = []
    def attach(obj, bone):
        parts.append(skin(obj, bone))
        return obj
    torso = organic([ellipsoid('Shoulder line', (0, 0, 1.36), (.258, .137, .105), shirt, 28, 18),
                     ellipsoid('Chest', (0, .003, 1.25), (.228, .139, .23), shirt, 28, 18),
                     ellipsoid('Waist', (0, 0, 1.04), (.171, .115, .13), shirt, 28, 18)], 'Tailored overshirt', .012)
    blend_skin(torso, lambda p: {'Chest': smoothstep(.98, 1.16, p.z), 'Pelvis': 1-smoothstep(.98, 1.16, p.z)})
    parts.append(torso)
    trouser_parts = [ellipsoid('Trouser seat', (0, -.012, .91), (.184, .127, .144), pants, 28, 18)]
    attach(ellipsoid('Neck', (0, 0, 1.49), (.073, .074, .127), skinmat, 24, 16), 'Chest')
    head = organic([ellipsoid('Cranium', (0, -.014, 1.686), (.122, .115, .159), skinmat, 32, 24),
                    ellipsoid('Jaw', (0, .03, 1.596), (.091, .079, .065), skinmat, 28, 18),
                    ellipsoid('Cheeks', (0, .065, 1.653), (.103, .058, .067), skinmat, 28, 18),
                    ellipsoid('Nose bridge', (0, .108, 1.676), (.019, .035, .042), skinmat, 24, 16),
                    ellipsoid('Nose tip', (0, .137, 1.652), (.024, .025, .019), skinmat, 24, 16)], 'Face and jaw', .007)
    attach(head, 'Head')
    for side in [-1, 1]:
        attach(ellipsoid('Ear', (side*.123, -.007, 1.668), (.024, .025, .039), skinmat, 24, 16), 'Head')
        attach(ellipsoid('Eye', (side*.049, .105, 1.694), (.020, .013, .009), white, 24, 16), 'Head')
        attach(ellipsoid('Iris', (side*.049, .117, 1.693), (.009, .004, .009), eyes, 20, 12), 'Head')
        attach(ellipsoid('Eyebrow', (side*.049, .113, 1.716), (.028, .007, .005), hair, 20, 12), 'Head')
    attach(ellipsoid('Mouth', (0, .121, 1.613), (.029, .005, .003), leather, 24, 12), 'Head')
    # A shaped hairline instead of a hemisphere cap.
    hair_parts = [ellipsoid('Back hair', (0, -.063, 1.738), (.123, .083, .105), hair, 28, 18),
                  ellipsoid('Crown', (0, -.015, 1.811), (.119, .105, .048), hair, 28, 18)]
    for i in range(6):
        lock = ellipsoid('Swept lock', (-.09+i*.034, .013, 1.80-abs(i-2)*.007), (.034, .105, .039), hair, 24, 16)
        lock.rotation_euler.y = -.25
        hair_parts.append(lock)
    for side in [-1, 1]:
        hair_parts.append(ellipsoid('Side hair', (side*.105, -.018, 1.743), (.024, .076, .06), hair, 24, 16))
    attach(organic(hair_parts, 'Swept short hair', .007), 'Head')
    # Collar, placket and pockets read at the follow camera distance.
    for side in [-1, 1]:
        flap = cube('Collar', (side*.057, .085, 1.43), (.078, .028, .095), seam, .012)
        flap.rotation_euler.y = side*.4
        attach(flap, 'Chest')
        attach(cube('Chest pocket', (side*.105, .133, 1.276), (.082, .016, .10), seam, .01), 'Chest')
    attach(cube('Shirt placket', (0, .142, 1.225), (.027, .016, .29), seam, .005), 'Chest')
    for z in [1.12, 1.22, 1.32]:
        attach(ellipsoid('Shirt button', (0, .154, z), (.006, .004, .006), brass, 12, 8), 'Chest')
    for label, (hip, knee, ankle, shoulder, elbow, wrist) in limbs.items():
        side = -1 if label == 'L' else 1
        trouser_parts.extend([segment('Thigh', hip, knee, .099, pants, .069, 24), ellipsoid('Knee', knee, (.071, .076, .08), pants, 24, 16),
                              segment('Calf', knee, ankle, .069, pants, .05, 24)])
        boot = organic([ellipsoid('Boot toe', (side*.12, .078, .072), (.073, .145, .065), leather, 28, 18),
                        ellipsoid('Boot ankle', (side*.12, -.018, .139), (.068, .084, .112), leather, 24, 16)], label+' rounded leather boot', .009)
        attach(boot, label+'Foot')
        attach(cube('Boot sole', (side*.12, .06, .02), (.15, .27, .035), sole, .025), label+'Foot')
        sleeve = organic([ellipsoid('Shoulder fabric', shoulder, (.082, .091, .08), shirt, 24, 16),
                          segment('Sleeve', shoulder, elbow, .078, shirt, .064, 24)], label+' shirt sleeve', .01)
        attach(sleeve, label+'Arm')
        attach(ellipsoid('Rolled cuff', elbow, (.074, .075, .04), seam, 24, 16), label+'Arm')
        forearm = organic([ellipsoid('Elbow', elbow, (.055, .055, .058), skinmat, 24, 16), segment('Forearm', elbow, wrist, .057, skinmat, .035, 24)], label+' forearm', .009)
        attach(forearm, label+'Forearm')
        hand = organic([ellipsoid('Palm', (wrist[0], wrist[1], .827), (.04, .027, .069), skinmat, 24, 16),
                        ellipsoid('Thumb', (wrist[0]-side*.036, wrist[1]+.017, .835), (.018, .023, .041), skinmat, 20, 12)], label+' hand', .007)
        attach(hand, label+'Hand')
    trousers = organic(trouser_parts, 'Continuous tailored trousers', .01)
    def trouser_weights(p):
        label = 'L' if p.x < 0 else 'R'
        pelvis = smoothstep(.76, .98, p.z)
        thigh = smoothstep(.38, .58, p.z)
        return {'Pelvis': pelvis, label+'Thigh': (1-pelvis)*thigh, label+'Shin': (1-pelvis)*(1-thigh)}
    blend_skin(trousers, trouser_weights)
    parts.append(trousers)
    rig = rig_from(bones, 'Homecoming keeper rig')
    mesh = bind(parts, rig, 'Homecoming keeper')
    def pose(b, clip, t):
        b['Chest'].rotation_euler.y = math.sin(t)*.009
        b['Head'].rotation_euler.y = math.sin(t*.5)*.02
        if clip in ['Walk', 'Run']:
            for label, shift in [('L', 0), ('R', math.pi)]:
                phase = t+shift
                stride = math.sin(phase)
                b[label+'Thigh'].rotation_euler.x = stride*(.39 if clip == 'Walk' else .58)
                b[label+'Shin'].rotation_euler.x = -max(0, -stride)*.65
                b[label+'Foot'].rotation_euler.x = max(0, stride)*.12
                b[label+'Arm'].rotation_euler.x = -stride*.27
                b[label+'Forearm'].rotation_euler.x = -.16-max(0, stride)*.12
            b['Pelvis'].location.z = abs(math.sin(t))*.019
            b['Chest'].rotation_euler.z = math.sin(t)*.025
        else:
            b['Chest'].scale.x = 1+math.sin(t)*.004
            for label in ['L', 'R']:
                b[label+'Forearm'].rotation_euler.x = -.12
    animate(rig, [('Idle', 120), ('Walk', 36), ('Run', 28)], pose)
    export(rig, mesh, 'homecoming_keeper')


make_dog(False)
make_dog(True)
make_keeper()
print('Homecoming character source and GLBs exported.')
