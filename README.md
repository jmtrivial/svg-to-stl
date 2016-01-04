# svg-to-stl
Created to enable the 3D printing of plates for a [printing press] from a 2D vector graphic, this browser-based tool runs entirely in the local browser.

### Screenshot
 ![Screenshot](https://github.com/rcalme/svg-to-stl/blob/master/screenshot.png)

### Options
  - Specifying type height
    - Including indented/recessed type
  - Rendering with and without a base plate
    - Round and Rectangular base plates supported
    - Specifying base plate height
  - Optionally inverting type for printing press use

### Requirements
This tool requires javascript support, and a browser that can handle a [WebGL] canvas, and the [File API].

### Version
0.5

### Tools Used
svg-to-stl makes use of a number of other open source projects:
* [three.js] - For WebGL rendering of a 3D scene
* [D3] - For converting SVG paths into three.js geometries
* [ThreeCSG] - For [Constructive Solid Geometry] support
* [STLExporter] - For converting a three.js geometry into an ASCII STL file
* [Spectrum] - For a javascript color-picker
* [Entypo] - Example SVG files to play with
* [jQuery]


   [printing press]: <https://en.wikipedia.org/wiki/Printing_press>
   [WebGL]: <https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API>
   [File API]: <http://www.w3.org/TR/FileAPI/>
   [three.js]: <https://github.com/mrdoob/three.js>
   [D3]: <https://github.com/mbostock/d3>
   [ThreeCSG]: <https://github.com/chandlerprall/ThreeCSG>
   [STLExporter]: <https://gist.github.com/kjlubick/fb6ba9c51df63ba0951f>
   [Spectrum]: <https://github.com/bgrins/spectrum>
   [Entypo]: <http://www.entypo.com>
   [jQuery]: <https://jquery.com/>