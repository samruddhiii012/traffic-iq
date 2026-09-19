import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function SignUp() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSignup = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/signup",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        password: password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Account creation failed."
                );
            }

            setSuccess("Account created successfully!");

            setName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                navigate("/login");
            }, 800);
        } catch (error) {
            console.error(error);

            setError(
                error.message || "Unable to create account."
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
                    <p> Smart Traffic Monitoring</p>
                </div>

                {/* TITLE */}

                <div className="auth-header">
                    <h2> Create Account </h2>
                    <p>
                        Join TrafficIQ to save your traffic analyses
                    </p>
                </div>

                {/* FORM */}

                <form onSubmit={handleSignup}>

                    <div className="auth-field">
                        <label> Name </label>

                        <input 
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value);
                                setError("");
                            }}
                        />
                    </div>

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
                            placeholder="Create a password"
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                setError("");
                            }}
                        />
                    </div>

                    <div className="auth-field">
                        <label> Confirm Password </label>

                        <input
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(event) => {
                                setConfirmPassword(event.target.value);
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

                    {/* SIGNUP BUTTON */}

                    <button 
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >

                        {loading
                            ? "Creating Account..."
                            : "Create Account"}
                    </button>

                </form>

                {/* LOGIN */}

                <div className="auth-footer">
                    <p>
                        Already have an account?
                    </p>

                    <Link to="/login">
                        Login
                    </Link>
                </div>

                {/* GUEST */}

                <div className="auth-public">
                    <p>
                        You can browse TrafficIQ without an account.
                    </p>

                    <Link to="/dashboard">
                        Continue as Guest 
                    </Link>
                </div>


            </div>
        </div>
    );
}

export default SignUp;