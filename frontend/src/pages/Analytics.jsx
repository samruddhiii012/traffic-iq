import { useEffect, useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

function Analytics() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedRange, setSelectedRange] = useState("all");

    useEffect(() => {
        const fetchHistory = () => {
            fetch("https://traffic-iq-production.up.railway.app/traffic/history")
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch history");
                    }

                    return response.json();
                })
                .then((data) => {
                    setHistory(data.history || []);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error(error);
                    setLoading(false);
                });
        };

        fetchHistory();

        const interval = setInterval(fetchHistory, 5000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1>Traffic Analysis</h1>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    // =====================================================
    // DATE FILTER
    // =====================================================

    const parseTimestamp = (timestamp) => {
        if (!timestamp) {
            return null;
        }

        const normalized = String(timestamp).replace(" ", "T");
        const parsed = new Date(normalized);

        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        return parsed;
    };

    const isInSelectedRange = (timestamp) => {
        if (selectedRange === "all") {
            return true;
        }

        const recordDate = parseTimestamp(timestamp);

        if (!recordDate) {
            return false;
        }

        const now = new Date();

        if (selectedRange === "today") {
            return (
                recordDate.getFullYear() === now.getFullYear() &&
                recordDate.getMonth() === now.getMonth() &&
                recordDate.getDate() === now.getDate()
            );
        }

        const differenceMs = now.getTime() - recordDate.getTime();
        const differenceDays = differenceMs / (1000 * 60 * 60 * 24);

        if (selectedRange === "7days") {
            return differenceDays >= 0 && differenceDays <= 7;
        }

        if (selectedRange === "30days") {
            return differenceDays >= 0 && differenceDays <= 30;
        }

        return true;
    };

    const filteredHistory = history.filter((item) =>
        isInSelectedRange(item.timestamp)
    );

    const chartData = [...filteredHistory].reverse();

    const latestRecord =
        filteredHistory.length > 0 ? filteredHistory[0] : null;

    const analyticsInsights = (() => {
        if (filteredHistory.length === 0) {
            return {
                averageVehicles: 0,
                highestTraffic: 0,
                highestTrafficTime: "N/A",
                mostCommonCongestion: "N/A",
                totalRecords: 0,
            };
        }

        const totalVehicles = filteredHistory.reduce(
            (sum, item) => sum + Number(item.total_vehicles || 0),
            0
        );

        const highestRecord = filteredHistory.reduce((max, item) => {
            return Number(item.total_vehicles || 0) >
                Number(max.total_vehicles || 0)
                ? item
                : max;
        }, filteredHistory[0]);

        const congestionCounts = {};

        filteredHistory.forEach((item) => {
            const level = (item.congestion || "UNKNOWN").toUpperCase();
            congestionCounts[level] = (congestionCounts[level] || 0) + 1;
        });

        const mostCommonCongestion = Object.entries(congestionCounts).sort(
            (a, b) => b[1] - a[1]
        )[0]?.[0] || "N/A";

        return {
            averageVehicles: Math.round(totalVehicles / filteredHistory.length),
            highestTraffic: Number(highestRecord.total_vehicles || 0),
            peakTrafficTime: highestRecord.timestamp || "N/A",
            highestTrafficTime: highestRecord.timestamp || "N/A",
            mostCommonCongestion,
            totalRecords: filteredHistory.length,
        };
})();

const congestionDistribution = (() => {
    const counts = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
    };

    filteredHistory.forEach((item) => {
        const level = (item.congestion || "").toUpperCase();

        if (counts[level] !== undefined) {
            counts[level]++;
        }
    });

    return counts;
})();

    return (
        <div className="page-container">

            {/* =====================================================
                PAGE HEADER
            ===================================================== */}

            <div className="page-header">
                <div>
                    <h1>Traffic Analysis</h1>
                    <p>
                        Analyze traffic trends and vehicle distribution
                    </p>
                </div>
            </div>


            {/* =====================================================
                ANALYTICS FILTER
            ===================================================== */}

            <section className="analytics-filter-card">

                <div className="analytics-filter-heading">
                    <div>
                        <span className="analytics-filter-label">
                            ANALYTICS PERIOD
                        </span>

                        <h2>Traffic Data Range</h2>
                    </div>

                    <span className="analytics-record-count">
                        {filteredHistory.length} records
                    </span>
                </div>


                <div className="analytics-filter-buttons">

                    <button
                        type="button"
                        className={
                            selectedRange === "all"
                                ? "analytics-filter-button active"
                                : "analytics-filter-button"
                        }
                        onClick={() => setSelectedRange("all")}
                    >
                        All
                    </button>

                    <button
                        type="button"
                        className={
                            selectedRange === "today"
                                ? "analytics-filter-button active"
                                : "analytics-filter-button"
                        }
                        onClick={() => setSelectedRange("today")}
                    >
                        Today
                    </button>

                    <button
                        type="button"
                        className={
                            selectedRange === "7days"
                                ? "analytics-filter-button active"
                                : "analytics-filter-button"
                        }
                        onClick={() => setSelectedRange("7days")}
                    >
                        7 Days
                    </button>

                    <button
                        type="button"
                        className={
                            selectedRange === "30days"
                                ? "analytics-filter-button active"
                                : "analytics-filter-button"
                        }
                        onClick={() => setSelectedRange("30days")}
                    >
                        30 Days
                    </button>

                </div>

            </section>


            {/* =====================================================
                ANALYTICS SUMMARY
            ===================================================== */}

            <section className="analytics-grid">

                <div className="analytics-card">

                    <span className="analytics-card-label">
                        TOTAL RECORDS
                    </span>

                    <h2>Records</h2>

                    <p className="big-number">
                        {filteredHistory.length}
                    </p>

                </div>


                <div className="analytics-card">

                    <span className="analytics-card-label">
                        LATEST VEHICLES
                    </span>

                    <h2>Vehicles</h2>

                    <p className="big-number">
                        {latestRecord
                            ? latestRecord.total_vehicles
                            : 0}
                    </p>

                </div>


                <div className="analytics-card">

                    <span className="analytics-card-label">
                        LATEST PEAK
                    </span>

                    <h2>Peak Vehicles</h2>

                    <p className="big-number">
                        {latestRecord
                            ? latestRecord.peak_vehicles
                            : 0}
                    </p>

                </div>

            </section>


            
{/* =====================================================
    CONGESTION DISTRIBUTION
===================================================== */}

<section className="analytics-congestion-card">

    <div className="analytics-chart-header">
        <div>
            <span className="analytics-filter-label">
                TRAFFIC LEVEL
            </span>

            <h2>Congestion Distribution</h2>
        </div>

        <span className="chart-period-label">
            {selectedRange === "all"
                ? "All Records"
                : selectedRange === "today"
                ? "Today"
                : selectedRange === "7days"
                ? "Last 7 Days"
                : "Last 30 Days"}
        </span>
    </div>

    <div className="congestion-distribution-grid">

        <div className="congestion-item low">
            <div className="congestion-item-top">
                <span className="congestion-dot"></span>
                <span>LOW</span>
            </div>

            <strong>{congestionDistribution.LOW}</strong>
            <small>records</small>
        </div>

        <div className="congestion-item medium">
            <div className="congestion-item-top">
                <span className="congestion-dot"></span>
                <span>MEDIUM</span>
            </div>

            <strong>{congestionDistribution.MEDIUM}</strong>
            <small>records</small>
        </div>

        <div className="congestion-item high">
            <div className="congestion-item-top">
                <span className="congestion-dot"></span>
                <span>HIGH</span>
            </div>

            <strong>{congestionDistribution.HIGH}</strong>
            <small>records</small>
        </div>

    </div>

</section>


{/* =====================================================
    TRAFFIC LEVEL VISUAL
===================================================== */}

<section className="analytics-traffic-level-card">
    <div className="analytics-chart-header">
        <div>
            <span className="analytics-filter-label">
                TRAFFIC BREAKDOWN
            </span>
            <h2>Traffic Level Overview</h2>
        </div>

        <span className="chart-period-label">
            {filteredHistory.length} Records
        </span>
    </div>

    <div className="traffic-level-bars">

        <div className="traffic-level-row">
            <div className="traffic-level-label">
                <span className="traffic-level-dot low-dot"></span>
                <span>LOW</span>
            </div>

            <div className="traffic-level-track">
                <div
                    className="traffic-level-fill low-fill"
                    style={{
                        width: `${
                            filteredHistory.length
                                ? (congestionDistribution.LOW / filteredHistory.length) * 100
                                : 0
                        }%`,
                    }}
                ></div>
            </div>

            <strong>{congestionDistribution.LOW}</strong>
        </div>

        <div className="traffic-level-row">
            <div className="traffic-level-label">
                <span className="traffic-level-dot medium-dot"></span>
                <span>MEDIUM</span>
            </div>

            <div className="traffic-level-track">
                <div
                    className="traffic-level-fill medium-fill"
                    style={{
                        width: `${
                            filteredHistory.length
                                ? (congestionDistribution.MEDIUM / filteredHistory.length) * 100
                                : 0
                        }%`,
                    }}
                ></div>
            </div>

            <strong>{congestionDistribution.MEDIUM}</strong>
        </div>

        <div className="traffic-level-row">
            <div className="traffic-level-label">
                <span className="traffic-level-dot high-dot"></span>
                <span>HIGH</span>
            </div>

            <div className="traffic-level-track">
                <div
                    className="traffic-level-fill high-fill"
                    style={{
                        width: `${
                            filteredHistory.length
                                ? (congestionDistribution.HIGH / filteredHistory.length) * 100
                                : 0
                        }%`,
                    }}
                ></div>
            </div>

            <strong>{congestionDistribution.HIGH}</strong>
        </div>

    </div>
</section>


            {/* =====================================================
                VEHICLE TREND
            ===================================================== */}

            
            <section className="analytics-insights-grid">
                <div className="analytics-insight-card">
                    <div className="analytics-insight-icon">🚗</div>
                    <div>
                        <span>Average Traffic</span>
                        <strong>{analyticsInsights.averageVehicles}</strong>
                        <small>vehicles per record</small>
                    </div>
                </div>

                <div className="analytics-insight-card">
                    <div className="analytics-insight-icon">📈</div>
                    <div>
                        <span>Highest Traffic</span>
                        <strong>{analyticsInsights.highestTraffic}</strong>
                        <small>vehicles recorded</small>
                    </div>
                </div>

                <div className="analytics-insight-card">
                    <div className="analytics-insight-icon">🚦</div>
                    <div>
                        <span>Most Common Level</span>
                        <strong>{analyticsInsights.mostCommonCongestion}</strong>
                        <small>based on selected range</small>
                    </div>
                </div>

                <div className="analytics-insight-card">
                    <div className="analytics-insight-icon">🕒</div>
                    <div>
                        <span>Records Analyzed</span>
                        <strong>{analyticsInsights.totalRecords}</strong>
                        <small>within selected filters</small>
                    </div>
                </div>
            </section>

            <div className="analytics-insight-card">
                <div className="analytics-insight-icon">⏰</div>
                <div>
                    <span>Peak Traffic Time</span>
                    <strong>
                        {analyticsInsights.peakTrafficTime !== "N/A"
                            ? new Date(analyticsInsights.peakTrafficTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                })
                            : "N/A"}
                    </strong>
                    <small>highest traffic record</small>
                </div>
            </div>



            <section className="analytics-chart-card">

                <div className="analytics-chart-header">

                    <div>
                        <span className="analytics-filter-label">
                            TREND ANALYSIS
                        </span>

                        <h2>Vehicle Trend</h2>
                    </div>

                    <span className="chart-period-label">
                        {selectedRange === "all"
                            ? "All Records"
                            : selectedRange === "today"
                            ? "Today"
                            : selectedRange === "7days"
                            ? "Last 7 Days"
                            : "Last 30 Days"}
                    </span>

                </div>

                {chartData.length > 0 ? (

                    <ResponsiveContainer width="100%" height={350}>

                        <LineChart data={chartData}>

                            <CartesianGrid
                                strokeDasharray="3 3"
                            />

                            <XAxis dataKey="id" />

                            <YAxis />

                            <Tooltip />

                            <Legend />

                            <Line
                                type="monotone"
                                dataKey="total_vehicles"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                name="Total Vehicles"
                            />

                            <Line
                                type="monotone"
                                dataKey="peak_vehicles"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                name="Peak Vehicles"
                            />

                        </LineChart>

                    </ResponsiveContainer>

                ) : (

                    <div className="analytics-empty-state">
                        <div className="analytics-empty-icon">
                            📊
                        </div>

                        <h3>No data available</h3>

                        <p>
                            There are no traffic records for the selected
                            time period.
                        </p>
                    </div>

                )}

            </section>


            {/* =====================================================
                VEHICLE TYPE COMPARISON
            ===================================================== */}

            <section className="analytics-chart-card">

                <div className="analytics-chart-header">

                    <div>
                        <span className="analytics-filter-label">
                            VEHICLE DISTRIBUTION
                        </span>

                        <h2>Vehicle Type Comparison</h2>
                    </div>

                    <span className="chart-period-label">
                        {selectedRange === "all"
                            ? "All Records"
                            : selectedRange === "today"
                            ? "Today"
                            : selectedRange === "7days"
                            ? "Last 7 Days"
                            : "Last 30 Days"}
                    </span>

                </div>

                {chartData.length > 0 ? (

                    <ResponsiveContainer width="100%" height={350}>

                        <BarChart data={chartData}>

                            <CartesianGrid
                                strokeDasharray="3 3"
                            />

                            <XAxis dataKey="id" />

                            <YAxis />

                            <Tooltip />

                            <Legend />

                            <Bar
                                dataKey="cars"
                                fill="#3b82f6"
                                name="Cars"
                            />

                            <Bar
                                dataKey="motorcycles"
                                fill="#10b981"
                                name="Motorcycles"
                            />

                            <Bar
                                dataKey="buses"
                                fill="#f59e0b"
                                name="Buses"
                            />

                            <Bar
                                dataKey="trucks"
                                fill="#ef4444"
                                name="Trucks"
                            />

                        </BarChart>

                    </ResponsiveContainer>

                ) : (

                    <div className="analytics-empty-state">
                        <div className="analytics-empty-icon">
                            🚗
                        </div>

                        <h3>No vehicle data available</h3>

                        <p>
                            Try selecting another time period.
                        </p>
                    </div>

                )}

            </section>

        </div>
    );
}

export default Analytics;