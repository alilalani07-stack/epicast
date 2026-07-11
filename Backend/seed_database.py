import sqlite3
import random
from datetime import datetime, timedelta, timezone

DB_FILE = "epicast.db"

AREAS = [
  {"area_id": "A-101", "area_name": "Madhapur", "facility_type": "clinic", "lat": 17.4483, "lon": 78.3915, "population_density": 215000, "state": "Telangana"},
  {"area_id": "A-102", "area_name": "Hitech City", "facility_type": "clinic", "lat": 17.4435, "lon": 78.3772, "population_density": 178000, "state": "Telangana"},
  {"area_id": "A-103", "area_name": "Gachibowli", "facility_type": "clinic", "lat": 17.4401, "lon": 78.3489, "population_density": 162000, "state": "Telangana"},
  {"area_id": "A-104", "area_name": "Kukatpally", "facility_type": "clinic", "lat": 17.4849, "lon": 78.4138, "population_density": 488000, "state": "Telangana"},
  {"area_id": "A-105", "area_name": "Banjara Hills", "facility_type": "clinic", "lat": 17.4156, "lon": 78.4347, "population_density": 132000, "state": "Telangana"},
  {"area_id": "A-106", "area_name": "Jubilee Hills", "facility_type": "clinic", "lat": 17.4326, "lon": 78.4071, "population_density": 110000, "state": "Telangana"},
  {"area_id": "A-107", "area_name": "Begumpet", "facility_type": "clinic", "lat": 17.4399, "lon": 78.4983, "population_density": 145000, "state": "Telangana"},
  {"area_id": "A-108", "area_name": "Secunderabad", "facility_type": "clinic", "lat": 17.4448, "lon": 78.5034, "population_density": 215000, "state": "Telangana"},
  {"area_id": "A-109", "area_name": "Charminar", "facility_type": "clinic", "lat": 17.3616, "lon": 78.4747, "population_density": 188000, "state": "Telangana"},
  {"area_id": "A-110", "area_name": "Mehdipatnam", "facility_type": "clinic", "lat": 17.3938, "lon": 78.4347, "population_density": 156000, "state": "Telangana"},
  {"area_id": "A-111", "area_name": "LB Nagar", "facility_type": "clinic", "lat": 17.3457, "lon": 78.5520, "population_density": 245000, "state": "Telangana"},
  {"area_id": "A-112", "area_name": "Uppal", "facility_type": "clinic", "lat": 17.4055, "lon": 78.5589, "population_density": 198000, "state": "Telangana"},
  {"area_id": "A-113", "area_name": "Miyapur", "facility_type": "clinic", "lat": 17.4969, "lon": 78.3578, "population_density": 167000, "state": "Telangana"},
  {"area_id": "A-114", "area_name": "Tarnaka", "facility_type": "clinic", "lat": 17.4239, "lon": 78.5377, "population_density": 92000, "state": "Telangana"},
  {"area_id": "A-115", "area_name": "Dilsukhnagar", "facility_type": "clinic", "lat": 17.3687, "lon": 78.5247, "population_density": 178000, "state": "Telangana"},
]

DISEASES = ["Dengue", "Influenza", "COVID-19", "Malaria", "Cholera", "Tuberculosis", "Typhoid", "Chikungunya", "Measles"]

def seed():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. Clear existing areas, reports, and alerts for a clean seed
    print("Clearing tables...")
    cursor.execute("DELETE FROM reports")
    cursor.execute("DELETE FROM alerts")
    cursor.execute("DELETE FROM areas")
    
    # 2. Insert areas
    print("Seeding areas...")
    for a in AREAS:
        cursor.execute(
            """
            INSERT INTO areas (area_id, area_name, facility_type, lat, lon, population_density, state)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (a["area_id"], a["area_name"], a["facility_type"], a["lat"], a["lon"], a["population_density"], a["state"])
        )
    
    # 3. Seed historical reports over the last 30 days
    print("Seeding reports...")
    now = datetime.now(timezone.utc)
    inserted_reports = 0
    
    for a in AREAS:
        for disease in DISEASES:
            # Let's seed Dengue and Influenza heavily in Madhapur and Hitech City to trigger some red zone alerts!
            is_heavy = a["area_name"] in ["Madhapur", "Hitech City", "Charminar"] and disease in ["Dengue", "Cholera", "Influenza"]
            base_cases = random.randint(15, 45) if is_heavy else random.randint(1, 8)
            
            for day_offset in range(30, 0, -1):
                # Generates a wave-like pattern of outbreak
                progress = 1 - (day_offset / 30.0)
                import math
                multiplier = math.sin(progress * math.pi) + 0.3
                daily_cases = max(0, int(base_cases * multiplier * random.uniform(0.6, 1.4)))
                
                if daily_cases > 0:
                    ts = (now - timedelta(days=day_offset)).replace(
                        hour=random.randint(8, 18),
                        minute=random.randint(0, 59),
                        second=0,
                        microsecond=0,
                    ).isoformat()
                    
                    cursor.execute(
                        "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp) VALUES (?, ?, ?, ?, ?)",
                        ("case", a["area_id"], disease, daily_cases, ts)
                    )
                    inserted_reports += 1
                    
                    # 5% chance of a death count associated
                    if random.random() < 0.05:
                        deaths = max(1, int(daily_cases * random.uniform(0.05, 0.15)))
                        cursor.execute(
                            "INSERT INTO reports (report_type, area_id, disease_name, count, timestamp) VALUES (?, ?, ?, ?, ?)",
                            ("death", a["area_id"], disease, deaths, ts)
                        )
                        inserted_reports += 1
                        
    # 4. Generate alerts based on simulated red zones (let's insert some active mock alerts)
    print("Seeding alerts...")
    mock_alerts = [
        ("A-109", "Cholera", "🔴 Red Zone Alert: High-risk cluster of 'Cholera' detected near Charminar. Also reported at: nearby facilities. Immediate review recommended."),
        ("A-101", "Dengue", "🔴 Red Zone Alert: High-risk cluster of 'Dengue' detected near Madhapur. Vector control measures advised."),
        ("A-102", "Influenza", "🔴 Red Zone Alert: Surge in 'Influenza' case count at Hitech City clinic. Recommend resource check."),
    ]
    for area_id, disease, msg in mock_alerts:
        cursor.execute(
            "INSERT INTO alerts (area_id, disease_name, message, status) VALUES (?, ?, ?, ?)",
            (area_id, disease, msg, "new")
        )
        
    conn.commit()
    conn.close()
    print(f"Seeding completed successfully! Inserted {len(AREAS)} areas, {inserted_reports} reports, and {len(mock_alerts)} alerts.")

if __name__ == "__main__":
    seed()
