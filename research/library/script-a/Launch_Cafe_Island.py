# -*- coding: utf-8 -*-
"""Run this file with Rhino RunPythonScript. Keep Island_Engine.py beside it.
Creates a NEW unsaved Grasshopper document; does not modify existing geometry.
Uses the legacy GhPython component shipped with Rhino 7/8 Grasshopper.
"""
import os
import io
import System
import Rhino
import rhinoscriptsyntax as rs

def main():
    source = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Island_Engine.py')
    if not os.path.isfile(source):
        rs.MessageBox('Extract the ZIP first. Island_Engine.py must be beside this launcher.',0,'Cafe island')
        return
    first = rs.GetObject('Select LENGTH axis (Enter uses a 4000 x 3000 mm example)',rs.filter.curve,preselect=False)
    second = None
    if first:
        second = rs.GetObject('Select WIDTH axis, crossing the first',rs.filter.curve,preselect=False)
        if not second:
            return
        if first==second:
            rs.MessageBox('Select two different axes.',0,'Cafe island')
            return
    Rhino.RhinoApp.RunScript('_Grasshopper',False)
    import clr
    clr.AddReference('Grasshopper')
    import Grasshopper as gh
    from Grasshopper.Kernel import GH_Document, GH_ParameterSide, GH_ParamAccess
    from Grasshopper.Kernel.Parameters import Param_Curve, Param_Brep, Param_Point
    from Grasshopper.Kernel.Special import GH_NumberSlider, GH_Panel
    from Grasshopper.GUI.Base import GH_SliderAccuracy
    from Grasshopper.Kernel.Types import GH_Curve
    from System.Drawing import PointF, SizeF
    proxy = gh.Instances.ComponentServer.EmitObjectProxy(System.Guid('410755b1-224a-4c1e-a407-bf32fb45ea7e'))
    if proxy is None:
        rs.MessageBox('The legacy GhPython component is unavailable. Enable/install GhPython and rerun. This launcher does not use the Python 3 component.',0,'Cafe island')
        return
    component = proxy.CreateInstance()
    component.CreateAttributes()
    component.Name = 'Cafe island from two axes'
    component.NickName = 'Cafe Island'
    component.Attributes.Pivot = PointF(600,330)
    component.Hidden = True
    # Preserve the built-in out output. All geometry previews use dedicated params.
    for param in list(component.Params.Input):
        component.Params.UnregisterInputParameter(param,True)
    for param in list(component.Params.Output)[1:]:
        component.Params.UnregisterOutputParameter(param,True)
    specs = [
        ('Scale1',1,0.25,3,2,'Length-axis scale'),
        ('Scale2',1,0.25,3,2,'Width-axis scale'),
        ('ModuleStep',0,0,600,0,'Axis length snapping in mm; 0 = continuous'),
        ('Depth',650,300,1000,0,'Counter body depth, mm'),
        ('Height',950,700,1200,0,'Finished top height, mm'),
        ('TopThickness',40,15,100,0,'Worktop thickness, mm'),
        ('Overhang',30,0,100,0,'Worktop overhang on both sides, mm'),
        ('CornerRadius',450,0,1200,0,'Outer body corner radius, mm'),
        ('EntranceWidth',900,500,1400,0,'Clear opening width, mm'),
        ('EntranceSide',0,0,3,0,'Side index around the perimeter'),
        ('EntranceShift',0,-1,1,2,'Move entrance along its side'),
        ('PlinthHeight',100,50,200,0,'Plinth height, mm'),
        ('PlinthInset',60,0,150,0,'Plinth setback on both sides, mm'),
        ('MinWorkspace',900,600,1600,0,'Minimum perpendicular workspace width, mm'),
        ('BaseOffset',0,-1000,1000,0,'Vertical offset from axes elevation, mm')]
    inputs = ['Axis1','Axis2']+[s[0] for s in specs]
    for i,name in enumerate(inputs):
        param = component.CreateParameter(GH_ParameterSide.Input,i)
        param.Name = param.NickName = name
        param.Description = name
        param.Access = GH_ParamAccess.item
        component.Params.RegisterInputParam(param)
    outputs = ['Geometry','Preview','Plan','Anchor','Report']
    for name in outputs:
        param = component.CreateParameter(GH_ParameterSide.Output,component.Params.Output.Count)
        param.Name = param.NickName = name
        component.Params.RegisterOutputParam(param)
    component.VariableParameterMaintenance()
    # GhPython's default is ghdoc Guid. Explicit Curve hints avoid temporary
    # document IDs and the Guid/DataTree failures of the earlier definition.
    for i,param in enumerate(component.Params.Input):
        if i<2:
            param.TypeHint = next(h for h in param.Hints if h.GetType().Name=='GH_CurveHint')
        else:
            param.TypeHint = param.Hints[0]
    component.Params.OnParametersChanged()
    with io.open(source,'r',encoding='utf-8') as stream:
        component.Code = stream.read()
    document = GH_Document()
    document.IsModified = True
    document.AddObject(component,False)
    unit = Rhino.RhinoMath.UnitScale(Rhino.UnitSystem.Millimeters,Rhino.RhinoDoc.ActiveDoc.ModelUnitSystem)
    for i,identifier in enumerate((first,second)):
        param = Param_Curve()
        param.Name = param.NickName = inputs[i]
        param.Description = 'Right-click > Set one Curve to replace the axis.'
        param.CreateAttributes(); param.Attributes.Pivot = PointF(110,70+i*55)
        if identifier:
            value = GH_Curve(identifier)
        else:
            import Rhino.Geometry as rg
            ends = ((-2000,0,2000,0),(0,-1500,0,1500))[i]
            value = GH_Curve(rg.LineCurve(rg.Point3d(ends[0]*unit,ends[1]*unit,0),rg.Point3d(ends[2]*unit,ends[3]*unit,0)))
        param.PersistentData.Append(value)
        document.AddObject(param,False)
        component.Params.Input[i].AddSource(param)
    for i,spec in enumerate(specs):
        name,value,low,high,places,description = spec
        slider = GH_NumberSlider()
        slider.CreateAttributes()
        slider.Name = slider.NickName = name
        slider.Description = description
        slider.Slider.Type = GH_SliderAccuracy.Integer if places==0 else GH_SliderAccuracy.Float
        slider.Slider.DecimalPlaces = places
        slider.Slider.Minimum = System.Decimal(low)
        slider.Slider.Maximum = System.Decimal(high)
        slider.SetSliderValue(System.Decimal(value))
        slider.Attributes.Pivot = PointF(110,210+i*38)
        document.AddObject(slider,False)
        component.Params.Input[i+2].AddSource(slider)
    for name,cls,y,hidden in [('Geometry',Param_Brep,190,True),('Preview',Param_Brep,260,False),('Plan',Param_Curve,330,True),('Anchor',Param_Point,400,True)]:
        param = cls()
        param.CreateAttributes()
        param.Name = param.NickName = name
        param.Attributes.Pivot = PointF(900,y)
        param.Hidden = hidden
        document.AddObject(param,False)
        param.AddSource(component.Params.Output[outputs.index(name)+1])
    panel = GH_Panel()
    panel.CreateAttributes(); panel.Attributes.Pivot = PointF(900,480)
    panel.Attributes.Bounds = System.Drawing.RectangleF(900,480,440,170)
    document.AddObject(panel,False)
    panel.AddSource(component.Params.Output[5])
    guide = GH_Panel()
    guide.CreateAttributes(); guide.Attributes.Pivot = PointF(1450,190)
    guide.Attributes.Bounds = System.Drawing.RectangleF(1450,190,450,360)
    guide.UserText = ('CAFE ISLAND\nAll dimension sliders are MILLIMETRES.\n'
        'Axis1 + Axis2 = one island footprint.\nReference straight, intersecting, horizontal axes.\n'
        'ModuleStep 0 = continuous length scaling.\n\n'
        'ARCHICAD: use your existing components.\nGeometry -> Object Settings Create: G\n'
        'Panel Cafe_Island -> ON\nSettings S -> Object S\nAnchor -> Object P\n'
        'Set Object Sy true only when ready to send.\nSet angle to 0; geometry already has orientation.\n\n'
        'Geometry is local to the axes intersection.\nPreview and Plan are in Rhino world coordinates.\n'
        'Plan is a reference output, not a custom GDL symbol.\n'
        'Read README for 2D projection and placement checks.\n\n'
        'Save this definition with Grasshopper Save As.\nEngine code is embedded in the component.')
    document.AddObject(guide,False)
    gh.Instances.DocumentServer.AddDocument(document)
    gh.Instances.ActiveCanvas.Document = document
    document.NewSolution(False)
    gh.Instances.ActiveCanvas.Refresh()
    print('Cafe Island opened in Grasshopper. Use Zoom Extents if needed. Save As to keep the definition.')

if __name__=='__main__':
    try:
        main()
    except Exception as error:
        import traceback
        print(traceback.format_exc())
        rs.MessageBox('Launcher failed: '+str(error)+'\nSee Rhino command history (F2) for details.',0,'Cafe island')
