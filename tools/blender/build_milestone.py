"""Reproducible original game assets. Blender 5: --background --python this_file.
Coordinates: Blender +Y is dog-forward; GLB export turns that into -Z.
No external textures, downloaded assets, or add-ons are required.
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'models'
SOURCE = ROOT / 'art' / 'blender'
bpy.context.preferences.filepaths.save_version = 0
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

def material(name, color, roughness=.8, metal=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = roughness
    node.inputs['Metallic'].default_value = metal
    return mat

def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def ellipsoid(name, position, scale, mat, segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=position)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for face in obj.data.polygons:
        face.use_smooth = True
    return finish(obj, name, mat)

def cube(name, pos, scale, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Soft crafted edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return finish(obj, name, mat)

def segment(name, start, end, radius, mat, end_radius=None, vertices=12):
    delta = Vector(end) - Vector(start)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=end_radius if end_radius is not None else radius,
                                  depth=delta.length, location=(Vector(start)+Vector(end))/2)
    obj = bpy.context.object
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for face in obj.data.polygons:
        face.use_smooth = True
    return finish(obj, name, mat)

def join(objects, name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = name
    return bpy.context.object

def create_dog(style):
    clear()
    stocky = style == 'stocky'
    coat = material('Coat', (.37, .19, .085) if stocky else (.13, .17, .20))
    cream = material('Markings', (.86, .79, .65))
    dark = material('NoseAndMouth', (.018, .023, .029), .42)
    eye = material('AmberEyes', (.44, .24, .055), .23)
    glint = material('EyeGlints', (.96, .98, 1), .12)
    collar = material('Collar', (.07, .15, .24), .7)
    tag = material('BrassTag', (.59, .37, .12), .3, .5)
    body_height = .73 if stocky else .82
    head_height = 1.03 if stocky else 1.14
    width = .255 if stocky else .20
    # Smooth the silhouette into a continuous torso, shoulders, neck and skull.
    core = [ellipsoid('Ribcage', (0, 0, body_height), (width, .49, .265), coat),
            ellipsoid('Hips', (0, -.36, body_height-.025), (width*.91, .26, .23), coat),
            ellipsoid('Chest', (0, .32, body_height-.025), (width*1.05, .24, .31), coat),
            ellipsoid('Neck', (0, .43, body_height+.16), (width*.8, .24, .28), coat),
            ellipsoid('Skull', (0, .56, head_height), (.235 if stocky else .18, .24, .205), coat),
            ellipsoid('Muzzle', (0, .765 if stocky else .82, head_height-.07), (.175 if stocky else .135, .17 if stocky else .235, .125), coat)]
    body = join(core, 'Continuous_body')
    remesh = body.modifiers.new('Joined organic silhouette', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = .038
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = body.modifiers.new('Relax surface', 'SMOOTH')
    smooth.factor = 1.2
    smooth.iterations = 4
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    decimate = body.modifiers.new('Browser mesh budget', 'DECIMATE')
    decimate.ratio = .5
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    for face in body.data.polygons:
        face.use_smooth = True

    bpy.ops.object.armature_add(location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = 'CompanionRig'
    bpy.ops.object.mode_set(mode='EDIT')
    rig.data.edit_bones.remove(rig.data.edit_bones[0])
    def bone(name, head, tail, parent=None):
        item = rig.data.edit_bones.new(name)
        item.head, item.tail = head, tail
        if parent:
            item.parent = rig.data.edit_bones[parent]
        return item
    bone('Root', (0, 0, .1), (0, 0, .3))
    bone('Spine', (0, -.25, body_height), (0, .3, body_height), 'Root')
    bone('Head', (0, .36, body_height+.13), (0, .67, head_height), 'Spine')
    bone('Tail', (0, -.54, body_height+.02), (0, -.94, body_height+.22), 'Spine')
    leg_positions = {}
    for label, x, y in [('FL', -width*.75, .31), ('FR', width*.75, .31), ('BL', -width*.8, -.35), ('BR', width*.8, -.35)]:
        hip = (x, y, body_height-.04)
        knee = (x, y + (-.07 if label[0]=='F' else .10), .35)
        ankle = (x, y, .09)
        bone(label, hip, knee, 'Spine')
        bone(label+'_shin', knee, ankle, label)
        leg_positions[label] = (hip, knee, ankle)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts = [body]
    def skin(obj, bone_name):
        obj.vertex_groups.new(name=bone_name).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
        parts.append(obj)
        return obj
    torso_group = body.vertex_groups.new(name='Spine')
    head_group = body.vertex_groups.new(name='Head')
    for vertex in body.data.vertices:
        world = body.matrix_world @ vertex.co
        head_weight = max(0, min(1, (world.z-body_height-.04)/.2)) * max(0, min(1, (world.y-.23)/.22))
        torso_group.add([vertex.index], 1-head_weight, 'REPLACE')
        head_group.add([vertex.index], head_weight, 'REPLACE')
    for label, (hip, knee, ankle) in leg_positions.items():
        skin(ellipsoid(label+'_shoulder', hip, (.115 if stocky else .085, .13, .20), coat), label)
        skin(segment(label+'_upper', hip, knee, .09 if stocky else .065, coat, .064), label)
        skin(ellipsoid(label+'_joint', knee, (.067, .077, .082), coat), label+'_shin')
        skin(segment(label+'_lower', knee, ankle, .060, coat, .044), label+'_shin')
        skin(ellipsoid(label+'_paw', (ankle[0], ankle[1]+.055, .064), (.08, .125, .065), cream if stocky else coat), label+'_shin')
    # Layered facial forms: brows, defined nose, jowls and inset amber eyes.
    muzzle_front = .91 if stocky else 1.02
    skin(ellipsoid('Nose', (0, muzzle_front, head_height-.045), (.092 if stocky else .075, .054, .055), dark), 'Head')
    skin(ellipsoid('Lower_jaw', (0, .79 if stocky else .87, head_height-.148), (.12, .16, .045), cream if stocky else coat), 'Head')
    skin(segment('Mouth_line', (-.10, .84, head_height-.13), (.10, .84, head_height-.13), .009, dark, vertices=8), 'Head')
    for side in [-1, 1]:
        eye_x = side*(.171 if stocky else .143)
        skin(ellipsoid('Eye_socket', (eye_x, .704, head_height+.025), (.060, .05, .054), dark), 'Head')
        skin(ellipsoid('Iris', (eye_x, .746, head_height+.029), (.027, .014, .032), eye), 'Head')
        skin(ellipsoid('Pupil', (eye_x, .758, head_height+.03), (.013, .008, .022), dark, 12, 8), 'Head')
        skin(ellipsoid('Catchlight', (eye_x-.007, .765, head_height+.042), (.008, .006, .008), glint, 8, 6), 'Head')
        skin(ellipsoid('Brow', (eye_x, .685, head_height+.092), (.075, .08, .040), coat), 'Head')
        ear = ellipsoid('Folded_ear', (side*(.23 if stocky else .19), .47, head_height+.055), (.080, .105, .145 if stocky else .19), coat)
        ear.rotation_euler.y = side*.38
        skin(ear, 'Head')
    if stocky:
        skin(ellipsoid('Chest_bib', (0, .519, body_height-.07), (.125, .045, .22), cream), 'Spine')
        skin(ellipsoid('Muzzle_blaze', (0, .77, head_height+.02), (.039, .145, .036), cream), 'Head')
    skin(segment('Tail_base', (0,-.5,body_height+.04), (0,-.83,body_height+.19), .059, coat, .032), 'Tail')
    skin(segment('Tail_tip', (0,-.81,body_height+.18), (0,-1.03,body_height+.39), .035, cream if stocky else coat, .012), 'Tail')
    bpy.ops.mesh.primitive_torus_add(major_radius=width*.82, minor_radius=.029, major_segments=24, minor_segments=8, location=(0,.415,body_height+.15), rotation=(math.pi/2-.4,0,0))
    skin(finish(bpy.context.object, 'Woven_collar', collar), 'Head')
    skin(ellipsoid('Name_tag', (0,.605,body_height-.02), (.037,.012,.045), tag, 12, 8), 'Head')
    mesh = join(parts, style.title()+'_companion')
    mesh.parent = rig
    modifier = mesh.modifiers.new('Companion skeleton', 'ARMATURE')
    modifier.object = rig
    rig.animation_data_create()
    bpy.context.scene.render.fps = 24
    for clip in ['Idle', 'Walk', 'Run', 'Eat', 'Sit']:
        action = bpy.data.actions.new(clip)
        rig.animation_data.action = action
        duration = 48 if clip in ['Idle','Eat','Sit'] else 24
        for frame in range(1, duration+2, 3):
            t = (frame-1)/duration * math.tau
            for pose in rig.pose.bones:
                pose.rotation_mode='XYZ'
                pose.rotation_euler=(0,0,0)
                pose.location=(0,0,0)
            rig.pose.bones['Tail'].rotation_euler.y = math.sin(t*2)*.20
            rig.pose.bones['Head'].rotation_euler.y = math.sin(t)*.035
            rig.pose.bones['Spine'].location.z = math.sin(t)*.008
            if clip in ['Walk','Run']:
                amplitude = .33 if clip=='Walk' else .57
                for label in leg_positions:
                    phase = t + (math.pi if label in ['FR','BL'] else 0)
                    rig.pose.bones[label].rotation_euler.x = math.sin(phase)*amplitude
                    rig.pose.bones[label+'_shin'].rotation_euler.x = max(0,-math.sin(phase))*.40
                rig.pose.bones['Spine'].location.z = abs(math.sin(t))*(.012 if clip=='Walk' else .035)
            elif clip=='Eat':
                rig.pose.bones['Head'].rotation_euler.x = -.8 + math.sin(t*3)*.06
            elif clip=='Sit':
                rig.pose.bones['Spine'].rotation_euler.x = .18
                rig.pose.bones['Spine'].location.z = -.11
                for label in ['BL','BR']:
                    rig.pose.bones[label].rotation_euler.x = -.9
                    rig.pose.bones[label+'_shin'].rotation_euler.x = 1.05
            for pose in rig.pose.bones:
                pose.keyframe_insert('rotation_euler', frame=frame, group=pose.name)
                pose.keyframe_insert('location', frame=frame, group=pose.name)
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        track.strips.new(clip, 1, action)
        track.mute = True
        rig.animation_data.action = None
    for pose in rig.pose.bones:
        pose.rotation_euler=(0,0,0)
        pose.location=(0,0,0)
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / (style+'_dog.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT / (style+'_dog.glb')), export_format='GLB', export_animation_mode='ACTIONS', export_anim_single_armature=True, export_force_sampling=True)
    print('DOG_ASSET', style, 'vertices', len(mesh.data.vertices), 'triangles', sum(len(p.vertices)-2 for p in mesh.data.polygons))

def create_yard():
    clear()
    rng = random.Random(24)
    mats = {name: material(name,color) for name,color in {
        'Grass':(.30,.38,.23), 'Meadow':(.42,.48,.31), 'Path':(.66,.55,.39), 'Wood':(.37,.24,.13),
        'Fence':(.64,.53,.38), 'Trim':(.86,.79,.62), 'Siding':(.14,.21,.28), 'Roof':(.30,.22,.17),
        'Glass':(.17,.31,.37), 'Leaf':(.24,.34,.20), 'LeafLight':(.38,.45,.24), 'Stone':(.43,.44,.40),
        'Brass':(.65,.42,.18), 'Ceramic':(.23,.35,.44), 'Water':(.21,.48,.57), 'Flowers':(.73,.49,.29),
    }.items()}
    def block(name,x,y,z,sx,sy,sz,mat,bevel=0):
        return cube(name,(x,-z,y),(sx,sz,sy),mats[mat],bevel)
    block('Yard_meadow',0,-.13,0,50,.22,50,'Grass')
    block('Playable_lawn',0,-.02,0,23,.08,23,'Meadow',.03)
    block('Entry_path',0,.024,5,2.4,.06,12,'Path',.1)
    block('Care_path',2.5,.026,-3,8,.055,2.2,'Path',.1)
    block('Gate_path',6,.025,-7,2,.055,8,'Path',.1)
    # Small cedar kennel cottage, porch, shingled pitched roof, windows.
    block('Cottage',-5.6,1.55,-6.1,6.2,3.1,4.8,'Siding',.07)
    block('Foundation',-5.6,.18,-6.1,6.5,.36,5.1,'Stone',.04)
    for x in [-8.55,-2.65]:
        block('Corner_trim',x,1.65,-3.67,.16,3.1,.14,'Trim',.01)
    for y in [i*.29+.4 for i in range(10)]:
        block('Cladding_seam',-5.6,y,-3.68,5.8,.022,.015,'Wood')
    for x in [-7.15,-4.15]:
        block('Window_frame',x,1.9,-3.64,1.28,1.28,.16,'Trim',.02)
        block('Window_glass',x,1.9,-3.54,1.10,1.08,.04,'Glass')
        block('Window_mullion',x,1.9,-3.49,.05,1.1,.04,'Trim')
        block('Window_mullion',x,1.9,-3.49,1.10,.05,.04,'Trim')
    block('Door',-5.65,1.15,-3.48,1.0,2.0,.12,'Wood',.02)
    block('Door_handle',-5.3,1.1,-3.38,.07,.18,.06,'Brass',.02)
    block('Porch',-5.6,.14,-2.95,6.6,.28,1.8,'Fence',.035)
    for x in [-8.35,-2.85]:
        block('Porch_post',x,1.4,-2.4,.14,2.8,.14,'Trim',.015)
    for z,angle in [(-4.72,.49),(-7.48,-.49)]:
        roof = block('Roof_slope',-5.6,3.36,z,7,.17,3.3,'Roof',.02)
        roof.rotation_euler.x = angle
        for i in range(15):
            slat = block('Roof_seam',-8.9+i*.47,3.45,z,.035,.04,3.3,'Wood')
            slat.rotation_euler.x = angle
    # Fence posts and rails; entry and agility opening remain traversable.
    for x in range(-11,12,2):
        for z in [-11,11]:
            if z==-11 and 4<=x<=8 or z==11 and -2<=x<=2: continue
            block('Fence_post',x,.66,z,.15,1.32,.15,'Wood',.025)
    for z in range(-11,12,2):
        for x in [-11,11]: block('Fence_post',x,.66,z,.15,1.32,.15,'Wood',.025)
    for y in [.45,1.0]:
        for x in [-11,11]: block('Side_rail',x,y,0,.08,.12,22,'Fence',.015)
        for x,width,z in [(-4,14,-11),(9.6,2.8,-11),(-6.5,9,11),(6.5,9,11)]: block('End_rail',x,y,z,width,.12,.08,'Fence',.015)
    for x in [4.5,7.5]: block('Agility_gate_post',x,1.3,-10.8,.22,2.6,.22,'Trim',.035)
    block('Agility_gate_sign',6,2.45,-10.8,3.3,.42,.18,'Siding',.03)
    # Bowl stands: ground-level interaction is shared with runtime markers.
    for x,mat in [(3,'Water'),(5,'Wood')]:
        block('Bowl_pad',x,.06,-3,1.3,.12,1.1,'Stone',.1)
        bpy.ops.mesh.primitive_torus_add(major_radius=.34,minor_radius=.065,major_segments=24,minor_segments=8,location=(x,3,.22))
        finish(bpy.context.object,'Bowl_rim',mats['Ceramic'])
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.30,depth=.045,location=(x,3,.19))
        finish(bpy.context.object,'Bowl_contents',mats[mat])
    block('Feed_bin',7,.55,-3,1,.95,.8,'Siding',.08)
    block('Feed_bin_lid',7,1.06,-3,1.1,.1,.9,'Trim',.04)
    # Bench and rest mat.
    block('Bench_seat',-5,.56,2,2.3,.15,.65,'Wood',.04)
    block('Bench_back',-5,1,2.27,2.3,.8,.12,'Fence',.02)
    for x in [-5.85,-4.15]: block('Bench_leg',x,.25,2,.12,.5,.5,'Siding',.02)
    block('Rest_mat',-4,.05,.5,1.6,.1,1.1,'Ceramic',.09)
    # Simple practice hurdle visible from the yard.
    for x in [6.4,9.2]: block('Practice_wing',x,.5,3.3,.25,1,.6,'Trim',.035)
    block('Practice_bar',7.8,.55,3.3,2.8,.10,.10,'Flowers',.03)
    for i in range(22):
        angle = i/22*math.tau
        x,z = math.cos(angle)*(15+rng.random()*6), math.sin(angle)*(15+rng.random()*6)
        height = 2.7+rng.random()*2
        segment('Tree_trunk',(x,-z,0),(x,-z,height),.15,mats['Wood'],.08,8)
        for j in range(3):
            ellipsoid('Tree_canopy',(x+rng.uniform(-.65,.65),-z+rng.uniform(-.65,.65),height+j*.45),(1.35,1.25,1.35),mats['Leaf' if j%2 else 'LeafLight'],10,7)
    for i in range(25):
        x,z = rng.choice([-9.8,9.8]), rng.uniform(-9,9)
        ellipsoid('Border_plant',(x+rng.uniform(-.3,.3),-z,.22),(.3,.3,.35),mats['LeafLight'],8,6)
        if i%3==0: ellipsoid('Flower_cluster',(x,-z,.48),(.15,.15,.12),mats['Flowers'],8,6)
    # Join by material to keep the environment to a small number of draw calls.
    for mat in mats.values():
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
        if objects: join(objects,mat.name+'_environment')
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'kennel_yard.blend'))
    bpy.ops.export_scene.gltf(filepath=str(OUT / 'kennel_yard.glb'), export_format='GLB', export_animations=False, export_apply=True)

if __name__ == '__main__':
    for body_style in ['athletic','stocky']:
        create_dog(body_style)
    create_yard()
    print('Milestone assets written to', OUT)
