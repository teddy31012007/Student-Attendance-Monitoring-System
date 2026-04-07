import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../../components/Layout";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { Html5Qrcode } from "html5-qrcode";
import { FiCamera, FiCheckCircle, FiUser, FiShield, FiMapPin, FiAlertCircle, FiUpload, FiEye } from "react-icons/fi";
import * as faceapi from "face-api.js";

const MODELS_URL = "/models";
const MATCH_THRESHOLD = 0.5;
// Eye aspect ratio threshold — below this = eye closed
const EAR_THRESHOLD = 0.22;
// How many consecutive closed frames = a blink
const BLINK_FRAMES = 2;

function getEAR(eye) {
  // eye = array of 6 {x,y} points
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

export default function StudentScanQR() {
  const [step, setStep] = useState("verify");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [blinkPrompt, setBlinkPrompt] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const blinkFramesRef = useRef(0);
  const blinkDetectedRef = useRef(false);
  const blinkIntervalRef = useRef(null);
  const [geoStatus, setGeoStatus] = useState("idle");
  const locationRef = useRef(null);
  const qrRef = useRef(null);
  const qrStarted = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL)
      .then(() => faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL))
      .then(() => faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL))
      .then(() => setModelsLoaded(true))
      .catch(() => toast.error("Face models failed to load"));
  }, []);

  useEffect(() => {
    return () => { stopFaceCamera(); stopQR(); };
  }, []);

  useEffect(() => {
    if (step === "scan") startQR();
    else stopQR();
  }, [step]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setGeoStatus("unavailable"); return; }
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setGeoStatus("granted");
      },
      () => { locationRef.current = null; setGeoStatus("denied"); },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const stopFaceCamera = () => {
    if (blinkIntervalRef.current) { clearInterval(blinkIntervalRef.current); blinkIntervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setBlinkDetected(false);
    setBlinkPrompt(false);
    blinkDetectedRef.current = false;
    blinkFramesRef.current = 0;
  };

  const startBlinkDetection = useCallback(() => {
    if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
    blinkFramesRef.current = 0;
    blinkDetectedRef.current = false;
    setBlinkDetected(false);
    setBlinkPrompt(true);

    blinkIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || blinkDetectedRef.current) return;
      try {
        const det = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        if (!det) return;

        const pts = det.landmarks.positions;
        // face-api landmark indices: left eye 36-41, right eye 42-47
        const leftEye  = [pts[36], pts[37], pts[38], pts[39], pts[40], pts[41]];
        const rightEye = [pts[42], pts[43], pts[44], pts[45], pts[46], pts[47]];
        const ear = (getEAR(leftEye) + getEAR(rightEye)) / 2;

        if (ear < EAR_THRESHOLD) {
          blinkFramesRef.current += 1;
        } else {
          if (blinkFramesRef.current >= BLINK_FRAMES) {
            blinkDetectedRef.current = true;
            setBlinkDetected(true);
            clearInterval(blinkIntervalRef.current);
            blinkIntervalRef.current = null;
          }
          blinkFramesRef.current = 0;
        }
      } catch {}
    }, 100);
  }, []);

  const startFaceCamera = async () => {
    if (!modelsLoaded) return toast.error("Face models still loading, please wait...");
    if (geoStatus === "idle") requestLocation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => startBlinkDetection();
        }
      }, 100);
    } catch {
      toast.error("Camera access denied. Please allow camera permission.");
    }
  };

  const verifyFace = async () => {
    if (!videoRef.current) return;
    if (!blinkDetectedRef.current) {
      toast.error("Please blink once to prove you are live — not a photo.");
      return;
    }
    setVerifying(true);
    try {
      const { data } = await api.get("/student/my-face");
      if (!data.faceDescriptor || data.faceDescriptor.length === 0) {
        toast.error("No face registered. Ask admin to register your face.");
        setVerifying(false);
        return;
      }
      const storedDescriptor = new Float32Array(data.faceDescriptor);
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        toast.error("No face detected. Look directly at the camera.");
        setVerifying(false);
        return;
      }
      const distance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor);
      if (distance > MATCH_THRESHOLD) {
        toast.error("Face not recognized (score: " + distance.toFixed(2) + "). Try again.");
        setVerifying(false);
        return;
      }
      toast.success("Identity verified!");
      stopFaceCamera();
      setStep("scan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed. Try again.");
    }
    setVerifying(false);
  };

  const startQR = async () => {
    if (qrStarted.current) return;
    await new Promise((r) => setTimeout(r, 300));
    const el = document.getElementById("qr-reader");
    if (!el) return;
    const tryStart = async (facingMode) => {
      const scanner = new Html5Qrcode("qr-reader");
      qrRef.current = scanner;
      qrStarted.current = true;
      await scanner.start(
        { facingMode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => { await stopQR(); handleQRResult(decodedText); },
        () => {}
      );
    };
    try {
      await tryStart("environment");
    } catch {
      qrStarted.current = false;
      try { await tryStart("user"); }
      catch { toast.error("Could not access camera for QR scanning."); qrStarted.current = false; }
    }
  };

  const stopQR = async () => {
    if (qrRef.current && qrStarted.current) {
      try { await qrRef.current.stop(); qrRef.current.clear(); } catch {}
      qrRef.current = null;
      qrStarted.current = false;
    }
  };

  const handleQRImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    try {
      await stopQR();
      const scanner = new Html5Qrcode("qr-reader-img");
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      handleQRResult(result);
    } catch {
      toast.error("Could not read QR code from image. Try a clearer photo.");
    }
  };

  const handleQRResult = async (decodedText) => {
    try {
      const { token, sessionId } = JSON.parse(decodedText);
      const loc = locationRef.current;
      await api.post("/attendance/mark-qr", {
        token, sessionId,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });
      setStep("done");
      toast.success("Attendance marked successfully!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to mark attendance";
      toast.error(msg);
      if (msg.toLowerCase().includes("away") || msg.toLowerCase().includes("location")) {
        toast("Enable location permission and try again", { icon: "📍" });
      }
      setStep("scan");
    }
  };

  const resetAll = () => {
    stopFaceCamera(); stopQR();
    setStep("verify"); setVerifying(false);
    locationRef.current = null; setGeoStatus("idle");
  };

  const geoMap = {
    idle:        { color: "text-gray-400",  text: "Location not yet requested" },
    requesting:  { color: "text-amber-500", text: "Requesting location..." },
    granted:     { color: "text-green-600", text: "Location ready" },
    denied:      { color: "text-red-500",   text: "Location denied — geo-fenced sessions may fail" },
    unavailable: { color: "text-gray-400",  text: "Location unavailable on this device" },
  };

  return (
    <Layout>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Scan QR Code</h2>
      <div className="max-w-md mx-auto">

        {step === "done" && (
          <div className="card text-center py-12">
            <FiCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Attendance Marked!</h3>
            <p className="text-gray-500 mb-6">Your attendance has been recorded successfully.</p>
            <button onClick={resetAll} className="btn-primary">Scan Another</button>
          </div>
        )}

        {step === "verify" && (
          <div className="card">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiShield className="text-indigo-600 text-2xl" />
              </div>
              <h3 className="font-semibold text-gray-800 text-lg">Step 1: Verify Identity</h3>
              <p className="text-gray-500 text-sm mt-1">Verify your face before scanning the QR code</p>
            </div>

            {cameraOn ? (
              <div className="space-y-3">
                <div className="relative">
                  <video ref={videoRef} autoPlay muted playsInline
                    className="w-full rounded-xl border-2 border-indigo-200" style={{ maxHeight: 260 }} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-40 h-48 border-4 border-indigo-400 border-dashed rounded-full opacity-60" />
                  </div>
                </div>

                {blinkPrompt && (
                  <div className={`flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg ${blinkDetected ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    <FiEye />
                    {blinkDetected ? "Blink detected — you are live!" : "Please blink once to confirm you are live"}
                  </div>
                )}

                <button onClick={verifyFace} disabled={verifying || !blinkDetected}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  <FiUser /> {verifying ? "Verifying..." : "Verify My Face"}
                </button>
                <button onClick={stopFaceCamera} className="btn-secondary w-full">Cancel</button>
              </div>
            ) : (
              <button onClick={startFaceCamera} disabled={!modelsLoaded}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <FiCamera /> {modelsLoaded ? "Start Face Verification" : "Loading face models..."}
              </button>
            )}

            <div className="mt-4 space-y-1.5">
              <div className={`text-center text-xs ${modelsLoaded ? "text-green-600" : "text-amber-500"}`}>
                {modelsLoaded ? "✓ Face recognition ready" : "⏳ Loading face recognition models..."}
              </div>
              <div className={`flex items-center gap-1.5 text-xs justify-center ${geoMap[geoStatus].color}`}>
                <FiMapPin size={11} /> {geoMap[geoStatus].text}
              </div>
            </div>
          </div>
        )}

        {step === "scan" && (
          <div className="card">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiCamera className="text-green-600 text-2xl" />
              </div>
              <h3 className="font-semibold text-gray-800 text-lg">Step 2: Scan QR Code</h3>
              <p className="text-gray-500 text-sm mt-1">Use camera or upload a QR image</p>
            </div>

            {geoStatus === "denied" && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <FiAlertCircle className="mt-0.5 shrink-0" />
                <span>Location denied. Geo-fenced sessions may reject your attendance. Enable location in browser settings.</span>
              </div>
            )}
            {geoStatus === "granted" && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 mb-3">
                <FiMapPin className="shrink-0" />
                <span>Location ready — geo-fenced sessions supported</span>
              </div>
            )}

            <div id="qr-reader" className="w-full rounded-lg overflow-hidden mb-3" />

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400">or upload QR image</span>
              </div>
            </div>

            <div id="qr-reader-img" className="hidden" />

            <button onClick={() => fileInputRef.current?.click()}
              className="btn-secondary w-full flex items-center justify-center gap-2">
              <FiUpload /> Upload QR Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={handleQRImageUpload} />

            <button onClick={async () => { await stopQR(); setStep("verify"); }}
              className="btn-secondary w-full mt-2">
              Back to Face Verify
            </button>
          </div>
        )}

      </div>
    </Layout>
  );
}