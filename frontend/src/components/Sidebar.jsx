import { NavLink } from "react-router-dom";

function Sidebar() {
    return (
        <aside className="sidebar">

            {/* LOGO */}

            <div className="sidebar-logo">
                <h2> TrafficIQ </h2>
                <p> Traffic Monitoring </p>
            </div>

            {/* NAVIGATION */}

            <nav className="sidebar-nav">

                <NavLink to="/dashboard">
                    Dashboard
                </NavLink>

                <NavLink to="/analytics">
                    Analytics 
                </NavLink>

                <NavLink to="/history">
                    History 
                </NavLink>

                <NavLink to="/live-monitoring">
                    Live Monitoring 
                </NavLink>

                {/* COMMUNITY */}

                <NavLink to="/community">
                    Community
                </NavLink>

                <NavLink to="/profile">
                    Profile 
                </NavLink>
            </nav>

        </aside>

    );

}

export default Sidebar;
