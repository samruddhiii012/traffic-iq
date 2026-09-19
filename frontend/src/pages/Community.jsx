import React, { useEffect, useState } from "react";

const API_BASE = "https://traffic-iq-production.up.railway.app";

const categories = [
    "Heavy Traffic",
    "Road Blocked",
    "Accident / Crash",
    "Signal Issue",
    "Traffic Diversion",
    "Lane Closure",
    "Vehicle Breakdown",
    "Route Suggestion",
];

const severities = ["LOW", "MEDIUM", "HIGH"];


function Community() {
    const [reports, setReports] = useState([]);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [loadingReports, setLoadingReports] = useState(false);

    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [showReportForm, setShowReportForm] = useState(false);

    const [form, setForm] = useState({
        category: "Heavy Traffic",
        description: "",
        location: "",
        latitude: "",
        longitude: "",
        suggested_route: "",
        severity: "MEDIUM",
    });

    const token = localStorage.getItem("trafficIQToken");

    const savedUser = localStorage.getItem("trafficIQUser");

    let currentUser = null;

    try {
        currentUser = savedUser
            ? JSON.parse(savedUser)
            : null;
    } catch {
        currentUser = null;
    }

    const isLoggedIn = !!token;


    // =====================================================
    // LOAD COMMUNITY REPORTS
    // =====================================================

    const loadReports = async (showLoader = false) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            setErrorMessage("");

            const response = await fetch(
                `${API_BASE}/community/reports`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Failed to load community reports."
                );
            }

            setReports(
                Array.isArray(data.reports)
                    ? data.reports
                    : []
            );

        } catch (error) {
            console.error(
                "Community reports error:",
                error
            );

            setErrorMessage(
                error.message ||
                "Unable to load community reports."
            );

        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    };


    // =====================================================
    // INITIAL LOAD + AUTO REFRESH
    // =====================================================

    useEffect(() => {
        loadReports(true);

        const interval = setInterval(() => {
            loadReports(false);
        }, 15000);

        return () => {
            clearInterval(interval);
        };
    }, []);


    // =====================================================
    // FORM CHANGE
    // =====================================================

    const handleFormChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        setMessage("");
        setErrorMessage("");
    };


    // =====================================================
    // CREATE REPORT
    // =====================================================

    const createReport = async (e) => {
        e.preventDefault();

        if (!isLoggedIn) {
            setMessage(
                "Please login to create a traffic report."
            );
            return;
        }

        if (
            !form.description.trim() ||
            !form.location.trim()
        ) {
            setMessage(
                "Please enter description and location."
            );
            return;
        }

        try {
            setMessage("");
            setErrorMessage("");
            setLoadingReports(true);

            const response = await fetch(
                `${API_BASE}/community/reports`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        category: form.category,
                        description:
                            form.description.trim(),
                        location:
                            form.location.trim(),

                        latitude: form.latitude
                            ? Number(form.latitude)
                            : null,

                        longitude: form.longitude
                            ? Number(form.longitude)
                            : null,

                        suggested_route:
                            form.suggested_route.trim() ||
                            null,

                        severity: form.severity,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Failed to create report."
                );
            }

            // =================================================
            // IMMEDIATELY SHOW NEW REPORT IN UI
            // =================================================

            const newReport = {
                id: data.report_id,
                category: form.category,
                description:
                    form.description.trim(),
                location:
                    form.location.trim(),

                latitude: form.latitude
                    ? Number(form.latitude)
                    : null,

                longitude: form.longitude
                    ? Number(form.longitude)
                    : null,

                suggested_route:
                    form.suggested_route.trim() ||
                    null,

                severity: form.severity,

                status: "ACTIVE",

                created_at: new Date().toLocaleString(),

                reported_by:
                    currentUser?.name ||
                    "You",

                confirmations: 0,
                comments: 0,
            };

            setReports((prev) => [
                newReport,
                ...prev,
            ]);

            setMessage(
                "Traffic report created successfully."
            );

            // Reset form

            setForm({
                category: "Heavy Traffic",
                description: "",
                location: "",
                latitude: "",
                longitude: "",
                suggested_route: "",
                severity: "MEDIUM",
            });

            setShowReportForm(false);

            // =================================================
            // REFRESH FROM BACKEND
            // =================================================

            await loadReports(false);

        } catch (error) {
            console.error(
                "Create report error:",
                error
            );

            setErrorMessage(
                error.message ||
                "Unable to create report."
            );

        } finally {
            setLoadingReports(false);
        }
    };


    // =====================================================
    // CONFIRM REPORT
    // =====================================================

    const confirmReport = async (reportId) => {

        if (!isLoggedIn) {
            setMessage(
                "Please login to confirm a traffic report."
            );
            return;
        }

        try {
            setMessage("");
            setErrorMessage("");

            const response = await fetch(
                `${API_BASE}/community/reports/${reportId}/confirm`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Unable to confirm report."
                );
            }

            setMessage(
                data.message ||
                "Report confirmed."
            );

            await loadReports(false);

        } catch (error) {
            console.error(
                "Confirm report error:",
                error
            );

            setErrorMessage(
                error.message ||
                "Unable to confirm report."
            );
        }
    };


    // =====================================================
    // FILTER REPORTS
    // =====================================================

    const filteredReports = reports.filter(
        (report) => {

            const reportStatus = (
                report.status ||
                "ACTIVE"
            ).toUpperCase();

            const statusMatch =
                statusFilter === "ALL" ||
                reportStatus === statusFilter;

            const categoryMatch =
                categoryFilter === "ALL" ||
                report.category === categoryFilter;

            return (
                statusMatch &&
                categoryMatch
            );
        }
    );


    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div
            className="community-page"
            style={{
                color: "#111827",
                paddingTop: "90px",
                paddingBottom: "40px",
                minHeight: "100%",
            }}
        >

            {/* =================================================
                HEADER
            ================================================= */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "20px",
                    marginBottom: "28px",
                    flexWrap: "wrap",
                }}
            >

                <div>

                    <h1
                        style={{
                            margin: "0 0 6px 0",
                            color: "#111827",
                            fontSize: "34px",
                            fontWeight: "700",
                        }}
                    >
                        Community Traffic
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            color: "#475569",
                            fontSize: "15px",
                        }}
                    >
                        Real traffic updates shared and
                        confirmed by TrafficIQ users.
                    </p>

                </div>


                {/* REPORT BUTTON */}

                {isLoggedIn ? (

                    <button
                        type="button"
                        onClick={() =>
                            setShowReportForm(
                                (prev) => !prev
                            )
                        }
                        style={{
                            border: "none",
                            borderRadius: "10px",
                            padding: "12px 18px",
                            cursor: "pointer",
                            fontWeight: "600",
                            background: "#0f172a",
                            color: "#ffffff",
                            fontSize: "14px",
                        }}
                    >
                        {showReportForm
                            ? "Close Report Form"
                            : "+ Report Traffic"}
                    </button>

                ) : (

                    <div
                        style={{
                            padding: "10px 14px",
                            borderRadius: "10px",
                            background: "#e2e8f0",
                            color: "#334155",
                            fontSize: "14px",
                            fontWeight: "500",
                        }}
                    >
                        Login to report or confirm traffic
                    </div>
                )}

            </div>


            {/* =================================================
                SUCCESS MESSAGE
            ================================================= */}

            {message && (

                <div
                    style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        marginBottom: "20px",
                        background: "#dcfce7",
                        color: "#166534",
                        fontSize: "14px",
                    }}
                >
                    ✅ {message}
                </div>
            )}


            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {errorMessage && (

                <div
                    style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        marginBottom: "20px",
                        background: "#fee2e2",
                        color: "#991b1b",
                        fontSize: "14px",
                    }}
                >
                    ❌ {errorMessage}
                </div>
            )}


            {/* =================================================
                REPORT FORM
            ================================================= */}

            {showReportForm && isLoggedIn && (

                <div
                    style={{
                        border:
                            "1px solid #e2e8f0",
                        borderRadius: "16px",
                        padding: "22px",
                        marginBottom: "24px",
                        background: "#ffffff",
                        color: "#111827",
                        boxShadow:
                            "0 8px 30px rgba(15, 23, 42, 0.08)",
                    }}
                >

                    <h2
                        style={{
                            marginTop: 0,
                            color: "#111827",
                            marginBottom: "20px",
                        }}
                    >
                        Report Traffic Issue
                    </h2>


                    <form onSubmit={createReport}>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "16px",
                            }}
                        >

                            {/* CATEGORY */}

                            <div>

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        color: "#334155",
                                        fontSize: "14px",
                                    }}
                                >
                                    Category
                                </label>

                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={
                                        handleFormChange
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "11px",
                                        marginTop: "6px",
                                        border:
                                            "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        color: "#111827",
                                        background: "#ffffff",
                                        boxSizing:
                                            "border-box",
                                    }}
                                >

                                    {categories.map(
                                        (category) => (
                                            <option
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>


                            {/* SEVERITY */}

                            <div>

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        color: "#334155",
                                        fontSize: "14px",
                                    }}
                                >
                                    Severity
                                </label>

                                <select
                                    name="severity"
                                    value={form.severity}
                                    onChange={
                                        handleFormChange
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "11px",
                                        marginTop: "6px",
                                        border:
                                            "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        color: "#111827",
                                        background: "#ffffff",
                                        boxSizing:
                                            "border-box",
                                    }}
                                >

                                    {severities.map(
                                        (severity) => (
                                            <option
                                                key={severity}
                                                value={severity}
                                            >
                                                {severity}
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>


                            {/* LOCATION */}

                            <div
                                style={{
                                    gridColumn: "1 / -1",
                                }}
                            >

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        color: "#334155",
                                        fontSize: "14px",
                                    }}
                                >
                                    Location
                                </label>

                                <input
                                    type="text"
                                    name="location"
                                    value={form.location}
                                    onChange={
                                        handleFormChange
                                    }
                                    placeholder="Example: Kharghar Station Road"
                                    style={{
                                        width: "100%",
                                        padding: "11px",
                                        marginTop: "6px",
                                        border:
                                            "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        color: "#111827",
                                        background: "#ffffff",
                                        boxSizing:
                                            "border-box",
                                    }}
                                />

                            </div>


                            {/* DESCRIPTION */}

                            <div
                                style={{
                                    gridColumn: "1 / -1",
                                }}
                            >

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        color: "#334155",
                                        fontSize: "14px",
                                    }}
                                >
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        form.description
                                    }
                                    onChange={
                                        handleFormChange
                                    }
                                    placeholder="Describe the traffic situation..."
                                    rows="4"
                                    style={{
                                        width: "100%",
                                        padding: "11px",
                                        marginTop: "6px",
                                        border:
                                            "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        color: "#111827",
                                        background: "#ffffff",
                                        boxSizing:
                                            "border-box",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                    }}
                                />

                            </div>


                            {/* LATITUDE */}

                            <div>

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        color: "#334155",
                                        fontSize: "14px",
                                    }}
                                >
                                    Latitude
                                </label>

                                <input
                                    type="number"
                                    step="any"
                                    name="latitude"
                                    value={form.latitude}
                                    onChange={
                                        handleFormChange
                                    }
                                    placeholder="Optional"
                                    style={{
                                        width: "100%",
                                        padding: "11px",
                                        marginTop: "6px",
                                        border:
                                            "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        color: "#111827",
                                        background: "#ffffff",
                                        boxSizing:
                                            "border-box",
                                    }}
                                />

                            </div>


                            {/* LONGITUDE */}

                            <div>

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        color: "#334155",
                                        fontSize: "14px",
                                    }}
                                >
                                    Longitude
                                </label>

                                <input
                                    type="number"
                                    step="any"
                                    name="longitude"
                                    value={form.longitude}
                                    onChange={
                                        handleFormChange
                                    }
                                    placeholder="Optional"
                                    style={{
                                        width: "100%",
                                        padding: "11px",
                                        marginTop: "6px",
                                        border:
                                            "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        color: "#111827",
                                        background: "#ffffff",
                                        boxSizing:
                                            "border-box",
                                    }}
                                />

                            </div>


                            {/* SUGGESTED ROUTE */}

                            <div
                                style={{
                                    gridColumn: "1 / -1",
                                }}
                            >

                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "600",
                                        color: "#334155",
                                        fontSize: "14px",
                                    }}
                                >
                                    Suggested Route
                                </label>

                                <input
                                    type="text"
                                    name="suggested_route"
                                    value={
                                        form.suggested_route
                                    }
                                    onChange={
                                        handleFormChange
                                    }
                                    placeholder="Example: Try Central Park Road"
                                    style={{
                                        width: "100%",
                                        padding: "11px",
                                        marginTop: "6px",
                                        border:
                                            "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        color: "#111827",
                                        background: "#ffffff",
                                        boxSizing:
                                            "border-box",
                                    }}
                                />

                            </div>

                        </div>


                        <button
                            type="submit"
                            disabled={loadingReports}
                            style={{
                                marginTop: "18px",
                                padding: "12px 20px",
                                border: "none",
                                borderRadius: "10px",
                                cursor: loadingReports
                                    ? "not-allowed"
                                    : "pointer",
                                fontWeight: "600",
                                background: "#0f172a",
                                color: "#ffffff",
                                opacity: loadingReports
                                    ? 0.6
                                    : 1,
                            }}
                        >
                            {loadingReports
                                ? "Submitting..."
                                : "Submit Traffic Report"}
                        </button>

                    </form>

                </div>
            )}


            {/* =================================================
                FILTERS
            ================================================= */}

            {!loading && reports.length > 0 && (

                <div
                    className="community-filter-bar"
                    style={{
                        marginBottom: "18px",
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                    }}
                >

                    <select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(
                                e.target.value
                            )
                        }
                    >
                        <option value="ALL">
                            All Status
                        </option>

                        <option value="ACTIVE">
                            Active
                        </option>

                        <option value="RESOLVED">
                            Resolved
                        </option>
                    </select>


                    <select
                        value={categoryFilter}
                        onChange={(e) =>
                            setCategoryFilter(
                                e.target.value
                            )
                        }
                    >
                        <option value="ALL">
                            All Categories
                        </option>

                        {categories.map(
                            (category) => (
                                <option
                                    key={category}
                                    value={category}
                                >
                                    {category}
                                </option>
                            )
                        )}

                    </select>

                </div>
            )}


            {/* =================================================
                REPORTS
            ================================================= */}

            {loading ? (

                <div
                    style={{
                        color: "#475569",
                        padding: "20px 0",
                    }}
                >
                    Loading community reports...
                </div>

            ) : errorMessage &&
              reports.length === 0 ? (

                <div
                    style={{
                        padding: "30px",
                        textAlign: "center",
                        borderRadius: "16px",
                        background: "#fff7ed",
                        color: "#9a3412",
                        border:
                            "1px solid #fed7aa",
                    }}
                >
                    <h3>
                        Unable to load reports
                    </h3>

                    <p>
                        {errorMessage}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            loadReports(true)
                        }
                        style={{
                            marginTop: "10px",
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: "8px",
                            background: "#0f172a",
                            color: "#ffffff",
                            cursor: "pointer",
                        }}
                    >
                        Retry
                    </button>
                </div>

            ) : reports.length === 0 ? (

                <div
                    style={{
                        padding: "40px 30px",
                        textAlign: "center",
                        borderRadius: "16px",
                        background: "#ffffff",
                        color: "#111827",
                        border:
                            "1px solid #e2e8f0",
                    }}
                >
                    <h3>
                        No traffic reports yet
                    </h3>

                    <p
                        style={{
                            color: "#64748b",
                        }}
                    >
                        Be the first person to report
                        a traffic situation.
                    </p>
                </div>

            ) : filteredReports.length === 0 ? (

                <div
                    style={{
                        padding: "40px 30px",
                        textAlign: "center",
                        borderRadius: "16px",
                        background: "#ffffff",
                        color: "#111827",
                        border:
                            "1px solid #e2e8f0",
                    }}
                >
                    <h3>
                        No matching traffic reports
                    </h3>

                    <p
                        style={{
                            color: "#64748b",
                        }}
                    >
                        Try changing the status or
                        category filter.
                    </p>
                </div>

            ) : (

                <div
                    style={{
                        display: "grid",
                        gap: "18px",
                    }}
                >

                    {filteredReports.map(
                        (report) => (

                            <ReportCard
                                key={report.id}
                                report={report}
                                token={token}
                                isLoggedIn={
                                    isLoggedIn
                                }
                                onConfirm={
                                    confirmReport
                                }
                                onReload={
                                    loadReports
                                }
                                setMessage={
                                    setMessage
                                }
                                setErrorMessage={
                                    setErrorMessage
                                }
                            />

                        )
                    )}

                </div>
            )}

        </div>
    );
}


// =========================================================
// REPORT CARD
// =========================================================

function ReportCard({
    report,
    token,
    isLoggedIn,
    onConfirm,
    onReload,
    setMessage,
    setErrorMessage,
}) {

    const [
        showComments,
        setShowComments,
    ] = useState(false);

    const [
        comments,
        setComments,
    ] = useState([]);

    const [
        commentText,
        setCommentText,
    ] = useState("");

    const [
        loadingComments,
        setLoadingComments,
    ] = useState(false);


    // =====================================================
    // LOAD COMMENTS
    // =====================================================

    const loadComments = async () => {

        try {

            setLoadingComments(true);
            setErrorMessage("");

            const response = await fetch(
                `${API_BASE}/community/reports/${report.id}/comments`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                    cache: "no-store",
                }
            );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Unable to load comments."
                );
            }

            setComments(
                data.comments || []
            );

        } catch (error) {

            console.error(
                "Load comments error:",
                error
            );

            setErrorMessage(
                error.message ||
                "Unable to load comments."
            );

        } finally {

            setLoadingComments(false);
        }
    };


    // =====================================================
    // TOGGLE COMMENTS
    // =====================================================

    const toggleComments = async () => {

        const newState =
            !showComments;

        setShowComments(
            newState
        );

        if (newState) {
            await loadComments();
        }
    };


    // =====================================================
    // ADD COMMENT
    // =====================================================

    const addComment = async (e) => {

        e.preventDefault();

        if (!isLoggedIn) {

            setMessage(
                "Please login to comment."
            );

            return;
        }

        if (!commentText.trim()) {
            return;
        }

        try {

            setErrorMessage("");

            const response =
                await fetch(
                    `${API_BASE}/community/reports/${report.id}/comments`,
                    {
                        method: "POST",

                        headers: {
                            Accept:
                                "application/json",

                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`,
                        },

                        body: JSON.stringify({
                            comment:
                                commentText.trim(),
                        }),
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Unable to add comment."
                );
            }

            setCommentText("");

            setMessage(
                "Comment added successfully."
            );

            await loadComments();

            await onReload(false);

        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );

            setErrorMessage(
                error.message ||
                "Unable to add comment."
            );
        }
    };


    // =====================================================
    // RESOLVE REPORT
    // =====================================================

    const resolveReport = async () => {

        if (!isLoggedIn) {

            setMessage(
                "Please login to resolve this report."
            );

            return;
        }

        try {

            setErrorMessage("");

            const response =
                await fetch(
                    `${API_BASE}/community/reports/${report.id}/resolve`,
                    {
                        method: "POST",

                        headers: {
                            Accept:
                                "application/json",

                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Unable to resolve report."
                );
            }

            setMessage(
                "Traffic report marked as resolved."
            );

            await onReload(false);

        } catch (error) {

            console.error(
                "Resolve report error:",
                error
            );

            setErrorMessage(
                error.message ||
                "Unable to resolve report."
            );
        }
    };


    // =====================================================
    // BADGES
    // =====================================================

    const severity =
        (
            report.severity ||
            "MEDIUM"
        ).toUpperCase();

    const status =
        (
            report.status ||
            "ACTIVE"
        ).toUpperCase();


    let severityBackground =
        "#e2e8f0";

    let severityColor =
        "#334155";


    if (severity === "HIGH") {

        severityBackground =
            "#fee2e2";

        severityColor =
            "#b91c1c";
    }


    if (severity === "MEDIUM") {

        severityBackground =
            "#fef3c7";

        severityColor =
            "#92400e";
    }


    if (severity === "LOW") {

        severityBackground =
            "#dcfce7";

        severityColor =
            "#15803d";
    }


    const statusBackground =
        status === "RESOLVED"
            ? "#dcfce7"
            : "#dbeafe";

    const statusColor =
        status === "RESOLVED"
            ? "#15803d"
            : "#1d4ed8";


    // =====================================================
    // REPORT CARD
    // =====================================================

    return (

        <div
            style={{
                border:
                    "1px solid #e2e8f0",

                borderRadius: "16px",

                padding: "20px",

                background: "#ffffff",

                color: "#111827",

                boxShadow:
                    "0 8px 30px rgba(15, 23, 42, 0.07)",
            }}
        >

            {/* =================================================
                HEADER
            ================================================= */}

            <div
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    alignItems:
                        "flex-start",
                    gap: "12px",
                    flexWrap: "wrap",
                }}
            >

                <div>

                    <div
                        style={{
                            fontSize: "13px",
                            color: "#64748b",
                            marginBottom:
                                "6px",
                        }}
                    >
                        Reported by{" "}

                        <strong>
                            {report.reported_by ||
                                "TrafficIQ user"}
                        </strong>
                    </div>

                    <h2
                        style={{
                            margin: 0,
                            color: "#111827",
                            fontSize: "24px",
                        }}
                    >
                        {report.category}
                    </h2>

                </div>


                {/* BADGES */}

                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                    }}
                >

                    <span
                        style={{
                            padding:
                                "6px 10px",

                            borderRadius:
                                "999px",

                            fontSize: "12px",

                            fontWeight: "700",

                            background:
                                severityBackground,

                            color:
                                severityColor,
                        }}
                    >
                        {severity}
                    </span>


                    <span
                        style={{
                            padding:
                                "6px 10px",

                            borderRadius:
                                "999px",

                            fontSize: "12px",

                            fontWeight: "700",

                            background:
                                statusBackground,

                            color:
                                statusColor,
                        }}
                    >
                        {status}
                    </span>

                </div>

            </div>


            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <div
                style={{
                    marginTop: "16px",
                    color: "#334155",
                    fontSize: "15px",
                    lineHeight: "1.6",
                }}
            >
                {report.description}
            </div>


            {/* =================================================
                LOCATION
            ================================================= */}

            <div
                style={{
                    marginTop: "14px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#0f172a",
                }}
            >
                📍 {report.location}
            </div>


            {/* =================================================
                SUGGESTED ROUTE
            ================================================= */}

            {report.suggested_route && (

                <div
                    style={{
                        marginTop: "10px",
                        padding:
                            "10px 12px",
                        borderRadius:
                            "10px",
                        background:
                            "#f8fafc",
                        color:
                            "#334155",
                        border:
                            "1px solid #e2e8f0",
                    }}
                >
                    🛣️{" "}
                    <strong>
                        Suggested route:
                    </strong>{" "}
                    {report.suggested_route}
                </div>
            )}


            {/* =================================================
                DATE
            ================================================= */}

            <div
                style={{
                    marginTop: "16px",
                    fontSize: "13px",
                    color: "#64748b",
                }}
            >
                {report.created_at ||
                    "Recently reported"}
            </div>


            {/* =================================================
                ACTION BUTTONS
            ================================================= */}

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "18px",
                    flexWrap: "wrap",
                }}
            >

                {status !== "RESOLVED" && (

                    <button
                        type="button"
                        onClick={() =>
                            onConfirm(
                                report.id
                            )
                        }
                        disabled={!isLoggedIn}
                        style={{
                            padding:
                                "10px 14px",

                            borderRadius:
                                "10px",

                            border:
                                "1px solid #cbd5e1",

                            cursor:
                                isLoggedIn
                                    ? "pointer"
                                    : "not-allowed",

                            background:
                                "#f8fafc",

                            color:
                                "#0f172a",

                            fontWeight:
                                "600",

                            opacity:
                                isLoggedIn
                                    ? 1
                                    : 0.6,
                        }}
                    >
                        ✅ Confirm (
                        {report.confirmations || 0}
                        )
                    </button>
                )}


                <button
                    type="button"
                    onClick={
                        toggleComments
                    }
                    style={{
                        padding:
                            "10px 14px",

                        borderRadius:
                            "10px",

                        border:
                            "1px solid #cbd5e1",

                        cursor:
                            "pointer",

                        background:
                            "#f8fafc",

                        color:
                            "#0f172a",

                        fontWeight:
                            "600",
                    }}
                >
                    💬 Comments (
                    {report.comments || 0}
                    )
                </button>


                {status !== "RESOLVED" && (

                    <button
                        type="button"
                        onClick={
                            resolveReport
                        }
                        disabled={
                            !isLoggedIn
                        }
                        style={{
                            padding:
                                "10px 14px",

                            borderRadius:
                                "10px",

                            border:
                                "1px solid #cbd5e1",

                            cursor:
                                isLoggedIn
                                    ? "pointer"
                                    : "not-allowed",

                            background:
                                "#f8fafc",

                            color:
                                "#0f172a",

                            fontWeight:
                                "600",

                            opacity:
                                isLoggedIn
                                    ? 1
                                    : 0.6,
                        }}
                    >
                        ✓ Mark Resolved
                    </button>
                )}

            </div>


            {/* =================================================
                COMMENTS
            ================================================= */}

            {showComments && (

                <div
                    style={{
                        marginTop: "20px",
                        paddingTop: "18px",
                        borderTop:
                            "1px solid #e2e8f0",
                    }}
                >

                    <h3
                        style={{
                            marginTop: 0,
                            marginBottom:
                                "14px",
                            color:
                                "#111827",
                        }}
                    >
                        Traffic Talk
                    </h3>


                    {loadingComments ? (

                        <p
                            style={{
                                color:
                                    "#64748b",
                            }}
                        >
                            Loading comments...
                        </p>

                    ) : comments.length === 0 ? (

                        <p
                            style={{
                                color:
                                    "#64748b",
                            }}
                        >
                            No comments yet.
                        </p>

                    ) : (

                        <div
                            style={{
                                display:
                                    "grid",
                                gap:
                                    "10px",
                                marginBottom:
                                    "15px",
                            }}
                        >

                            {comments.map(
                                (comment) => (

                                    <div
                                        key={
                                            comment.id
                                        }
                                        style={{
                                            padding:
                                                "10px 12px",

                                            borderRadius:
                                                "10px",

                                            background:
                                                "#f8fafc",

                                            border:
                                                "1px solid #e2e8f0",
                                        }}
                                    >

                                        <strong
                                            style={{
                                                color:
                                                    "#0f172a",
                                            }}
                                        >
                                            {
                                                comment.user
                                            }
                                        </strong>

                                        <div
                                            style={{
                                                marginTop:
                                                    "4px",
                                                color:
                                                    "#334155",
                                            }}
                                        >
                                            {
                                                comment.comment
                                            }
                                        </div>

                                        <small
                                            style={{
                                                display:
                                                    "block",
                                                marginTop:
                                                    "5px",
                                                color:
                                                    "#64748b",
                                            }}
                                        >
                                            {
                                                comment.created_at
                                            }
                                        </small>

                                    </div>
                                )
                            )}

                        </div>
                    )}


                    {/* COMMENT INPUT */}

                    {isLoggedIn ? (

                        <form
                            onSubmit={
                                addComment
                            }
                            style={{
                                display:
                                    "flex",
                                gap:
                                    "10px",
                                flexWrap:
                                    "wrap",
                            }}
                        >

                            <input
                                type="text"
                                value={
                                    commentText
                                }
                                onChange={(
                                    e
                                ) =>
                                    setCommentText(
                                        e.target.value
                                    )
                                }
                                placeholder="Add a traffic update..."
                                style={{
                                    flex: 1,
                                    minWidth:
                                        "220px",
                                    padding:
                                        "11px",
                                    border:
                                        "1px solid #cbd5e1",
                                    borderRadius:
                                        "10px",
                                    color:
                                        "#111827",
                                    background:
                                        "#ffffff",
                                    boxSizing:
                                        "border-box",
                                }}
                            />


                            <button
                                type="submit"
                                style={{
                                    padding:
                                        "11px 16px",
                                    border:
                                        "none",
                                    borderRadius:
                                        "10px",
                                    cursor:
                                        "pointer",
                                    fontWeight:
                                        "600",
                                    background:
                                        "#0f172a",
                                    color:
                                        "#ffffff",
                                }}
                            >
                                Comment
                            </button>

                        </form>

                    ) : (

                        <div
                            style={{
                                padding:
                                    "10px 12px",
                                borderRadius:
                                    "10px",
                                background:
                                    "#f8fafc",
                                border:
                                    "1px solid #e2e8f0",
                                color:
                                    "#475569",
                                fontSize:
                                    "14px",
                            }}
                        >
                            Login to join
                            Traffic Talk.
                        </div>
                    )}

                </div>
            )}

        </div>
    );
}


export default Community;