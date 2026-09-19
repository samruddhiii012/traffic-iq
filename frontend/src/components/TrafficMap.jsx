import { useEffect, useState } from "react";

import {
    CircleMarker,
    MapContainer,
    Popup,
    TileLayer,
    useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const API_BASE = "http://127.0.0.1:8000";

const DEFAULT_CENTER = [
    19.0330,
    73.0297,
];


// =========================================================
// MAP VIEWPORT
// =========================================================

function MapViewport({ reports}) {
    const map = useMap();

    useEffect(() => {
        const validReports = reports.filter(
            (report) => 
                report.latitude !== null &&
                report.longitude !== null &&
                report.latitude !== undefined &&
                report.longitude !== undefined
        );
        if (validReports.length === 0) {
            map.setView(DEFAULT_CENTER, 12);
            return;
        }
        if (validReports.length === 1) {
            map.setView(
                [
                    Number(validReports[0].latitude),
                    Number(validReports[0].longitude),
                ],
                13
            );
            return;
        }

        const bounds = validReports.map(
            (report) => [
                Number(report.latitude),
                Number(report.longitude),
            ]
        );
        map.fitBounds(bounds, {
            padding: [30, 30],
        });
    }, [reports, map]);

    return null;
}


// =========================================================
// MARKER COLOR
// =========================================================

function getMarkerColor(report) {
    if (report.status === "RESOLVED") {
        return "#3B82F6";
    }
    if (report.severity === "HIGH") {
        return "#EF4444";
    }
    if (report.severity === "MEDIUM") {
        return "#F59E0B";
    }
    return "#16A34A";
}


// =========================================================
// TRAFFIC MAP
// =========================================================

function TrafficMap() {
    
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const loadReports = async () => {

        try {
            const response = await fetch(
                `${API_BASE}/community/reports`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Unable to load traffic reports."
                );
            }
            setReports(
                data.reports || []
            );
            setError("");
        } catch (err) {
            console.error(err);

            setError(
                "Traffic map data is currently unavailable."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();

        const interval = setInterval(loadReports, 15000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    const reportsWithLocation = 
        reports.filter(
            (report) =>
                report.latitude !== null &&
                report.longitude !== null &&
                report.latitude !== undefined &&
                report.longitude !== undefined
        );
    return (

        <div className="traffic-map">

            {loading ? (

                <div className="map-empty">

                    <strong>
                        Loading traffic map...
                    </strong>

                    <span>
                        Loading TrafficIQ community locations.
                    </span>

                </div>

            ) : error ? (

                <div className="map-empty">

                    <strong>
                        Traffic Map
                    </strong>

                    <span>
                        {error}
                    </span>

                </div>

            ) : (

                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={12}
                    scrollWheelZoom={true}
                >

                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapViewport
                        reports={reportsWithLocation}
                    />


                    {reportsWithLocation.map(
                        (report) => {

                            const color =
                                getMarkerColor(report);

                            return (

                                <CircleMarker
                                    key={report.id}
                                    center={[
                                        Number(
                                            report.latitude
                                        ),
                                        Number(
                                            report.longitude
                                        ),
                                    ]}
                                    radius={9}
                                    pathOptions={{
                                        color,
                                        fillColor: color,
                                        fillOpacity: 0.75,
                                        weight: 3,
                                    }}
                                >

                                    <Popup>

                                        <div
                                            style={{
                                                minWidth:
                                                    "180px",
                                            }}
                                        >

                                            <strong
                                                style={{
                                                    display:
                                                        "block",
                                                    marginBottom:
                                                        "6px",
                                                }}
                                            >
                                                {report.category}
                                            </strong>

                                            <div>
                                                📍{" "}
                                                {report.location}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop:
                                                        "5px",
                                                }}
                                            >
                                                Status:{" "}
                                                {report.status}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop:
                                                        "5px",
                                                }}
                                            >
                                                Severity:{" "}
                                                {report.severity}
                                            </div>

                                        </div>

                                    </Popup>

                                </CircleMarker>

                            );
                        }
                    )}

                </MapContainer>

            )}


            {/* MAP LEGEND */}

            {!loading &&
                !error && (
                    <div className="map-legend">

                        <span
                            className="map-legend-item"
                        >
                            <span
                                className="map-legend-dot green"
                            ></span>
                            Low
                        </span>

                        <span
                            className="map-legend-item"
                        >
                            <span
                                className="map-legend-dot yellow"
                            ></span>
                            Medium
                        </span>

                        <span
                            className="map-legend-item"
                        >
                            <span
                                className="map-legend-dot red"
                            ></span>
                            High
                        </span>

                        <span
                            className="map-legend-item"
                        >
                            <span
                                className="map-legend-dot blue"
                            ></span>
                            Resolved
                        </span>

                    </div>
                )}

        </div>
    );
}


export default TrafficMap;