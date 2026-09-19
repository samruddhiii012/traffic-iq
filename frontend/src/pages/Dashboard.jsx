import { useEffect, useState } from "react";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

import TrafficMap from "../components/TrafficMap";

function Dashboard() {

    // =====================================================
    // TRAFFIC DATA
    // =====================================================

    const [traffic, setTraffic] = useState(null);
    const [history, setHistory] = useState([]);

    const [loading, setLoading] = useState(true);


    // =====================================================
    // TRAFFIC NEAR ME
    // =====================================================

    const [nearbyTraffic, setNearbyTraffic] = useState(null);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [nearbyError, setNearbyError] = useState("");


    // =====================================================
    // FETCH DASHBOARD DATA
    // =====================================================

    useEffect(() => {

        // -------------------------------------------------
        // FETCH LATEST TRAFFIC
        // -------------------------------------------------

        const fetchTrafficData = async () => {

            try {

                const response = await fetch(
                    "https://traffic-iq-production.up.railway.app/traffic"
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to fetch traffic data"
                    );
                }

                const data = await response.json();

                setTraffic(data);

            } catch (error) {

                console.error(
                    "Traffic data error:",
                    error
                );

                // Safe fallback when backend is offline

                setTraffic((previousTraffic) => {

                    if (previousTraffic) {
                        return previousTraffic;
                    }

                    return {
                        cars: 0,
                        motorcycles: 0,
                        buses: 0,
                        trucks: 0,
                        total_vehicles: 0,
                        average_vehicles: 0,
                        peak_vehicles: 0,
                        congestion: "OFFLINE",
                        location: null,
                    };

                });

            } finally {

                setLoading(false);

            }

        };


        // -------------------------------------------------
        // FETCH TRAFFIC HISTORY
        // -------------------------------------------------

        const fetchHistory = async () => {

            try {

                const response = await fetch(
                    "https://traffic-iq-production.up.railway.app/traffic/history"
                );

                if (!response.ok) {
                    throw new Error(
                        "Failed to fetch traffic history"
                    );
                }

                const data = await response.json();

                setHistory(
                    data.history || []
                );

            } catch (error) {

                console.error(
                    "Traffic history error:",
                    error
                );

            }

        };


        // -------------------------------------------------
        // INITIAL LOAD
        // -------------------------------------------------

        fetchTrafficData();
        fetchHistory();


        // -------------------------------------------------
        // AUTO REFRESH
        // -------------------------------------------------

        const trafficInterval = setInterval(
            fetchTrafficData,
            5000
        );

        const historyInterval = setInterval(
            fetchHistory,
            5000
        );


        // -------------------------------------------------
        // CLEANUP
        // -------------------------------------------------

        return () => {

            clearInterval(trafficInterval);
            clearInterval(historyInterval);

        };

    }, []);


    // =====================================================
    // TRAFFIC NEAR ME
    // =====================================================

    const handleTrafficNearMe = () => {

        if (!navigator.geolocation) {

            setNearbyError(
                "Geolocation is not supported by this browser."
            );

            return;
        }


        setNearbyLoading(true);
        setNearbyError("");
        setNearbyTraffic(null);


        navigator.geolocation.getCurrentPosition(

            async (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;


                try {

                    const response = await fetch(
                        `https://traffic-iq-production.up.railway.app/traffic/near-me?latitude=${latitude}&longitude=${longitude}`
                    );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.detail ||
                            "Unable to find nearby traffic."
                        );

                    }


                    if (!data.found) {

                        setNearbyError(
                            "No nearby traffic analysis is available yet."
                        );

                        setNearbyTraffic(null);

                        return;

                    }


                    setNearbyTraffic({
                        ...data.traffic,
                        distance_km:
                            data.distance_km,
                    });


                } catch (error) {

                    console.error(error);

                    setNearbyError(
                        error.message ||
                        "Unable to find nearby traffic."
                    );

                } finally {

                    setNearbyLoading(false);

                }

            },


            (error) => {

                console.error(error);

                setNearbyError(
                    "Unable to get your current location. Please allow location access."
                );

                setNearbyLoading(false);

            }

        );

    };


    // =====================================================
// TRAFFIC SCORE + ALERT
// =====================================================

const getTrafficScore = () => {
    if (!traffic) return 0;

    const level = traffic.congestion?.toUpperCase();

    if (level === "HIGH") return 90;
    if (level === "MEDIUM") return 60;
    if (level === "LOW") return 30;

    return 0;
};

const trafficScore = getTrafficScore();

const getTrafficAlert = () => {
    if (!traffic) {
        return {
            type: "INFO",
            title: "Traffic data unavailable",
            message: "Waiting for the latest traffic analysis.",
        };
    }

    const level = traffic.congestion?.toUpperCase();

    if (level === "HIGH") {
        return {
            type: "HIGH",
            title: "Heavy Traffic Detected",
            message:
                "Traffic density is currently high according to the latest TrafficIQ analysis.",
        };
    }

    if (level === "MEDIUM") {
        return {
            type: "MEDIUM",
            title: "Moderate Traffic",
            message:
                "Traffic is currently at a moderate level according to the latest analysis.",
        };
    }

    if (level === "LOW") {
        return {
            type: "LOW",
            title: "Traffic Flow Is Normal",
            message:
                "Current traffic density is relatively low according to the latest analysis.",
        };
    }

    return {
        type: "INFO",
        title: "Traffic Monitoring Active",
        message: "TrafficIQ is monitoring the latest available traffic data.",
    };
};

const trafficAlert = getTrafficAlert();


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (
            <div className="app">

                <div className="dashboard">

                    <div className="no-results">

                        <p>
                            Loading traffic data....
                        </p>

                    </div>

                </div>

            </div>
        );

    }


    // =====================================================
    // CHART DATA
    // =====================================================

    const chartData =
        [...history].reverse();


    // =====================================================
    // DASHBOARD
    // =====================================================

    return (

        <div className="app">


            {/* =================================================
                HEADER
            ================================================= */}

            <header className="header">

                <div>

                    <h1>
                        TrafficIQ
                    </h1>

                    <p>
                        Smart Traffic Monitoring Dashboard
                    </p>

                </div>

            </header>


            <main className="dashboard">


                {/* =================================================
                    1. TRAFFIC SAFETY TIPS + CITIZEN GUIDE
                ================================================= */}

                <section className="main-content">

                    {/* TRAFFIC SAFETY TIPS */}

                    <div className="traffic-card">

                        <h2>
                            🚦 Traffic Safety Tips
                        </h2>


                        <ul className="guide-list">

                            <li>
                                Maintain a safe distance
                                from other vehicles.
                            </li>

                            <li>
                                Follow traffic signals
                                and road signs.
                            </li>

                            <li>
                                Wear a helmet and seat belt.
                            </li>

                            <li>
                                Avoid unnecessary
                                lane changes.
                            </li>

                            <li>
                                Never use your phone
                                while driving.
                            </li>

                        </ul>

                    </div>


                    {/* CITIZEN TRAFFIC GUIDE */}

                    <div className="traffic-card">

                        <h2>
                            👥 Citizen Traffic Guide
                        </h2>


                        <ul className="guide-list">

                            <li>
                                Check traffic conditions
                                before leaving.
                            </li>

                            <li>
                                Choose alternate routes
                                when congestion is high.
                            </li>

                            <li>
                                Avoid unnecessary
                                peak-hour travel.
                            </li>

                            <li>
                                Report unusual or severe
                                congestion.
                            </li>

                            <li>
                                Follow local traffic rules
                                and road instructions.
                            </li>

                        </ul>

                    </div>

                </section>


                {/* =================================================
                    2. TRAFFIC NEAR ME
                ================================================= */}

                <section className="traffic-card">

                    <h2>
                        📍 Traffic Near Me
                    </h2>


                    <p className="description">

                        Check the nearest available traffic
                        analysis based on your current location.

                    </p>


                    <button
                        className="location-button"
                        onClick={handleTrafficNearMe}
                        disabled={nearbyLoading}
                    >

                        {nearbyLoading
                            ? "Finding Nearby Traffic..."
                            : "📍 Check Traffic Near Me"}

                    </button>


                    {nearbyError && (

                        <p className="upload-error">

                            ❌ {nearbyError}

                        </p>

                    )}


                    {nearbyTraffic && (

                        <div className="nearby-result">

                            <h3>
                                Nearby Traffic Status
                            </h3>


                            <div
                                className={`congestion ${
                                    nearbyTraffic.congestion
                                        .toLowerCase()
                                }`}
                            >

                                {nearbyTraffic.congestion}

                            </div>


                            <p className="description">

                                📍 {nearbyTraffic.location}

                            </p>


                            <p className="description">

                                Approximately{" "}

                                {nearbyTraffic.distance_km}

                                {" "}km from your current location.

                            </p>


                            <p className="description">

                                🚗 Cars:{" "}
                                {nearbyTraffic.cars}

                            </p>


                            <p className="description">

                                🏍️ Motorcycles:{" "}
                                {nearbyTraffic.motorcycles}

                            </p>


                            <p className="description">

                                🚌 Buses:{" "}
                                {nearbyTraffic.buses}

                            </p>


                            <p className="description">

                                🚚 Trucks:{" "}
                                {nearbyTraffic.trucks}

                            </p>


                            <p className="description">

                                🚦 Total Vehicles:{" "}
                                {nearbyTraffic.total_vehicles}

                            </p>


                            <small>

                                Last analyzed:{" "}
                                {nearbyTraffic.timestamp}

                            </small>

                        </div>

                    )}

                </section>


                {/* =====================================================
                    TRAFFIC MAP
                ===================================================== */}

                <section className="dashboard-map-section">

                    <div className="dashboard-map-header">

                        <div>

                            <div className="dashboard-map-title">

                                <span>🗺️</span>

                                <h2> TrafficIQ Traffic Map </h2>
                            </div>

                            <p className="dashboard-map-subtitle.">
                                community-reported traffic locations
                                and their current report status.
                            </p>
                        </div>

                        <div className="map-live-indicator">

                            <span className="map-live-dot"></span>

                            Traffic Reports

                        </div>
                    </div>
                    <TrafficMap />
                </section>


                {/* =====================================================
    TRAFFIC INTELLIGENCE
===================================================== */}

<section className="traffic-intelligence-grid">

    {/* TRAFFIC SCORE */}
    <div className="traffic-score-card">

        <div className="traffic-score-header">
            <div>
                <span className="traffic-mini-label">
                    TRAFFIC SCORE
                </span>

                <h2>
                    Traffic Intelligence
                </h2>
            </div>

            <div
                className={`traffic-score-badge ${trafficAlert.type.toLowerCase()}`}
            >
                {traffic.congestion}
            </div>
        </div>

        <div className="traffic-score-main">

            <div
                className={`traffic-score-circle ${trafficAlert.type.toLowerCase()}`}
            >
                <span className="traffic-score-number">
                    {trafficScore}
                </span>

                <span className="traffic-score-max">
                    / 100
                </span>
            </div>

            <div className="traffic-score-info">

                <h3>
                    {trafficAlert.title}
                </h3>

                <p>
                    {trafficAlert.message}
                </p>

                <small>
                    Based on the latest TrafficIQ traffic analysis.
                </small>

            </div>

        </div>

    </div>


    {/* TRAFFIC ALERT */}
    <div className={`traffic-alert-card ${trafficAlert.type.toLowerCase()}`}>

        <div className="traffic-alert-icon">
            {trafficAlert.type === "HIGH"
                ? "⚠️"
                : trafficAlert.type === "MEDIUM"
                ? "🚦"
                : "✅"}
        </div>

        <div>

            <span className="traffic-mini-label">
                TRAFFIC ALERT
            </span>

            <h2>
                {trafficAlert.title}
            </h2>

            <p>
                {trafficAlert.message}
            </p>

            <div className="traffic-alert-meta">
                🚗 {traffic.total_vehicles} vehicles detected
            </div>

        </div>

    </div>

</section>


                {/* =================================================
                    3. VEHICLE OVERVIEW
                ================================================= */}

                <section className="overview">


                    <div className="card">

                        <h3>
                            Cars
                        </h3>

                        <p className="number">
                            {traffic.cars}
                        </p>

                    </div>


                    <div className="card">

                        <h3>
                            Motorcycles
                        </h3>

                        <p className="number">
                            {traffic.motorcycles}
                        </p>

                    </div>


                    <div className="card">

                        <h3>
                            Buses
                        </h3>

                        <p className="number">
                            {traffic.buses}
                        </p>

                    </div>


                    <div className="card">

                        <h3>
                            Trucks
                        </h3>

                        <p className="number">
                            {traffic.trucks}
                        </p>

                    </div>

                </section>


                {/* =================================================
                    4. TRAFFIC STATUS
                ================================================= */}

                <section className="main-content">


                    <div className="traffic-card">

                        <h2>
                            Traffic Status
                        </h2>


                        <div
                            className={`congestion ${
                                traffic.congestion
                                    .toLowerCase()
                            }`}
                        >

                            {traffic.congestion}

                        </div>


                        <p className="description">

                            Current traffic congestion is{" "}

                            {traffic.congestion.toLowerCase()}.

                        </p>

                    </div>


                    <div className="traffic-card">

                        <h2>
                            Total Vehicles
                        </h2>


                        <p className="big-number">

                            {traffic.total_vehicles}

                        </p>


                        <p className="description">

                            Vehicles detected in the latest analysis

                        </p>

                    </div>

                </section>


                {/* =================================================
                    5. ANALYTICS
                ================================================= */}

                <section className="analytics">


                    <div className="analytics-card">

                        <h2>
                            Average Vehicles / Frame
                        </h2>


                        <p className="big-number">

                            {Number(
                                traffic.average_vehicles
                            ).toFixed(2)}

                        </p>

                    </div>


                    <div className="analytics-card">

                        <h2>
                            Peak Vehicles
                        </h2>


                        <p className="big-number">

                            {traffic.peak_vehicles}

                        </p>

                    </div>

                </section>


                {/* =================================================
                    6. TRAFFIC TREND
                ================================================= */}

                <section className="history-section">

                    <h2>
                        Traffic Trend
                    </h2>


                    <div className="chart-container">

                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >

                            <LineChart
                                data={chartData}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                />

                                <XAxis
                                    dataKey="id"
                                />

                                <YAxis />

                                <Tooltip />


                                <Line
                                    type="monotone"
                                    dataKey="total_vehicles"
                                    stroke="#38bdf8"
                                    strokeWidth={3}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </section>


                {/* =================================================
                    7. RECENT TRAFFIC HISTORY
                ================================================= */}

                <section className="history-section">

                    <h2>
                        Recent Traffic History
                    </h2>


                    <div className="history-table">


                        <div className="history-row history-header">

                            <span>
                                ID
                            </span>

                            <span>
                                Time
                            </span>

                            <span>
                                Total Vehicles
                            </span>

                            <span>
                                Congestion
                            </span>

                        </div>


                        {history.map((item) => (

                            <div
                                className="history-row"
                                key={item.id}
                            >

                                <span>
                                    {item.id}
                                </span>


                                <span>
                                    {item.timestamp}
                                </span>


                                <span>
                                    {item.total_vehicles}
                                </span>


                                <span
                                    className={`history-status ${
                                        item.congestion
                                            ? item.congestion.toLowerCase()
                                            : ""
                                    }`}
                                >

                                    {item.congestion}

                                </span>

                            </div>

                        ))}


                    </div>

                </section>


            </main>

        </div>

    );
}


export default Dashboard;