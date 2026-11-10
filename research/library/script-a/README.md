# Cafe Island — two axes

## Start

1. Extract the entire ZIP into one folder.
2. In Rhino 7 or 8, run `RunPythonScript` and select `Launch_Cafe_Island.py`.
3. Select the length axis, then the width axis. Alternatively, press Enter at the first prompt for a 4000 × 3000 mm example.
4. Grasshopper opens a NEW definition with the engine, curve inputs, sliders and outputs already connected. Use Zoom Extents if needed.
5. Save it using Grasshopper **File > Save As**. The engine is embedded in the definition; the two Python files are only needed to launch another one.

The launcher uses legacy GhPython, including in Rhino 8. It does not create a Python 3 component or require you to configure type hints/access manually. Referenced axes should update when edited in Rhino. Right-click Axis1/Axis2 > Set one Curve to change them.

## Geometry and scaling

Two straight, open, intersecting, horizontal axes define the length and width of ONE island. They must lie at the same elevation and cross inside both segments. Perpendicular axes form a rectangle; angled axes form a parallelogram. The supported angle is 30–150 degrees. Curved axes are not supported in this version; perimeter curvature is controlled by CornerRadius.

The intersection is the scaling centre. Each endpoint retains its proportional distance from that centre, so off-centre axis intersections also work. Axes describe the sharp-corner body footprint before filleting; the top adds an overhang.

Scale1 and Scale2 change axis lengths independently. Depth, height, top thickness, overhang, entrance width and plinth dimensions remain fixed unless their sliders are changed. ModuleStep optionally rounds each total axis length to an increment, e.g. 100 mm; zero gives continuous scaling. It does not create cabinet modules.

The output consists of a plain continuous counter body, worktop and recessed plinth around a central workspace, with a full-height entrance. No chairs, canopy, appliances, equipment symbols or equipment layout are generated.

All dimension sliders are in **millimetres**, regardless of Rhino document units. BaseOffset is relative to the axes' elevation. Height is the finished worktop height above the base.

EntranceSide selects one of four perimeter sides; EntranceShift moves it along the straight portion of that side. Side indexing follows a counterclockwise perimeter derived from axis direction. For the default example, side 0 is the bottom long edge. Reversing an axis can change side numbering. The entrance width is clear between vertical jambs; jamb corners remain square. Outer corners are filleted; inner corners are rounded where the depth allows it.

The engine stops with a readable error and clears its outputs if the workspace, entrance or corner radius cannot fit, or a solid operation fails. The default MinWorkspace is a modelling constraint, not a code-compliance check. Increase scales or adjust the reported dimension. A red component is not a request to mesh the model.

## Archicad connection

Use the **Object Settings Create** and **Object** components you already have. The launcher does not create connector components or start synchronisation automatically.

| Output / source | Destination |
|---|---|
| Geometry | Object Settings Create → G |
| Text panel `Cafe_Island` | Object Settings Create → ON |
| Object Settings Create → S | Object → S |
| Anchor | Object → P |
| Boolean True, when ready | Object → Sy |

Geometry is ONE combined Brep containing the three closed solids, in local coordinates around the axis intersection. Do not flatten the Preview output into G: that could create several objects. Keep the object angle at zero because the geometry already carries its orientation. Preview is positioned at the Rhino axes for visual inspection; Plan contains the top's perimeter and entrance edges projected to base elevation. Both are separate from the local Geometry output.

The connector creates the library part from the 3D geometry. Check its generated floor-plan representation in Archicad. The Plan output is a Rhino/Grasshopper reference and is NOT automatically a custom Archicad 2D script. If the connector's generated part has no useful 2D projection, open the generated library part in Archicad and use `PROJECT2 3, 270, 2` in its 2D Script as a simple projected-symbol fallback; connector regeneration may overwrite manual library-part changes. Home Story / Show on Stories must also match your plan view. This workflow does not create adjustable axis sliders inside the Archicad object; edit the shape in Grasshopper and synchronise it.

For the first transfer, verify the anchor, elevation, scale and floor-plan outline against the Rhino preview. Rhino and Archicad project origins must be coordinated; the script cannot infer survey-point offsets or story settings. If you delete input axes or create invalid dimensions, the Grasshopper output clears; check Archicad for any previously synchronised object that remains.

## Validation and limits

Code syntax and independent 2D layout checks were tested outside Rhino. RhinoCommon solid booleans, launcher execution and the installed Archicad connector could not be run in this environment. The script validates every generated part with IsValid and IsSolid at runtime and does not depend on mesh closure. Treat the first launch/transfer as an integration check, not as an already verified Archicad installation.

API references used:
- McNeel GhPython source: https://github.com/mcneel/ghpython/blob/master/Component/ZUIPythonComponent.cs
- RhinoCommon curve API: https://developer.rhino3d.com/api/rhinocommon/type/rhino.geometry.curve/
- RhinoCommon Brep boolean difference: https://developer.rhino3d.com/api/rhinocommon/rhino.geometry.brep/createbooleandifference
- Graphisoft Live Connection guide: https://help.graphisoft.com/AC/24/INT/GC.pdf
- Graphisoft object/anchor example: https://community.graphisoft.com/t5/Modeling/Grasshopper-Connection-Object-Guide-Loft-Object/ta-p/303981
