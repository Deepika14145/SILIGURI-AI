# Siliguri Corridor – AI-Powered Threat Intelligence & Prediction System

An AI-driven threat intelligence platform designed to predict infiltration risks in the Siliguri Corridor using multi-source open data, geospatial analysis, and real-time risk visualization.

---

## Problem Statement

The Siliguri Corridor is a strategically critical 22 km stretch where low visibility, dense terrain, and multi-border pressure make real-time infiltration detection extremely difficult. Existing surveillance systems are largely reactive and lack predictive intelligence.

---

## Solution Overview

The platform applies machine learning and geospatial analytics to identify high-risk zones before incidents occur. It integrates weather data, satellite imagery, movement patterns, and historical incidents to generate a live threat heatmap and alerts.

---

## Key Features

* AI-based risk scoring and anomaly detection
* Live GIS-based threat heatmap
* Centralized monitoring dashboard
* Weather and terrain impact analysis
* Threshold-based alerting system
* Explainable risk indicators for decision support

---

## Technical Architecture

**Data Layer**

* Weather APIs
* Sentinel satellite imagery
* Mobility or movement data (simulated)
* Historical incident datasets

**Processing Layer**

* Data cleaning and normalization
* Feature extraction
* Anomaly detection using Isolation Forest or Autoencoders

**Risk Engine**

* Weighted risk scoring model combining real-time and historical inputs

**Visualization Layer**

* GIS-based heatmap using Leaflet.js or Mapbox
* Central dashboard for monitoring

**Alerting Layer**

* Threshold-based alerts using SMS or audio notification APIs

---

## Tech Stack

**Frontend**

* React.js or Next.js
* Leaflet.js or Mapbox GL JS
* Chart.js or Recharts
* Tailwind CSS

**Backend**

* Python (FastAPI or Flask) or Node.js (Express)

**Machine Learning**

* Python
* Pandas, NumPy
* Scikit-learn
* GeoPandas

**Database & Storage**

* SQLite or PostgreSQL with PostGIS
* JSON files for rapid prototyping

**Deployment**

* Vercel or Netlify (frontend)
* Render or Railway (backend)

---

## Screenshots
<img width="1906" height="836" alt="image" src="https://github.com/user-attachments/assets/05ae7f60-54b2-421c-b049-b8d155abdb91" />
<img width="1904" height="845" alt="image" src="https://github.com/user-attachments/assets/194aa6b3-218f-4c06-bd12-c1c77e012f74" />


## Useful Links

* Demo Video: https://youtu.be/EpKUIhCltz4
* System Walkthrough: https://www.youtube.com/watch?v=pBEc_qVPIQM

---

## Impact

The system enables early threat detection, reduces blind patrolling, improves situational awareness, and supports faster decision-making using cost-effective and scalable technology.

---

## License

This project is developed for educational and hackathon purposes only and does not use real or classified military systems.

---


