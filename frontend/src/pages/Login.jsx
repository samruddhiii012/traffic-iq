import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/login",
                {
                    method:"POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password: password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Login failed."
                );
            }

            // Save logged-in user
            localStorage.setItem(
                "trafficIQUser",
                JSON.stringify(data.user)
            );

            localStorage.setItem(
                "trafficIQToken",
                data.access_token
            );

            setSuccess("Login successful!");

            // Go to dashboard
            setTimeout(() => {
                navigate("/dashboard");
            }, 500);
        } catch (error) {
            console.error(error);

            setError(
                error.message || "Unable to login."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            <div className="auth-card">

                {/* LOGO */}

                <div className="auth-logo">
                    <h1> TrafficIQ </h1>
                    <p> Smart Traffic Monitoring </p>
                </div>

                 {/* TITLE */}
                
                <div className="auth-header">
                    <h2> Welcome Back </h2>
                    <p> 
                        Login to your TrafficIQ account 
                    </p>
                </div>

                {/* FORM */}

                <form onSubmit={handleLogin}>

                    <div className="auth-field">
                        <label> Email </label>

                        <input 
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                setError("");
                            }}
                        />
                    </div>

                    <div className="auth-field">
                        <label> Password </label>

                        <input 
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                setError("");
                            }}
                        />
                    </div>

                    {/* ERROR */}

                    {error && (
                        <p className="auth-error">
                            ❌ {error}
                        </p>
                    )}

                    {/* SUCCESS */}

                    {success && (
                        <p className="auth-success">
                            ✅ {success}
                        </p>
                    )}

                     {/* LOGIN BUTTON */}
                    
                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"}
                    </button>
                </form>

                {/* SIGNUP */}

                <div className="auth-footer">
                    <p>
                        Don't have an account?
                    </p>

                    <Link to="/signup">
                            Create Account
                    </Link>
                </div>

                {/* PUBLIC ACCESS */}

                <div className="auth-public">
                    <p>
                        You can continue browsing
                        TrafficIQ without an account.
                    </p>

                    <Link to="/dashboard">
                        Continue as Guest
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;