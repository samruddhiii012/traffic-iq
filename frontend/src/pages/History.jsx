import { useEffect, useState } from "react";

function History() {
    // =====================================================
    // USER DATA
    // =====================================================

    const [user] = useState(() => {
        const storedUser =
            localStorage.getItem("trafficIQUser");

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser);
        } catch (error) {
            console.error(
                "Unable to read saved user:",
                error
            );

            return null;
        }
    });

    const [token] = useState(() => {
        return localStorage.getItem(
            "trafficIQToken"
        );
    });


    // =====================================================
    // HISTORY STATE
    // =====================================================

    const [history, setHistory] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");


    // =====================================================
    // FILTER STATE
    // =====================================================

    const [searchTerm, setSearchTerm] = useState("");

    const [congestionFilter, setCongestionFilter] =
        useState("ALL");

    const [dateFilter, setDateFilter] =
        useState("ALL");

    const [sortBy, setSortBy] = useState("newest");


    // =====================================================
    // FETCH HISTORY
    // =====================================================

    useEffect(() => {

        const fetchHistory = async () => {

            setLoading(true);
            setError("");

            try {

                let response;


                // -------------------------------------------------
                // LOGGED-IN USER
                // -------------------------------------------------

                if (user && token) {

                    response = await fetch(
                        "http://127.0.0.1:8000/my-history",
                        {
                            method: "GET",
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );

                }

                // -------------------------------------------------
                // GUEST
                // -------------------------------------------------

                else {

                    response = await fetch(
                        "http://127.0.0.1:8000/traffic/history",
                        {
                            method: "GET",
                        }
                    );

                }


                const data =
                    await response.json();


                // -------------------------------------------------
                // ERROR
                // -------------------------------------------------

                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        "Failed to fetch traffic history."
                    );

                }


                // -------------------------------------------------
                // SAVE HISTORY
                // -------------------------------------------------

                setHistory(
                    data.history || []
                );


            } catch (error) {

                console.error(
                    "History error:",
                    error
                );

                setError(
                    error.message ||
                    "Unable to load traffic history."
                );

            } finally {

                setLoading(false);

            }

        };


        fetchHistory();

    }, [user, token]);


    // =====================================================
    // DATE HELPER
    // =====================================================

    const getRecordDate = (timestamp) => {

        if (!timestamp) {
            return null;
        }

        const normalizedTimestamp =
            String(timestamp).replace(" ", "T");

        const date =
            new Date(normalizedTimestamp);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    };


    // =====================================================
    // FILTER HISTORY
    // =====================================================

    const filteredHistory = history.filter((item) => {

        // -------------------------------------------------
        // SEARCH
        // -------------------------------------------------

        const search =
            searchTerm.trim().toLowerCase();

        const matchesSearch =
            !search ||
            String(item.id || "")
                .toLowerCase()
                .includes(search) ||
            String(item.location || "")
                .toLowerCase()
                .includes(search) ||
            String(item.location_source || "")
                .toLowerCase()
                .includes(search) ||
            String(item.timestamp || "")
                .toLowerCase()
                .includes(search);


        // -------------------------------------------------
        // CONGESTION
        // -------------------------------------------------

        const matchesCongestion =
            congestionFilter === "ALL" ||
            String(item.congestion || "")
                .toUpperCase() ===
                congestionFilter;


        // -------------------------------------------------
        // DATE
        // -------------------------------------------------

        let matchesDate = true;

        if (dateFilter !== "ALL") {

            const recordDate =
                getRecordDate(item.timestamp);

            if (!recordDate) {
                matchesDate = false;
            } else {

                const today =
                    new Date();

                today.setHours(
                    0,
                    0,
                    0,
                    0
                );

                const recordDay =
                    new Date(recordDate);

                recordDay.setHours(
                    0,
                    0,
                    0,
                    0
                );


                if (dateFilter === "TODAY") {

                    matchesDate =
                        recordDay.getTime() ===
                        today.getTime();

                }


                if (dateFilter === "7_DAYS") {

                    const sevenDaysAgo =
                        new Date(today);

                    sevenDaysAgo.setDate(
                        today.getDate() - 6
                    );

                    matchesDate =
                        recordDay >=
                        sevenDaysAgo &&
                        recordDay <=
                        today;

                }


                if (dateFilter === "30_DAYS") {

                    const thirtyDaysAgo =
                        new Date(today);

                    thirtyDaysAgo.setDate(
                        today.getDate() - 29
                    );

                    matchesDate =
                        recordDay >=
                        thirtyDaysAgo &&
                        recordDay <=
                        today;

                }

            }

        }


        return (
            matchesSearch &&
            matchesCongestion &&
            matchesDate
        );

    });

    const sortedHistory = [...filteredHistory].sort((a, b) => {
        if (sortBy === "newest") {
            return new Date(b.timestamp) - new Date(a.timestamp);
        }

        if (sortBy === "oldest") {
            return new Date(a.timestamp) - new Date(b.timestamp);
        }

        if (sortBy === "highest") {
            return (
                Number(b.total_vehicles || 0) -
                Number(a.total_vehicles || 0)
            );
        }

        if (sortBy === "lowest") {
            return (
                Number(a.total_vehicles || 0) -
                Number(b.total_vehicles || 0)
            );
        }

        return 0;
    });


    // =====================================================
    // RESET FILTERS
    // =====================================================

    const clearFilters = () => {

        setSearchTerm("");

        setCongestionFilter("ALL");

        setDateFilter("ALL");

        setSortBy("newest");

    };


    const hasActiveFilters =
        searchTerm.trim() !== "" ||
        congestionFilter !== "ALL" ||
        dateFilter !== "ALL";


    // =====================================================
    // PAGE TITLE
    // =====================================================

    const pageTitle = user
        ? "My Traffic History"
        : "Traffic History";


    const pageDescription = user
        ? `Analysis records for ${user.name}`
        : "Recent public traffic analysis records";


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (
            <div className="page-container history-page">

                <div className="page-header">

                    <h1>
                        Traffic History
                    </h1>

                    <p>
                        Loading your traffic history...
                    </p>

                </div>


                <div className="history-section">

                    <div className="no-results">

                        <p>
                            Loading History...
                        </p>

                    </div>

                </div>

            </div>
        );

    }


    // =====================================================
    // ERROR
    // =====================================================

    if (error) {

        return (
            <div className="page-container history-page">

                <div className="page-header">

                    <h1>
                        {pageTitle}
                    </h1>

                    <p>
                        {pageDescription}
                    </p>

                </div>


                <div className="history-section">

                    <div className="no-results">

                        <p>
                            ❌ Unable to load history
                        </p>

                        <span>
                            {error}
                        </span>

                    </div>

                </div>

            </div>
        );

    }


    // =====================================================
    // MAIN PAGE
    // =====================================================

    return (
        <div className="page-container history-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="page-header">

                <h1>
                    {pageTitle}
                </h1>

                <p>
                    {pageDescription}
                </p>

            </div>


            {/* =================================================
                FILTER PANEL
            ================================================= */}

            <section className="history-filter-card">

                <div className="history-filter-heading">

                    <div>

                        <span className="history-filter-label">
                            HISTORY FILTERS
                        </span>

                        <h2>
                            Search & Filter Records
                        </h2>

                    </div>

                    <span className="history-record-count">
                        {filteredHistory.length} of {history.length} records
                    </span>

                </div>


                <div className="history-filter-grid">

                    {/* SEARCH */}

                    <div className="history-filter-field search-field">

                        <label>
                            Search
                        </label>

                        <div className="history-search-wrapper">

                            <span className="history-search-icon">
                                🔎
                            </span>

                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) =>
                                    setSearchTerm(e.target.value)
                                }
                                placeholder="Search by location, ID or time..."
                            />

                        </div>

                    </div>


                    {/* CONGESTION */}

                    <div className="history-filter-field">

                        <label>
                            Traffic Level
                        </label>

                        <select
                            value={congestionFilter}
                            onChange={(e) =>
                                setCongestionFilter(
                                    e.target.value
                                )
                            }
                        >

                            <option value="ALL">
                                All Levels
                            </option>

                            <option value="LOW">
                                Low
                            </option>

                            <option value="MEDIUM">
                                Medium
                            </option>

                            <option value="HIGH">
                                High
                            </option>

                        </select>

                    </div>


                    {/* DATE */}

                    <div className="history-filter-field">

                        <label>
                            Date Range
                        </label>

                        <select
                            value={dateFilter}
                            onChange={(e) =>
                                setDateFilter(
                                    e.target.value
                                )
                            }
                        >

                            <option value="ALL">
                                All Dates
                            </option>

                            <option value="TODAY">
                                Today
                            </option>

                            <option value="7_DAYS">
                                Last 7 Days
                            </option>

                            <option value="30_DAYS">
                                Last 30 Days
                            </option>

                        </select>

                    </div>

                </div>


                {hasActiveFilters && (

                    <div className="history-filter-footer">

                        <span>
                            Filters applied
                        </span>

                        <button
                            type="button"
                            onClick={clearFilters}
                        >
                            Clear Filters
                        </button>

                    </div>

                )}

            </section>


            {/* =================================================
                HISTORY TABLE
            ================================================= */}

            <div className="history-section">

                <div className="history-section-heading">

                    <div>

                        <h2>
                            {user
                                ? "My Analysis Records"
                                : "Recent Traffic Records"}
                        </h2>

                        <p>
                            Showing {filteredHistory.length} matching record
                            {filteredHistory.length === 1
                                ? ""
                                : "s"}
                        </p>

                    </div>

                </div>


                {filteredHistory.length === 0 ? (

                    <div className="history-filter-empty">

                        <div className="history-empty-icon">
                            🔎
                        </div>

                        <h3>
                            No matching records
                        </h3>

                        <p>
                            Try changing your search or filters.
                        </p>

                        {hasActiveFilters && (

                            <button
                                type="button"
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </button>

                        )}

                    </div>

                ) : (

                    <div className="history-table">

                        {/* =================================================
                            TABLE HEADER
                        ================================================= */}

                        <div className="history-row history-header">

                            <span>ID</span>

                            <span>Time</span>

                            <span>Cars</span>

                            <span>Motorcycles</span>

                            <span>Buses</span>

                            <span>Trucks</span>

                            <span>Total</span>

                            <span>Average</span>

                            <span>Peak</span>

                            <span>Congestion</span>

                            <span>Location</span>

                            <span>Source</span>

                        </div>


                        {/* =================================================
                            TABLE ROWS
                        ================================================= */}

                        {sortedHistory.map((item) => (

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
                                    {item.cars}
                                </span>


                                <span>
                                    {item.motorcycles}
                                </span>


                                <span>
                                    {item.buses}
                                </span>


                                <span>
                                    {item.trucks}
                                </span>


                                <span>
                                    {item.total_vehicles}
                                </span>


                                <span>
                                    {Number(
                                        item.average_vehicles || 0
                                    ).toFixed(2)}
                                </span>


                                <span>
                                    {item.peak_vehicles}
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


                                <span
                                    title={
                                        item.location ||
                                        "Not available"
                                    }
                                >
                                    {item.location ||
                                        "Not available"}
                                </span>


                                <span>
                                    {item.location_source ||
                                        "Not available"}
                                </span>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
}

export default History;