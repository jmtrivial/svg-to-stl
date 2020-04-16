
/** 
 ** 
 ** class Box: a 2D bounding box 
 **  
 **  
 **/
class Box {
    constructor(left, right, top, bottom, valid = true) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
        this.valid = valid;
    }
        
};


Box.prototype.toRBushItem = function() {
    return { minX: this.left, minY: this.top, maxX: this.right, maxY: this.bottom };
}

Box.prototype.getMaximumSize = function () {
    var width = this.right - this.left;
    var height = this.bottom - this.top;
    if (width > height)
        return width;
    else
        return height;
}

Box.prototype.add = function(box) {
    if (box.valid) {
        if (box.left < this.left) this.left = box.left;
        if (box.top < this.top) this.top = box.top;
        if (box.right > this.right) this.right = box.right;
        if (box.bottom > this.bottom) this.bottom = box.bottom;
    }
}

Box.prototype.addPoint = function(point) {
    if (this.valid) {
        if (point[0] < this.left) this.left = point[0];
        if (point[1] < this.top) this.top = point[1];
        if (point[0] > this.right) this.right = point[0];
        if (point[1] > this.bottom) this.bottom = point[1];
    }
}

Box.prototype.center = function() {
    return [(this.left + this.right) / 2, (this.bottom + this.top) / 2];
}

Box.invalid = function() {
    return new Box(0, 0, 0, 0, false);
}

Box.fromPaths = function(paths) {
    if (paths.length == 0)
        return Box.invalid();
    
    var result = Box.fromPath(paths[0]);
    
    for(var i = 1; i < paths.length; ++i) {
        result.add(Box.fromPath(paths[i]));
    }
    return result;

};


Box.fromShape = function(shape) {
    var result = Box.fromPath(shape.polyline);
    
    if (shape.holes.length > 0) {
        result.add(Box.fromPaths(shape.holes));
    }
    return result;

};

Box.fromShapes = function(shapes) {
    if (shapes.length == 0)
        return Box.invalid();
    
    
    var result = Box.fromShape(shapes[0]);
    
    for(var i = 1; i < shapes.length; ++i) {
        result.add(Box.fromShape(shapes[i]));
    }
    return result;
}

Box.fromPath = function(path) {
    if (path.length == 0)
        return Box.invalid();
    var result = new Box(path[0][0], path[0][0], path[0][1], path[0][1]);
    
    for(var i = 1; i != path.length; ++i) {
        result.addPoint(path[i]);
    }
    return result;
};


Box.fromXY = function(vertices) {
    if (vertices.length == 0)
        return Box.invalid();
    var result = new Box(vertices[0].x, vertices[0].x, vertices[0].y, vertices[0].y);
    
    for(var i = 1; i != vertices.length; ++i) {
        result.addPoint([vertices[i].x, vertices[i].y]);
    }
    return result;

}


function inside(point, vs) {
    // function from  https://github.com/substack/point-in-polygon (MIT license)
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};


function clockwise(path) {
    if (path.length <= 2) {
            return false;
    }
    
    if ((path[0][0] != path[path.length - 1][0]) ||
        (path[0][1] != path[path.length - 1][1])) {
        console.log("ERROR: one path is not defined as a loop", JSON.stringify(path));
    }
    var sum = 0;
    for(var i = 1; i != path.length; ++i) {
        var p1 = path[i - 1];
        var p2 = path[i];
        sum += (p2[0] - p1[0]) * (p2[1] + p1[1]);
    }
    return sum >= 0;
    
}



function pointToRBushBox(p) {
    return {minX: p[0], minY: p[1], maxX: p[0], maxY: p[1]};
}

function dilate(a, epsilon) {
    a.minX -= epsilon;
    a.minY -= epsilon;
    a.maxX += epsilon;
    a.maxY += epsilon;
    return a;
}

function extend(a, b) {
    a.minX = Math.min(a.minX, b.minX);
    a.minY = Math.min(a.minY, b.minY);
    a.maxX = Math.max(a.maxX, b.maxX);
    a.maxY = Math.max(a.maxY, b.maxY);
    return a;
}

// return distance between a point C and a segment [A, B]
// or -1 if the nearest point along (A, B) line is ouside of the segment [A, B]
function relativePositionToEdge(C, A, B, epsilon) {
    // cf http://www.faqs.org/faqs/graphics/algorithms-faq/
    // Subject 1.02: How do I find the distance from a point to a line?
    var L2 = distanceSqrd(A, B);
    if (L2 <= epsilon)
        return null;
    var r = ((C[0] - A[0]) * (B[0] - A[0]) + (C[1] - A[1]) * (B[1] - A[1])) / L2;

    if ((r <= 0) || (r >= 1))
        return null;
    else {
        var Px = A[0] + r * (B[0] - A[0]);
        var Py = A[1] + r * (B[1] - A[1]);
        
        return {position: r, dist: distanceSqrd(C, [Px, Py]), point: [Px, Py]};
    }
}

function addMissingPointsInPathFromRBush(path, points, precision, scale) {
    var epsilon = 0.1 ** (precision * scale + 2);
    var eDilate = 0.1 ** (precision * scale + 1);
    
    
    if (path.length <= 1)
        return path;
    
    var result = [path[0]];
    
    for(var i = 1; i != path.length; ++i) {
        var p1 = path[i - 1];
        var p2 = path[i];
        var box = dilate(extend(pointToRBushBox(p1), pointToRBushBox(p2)), eDilate);
        
        var intersects = points.search(box);
        var inside = [];
        for(var inter of intersects) {
            var point = [inter.minX, inter.minY];
            var relLoc = relativePositionToEdge(point, p1, p2, epsilon);
            if (relLoc && relLoc.dist < epsilon) {
                inside.push(relLoc);
            }
        }
        
        if (inside.length > 0) {
            // sort wrt position
            inside.sort(function(a, b) { return a.position < b.position; });
            // remove doubles 
            inside = inside.filter(function(item, pos, ary) { return !pos || item.position != ary[pos - 1].position;});
            
            // add them to the result
            for(var ii of inside) {
                result.push(ii.point);
            }
        }
        
        result.push(p2);
        
    }
    
    return result;
}

function addPointsInRBushFromPath(path, points) {
    for(var x of path) {
        points.insert(pointToRBushBox(x));
    }
}

function getBaseLog(x, y) {
  return Math.log(y) / Math.log(x);
}

function truncator(x, precision) {
    var npow = Math.pow(10, precision);
    return Math.round(x * npow) / npow;
}


/*
 * A SVG shape is defined by:
 *  * a non closed polyline
 *  * a contour, and a (possibly empty) list of inner polygons (=holes)
 *  * a fill color
 * */
class SVGShape2D {
    
    constructor(polyline, fillColor, holes = []) {
        this.polyline = polyline;
        this.holes = holes;
        this.color = fillColor;
    }
    
    toList() {
        return [this.polyline].concat(this.holes);
    }
    
    isPolygon() {
        return ((this.polyline[0][0] == this.polyline[this.polyline - 1][0]) &&
                (this.polyline[0][1] == this.polyline[this.polyline - 1][1]));
    }
    
    adjustPathsToPrecision(precision) {
        if (precision >= 0) {
            for(var i = 0; i < this.holes.length; ++i) {
                for(var j = 0; j < this.holes[i].length; ++j) {
                    this.holes[i][j] = [truncator(this.holes[i][j][0], precision), 
                                            truncator(this.holes[i][j][1], precision)];
                }
            }
            
            for(var j = 0; j < this.polyline.length; ++j) {
                this.polyline[j] = [truncator(this.polyline[j][0], precision), 
                                    truncator(this.polyline[j][1], precision)];
            }
        }
    }
    
    removeConsecutiveDoubles() {
        for(var i = 0; i < this.holes.length; ++i) {
            this.holes[i] = this.holes[i].filter(function(item, pos, arr){  return pos === 0 || 
                                                                                    item[0] !== arr[pos - 1][0] ||
                                                                                    item[1] !== arr[pos - 1][1]; });
        }
        

        this.polyline = this.polyline.filter(function(item, pos, arr){  return pos === 0 || 
                                                                                      item[0] !== arr[pos - 1][0] ||
                                                                                      item[1] !== arr[pos - 1][1]; });
    }

    rescaleAndCenter(ratio, center) {
       
        for(var k = 0; k < this.polyline.length; ++k) {
            this.polyline[k] = [(this.polyline[k][0] - center[0]) * ratio, 
                                (this.polyline[k][1] - center[1]) * ratio];
        }
        
        // rescale and center 
        for(var j = 0; j < this.holes.length; ++j) {
            for(var k = 0; k < this.holes[j].length; ++k) {
                this.holes[j][k] = [(this.holes[j][k][0] - center[0]) * ratio, 
                                        (this.holes[j][k][1] - center[1]) * ratio];
            }
        }
    }
    
    
    
    addPointsInRBush(points) {
        addPointsInRBushFromPath(this.polyline, points);
        for(var h of this.holes) {
            addPointsInRBushFromPath(h, points);
        }
    }
    
    
    // if one point is in an edge of the current shape, add it
    addMissingPointsFromRBush(points, precision, scale) {
        this.polyline = addMissingPointsInPathFromRBush(this.polyline, points, precision, scale);
        
        // for each path of this shape
        for(var h of this.holes) {
            h = addMissingPointsInPathFromRBush(h, points, precision, scale);
        }
    
    }
    


    union(shapes, color = "union") {
        var newShapes = martinez.union(this.toList(), SVGShape2D.shapesToList(shapes));
        return TreeNode.splitIntoShapes(newShapes, color);
    }
    
    diff(shapes) {
        var newShapes = martinez.diff(this.toList(), SVGShape2D.shapesToList(shapes));
        return TreeNode.splitIntoShapes(newShapes, this.color);
    }
    
    intersection(shapes) {
        var newShapes = martinez.intersection(this.toList(), SVGShape2D.shapesToList(shapes));
        return TreeNode.splitIntoShapes(newShapes, this.color);
    }
}

SVGShape2D.shapesToList = function(shapes) {
    var result = [];
    for(var s of shapes) {
        result.push(s.toList());
    }
    return result;
}


/**
 * class TreeNode is a hierarchical structure to detect
 * inclusions between polygons.
 * It is used to distinguish between contours and holes 
 * in 2D drawings.
 * 
 * */
class TreeNode {
        constructor(polygon, color, children = []) {
            this.polygon = polygon;
            this.children = children;
            this.color = color;
            this.bBoxes = new rbush();
            if (children.length > 0) {
                this.rebuildBBoxes();
            }
        }
        rebuildBBoxes() {
            this.bBoxes.clear();
            for(var i = 0; i != this.children.length; ++i) {
                var iitem = Box.fromPath(this.children[i].polygon).toRBushItem();
                iitem.id = i;
                this.bBoxes.insert(iitem);
            }
        }

        addPolygon(polygon) {
            if (polygon.length == 0) {
                return;
            }
            var item = Box.fromPath(polygon).toRBushItem();
            if (this.children.length == 0) {
                this.children.push(new TreeNode(polygon, this.color, []));
                item.id = 0;
                this.bBoxes.insert(item);
            }
            else {
                var intersect = this.bBoxes.search(item);
                
                var found = false;
                if (intersect.length != 0) {
                    // check if the given element is inside a child
                    for(var inter of intersect) {
                        var point = polygon[0];
                        // if the given polygon is contained in one
                        // child, we add the polygon to this child
                        if (inside(point, this.children[inter.id].polygon)) {
                            this.children[inter.id].addPolygon(polygon);
                            found = true;
                            break;
                        }
                    }
                
                    if (!found) {
                        // check if this element contains existing children
                        var insideChildrenIDs = [];
                        for(var inter of intersect) {
                            if (inside(this.children[inter.id].polygon[0], polygon)) {
                                insideChildrenIDs.push(inter.id);
                            }
                        }
                        if (insideChildrenIDs.length > 0) {
                            var newChild = new TreeNode(polygon, this.color, insideChildrenIDs.map(id => this.children[id])); 
                            this.children = this.children.filter((e, id) => ! insideChildrenIDs.includes(id));
                            this.children.push(newChild);
                            // rebuild bBoxes
                            this.rebuildBBoxes();
                            found = true;
                        }
                     }
                }
                
                if (!found) {
                    // this element is a brother of the existing elements
                    this.children.push(new TreeNode(polygon, this.color, []));
                    item.id = this.children.length - 1;
                    this.bBoxes.insert(item);
                }
                
            }
        }
        
        flatten() {
            var result = [];
            
            for(var i = 0; i < this.children.length; ++i) {
                    var holes = [];
                    for(var j = 0; j < this.children[i].children.length; ++j) {
                        if (!clockwise(this.children[i].children[j].polygon)) {
                            this.children[i].children[j].polygon.reverse();
                        }
                        holes.push(this.children[i].children[j].polygon);
                    }
                    if (clockwise(this.children[i].polygon)) {
                        this.children[i].polygon.reverse();
                    }
                    result.push(new SVGShape2D(this.children[i].polygon, this.color, holes));
                    for(var j = 0; j < this.children[i].children.length; ++j) {
                        result = result.concat(this.children[i].children[j].flatten());
                    }
            }
            
            return result;
        }
};

// given a list of paths (or a list of list of paths), it split it into a list of shapes.
// following geojson specifications: https://geojson.org/geojson-spec.html#id7
// A polygon is defined by a list of rings, the first one being the contours,
// and the following the holes
TreeNode.splitIntoShapes = function(paths, color, ignoreNonPolygons = true) {
        
        if (paths.length == 0)
            return paths;
        
        var tree = TreeNode.root(color);
        
        if (typeof paths[0][0][0] === 'number') {
            for(var i = 0; i < paths.length; ++i) {
                if (ignoreNonPolygons || (paths[i][0][0] == paths[i][paths[i].length - 1][0] &&
                                          paths[i][0][1] == paths[i][paths[i].length - 1][1])) {
                    tree.addPolygon(paths[i]);
                }
            }
        }
        else {
            for(var i = 0; i < paths.length; ++i) {
                for(var j = 0; j < paths[i].length; ++j) {
                    if (ignoreNonPolygons || (paths[i][j][0][0] == paths[i][j][paths[i][j].length - 1][0] &&
                                          paths[i][j][0][1] == paths[i][j][paths[i][j].length - 1][1])) {
                        tree.addPolygon(paths[i][j]);
                    }
                }
            }
            
        }
        return tree.flatten();
    }

TreeNode.root = function(color = "") {
        return new TreeNode(null, color, []);
}


function getFillColor(elem) {
    var regex = /([\w-]*)\s*:\s*([^;]*)/g;
    var match, properties={};
    while(match = regex.exec($(elem).attr("style"))) properties[match[1].trim()] = match[2].trim();
    return "fill" in properties ? properties["fill"] : "";
}

function getIDFromURL(url) {
    var expr = new RegExp("[uU][rR][lL][ ]*\\(#[ ]*[\"\']?([A-Za-z][A-Za-z0-9\-\:\.]*)[\"\']?[ ]*\\)");
    var match = expr.exec(url);
    if (match.length == 2)
        return match[1];
    else
        return null;
}

/* 
 * A SVG group is defined by:
 *  * a SVGshape2D or a list of SVGgroup
 *  * a clip-path defined as an SVG group
 *  * a mask defined as an SVG group
 *  
 */
class SVGGroup2D {
    constructor(elem, root = null, forceClip = false) {
        if (root == null)
            root = elem;
        
        this.shape = null;
        this.content = null;
        this.clipPath = null;
        this.mask = null;
        this.svgColor = null;
        
        if (elem) {
            if (elem.children && elem.children.length && (forceClip || !(elem instanceof SVGClipPathElement) && !(elem instanceof SVGMaskElement))) {
                this.content = [];
                for(var e = 0; e != elem.children.length; ++e) {
                    var child = new SVGGroup2D(elem.children[e], root);
                    if (!child.empty())
                        this.content.push(child);
                }
                this.svgColor = getFillColor(elem);
                if (elem instanceof SVGSVGElement && this.svgColor == "")
                    this.svgColor = "#000000";

                if (this.svgColor != "") {
                    for(var c of this.content) {
                        c.inheritColor(this.svgColor);
                    }
                }
                else
                    this.svgColor = null;
            }
            else if (elem instanceof SVGPathElement) {
                // read SVG path
                var svgPath = elem.getAttribute("d");
                
                this.svgColor = getFillColor(elem);
                
                // Turn SVG path into a three.js shape (that can be composed of a list of shapes)
                var path = d3.transformSVGPath(svgPath);
                    
                // extract shapes associated to the svg path,
                var newShapes = path.toShapes(this.svgWindingIsCW);

                // discretize them, and convert them to a basic list format
                newShapes = SVGGroup2D.convertToList(newShapes);

                // possibly split the original path in multiple shapes
                var shapes = TreeNode.splitIntoShapes(newShapes, this.svgColor, false);
                if (shapes.length == 0) {
                    // empty shape
                    return;
                }
                else if (shapes.length == 1) {
                    this.shape = shapes[0];
                }
                else {
                    this.content = [];
                    for(var s = 0; s != shapes.length; ++s) {
                        this.content.push(SVGGroup2D.fromList(shapes[s], root));
                    }
                }
            }
            else {
                console.log("WARNING: svg element not handled - " + elem);
            }

            if (elem.hasAttribute("clip-path")) {
                var id = getIDFromURL(elem.getAttribute("clip-path"));
                if (id) {
                    var newElem = root.getElementById(id);
                    this.clipPath = new SVGGroup2D(newElem, root, true);
                }
                
            }
            if (elem.hasAttribute("mask")) {
                var id = getIDFromURL(elem.getAttribute("mask"));
                if (id) {
                    var newElem = root.getElementById(id);
                    this.mask = new SVGGroup2D(newElem, root, true);
                }
                
            }
        }
    }
    
    inheritColor(color) {
        if (!this.svgColor) {
            if (this.shape) {
                if (!this.shape.color || this.shape.color == "") {
                    this.shape.color = color;
                }
            }
            else {
                if (this.content) {
                    for(var c of this.content) {
                        c.inheritColor(color);
                    }
                }
            }
        }
    }
    
    empty() {
        return this.content == null && this.shape == null;
    }
    
    
    applyClipping(clipPath) {
        if (this.shape) {
            // apply intersection
            var res = this.shape.intersection(clipPath);
            if (res.length > 1) {
                // if multiple elements, create a group
                this.content = res;
            }
            else if (res.length == 1) {
                // otherwise, the shape is the first one
                this.shape = res[0];
            }
            else
                // a clipping can remove all the parts of a shape
                this.shape = null;
        }
        if (this.content) {
            for(var c of this.content) {
                c = c.applyClipping(clipPath);
            }
        }
    }
    
    applyClippings() {
        if (this.content != null) {
            // apply first the clippings inside the shape
            for(var c of this.content) {
                c.applyClippings();
            }
        }
        
        // if the current node has a clipping path, apply it 
        if (this.clipPath) {
            // get a flat description of clipPath
            var clipFlat = this.clipPath.getShapesList();
            // apply this clipping path
            this.applyClipping(clipFlat);
            // remove it from the data structure
            this.clipPath = null;
        }
        
    }

    flatten() {
        
        // first apply clippings
        this.applyClippings();
        
        // TODO: handle masks
        
        // then return shape list
        return this.getShapesList();
    }
     
    getShapesList() {
        var result = [];
        
        if (this.shape != null) {
            result.push(this.shape);
        }
        else {
            if (this.content != null) {
                for(var v = 0; v != this.content.length; ++v) {
                    var elems = this.content[v].getShapesList();
                    if (elems.length != 0)
                        result = result.concat(elems);
                }
            }
        }
        
        return result;
    }
    
    
}

SVGGroup2D.fromList = function(shape, root)  {
    var result = new SVGGroup2D(null, root);
    result.shape = shape;
    return result;
}

SVGGroup2D.convertToList = function(shapes) {
    var result = [];
    
    var precision = 0.;
    if (SVGGroup2D.options && SVGGroup2D.options.precision)
        precision = SVGGroup2D.options.precision;
    for (var j = 0; j < shapes.length; j++) {
        
        // TODO: add an heuristic to change this value
        var pts = shapes[j].extractPoints(30);
        var paths = [pts.shape].concat(pts.holes);
                    
        for(var a = 0; a != paths.length; ++a) {
            for(var b = 0; b != paths[a].length; ++b) {
                if (precision >= 0)
                    paths[a][b] = [parseFloat(paths[a][b].x.toFixed(precision)), 
                                    parseFloat(paths[a][b].y.toFixed(precision))];
                else
                    paths[a][b] = [parseFloat(paths[a][b].x), parseFloat(paths[a][b].y)];
            }
        }
        result.push(paths);
    }
    return result;
}


class SpatialClipping {
    
    constructor() {
        this.color = null;
        this.regions = new rbush();
    }
    
    shapes() {
        return this.regions.all().map(x => x.shape);
    }
    
    // this function merge the new shape in the existing shapes
    // applying a Martinez union only with shapes that will possibly
    // be intersecting, wrt the RBush tree. 
    // The color of the union is defined by the first added element
    // or by the supplementary parameter if required
    add(shape, color = null) {
        var box = Box.fromShape(shape).toRBushItem();
        var possibleShapeBoxes = this.regions.search(box);

        if (possibleShapeBoxes.length > 0) {
            var possibleShapes = possibleShapeBoxes.map(x => x.shape);
            // compute union
            var union = shape.union(possibleShapes, this.color);
            
            // remove previous elements
            for(var p of possibleShapeBoxes) {
                this.regions.remove(p);
            }
            
            // add shapes of the union in the region
            for(var u of union) {
                var ubox = Box.fromShape(u).toRBushItem();
                ubox.shape = u;
                this.regions.insert(ubox);
            }
        }
        else {
            box.shape = shape;
            this.regions.insert(box);
            this.color = shape.color;
        }
        
    }
    
    // add a list of shapes to the current container, set color of the final union
    addList(shapes) {
        for(var s of shapes)
            this.add(s);
    }
    
    // this function removes from the given shape the parts contained
    // in the current structure, applying a Martinez diff only with 
    // shapes that will possibly be intersecting, wrt the RBush tree
    crop(shape) {
        var box = Box.fromShape(shape).toRBushItem();
        var possibleShapeBoxes = this.regions.search(box);
        
        if (possibleShapeBoxes.length > 0) {
            var possibleShapes = possibleShapeBoxes.map(x => x.shape);
            return shape.diff(possibleShapes);
        }
        else
            return [shape];
        
    }
    
    // crop a list of shapes with the current object
    cropList(shapes) {
        var result = [];
        for(var s of shapes) {
            result = result.concat(this.crop(s));
        }
        return result;
    }
    
}


class SVGCrop {

    
    constructor(svgID, options, viewBox) {
        this.svgNode = document.getElementById(svgID);
        this.options = options;
        this.silhouette = null;
        this.svgWindingIsCW = options.svgWindingIsCW;
        this.viewBox = viewBox;
        this.precision = this.options.discretization ? this.options.precision : -1;
        this.shapes = null;
        this.svgStructure = null;
    }


    
    addMissingPoints() {
        // add all points in a RBush data structure
        var points = new rbush();
        
        for(var s of this.shapes) {
            s.addPointsInRBush(points);
        }
        
        var scale = this.getScale();
        
        // then add possible missing points
        for(var sh of this.shapes) {
            sh.addMissingPointsFromRBush(points, this.precision, scale);
        }

        for(var si of this.silhouette) {
            si.addMissingPointsFromRBush(points, this.precision, scale);
        }

    }
          

    
    getBoundsOfShapes() {
        return Box.fromShapes(this.shapes);
    }
    
    
    adjustToPrecision(precision) {
        if (this.shapes != null) {
            for(var s of this.shapes) {
                s.adjustPathsToPrecision(precision);
                s.removeConsecutiveDoubles();
            }
        }
        if (this.silhouette != null) {
            for(var s of this.silhouette) {
                s.adjustPathsToPrecision(precision);
                s.removeConsecutiveDoubles();
            }
        }
    }
          
    // center and rescale to match the desired width
    rescaleAndCenter(width) {
        var bbox = this.getBoundsOfShapes();
        var ratio = width / (bbox.right - bbox.left);
        var center = bbox.center();
        // rescale and center paths
        
        for(var sh of this.shapes) {
            sh.rescaleAndCenter(ratio, center);
        }

        for(var si of this.silhouette) {
            si.rescaleAndCenter(ratio, center);
        }
    }
          
    process() {
        SVGGroup2D.options = this.options;
        this.svgStructure = new SVGGroup2D(this.svgNode);
        // produce a list of shapes (hierarchical structure is only required
        // for mask and clip)
        this.shapes = this.svgStructure.flatten();
        
        if (this.shapes.length > 0) {
            // adjust the precision wrt the scale
            var precision = this.precision + (Math.floor(getBaseLog(10, this.getScale())));

            this.adjustToPrecision(precision);
            if (this.options.wantBasePlate != null)
                this.addBasePlateInternal();

            this.clipShapesUsingVisibility();
                    

            // center and scale the shapes
            this.rescaleAndCenter(options.objectWidth - (options.baseBuffer * 2));
            
            // add possible missing vertices along the paths
            // when two shapes are sharing a common edge
            this.addMissingPoints();
            
            // adjust to precision before any other step
            this.adjustToPrecision(this.precision);
            
        }

    }




    getScale() {
        var bbox;
        if (this.options.ignoreDocumentMargins) {
            bbox = this.getBoundsOfShapes();
        }
        else {
            bbox = new Box(this.viewBox[0], this.viewBox[2], 
                           this.viewBox[1], this.viewBox[3]);
        }
        
        return this.options.objectWidth / (bbox.right - bbox.left) ;
        
    }
    
    addBasePlateInternal() {
        // compute the effective bounding box, defined or by document margin, or by shapes
        var bbox;
        var plate;
        
        if (this.options.ignoreDocumentMargins) {
            bbox = this.getBoundsOfShapes();
        }
        else {
            bbox = new Box(this.viewBox[0], this.viewBox[2], 
                           this.viewBox[1], this.viewBox[3]);
        }
        
        // add offset if required
        if (this.options.baseBuffer > 0) {
            var buffer = this.options.baseBuffer / this.options.objectWidth * (bbox.right - bbox.left);
            bbox.left -= buffer;
            bbox.top -= buffer;
            bbox.right += buffer;
            bbox.bottom += buffer;
        }
        
        // create the final shape
        if(this.options.basePlateShape === "Rectangular" || 
            this.options.basePlateShape === "Squared") {
            // first turn it into a square if required
            if (this.options.basePlateShape==="Squared") {
                var width = bbox.right - bbox.left;
                var height = bbox.bottom - bbox.top;
                var middle = [(bbox.left + bbox.right) / 2, (bbox.bottom + bbox.top) / 2];
                var halfSize = (width > height ? width : height) / 2;
                bbox.left = middle[0] - halfSize;
                bbox.right = middle[0] + halfSize;
                bbox.top = middle[1] - halfSize;
                bbox.bottom = middle[1] + halfSize;
            }
            // then create the path
            plate = [[bbox.left, bbox.bottom],
                    [bbox.right, bbox.bottom],
                    [bbox.right, bbox.top],                    
                    [bbox.left, bbox.top]
                    ];
            
        }
        // Otherwise a circle
        else {
            var middle = bbox.center();
            var corner = [bbox.left, bbox.top];
            var radius = Math.sqrt(distanceSqrd(middle, corner));
            plate = [];
            var nbPoints = 128;
            for(var i = 0; i != nbPoints; i++) {
                plate.push([middle[0] + radius * Math.cos(i / nbPoints * 6.283185307179586), 
                            middle[1] + radius * Math.sin(i / nbPoints * 6.283185307179586)]);
            }
        }
        // close the shape
        plate.push(plate[0]);
        
        this.shapes.unshift(new SVGShape2D(plate, "base"));
        
        // add the depth of the plate
        options.typeDepths["base"] = 0.0;
    }
    
    
    
    clipShapesUsingVisibility() {
        
        var silhouetteRegion = new SpatialClipping();
        var regions = {};
                
        
        if (this.shapes.length > 0) { 
            
            // use inverse order to crop shapes according to their visibility
            for (var i = this.shapes.length - 1; i >= 0; i--) {
                var curShape = this.shapes[i];
                var color = curShape.color;
                var curShapes = [curShape];
                
                // remove subpart of the regions corresponding to other colors 
                for(var r in regions) {
                    if (r != color) {
                        curShapes = regions[r].cropList(curShapes);
                    }
                }
                
                // then merge the new shape in its region
                if (!(color in regions)) {
                    regions[color] = new SpatialClipping();
                }
                regions[color].addList(curShapes);
                
                // add this shape to the main silhouette
                silhouetteRegion.addList(curShapes);
                
            }
            
        }
        
        this.silhouette = silhouetteRegion.shapes();

        // merge all shapes from regions into a single list
        this.shapes = [];
        for(var r in regions) {
            this.shapes = this.shapes.concat(regions[r].shapes());
        }
        
        
    }

    
    getShapes() { 
        if (this.shapes == null)
            this.process();
        return this.shapes; 
    }
    
    getNbShapes() { 
        if (this.shapes == null)
            this.process();
        return this.shapes.length; 
        
    }
    
    getColors() {
        if (this.shapes == null)
            this.process();

        var result = [];
        for(var s of this.shapes) {
            result.push(s.color);
        }
        return result;
    }
    
    
    getPalette() {
        if (this.svgColors == null)
            this.process();
        var result = [];
        for(var s of this.shapes) {
            if (s.color != "base")
                result.push(s.color);
        }
        return result;
    }

    
    getSilhouette() { 
        if (this.silhouette == null)
            this.process();
        return this.silhouette;
    }

};
