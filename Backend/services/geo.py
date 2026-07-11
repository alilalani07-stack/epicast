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
    population_density: int,
    cluster_count: int,
    case_count_7d: int = 0,
) -> Literal["Green", "Yellow", "Red"]:
    """
    Determine risk zone color.

    Rules (in descending priority):
    - Red   : High-density area (>5000/km²) with ≥1 nearby cluster
              OR ≥2 nearby facilities reporting the same disease
              OR any area with 50+ cases in 7 days AND ≥1 nearby cluster
    - Yellow: Medium-density (>2000/km²) with ≥1 cluster
              OR high-density area (>8000/km²) with any recent reports
              OR 20–49 cases in 7 days
    - Green : Everything else
    """
    if (
        (population_density > 5000 and cluster_count >= 1)
        or cluster_count >= 2
        or (case_count_7d >= 50 and cluster_count >= 1)
    ):
        return "Red"

    if (
        (population_density > 2000 and cluster_count >= 1)
        or population_density > 8000
        or case_count_7d >= 20
    ):
        return "Yellow"

    return "Green"