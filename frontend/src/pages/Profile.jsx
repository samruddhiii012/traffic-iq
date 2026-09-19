import { useEffect, useState } from "react";

function Profile() {
    const storedUser = localStorage.getItem("trafficIQUser");
    const token = localStorage.getItem("trafficIQToken");

    const user = storedUser
        ? JSON.parse(storedUser)
        : null;

    const userName = user?.name?.trim() || "TrafficIQ User";
    const userEmail = user?.email || "No email available";

    const userInitial = userName
        .charAt(0)
        .toUpperCase();

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const [openSection, setOpenSection] = useState(null);


    // =====================================================
    // FETCH USER ACTIVITY
    // =====================================================

    useEffect(() => {

        const fetchMyHistory = async () => {

            if (!token) {
                setHistoryLoading(false);
                return;
            }

            try {

                const response = await fetch(
                    "https://traffic-iq-production.up.railway.app/my-history",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail ||
                        "Failed to load activity."
                    );
                }

                setHistory(
                    data.history || []
                );

            } catch (error) {

                console.error(error);

            } finally {

                setHistoryLoading(false);

            }
        };


        fetchMyHistory();

    }, [token]);


    // =====================================================
    // ACTIVITY DATA
    // =====================================================

    const totalAnalyses = history.length;

    const latestAnalysis =
        history.length > 0
            ? history[0]
            : null;


    // =====================================================
    // ACCORDION
    // =====================================================

    const toggleSection = (section) => {

        setOpenSection(
            openSection === section
                ? null
                : section
        );

    };


    return (

        <div className="page-container">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="page-header">

                <h1>
                    Profile
                </h1>

                <p>
                    Your TrafficIQ account and activity
                </p>

            </div>


            <div className="profile-grid">


                {/* =================================================
                    MY INFORMATION
                ================================================= */}

                <div className="profile-card">

                    <div className="profile-avatar">
                        {userInitial}
                    </div>


                    <h2>
                        {userName}
                    </h2>


                    <p className="profile-role">
                        Traffic Monitoring User
                    </p>


                    <div className="profile-info">


                        <div className="profile-info-row">

                            <span>
                                Name
                            </span>

                            <strong>
                                {userName}
                            </strong>

                        </div>


                        <div className="profile-info-row">

                            <span>
                                Email
                            </span>

                            <strong>
                                {userEmail}
                            </strong>

                        </div>


                        <div className="profile-info-row">

                            <span>
                                Role
                            </span>

                            <strong>
                                User
                            </strong>

                        </div>


                        <div className="profile-info-row">

                            <span>
                                Status
                            </span>

                            <strong
                                className="profile-active"
                            >
                                Active
                            </strong>

                        </div>

                    </div>

                </div>



                {/* =================================================
                    MY ACTIVITY
                ================================================= */}

                <div className="profile-card">

                    <h2>
                        My Activity
                    </h2>


                    {historyLoading ? (

                        <p className="about-text">
                            Loading your activity...
                        </p>

                    ) : (

                        <div className="profile-info">


                            <div className="profile-info-row">

                                <span>
                                    Total Analyses
                                </span>

                                <strong>
                                    {totalAnalyses}
                                </strong>

                            </div>


                            <div className="profile-info-row">

                                <span>
                                    Last Analysis
                                </span>

                                <strong>
                                    {latestAnalysis
                                        ? latestAnalysis.timestamp
                                        : "No analysis yet"}
                                </strong>

                            </div>


                            <div className="profile-info-row">

                                <span>
                                    Last Location
                                </span>

                                <strong>
                                    {latestAnalysis?.location ||
                                        "No location yet"}
                                </strong>

                            </div>


                            <div className="profile-info-row">

                                <span>
                                    Last Congestion
                                </span>

                                <strong
                                    className={
                                        latestAnalysis?.congestion
                                            ? `history-status ${latestAnalysis.congestion.toLowerCase()}`
                                            : ""
                                    }
                                >
                                    {latestAnalysis?.congestion ||
                                        "No analysis yet"}
                                </strong>

                            </div>


                        </div>

                    )}

                </div>



                {/* =================================================
                    HOW TO USE TRAFFICIQ
                ================================================= */}

                <div className="profile-card">

                    <h2>
                        How to Use TrafficIQ
                    </h2>


                    {/* STEP 1 */}

                    <div className="help-item">

                        <button
                            type="button"
                            className={`help-question ${
                                openSection === "account"
                                    ? "open"
                                    : ""
                            }`}
                            onClick={() =>
                                toggleSection("account")
                            }
                        >

                            <span>
                                1️⃣ Create an account
                            </span>

                            <span className="help-icon">
                                {openSection === "account"
                                    ? "−"
                                    : "+"}
                            </span>

                        </button>


                        {openSection === "account" && (

                            <div className="help-answer">

                                Create an account using your
                                name, email, and password.
                                Your account allows TrafficIQ
                                to save your traffic analyses
                                to your personal history.

                            </div>

                        )}

                    </div>



                    {/* STEP 2 */}

                    <div className="help-item">

                        <button
                            type="button"
                            className={`help-question ${
                                openSection === "analysis"
                                    ? "open"
                                    : ""
                            }`}
                            onClick={() =>
                                toggleSection("analysis")
                            }
                        >

                            <span>
                                2️⃣ Analyze traffic
                            </span>

                            <span className="help-icon">
                                {openSection === "analysis"
                                    ? "−"
                                    : "+"}
                            </span>

                        </button>


                        {openSection === "analysis" && (

                            <div className="help-answer">

                                Open Live Monitoring,
                                choose a traffic photo or
                                video, select a location
                                method, and click Analyze.

                            </div>

                        )}

                    </div>



                    {/* STEP 3 */}

                    <div className="help-item">

                        <button
                            type="button"
                            className={`help-question ${
                                openSection === "location"
                                    ? "open"
                                    : ""
                            }`}
                            onClick={() =>
                                toggleSection("location")
                            }
                        >

                            <span>
                                3️⃣ Choose a location
                            </span>

                            <span className="help-icon">
                                {openSection === "location"
                                    ? "−"
                                    : "+"}
                            </span>

                        </button>


                        {openSection === "location" && (

                            <div className="help-answer">

                                TrafficIQ supports EXIF GPS,
                                Current Location, Manual
                                Location, and Visual Estimate.

                            </div>

                        )}

                    </div>



                    {/* STEP 4 */}

                    <div className="help-item">

                        <button
                            type="button"
                            className={`help-question ${
                                openSection === "results"
                                    ? "open"
                                    : ""
                            }`}
                            onClick={() =>
                                toggleSection("results")
                            }
                        >

                            <span>
                                4️⃣ View results
                            </span>

                            <span className="help-icon">
                                {openSection === "results"
                                    ? "−"
                                    : "+"}
                            </span>

                        </button>


                        {openSection === "results" && (

                            <div className="help-answer">

                                TrafficIQ detects cars,
                                motorcycles, buses, and
                                trucks and provides total,
                                average, peak, and congestion
                                information.

                            </div>

                        )}

                    </div>



                    {/* STEP 5 */}

                    <div className="help-item">

                        <button
                            type="button"
                            className={`help-question ${
                                openSection === "history"
                                    ? "open"
                                    : ""
                            }`}
                            onClick={() =>
                                toggleSection("history")
                            }
                        >

                            <span>
                                5️⃣ View My History
                            </span>

                            <span className="help-icon">
                                {openSection === "history"
                                    ? "−"
                                    : "+"}
                            </span>

                        </button>


                        {openSection === "history" && (

                            <div className="help-answer">

                                Your analyzed traffic
                                records are saved to your
                                personal history and can be
                                viewed from the History page.

                            </div>

                        )}

                    </div>

                </div>



                {/* =================================================
                    ABOUT TRAFFICIQ
                ================================================= */}

                <div className="profile-card">

                    <h2>
                        About TrafficIQ
                    </h2>


                    <p className="about-text">

                        TrafficIQ is a smart traffic monitoring
                        system that uses computer vision to
                        analyze traffic photos and videos,
                        detect vehicles, calculate traffic
                        statistics, and organize analysis
                        history with location information.

                    </p>


                    <div className="profile-info">


                        <div className="profile-info-row">

                            <span>
                                Vehicle Detection
                            </span>

                            <strong>
                                YOLO
                            </strong>

                        </div>


                        <div className="profile-info-row">

                            <span>
                                Authentication
                            </span>

                            <strong>
                                Secure Login
                            </strong>

                        </div>


                        <div className="profile-info-row">

                            <span>
                                Database
                            </span>

                            <strong>
                                SQLite
                            </strong>

                        </div>


                    </div>

                </div>

            </div>

        </div>
    );
}

export default Profile;