import math
from typing import Literal

ZONE_RADIUS_KM = 5.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in kilometres between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_zone_color(
    cluster_count: int,
    case_count_7d: int = 0,
) -> Literal["Green", "Yellow", "Red"]:
    """
    Determine risk zone color based on case volume and geographic clustering.

    The ``population_density`` field in the database stores total population counts
    (e.g. 215,000 people), not density per km², so it cannot be used reliably as a
    density threshold.  Rules are therefore based purely on observable case data:

    - Red    : ≥ 2 nearby areas reporting the same disease (cluster confirmed)
               OR ≥ 50 cases in the last 7 days within a single area
    - Yellow : ≥ 1 nearby area reporting the same disease (possible spread)
               OR ≥ 10 cases in the last 7 days
    - Green  : Isolated, low-volume report
    """
    if cluster_count >= 2 or case_count_7d >= 50:
        return "Red"
    if cluster_count >= 1 or case_count_7d >= 10:
        return "Yellow"
    return "Green"