from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from datetime import datetime

#Areas

class AreaRegister(BaseModel):
    area_id: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_\-]+$")
    area_name: str = Field(..., min_length=2, max_length=100)
    facility_type: Literal["clinic", "hospital", "lab", "field_post"] = "clinic"
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    population_density: int = Field(..., ge=0)
    state: str = Field(..., min_length=2, max_length=100)


class AreaResponse(BaseModel):
    id: int
    area_id: str
    area_name: str
    facility_type: str
    lat: float
    lon: float
    population_density: int
    state: str
    created_at: str

#Reports

class CaseReport(BaseModel):
    area_id: str = Field(..., min_length=1)
    disease_name: str = Field(..., min_length=2, max_length=100)
    case_count: int = Field(..., gt=0, description="Must be a positive integer")
    clinic_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    locationLabel: Optional[str] = Field(None, max_length=200)

    @field_validator("disease_name")
    @classmethod
    def normalize_disease(cls, v: str) -> str:
        return v.strip().title()   # "flu" → "Flu", "  DENGUE  " → "Dengue"


class DeathReport(BaseModel):
    area_id: str = Field(..., min_length=1)
    disease_name: str = Field(..., min_length=2, max_length=100)
    death_count: int = Field(..., gt=0, description="Must be a positive integer")
    clinic_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    locationLabel: Optional[str] = Field(None, max_length=200)

    @field_validator("disease_name")
    @classmethod
    def normalize_disease(cls, v: str) -> str:
        return v.strip().title()


class ReportResponse(BaseModel):
    message: str
    report_id: int

#Zones

class ZoneResponse(BaseModel):
    area_id: str
    area_name: str
    lat: float
    lon: float
    zone_color: Literal["Green", "Yellow", "Red"]
    disease_in_cluster: str
    nearby_reporting_clinics: int
    population_density: int
    case_count: int
    state: str

#Alerts

class AlertResponse(BaseModel):
    id: int
    area_id: str
    disease_name: str
    message: str
    status: str
    severity: str
    created_at: str
    updated_at: str


class AlertStatusUpdate(BaseModel):
    status: Literal["acknowledged", "resolved"]

#Stats and Forecasts

class DiseaseStats(BaseModel):
    disease_name: str
    total_cases: int
    total_deaths: int
    cfr_percent: float = Field(description="Case Fatality Rate as a percentage")
    active_cases_7d: int


class DashboardStats(BaseModel):
    active_cases_7d: int
    total_recorded_cases: int
    total_report_count: int
    total_deaths: int
    new_alerts: int
    active_alerts: int
    high_risk_zone_count: int
    total_reports_delta: Optional[float] = None
    active_alerts_delta: Optional[float] = None
    high_risk_zones_delta: Optional[float] = None
    disease_breakdown: List[DiseaseStats]


class ForecastResponse(BaseModel):
    disease_name: str
    historical_labels: List[str]
    historical_data: List[float]
    forecast_labels: List[str]
    forecast_data: List[float]
    trend: Literal["Rising", "Stable", "Declining"]
    trend_percent_change: float = Field(description="% change over the forecast window vs last known window")
    model_used: str


class TrendResponse(BaseModel):
    disease_name: str
    trend: Literal["Rising", "Stable", "Declining"]
    percent_change_7d: float
    current_week_cases: int
    previous_week_cases: int
    summary: str


#Hotspots and Area Stats

class HotspotResponse(BaseModel):
    id: str
    primary_area: str
    area_names: List[str]
    area_count: int
    lat: float
    lon: float
    disease: str
    total_cases: int
    zone_color: Literal["Green", "Yellow", "Red"]
    risk_level: str
    trend_pct: float


class AreaStatsResponse(BaseModel):
    area_id: str
    area_name: str
    lat: float
    lon: float
    state: str
    population_density: int
    case_count_7d: int
    death_count_7d: int
    active_alerts: int
    risk_level: str
    zone_color: Literal["Green", "Yellow", "Red"]
    trend_pct: float
    diseases: List[str]