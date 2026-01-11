import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { ShieldAlert, Feather, Info, List, Map as MapIcon } from "lucide-react";

// --- LEAFLET MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// --- CONFIGURATION ---
// !!! PASTE YOUR FIREBASE CONFIG HERE !!!
const firebaseConfig = {
  apiKey: "AIzaSyC9raLv_4fQzq0bo4OGg701YANPycZRnYI",
  authDomain: "bird-watching-aa6e5.firebaseapp.com",
  projectId: "bird-watching-aa6e5",
  storageBucket: "bird-watching-aa6e5.firebasestorage.app",
  messagingSenderId: "974452333348",
  appId: "1:974452333348:web:e5a51101d6c3c3de2e31b1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- CAMOUFLAGE DICTIONARY ---
const THREAT_TYPES = [
  {
    code: "Blue Jay",
    real: "Local Police / ICE",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: "🚙",
    pinColor: "#2563eb", // blue-600
  },
  {
    code: "Red Hawk",
    real: "Military / Fed Agents",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: "🦅",
    pinColor: "#dc2626", // red-600
  },
  {
    code: "Nest",
    real: "Checkpoint / Roadblock",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    icon: "🚧",
    pinColor: "#ea580c", // orange-600
  },
  {
    code: "Flock",
    real: "Large Convoy",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    icon: "🚚",
    pinColor: "#9333ea", // purple-600
  },
];

// Helper to create custom colored markers
const createCustomIcon = (color) => {
  return new L.DivIcon({
    className: "custom-icon",
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
};

export default function App() {
  const [view, setView] = useState("feed"); // feed, map, report, panic
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isPanic, setIsPanic] = useState(false);

  // Auth & Data Listener
  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously(auth);

        // Listen for "sightings" (reports)
        const q = query(
          collection(db, "sightings"),
          orderBy("timestamp", "desc"),
          limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setReports(data);
        });
        return unsubscribe;
      } catch (error) {
        console.error("Connection error:", error);
      }
    };
    init();

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      });
    }
  }, []);

  // --- ACTIONS ---

  const handleReport = async (typeCode, notes) => {
    setLoading(true);
    try {
      let locationData = { lat: 0, lng: 0 };

      // Attempt to get fresh location for the report
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              locationData = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              resolve();
            },
            () => resolve()
          );
        });
      }

      await addDoc(collection(db, "sightings"), {
        type: typeCode,
        notes: notes || "No specific details.",
        location: locationData,
        timestamp: serverTimestamp(),
      });
      setView("feed");
    } catch (err) {
      alert("Could not log sighting.");
    }
    setLoading(false);
  };

  const triggerPanic = () => {
    setIsPanic(true);
    localStorage.clear();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = (now - date) / 1000 / 60;
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  // --- PANIC VIEW ---
  if (isPanic) {
    return (
      <div className="min-h-screen bg-white p-6 font-serif text-gray-800">
        <h1 className="text-3xl font-bold mb-4 text-green-800">
          Altoona Nature Society
        </h1>
        <p className="mb-4">
          Dedicated to the preservation of local wildlife in Blair County.
        </p>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Blue_Jay_in_Through_the_Window_%285157121735%29.jpg/640px-Blue_Jay_in_Through_the_Window_%285157121735%29.jpg"
          alt="Blue Jay"
          className="rounded-lg shadow-lg mb-4"
        />
        <p>Silence is observed during nesting season.</p>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-800 max-w-md mx-auto relative overflow-hidden flex flex-col h-screen">
      {/* Header */}
      <div className="bg-emerald-800 p-4 text-white shadow-md flex justify-between items-center z-20 relative shrink-0">
        <div className="flex items-center gap-2">
          <Feather size={20} />
          <h1 className="font-bold text-lg">Bird Watch</h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={triggerPanic}
            className="text-emerald-200 hover:text-white"
          >
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-white border-b border-stone-200 shrink-0">
        <button
          onClick={() => setView("feed")}
          className={`flex-1 p-3 text-sm font-bold flex justify-center items-center gap-2 ${
            view === "feed"
              ? "text-emerald-800 border-b-2 border-emerald-800"
              : "text-stone-400"
          }`}
        >
          <List size={16} /> Feed
        </button>
        <button
          onClick={() => setView("map")}
          className={`flex-1 p-3 text-sm font-bold flex justify-center items-center gap-2 ${
            view === "map"
              ? "text-emerald-800 border-b-2 border-emerald-800"
              : "text-stone-400"
          }`}
        >
          <MapIcon size={16} /> Map
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 relative overflow-hidden">
        {/* FEED */}
        {view === "feed" && (
          <div className="absolute inset-0 overflow-y-auto p-4 pb-24 space-y-4">
            <div className="bg-emerald-100 p-3 rounded-lg text-xs text-emerald-800 mb-4 flex gap-2 items-start">
              <Info size={16} className="shrink-0" />
              <p>Recent sightings. Verify species before logging.</p>
            </div>

            {reports.map((report) => {
              const bird =
                THREAT_TYPES.find((t) => t.code === report.type) ||
                THREAT_TYPES[0];
              return (
                <div
                  key={report.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-stone-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-bold ${bird.bgColor} ${bird.color} flex items-center gap-1`}
                    >
                      <span>{bird.icon}</span>
                      <span>{bird.code}</span>
                    </div>
                    <span className="text-xs text-stone-400 font-mono">
                      {formatTime(report.timestamp)}
                    </span>
                  </div>
                  <p className="text-stone-700 text-sm mb-2">{report.notes}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* MAP */}
        {view === "map" && (
          <div className="absolute inset-0 z-10">
            <MapContainer
              center={
                userLocation
                  ? [userLocation.lat, userLocation.lng]
                  : [40.518, -78.394]
              }
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {reports.map((report) => {
                if (
                  !report.location ||
                  (report.location.lat === 0 && report.location.lng === 0)
                )
                  return null;
                const bird =
                  THREAT_TYPES.find((t) => t.code === report.type) ||
                  THREAT_TYPES[0];
                return (
                  <Marker
                    key={report.id}
                    position={[report.location.lat, report.location.lng]}
                    icon={createCustomIcon(bird.pinColor)}
                  >
                    <Popup>
                      <div className="text-center">
                        <strong className={`${bird.color}`}>{bird.code}</strong>
                        <br />
                        <span className="text-xs">{report.notes}</span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        )}

        {/* REPORT */}
        {view === "report" && (
          <div className="absolute inset-0 bg-stone-100 z-30 p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 text-emerald-900">
              Log Sighting
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {THREAT_TYPES.map((type) => (
                <button
                  key={type.code}
                  onClick={() =>
                    handleReport(
                      type.code,
                      prompt(`Describe the ${type.code} activity:`)
                    )
                  }
                  disabled={loading}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                    ${
                      loading ? "opacity-50" : "hover:scale-105 active:scale-95"
                    }
                    ${type.bgColor} border-${type.color.split("-")[1]}-200`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className={`font-bold text-sm ${type.color}`}>
                    {type.code}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setView("feed")}
              className="w-full py-3 bg-white border border-stone-300 rounded-lg text-stone-600 font-bold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {(view === "feed" || view === "map") && (
        <button
          onClick={() => setView("report")}
          className="fixed bottom-6 right-6 bg-emerald-700 text-white p-4 rounded-full shadow-lg hover:bg-emerald-600 transition-colors z-40"
        >
          <Feather size={24} />
        </button>
      )}
    </div>
  );
}
