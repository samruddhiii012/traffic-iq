import { useEffect, useState } from "react";

import {
    BrowserRouter,
    Routes,
    Route,
    useNavigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import History from "./pages/History";
import LiveMonitoring from "./pages/LiveMonitoring";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Community from "./pages/Community";

const [mobilePreview, setMobilePreview] = useState(false);

import "./App.css";


function ProtectedRoute({ children }) {
    const token = localStorage.getItem("trafficIQToken");

    if (!token) {
        window.location.href = "/login";
        return null;
    }

    return children;
}


function AppLayout() {

    const navigate = useNavigate();

    const [showUserMenu, setShowUserMenu] = useState(false);

    const [systemOnline, setSystemOnline] = useState(false);


    // =====================================================
    // USER
    // =====================================================

    const storedUser =
        localStorage.getItem("trafficIQUser");

    const user = storedUser
        ? JSON.parse(storedUser)
        : null;


    // =====================================================
    // SYSTEM STATUS
    // =====================================================

    useEffect(() => {

        const checkBackend = async () => {

            try {

                const response = await fetch(
                    "http://127.0.0.1:8000/"
                );

                setSystemOnline(response.ok);

            } catch (error) {

                console.error(
                    "Backend health check failed:",
                    error
                );

                setSystemOnline(false);
            }
        };


        checkBackend();

        const interval = setInterval(
            checkBackend,
            5000
        );


        return () => {
            clearInterval(interval);
        };

    }, []);


    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {

        localStorage.removeItem(
            "trafficIQUser"
        );

        localStorage.removeItem(
            "trafficIQToken"
        );

        setShowUserMenu(false);

        navigate("/login");

        window.location.reload();
    };


    return (
        <div className="app-layout">

            <Sidebar />

            <button
                onClick={() => setMobilePreview((prev) => !prev)}
                className="preview-toggle"
            >
                {mobilePreview ? "🖥️ Web View" : "📱 Mobile Preview"}
            </button>


            <main className="page-content">


                {/* =================================================
                    TOP RIGHT USER
                ================================================= */}

                <div className="top-user-area">

                    {user ? (

                        <div className="user-wrapper">

                            <button
                                type="button"
                                className="user-button"
                                onClick={() =>
                                    setShowUserMenu(
                                        !showUserMenu
                                    )
                                }
                            >

                                <span className="user-avatar">
                                    {user.name
                                        ?.trim()
                                        ?.charAt(0)
                                        ?.toUpperCase() || "U"}
                                </span>


                                <span className="user-name">
                                    {user.name}
                                </span>


                                <span className="user-arrow">
                                    {showUserMenu
                                        ? "▲"
                                        : "▼"}
                                </span>

                            </button>


                            {showUserMenu && (

                                <div className="user-dropdown">

                                    <div className="user-dropdown-info">

                                        <strong>
                                            {user.name}
                                        </strong>

                                        <span>
                                            {user.email}
                                        </span>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            navigate("/profile");
                                        }}
                                    >
                                        My Profile
                                    </button>


                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                    >
                                        Logout
                                    </button>

                                </div>

                            )}

                        </div>

                    ) : (

                        <button
                            type="button"
                            className="login-user-button"
                            onClick={() =>
                                navigate("/login")
                            }
                        >

                            <span className="user-avatar">
                                👤
                            </span>

                            <span>
                                Login
                            </span>

                        </button>

                    )}

                </div>


                {/* =================================================
                    GLOBAL SYSTEM STATUS
                ================================================= */}

                <div
                    className={`status ${
                        systemOnline
                            ? "online"
                            : "offline"
                    }`}
                >

                    <span
                        className={`status-dot ${
                            systemOnline
                                ? "online"
                                : "offline"
                        }`}
                    ></span>


                    {systemOnline
                        ? "System Online"
                        : "System Offline"}

                </div>


                {/* =================================================
                    ROUTES
                ================================================= */}

                <Routes>

                    <Route
                        path="/"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/analytics"
                        element={<Analytics />}
                    />

                    <Route
                        path="/history"
                        element={<History />}
                    />

                    <Route
                        path="/live-monitoring"
                        element={<LiveMonitoring />}
                    />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/community"
                        element={<Community />}
                    />

                    <Route
                        path="/login"
                        element={<Login />}
                    />

                    <Route
                        path="/signup"
                        element={<SignUp />}
                    />

                </Routes>

            </main>

        </div>
    );
}


function App() {

    return (
        <BrowserRouter>

            <AppLayout />

        </BrowserRouter>
    );
}


export default App;