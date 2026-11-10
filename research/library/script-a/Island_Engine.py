# -*- coding: utf-8 -*-
"""Embedded by Launch_Cafe_Island.py. Dimensions in mm; axes in document units.
Two straight, intersecting axes define one rounded parallelogram island.
No equipment is generated. Geometry is local; Preview is world positioned.
"""
import math
import System
import Rhino
import Rhino.Geometry as rg
import Grasshopper.Kernel as ghk

Geometry = None
Preview, Plan = [], []
Anchor = None
Report = ''

def single(x):
    if hasattr(x, 'Branches'):
        x = [a for b in x.Branches for a in b]
    if isinstance(x, (list, tuple)):
        if len(x) != 1:
            raise ValueError('Each axis input must contain exactly one curve.')
        x = x[0]
    for unused in range(4):
        if hasattr(x, 'Value'):
            x = x.Value
        else:
            break
    if isinstance(x, rg.Line):
        return rg.LineCurve(x)
    if isinstance(x, rg.Curve):
        return x
    if isinstance(x, (System.Guid, str)):
        obj = Rhino.RhinoDoc.ActiveDoc.Objects.FindId(System.Guid(str(x)))
        if obj and isinstance(obj.Geometry, rg.Curve):
            return obj.Geometry
    raise ValueError('Reference one straight Rhino curve in each axis parameter.')

def number(name, default):
    x = globals().get(name)
    x = default if x is None else single_value(x)
    x = float(x)
    if math.isnan(x) or math.isinf(x):
        raise ValueError(name + ' must be finite.')
    return x

def single_value(x):
    while hasattr(x, 'Value'):
        x = x.Value
    return x

def cross(a, b):
    return a.X*b.Y-a.Y*b.X

def meet(a, u, b, v):
    d = cross(u, v)
    if abs(d) < 1e-9:
        raise ValueError('Axes/edges are parallel.')
    w = b-a
    return a + u*(cross(w, v)/d)

def inset(poly, distance):
    # Positive inset uses the left side of each CCW edge.
    starts, directions = [], []
    for i in range(4):
        v = poly[(i+1)%4]-poly[i]
        v.Unitize()
        starts.append(poly[i]+rg.Vector3d(-v.Y,v.X,0)*distance)
        directions.append(v)
    return [meet(starts[(i-1)%4], directions[(i-1)%4],
                 starts[i], directions[i]) for i in range(4)]

def rounded(poly, radius):
    c = rg.PolylineCurve(poly+[poly[0]])
    if radius > tol:
        # Bound tangent lengths so no adjacent fillets overlap.
        trims = []
        for i in range(4):
            a = poly[(i-1)%4]-poly[i]
            b = poly[(i+1)%4]-poly[i]
            angle = rg.Vector3d.VectorAngle(a,b)
            trims.append(radius/math.tan(angle/2.0))
        for i in range(4):
            if trims[i]+trims[(i+1)%4] >= poly[i].DistanceTo(poly[(i+1)%4])-tol*10:
                raise ValueError('Corner radius is too large for this footprint. Reduce CornerRadius.')
        c = rg.Curve.CreateFilletCornersCurve(c,radius,tol,doc.ModelAngleToleranceRadians)
    if c is None or not c.IsClosed or not c.IsValid:
        raise ValueError('Could not make the rounded perimeter.')
    return c

def extrude(c, z, height):
    c = c.DuplicateCurve()
    c.Translate(0,0,z)
    e = rg.Extrusion.Create(c,height,True)
    if e is None:
        raise ValueError('Could not extrude a perimeter.')
    b = e.ToBrep()
    if not b.IsValid or not b.IsSolid:
        raise ValueError('Extrusion did not form a closed solid.')
    return b

def subtract(a, b, label):
    result = rg.Brep.CreateBooleanDifference(a,b,tol)
    if result is None or len(result)!=1 or not result[0].IsValid or not result[0].IsSolid:
        raise ValueError(label + ': solid operation failed. Check dimensions and document tolerance.')
    return result[0]

try:
    doc = Rhino.RhinoDoc.ActiveDoc
    tol = doc.ModelAbsoluteTolerance
    unit = Rhino.RhinoMath.UnitScale(Rhino.UnitSystem.Millimeters,doc.ModelUnitSystem)
    if tol > 2*unit:
        raise ValueError('Document tolerance exceeds 2 mm. Set a finer Rhino absolute tolerance.')
    def mm(name,default):
        return number(name,default)*unit
    a,b = single(Axis1),single(Axis2)
    for c in (a,b):
        if c.IsClosed or not c.IsLinear(tol) or c.GetLength() < 100*unit:
            raise ValueError('Use two straight, open axes, each longer than 100 mm.')
        if abs(c.PointAtStart.Z-c.PointAtEnd.Z)>tol:
            raise ValueError('Axes must be horizontal.')
    if abs(a.PointAtStart.Z-b.PointAtStart.Z)>tol:
        raise ValueError('Both axes must be at the same elevation.')
    aa,ab,ba,bb = a.PointAtStart,a.PointAtEnd,b.PointAtStart,b.PointAtEnd
    u,v = ab-aa,bb-ba
    u.Unitize(); v.Unitize()
    if abs(cross(u,v)) < 0.5:
        raise ValueError('The angle between axes must be between 30 and 150 degrees.')
    origin = meet(aa,u,ba,v)
    for p,q in ((aa,ab),(ba,bb)):
        if origin.DistanceTo(p)+origin.DistanceTo(q)>p.DistanceTo(q)+tol*2:
            raise ValueError('The two axis segments must intersect inside their lengths.')
        if min(origin.DistanceTo(p),origin.DistanceTo(q))<tol*10:
            raise ValueError('The intersection must be inside both axes, away from the ends.')
    s1,s2 = number('Scale1',1),number('Scale2',1)
    if min(s1,s2)<=0:
        raise ValueError('Axis scales must be positive.')
    step = mm('ModuleStep',0)
    if step<0:
        raise ValueError('ModuleStep cannot be negative.')
    if step>tol:
        s1 = max(step,math.floor(a.GetLength()*s1/step+0.5)*step)/a.GetLength()
        s2 = max(step,math.floor(b.GetLength()*s2/step+0.5)*step)/b.GetLength()
    av = [(aa-origin)*s1,(ab-origin)*s1]
    bv = [(ba-origin)*s2,(bb-origin)*s2]
    p = [rg.Point3d.Origin+av[0]+bv[0],rg.Point3d.Origin+av[1]+bv[0],
         rg.Point3d.Origin+av[1]+bv[1],rg.Point3d.Origin+av[0]+bv[1]]
    if cross(p[1]-p[0],p[2]-p[1])<0:
        p.reverse()
    depth,height,thick = mm('Depth',650),mm('Height',950),mm('TopThickness',40)
    over,ph,pi = mm('Overhang',30),mm('PlinthHeight',100),mm('PlinthInset',60)
    radius,entry,clear = mm('CornerRadius',450),mm('EntranceWidth',900),mm('MinWorkspace',900)
    if min(depth,height,thick,ph,entry,clear)<=tol*10 or min(over,pi,radius)<0:
        raise ValueError('Dimensions must be positive; overhang, inset and radius may be zero.')
    if height<=ph+thick+tol*10 or 2*pi>=depth-tol*10:
        raise ValueError('Height is too low or plinth inset too large.')
    # Perpendicular width between opposite sides, including skew axes.
    widths = [abs(cross(p[1]-p[0],p[3]-p[0]))/p[1].DistanceTo(p[0]),
              abs(cross(p[2]-p[1],p[0]-p[1]))/p[2].DistanceTo(p[1])]
    if min(widths)-2*(depth+over)<clear:
        raise ValueError('Workspace below MinWorkspace. Increase axis scale or reduce depth/overhang.')
    side = int(number('EntranceSide',0))
    shift = number('EntranceShift',0)
    if side not in range(4) or abs(shift)>1:
        raise ValueError('EntranceSide: 0 to 3. EntranceShift: -1 to 1.')
    edge = p[(side+1)%4]-p[side]
    length = edge.Length
    edge.Unitize()
    normal = rg.Vector3d(-edge.Y,edge.X,0)
    # Keep the entry entirely on the straight portion, beyond the rounded corners.
    def corner_trim(i):
        angle = rg.Vector3d.VectorAngle(p[(i-1)%4]-p[i],p[(i+1)%4]-p[i])
        return (radius+over)/math.tan(angle/2.0)
    margin = max(corner_trim(side),corner_trim((side+1)%4),depth+over)+100*unit
    available = length-2*margin-entry
    if available<0:
        raise ValueError('Entrance does not fit this side. Choose another side, enlarge axes or reduce radius/entry.')
    center = p[side]+edge*(length/2.0+shift*available/2.0)
    reach = max(widths)+depth+over+100*unit
    # Cut from outside to the middle of the workspace, never across its far counter.
    outer = center-normal*(depth+over+100*unit)
    inner = center+normal*(depth+over+clear/2.0)
    cutpts = [outer-edge*(entry/2.0),outer+edge*(entry/2.0),
              inner+edge*(entry/2.0),inner-edge*(entry/2.0)]
    cut = extrude(rg.PolylineCurve(cutpts+[cutpts[0]]),-100*unit,height+200*unit)
    def layer(outset,innerdepth,r,z,h,label):
        outside = rounded(inset(p,outset),max(0,r-outset))
        inside = rounded(inset(p,innerdepth),max(0,r-innerdepth))
        ring = subtract(extrude(outside,z,h),extrude(inside,z-10*unit,h+20*unit),label+' workspace')
        return subtract(ring,cut,label+' entrance')
    body = layer(0,depth,radius,ph,height-ph-thick,'Body')
    top = layer(-over,depth+over,radius,height-thick,thick,'Top')
    plinth = layer(pi,depth-pi,radius,0,ph,'Plinth')
    combined = rg.Brep()
    for part in (body,top,plinth):
        combined.Append(part)
    if not combined.IsValid or not combined.IsSolid:
        raise ValueError('Combined object failed closed-solid validation.')
    Anchor = rg.Point3d(origin.X,origin.Y,origin.Z+mm('BaseOffset',0))
    move = rg.Transform.Translation(Anchor.X,Anchor.Y,Anchor.Z)
    for part in (body,top,plinth):
        world = part.DuplicateBrep(); world.Transform(move); Preview.append(world)
    for e in top.Edges:
        box = e.GetBoundingBox(True)
        if abs(box.Min.Z-height)<tol*2 and abs(box.Max.Z-height)<tol*2:
            curve = e.DuplicateCurve()
            curve.Translate(Anchor.X,Anchor.Y,Anchor.Z-height)
            Plan.append(curve)
    Geometry = combined
    Report = ('OK: one island; body, top and plinth are closed solids.\n'
              'Axis spans: %.0f x %.0f mm; minimum clear workspace: %.0f mm.\n'
              'Geometry is LOCAL. Preview/Plan are WORLD. Anchor is placement point.\n'
              'Entrance side %d follows the CCW perimeter; reverse axes to change indexing.\n'
              'No equipment. Controls remain in Grasshopper.') % (
                  a.GetLength()*s1/unit,b.GetLength()*s2/unit,
                  (min(widths)-2*(depth+over))/unit,side)
except Exception as error:
    Geometry,Anchor = None,None
    Preview,Plan = [],[]
    Report = str(error)
    ghenv.Component.AddRuntimeMessage(ghk.GH_RuntimeMessageLevel.Error,Report)
