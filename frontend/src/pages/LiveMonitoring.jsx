import { useState } from "react";

function LiveMonitoring() {
    const [traffic, setTraffic] = useState(null);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [processedType, setProcessedType] = useState(null);
    const [processedUrl, setProcessedUrl] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");

    const [locationMethod, setLocationMethod] = useState("");
    const [location, setLocation] = useState("");
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);


    // =====================================================
    // FILE SELECTION
    // =====================================================

    const handleFileChange = (event) => {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        setSelectedFile(file);

        // Clear previous analysis
        setTraffic(null);

        setProcessedUrl(null);
        setProcessedType(null);

        setUploadError("");
        setUploadSuccess("");

        // Clear previous location
        setLocationMethod("");
        setLocation("");

        setLatitude(null);
        setLongitude(null);

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    // =====================================================
    // FILE TYPE
    // =====================================================

    const fileType = selectedFile?.type?.startsWith("image/")
        ? "Photo"
        : selectedFile?.type?.startsWith("video/")
        ? "Video"
        : "Media";

    
    // =====================================================
    // CURRENT LOCATION
    // =====================================================

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            setUploadError(
                "Geolocation is not supported by this browser."
            );
            return;
        }

        setLocationLoading(true);
        setUploadError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                setLatitude(lat);
                setLongitude(lon);

                fetch(
                    `https://traffic-iq-production.up.railway.app/reverse-geocode?latitude=${lat}&longitude=${lon}`
                )
                    .then((response) => {
                        
                        if (!response.ok) {
                            throw new Error(
                                "Unable to determine location name."
                            );
                        }
                        
                        return response.json();
                    })
                    
                    .then((data) => {
                        
                        setLocation(
                            data.location
                        );

                        setLocationLoading(false);
                    })

                    .catch((error) => {
                        console.error(error);
                        
                        // Fallback to coordinates
                        setLocation(
                            `${lat.toFixed(6)}, ${lon.toFixed(6)}`
                        );
                        setLocationLoading(false);
                        
                    }); 
            },
            (error) => {
                console.error(error);

                setUploadError(
                    "Unable to get your current location. Please allow location access."
                );

                setLocationLoading(false);
            }
        );
    };


    // =====================================================
    // UPLOAD + YOLO ANALYSIS
    // =====================================================

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadError(
                "Please select a photo or video first."
            );
            return;
        }

        if (!locationMethod) {
            setUploadError(
                "Please select a location method."
            );
            return;
        }

        if (
            locationMethod !== "EXIF GPS" &&
            !location.trim()
        ) {
            setUploadError(
                "Please provide the analysis location."
            );
            return;
        }

        setUploading(true);

        setUploadError("");
        setUploadSuccess("");

        const token = localStorage.getItem("trafficIQToken");

        if (!token) {
            setUploadError(
                "Please login to analyze your traffic photo or video."
            );
            setUploading(false);
            return;
        }

        const formData = new FormData();

        formData.append("file", selectedFile);
        formData.append("location", location.trim());
        formData.append("location_source", locationMethod);

        if (latitude !== null && longitude !== null) {
            formData.append("latitude", latitude);
            formData.append("longitude", longitude);
        }

        try {
            const response = await fetch(
                "https://traffic-iq-production.up.railway.app/upload-video",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Traffic media analysis failed."
                );
            }

            // ---------------------------------------------
            // UPDATE TRAFFIC RESULTS
            // ---------------------------------------------

            setTraffic({
                cars: data.cars,
                motorcycles: data.motorcycles,
                buses: data.buses,
                trucks: data.trucks,
                total_vehicles: data.total_vehicles,
                average_vehicles: data.average_vehicles,
                peak_vehicles: data.peak_vehicles,
                congestion: data.congestion,
                location: data.location || location,
                location_source: data.location_source || locationMethod,
                latitude: data.latitude ?? latitude,
                longitude: data.longitude ?? longitude,
            });

            // ---------------------------------------------
            // PROCESSED YOLO OUTPUT
            // ---------------------------------------------

            if (data.output_url) {
                setProcessedUrl(
                    `https://traffic-iq-production.up.railway.app${data.output_url}`
                );
            }

            setProcessedType(data.media_type);

            setUploadSuccess(
                `${fileType} processed successfully!`
            );

        } catch (error) {
            console.error(error);

            // ---------------------------------------------
            // INVALID / NON-TRAFFIC MEDIA
            // ---------------------------------------------

            setTraffic({
                cars: 0,
                motorcycles: 0,
                buses: 0,
                trucks: 0,
                total_vehicles: 0,
                average_vehicles: 0,
                peak_vehicles: 0,
                congestion: "LOW",
                location: location,
            });

            setProcessedUrl(null);
            setProcessedType(null);

            setUploadError(error.message);

        } finally {
            setUploading(false);
        }
    };

    // =====================================================
    // UI
    // =====================================================


    return (
        <div className="page-container">


            
            {/* PAGE HEADER */}

            <div className="page-header">
                <h1>Live Monitoring</h1>
                <p>
                    Upload a traffic photo or video for vehicle detection
                </p>
            </div>

            {/* STATUS */}

            <div className="live-status">
                <span className="status-dot"></span>
                Traffic Analysis System Online
            </div>

            <section className="live-grid">

                {/* ========================= */}
                {/* LEFT SIDE */}
                {/* ========================= */}

                <div className="live-video-card">

                    <h2>
                        {processedUrl
                            ? `Processed ${fileType}`
                            : selectedFile
                            ? `Selected ${fileType}`
                            : "Upload Traffic Photo or Video"}
                    </h2>

                    {/* MEDIA AREA */}

                    <div className="video-placeholder">

                        {processedUrl ? (

                            processedType === "image" ? (

                                <img
                                    src={processedUrl}
                                    alt="Processed traffic detection"
                                    className="media-preview"
                                />

                            ) : (

                                <video
                                    src={processedUrl}
                                    controls
                                    autoPlay
                                    muted
                                    className="media-preview"
                                />

                            )

                        ) : !previewUrl ? (

                            <div className="upload-empty">
                                <div className="camera-icon">
                                    📤
                                </div>

                                <p>
                                    Upload traffic photo or video here
                                </p>

                                <span>
                                    Supported: JPG, PNG, MP4, AVI, MOV
                                </span>
                            </div>

                        ) : selectedFile.type.startsWith("image/") ? (

                            <img
                                src={previewUrl}
                                alt="Selected traffic"
                                className="media-preview"
                            />

                        ) : (

                            <video
                                src={previewUrl}
                                controls
                                muted
                                className="media-preview"
                            />

                        )}

                    </div>

                    {/* UPLOAD CONTROLS */}

                    <div className="upload-section">

                        <label htmlFor="traffic-media">
                            {selectedFile
                                ? `Selected ${fileType}`
                                : "Choose Traffic Photo or Video"}
                        </label>

                        <input
                            id="traffic-media"
                            type="file"
                            accept="video/mp4,video/avi,video/x-msvideo,video/quicktime,image/jpeg,image/png"
                            onChange={handleFileChange}
                        />

                        {selectedFile && (
                            <p className="selected-file">
                                Selected: {selectedFile.name}
                            </p>
                        )}


                        {/* LOCATION */}

                        <div className="location-section">

                            <label>
                                📍 Location Method
                            </label>

                            <div className="location-options">

                                <label className="location-option">
                                    <input
                                        type="radio"
                                        name="locationMethod"
                                        value="EXIF GPS"
                                        checked={
                                            locationMethod === "EXIF GPS"
                                        }
                                        onChange={() => {
                                            setLocationMethod("EXIF GPS");
                                            setLocation("");
                                            setLatitude(null);
                                            setLongitude(null);
                                            setUploadError("");
                                        }}
                                    />
                                    <span>EXIF GPS</span>
                                </label>


                                 {/* CURRENT LOCATION */}

                                <label className="location-option">
                                    <input
                                        type="radio"
                                        name="locationMethod"
                                        value="Current Location"
                                        checked={
                                            locationMethod === "Current Location"
                                        }
                                        onChange={() => {
                                            setLocationMethod(
                                                "Current Location"
                                            );
                                            setLocation("");

                                            setLatitude(null);
                                            setLongitude(null);

                                            setUploadError("");
                                        }}
                                    />
                                    <span>
                                        Use Current Location
                                    </span>
                                </label>


                                {/* MANUAL */}

                                <label className="location-option">
                                    <input
                                        type="radio"
                                        name="locationMethod"
                                        value="Manual"
                                        checked={
                                            locationMethod === "Manual"
                                        }
                                        onChange={() => {
                                            setLocationMethod("Manual");
                                            setLocation("");
                                            setLatitude(null);
                                            setLongitude(null);
                                            setUploadError("");
                                        }}
                                    />
                                    <span>
                                        Enter Manually
                                    </span>
                                </label>


                                {/* VISUAL ESTIMATE */}

                                <label className="location-option">
                                    <input
                                        type="radio"
                                        name="locationMethod"
                                        value="Visual Estimate"
                                        checked={
                                            locationMethod === "Visual Estimate"
                                        }
                                        onChange={() => {
                                            setLocationMethod(
                                                "Visual Estimate"
                                            );
                                            setLocation("");
                                            setLatitude(null);
                                            setLongitude(null);
                                            setUploadError("");
                                        }}
                                    />
                                    <span>
                                        Visual Estimate
                                    </span>
                                </label>

                            </div>



                            {/* EXIF */}

                            {locationMethod === "EXIF GPS" && (
                                <div className="location-info">

                                    <p>
                                        EXIF GPS will be checked automatically
                                        during analysis.
                                    </p>

                                    <small>
                                        If GPS data is unavailable, choose
                                        another location method.
                                    </small>

                                </div>
                            )}


                            {/* CURRENT LOCATION */}

                            {locationMethod === "Current Location" && (
                                <div className="location-info">

                                    <button
                                        type="button"
                                        className="location-button"
                                        onClick={handleCurrentLocation}
                                        disabled={locationLoading}
                                    >
                                        {locationLoading
                                            ? "Getting Location..."
                                            : "📍 Get My Location"}
                                    </button>

                                    {location && (
                                        <p>
                                            Location: {location}
                                        </p>
                                    )}

                                </div>
                            )}



                            {/* MANUAL */}

                            {locationMethod === "Manual" && (
                                <div className="location-info">

                                    <input
                                        type="text"
                                        className="location-input"
                                        placeholder="Enter location (e.g. Andheri East, Mumbai)"
                                        value={location}
                                        onChange={(event) => {
                                            setLocation(event.target.value);
                                            setUploadError("");
                                        }}
                                    />

                                </div>
                            )}


                            {/* VISUAL ESTIMATE */}

                            {locationMethod === "Visual Estimate" && (
                                <div className="location-info">

                                    <p>
                                        Visual location estimation will be
                                        used for this analysis.
                                    </p>

                                    <small>
                                        This is an estimated location,
                                        not GPS-verified.
                                    </small>

                                    <input
                                        type="text"
                                        className="location-input"
                                        placeholder="Enter estimated location"
                                        value={location}
                                        onChange={(event) => {
                                            setLocation(event.target.value);
                                            setUploadError("");
                                        }}
                                    />

                                </div>
                            )}

                        </div>

                        {/* ANALYZE BUTTON */}
                        <button
                            className="upload-button"
                            disabled={
                                !selectedFile ||
                                !locationMethod ||
                                (locationMethod !== "EXIF GPS" && !location.trim()) ||
                                uploading
                            }
                            onClick={handleUpload}
                        >
                            {uploading
                                ? `Analyzing ${fileType}...`
                                : selectedFile
                                ? `Analyze ${fileType}`
                                : "Choose File First"}
                        </button>


                        {/* SUCCESS */}

                        {uploadSuccess && (
                            <p className="upload-success">
                                ✅ {uploadSuccess}
                            </p>
                        )}

                         {/* ERROR */}

                        {uploadError && (
                            <p className="upload-error">
                                ❌ {uploadError}
                            </p>
                        )}

                    </div>

                </div>

                {/* ========================= */}
                {/* RIGHT SIDE */}
                {/* ========================= */}

                <div className="live-data-card">

                    <h2>
                        Traffic Detection Results
                    </h2>

                    {traffic ? (

                        <>

                            {/* VEHICLE COUNTS */}

                            <div className="live-count">

                                <div>
                                    <span>Cars</span>
                                    <strong>
                                        {traffic.cars}
                                    </strong>
                                </div>

                                <div>
                                    <span>Motorcycles</span>
                                    <strong>
                                        {traffic.motorcycles}
                                    </strong>
                                </div>

                                <div>
                                    <span>Buses</span>
                                    <strong>
                                        {traffic.buses}
                                    </strong>
                                </div>

                                <div>
                                    <span>Trucks</span>
                                    <strong>
                                        {traffic.trucks}
                                    </strong>
                                </div>

                            </div>


                            {/* TOTAL */}

                            <div className="live-total">
                                <span>
                                    Total Vehicles
                                </span>

                                <strong>
                                    {traffic.total_vehicles}
                                </strong>
                            </div>


                            {/* AVERAGE + PEAK */}

                            <div className="live-total">
                                <span>
                                    Average Vehicles
                                </span>

                                <strong>
                                    {Number(traffic.average_vehicles || 0).toFixed(1)}
                                </strong>
                            </div>

                            <div className="live-total">
                                <span>
                                    Peak Vehicles
                                </span>

                                <strong>
                                    {traffic.peak_vehicles || 0}
                                </strong>
                            </div>


                            {/* CONGESTION */}

                            <div className="live-congestion">
                                <span>
                                    Current Congestion
                                </span>

                                <strong
                                    className={`history-status ${traffic.congestion?.toLowerCase() || ""}`}
                                >
                                    {traffic.congestion}
                                </strong>
                            </div>

                            {/* LOCATION */}

                            <div className="live-total">
                                <span>
                                    📍 Location
                                </span>

                                <strong>
                                    {traffic.location}
                                </strong>
                            </div>

                        </>

                    ) : (

                        <div className="no-results">

                            <p>
                                No traffic analysis yet.
                            </p>

                            <span>
                                Upload a photo or video to start detection.
                            </span>

                        </div>

                    )}

                </div>

            </section>

        </div>
    );
}

export default LiveMonitoring;