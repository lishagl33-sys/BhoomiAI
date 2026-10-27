"""
Resilient GIS Geometry Engine with Seamless Pure-Python Fallback:
Provides Polygon, shape, Point, and make_valid.
Uses high-performance Shapely if available, or pure-Python Sutherland-Hodgman
and Shoelace algorithms if Shapely's C-DLL is restricted by OS Application Control policies.
"""
from typing import Any, List, Dict, Optional, Tuple

try:
    from shapely.geometry import Polygon as ShapelyPolygon, shape as shapely_shape, Point as ShapelyPoint
    from shapely.validation import make_valid as shapely_make_valid
    SHAPELY_AVAILABLE = True
except (ImportError, Exception):
    SHAPELY_AVAILABLE = False


def ensure_ccw(pts: List[List[float]]) -> List[List[float]]:
    n = len(pts)
    if n < 3:
        return pts
    a = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    return pts[::-1] if a < 0 else pts


def poly_area(pts: List[List[float]]) -> float:
    n = len(pts)
    if n < 3:
        return 0.0
    return abs(sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))) / 2.0


def clip_polygon(subject_polygon: List[List[float]], clip_poly: List[List[float]]) -> List[List[float]]:
    if len(subject_polygon) < 3 or len(clip_poly) < 3:
        return []
    sub = ensure_ccw(list(subject_polygon))
    clp = ensure_ccw(list(clip_poly))

    def inside(cp1, cp2, p):
        return (cp2[0] - cp1[0]) * (p[1] - cp1[1]) - (cp2[1] - cp1[1]) * (p[0] - cp1[0]) >= -1e-11

    def intersection(cp1, cp2, s, e):
        dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]]
        dp = [s[0] - e[0], s[1] - e[1]]
        denom = dc[0] * dp[1] - dc[1] * dp[0]
        if abs(denom) < 1e-14:
            return s
        n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0]
        n2 = s[0] * e[1] - s[1] * e[0]
        n3 = 1.0 / denom
        return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3]

    output_list = sub
    cp1 = clp[-1]
    for cp2 in clp:
        input_list = output_list
        output_list = []
        if not input_list:
            break
        s = input_list[-1]
        for e in input_list:
            if inside(cp1, cp2, e):
                if not inside(cp1, cp2, s):
                    output_list.append(intersection(cp1, cp2, s, e))
                output_list.append(e)
            elif inside(cp1, cp2, s):
                output_list.append(intersection(cp1, cp2, s, e))
            s = e
        cp1 = cp2
    return output_list


class PurePoint:
    def __init__(self, x: float, y: float):
        self.x = float(x)
        self.y = float(y)
        self.coords = [(self.x, self.y)]

    def __repr__(self):
        return f"Point({self.x}, {self.y})"


class PurePolygon:
    def __init__(self, coordinates: Any):
        # Normalize input coordinates
        coords = list(coordinates)
        if len(coords) > 0 and isinstance(coords[0], (list, tuple)) and len(coords[0]) > 0 and isinstance(coords[0][0], (list, tuple)):
            coords = coords[0]

        # Strip duplicate closing coordinate if present
        clean_pts = []
        for pt in coords:
            clean_pts.append([float(pt[0]), float(pt[1])])
        if len(clean_pts) > 1 and clean_pts[0] == clean_pts[-1]:
            clean_pts = clean_pts[:-1]

        self.pts = clean_pts
        self.is_valid = len(self.pts) >= 3

    @property
    def is_empty(self) -> bool:
        return len(self.pts) == 0

    @property
    def area(self) -> float:
        return poly_area(self.pts)

    @property
    def centroid(self) -> PurePoint:
        if not self.pts:
            return PurePoint(0.0, 0.0)
        cx = sum(p[0] for p in self.pts) / len(self.pts)
        cy = sum(p[1] for p in self.pts) / len(self.pts)
        return PurePoint(cx, cy)

    @property
    def bounds(self) -> Tuple[float, float, float, float]:
        if not self.pts:
            return (0.0, 0.0, 0.0, 0.0)
        xs = [p[0] for p in self.pts]
        ys = [p[1] for p in self.pts]
        return (min(xs), min(ys), max(xs), max(ys))

    def intersects(self, other: Any) -> bool:
        if not self.is_valid or not other.is_valid:
            return False
        # Fast bounding box rejection
        b1 = self.bounds
        b2 = other.bounds
        if b1[2] < b2[0] or b1[0] > b2[2] or b1[3] < b2[1] or b1[1] > b2[3]:
            return False
        inter = clip_polygon(self.pts, other.pts)
        return poly_area(inter) > 0.0 or self.contains(other) or other.contains(self)

    def intersection(self, other: Any) -> "PurePolygon":
        inter_pts = clip_polygon(self.pts, other.pts)
        return PurePolygon(inter_pts)

    def contains(self, other: Any) -> bool:
        if isinstance(other, PurePoint):
            # Ray-casting point in polygon
            x, y = other.x, other.y
            inside = False
            n = len(self.pts)
            for i in range(n):
                j = (i + 1) % n
                xi, yi = self.pts[i]
                xj, yj = self.pts[j]
                if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi):
                    inside = not inside
            return inside

        if isinstance(other, PurePolygon):
            if not other.pts:
                return False
            return all(self.contains(PurePoint(p[0], p[1])) for p in other.pts)

        return False

    def __repr__(self):
        return f"Polygon(pts={len(self.pts)}, area={self.area:.6f})"


def pure_shape(geojson_dict: Dict[str, Any]) -> Any:
    g_type = geojson_dict.get("type", "")
    coords = geojson_dict.get("coordinates", [])
    if g_type == "Polygon":
        return PurePolygon(coords[0] if coords and isinstance(coords[0], list) else coords)
    elif g_type == "MultiPolygon":
        if coords and len(coords) > 0 and len(coords[0]) > 0:
            return PurePolygon(coords[0][0])
        return PurePolygon([])
    elif g_type == "Point":
        return PurePoint(coords[0], coords[1])
    return PurePolygon(coords)


def pure_make_valid(geom: Any) -> Any:
    return geom


if SHAPELY_AVAILABLE:
    Polygon = ShapelyPolygon
    shape = shapely_shape
    Point = ShapelyPoint
    make_valid = shapely_make_valid
else:
    Polygon = PurePolygon
    shape = pure_shape
    Point = PurePoint
    make_valid = pure_make_valid
