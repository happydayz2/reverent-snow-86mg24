import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  Bird, 
  MapPin, 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert, 
  Feather, 
  Info 
} from 'lucide-react';

// --- CONFIGURATION ---
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
    code: 'Blue Jay', 
    real: 'Local Police / ICE', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    icon: '🚙' 
  },
  { 
    code: 'Red Hawk', 
    real: 'Military / Fed Agents', 
    color: 'text-red-600', 
    bgColor: 'bg-red-100',
    icon: '🦅' 
  },
  { 
    code: 'Nest', 
    real: 'Checkpoint / Roadblock', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100',
    icon: '🚧' 
  },
  { 
    code: 'Flock', 
    real: 'Large Convoy', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100',
    icon: '🚚' 
  }
];

export default function App() {
  const [view, setView] = useState('feed'); // feed, report, panic
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
          collection(db, 'sightings'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setReports(data);
        });
        return unsubscribe;
      } catch (error) {
        console.error("Connection error:", error);
      }
    };
    init();

    // Get basic location for relative distance
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
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
          navigator.geolocation.getCurrentPosition((pos) => {
            locationData = { 
              lat: pos.coords.latitude, 
              lng: pos.coords.longitude 
            };
            resolve();
          }, () => resolve()); // Resolve even if error
        });
      }

      await addDoc(collection(db, 'sightings'), {
        type: typeCode,
        notes: notes || "No specific details.",
        location: locationData,
        timestamp: serverTimestamp(),
      });
      setView('feed');
    } catch (err) {
      alert("Could not log sighting.");
    }
    setLoading(false);
  };

  const triggerPanic = () => {
    setIsPanic(true);
    // In a real app, this would also clear local storage
    localStorage.clear();
  };

  // --- HELPERS ---

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = (now - date) / 1000 / 60; // minutes
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    return `${Math.floor(diff/60)}h ago`;
  };

  // Haversine formula for rough distance
  const getDistance = (lat1, lon1) => {
    if (!userLocation || !lat1) return "?";
    const R = 6371; // km
    const dLat = (userLocation.lat - lat1) * Math.PI / 180;
    const dLon = (userLocation.lng - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(userLocation.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c * 0.621371; // convert to miles
    return d.toFixed(1);
  };

  // --- PANIC VIEW (Camouflage) ---
  if (isPanic) {
    return (
      <div className="min-h-screen bg-white p-6 font-serif text-gray-800">
        <h1 className="text-3xl font-bold mb-4 text-green-800">Altoona Nature Society</h1>
        <p className="mb-4">
          Dedicated to the preservation of local wildlife in Blair County.
        </p>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Blue_Jay_in_Through_the_Window_%285157121735%29.jpg/640px-Blue_Jay_in_Through_the_Window_%285157121735%29.jpg" 
          alt="Blue Jay" 
          className="rounded-lg shadow-lg mb-4"
        />
        <p>
          Our monthly meetings are held at the community library. Please observe silence while birdwatching.
        </p>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-800 max-w-md mx-auto relative overflow-hidden">
      
      {/* Header */}
      <div className="bg-emerald-800 p-4 text-white shadow-md flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2">
          <Feather size={20} />
          <h1 className="font-bold text-lg">Bird Watch</h1>
        </div>
        <div className="flex gap-4">
           {/* The Panic Button (Shield Icon) */}
           <button onClick={triggerPanic} className="text-emerald-200 hover:text-white">
            <ShieldAlert size={20} />
          </button>
        </div>
      </div>

      {/* VIEW: FEED */}
      {view === 'feed' && (
        <div className="p-4 pb-24 space-y-4">
          <div className="bg-emerald-100 p-3 rounded-lg text-xs text-emerald-800 mb-4 flex gap-2 items-start">
            <Info size={16} className="shrink-0" />
            <p>Recent sightings in the Blair County area. Please verify species before logging.</p>
          </div>

          {reports.map((report) => {
            const bird = THREAT_TYPES.find(t => t.code === report.type) || THREAT_TYPES[0];
            return (
              <div key={report.id} className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                <div className="flex justify-between items-start mb-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${bird.bgColor} ${bird.color} flex items-center gap-1`}>
                    <span>{bird.icon}</span>
                    <span>{bird.code}</span>
                  </div>
                  <span className="text-xs text-stone-400 font-mono">
                    {formatTime(report.timestamp)}
                  </span>
                </div>
                <p className="text-stone-700 text-sm mb-2">{report.notes}</p>
                <div className="flex items-center gap-1 text-xs text-stone-400">
                  <MapPin size={12} />
                  <span>{getDistance(report.location.lat, report.location.lng)} mi away</span>
                </div>
              </div>
            );
          })}
          
          {reports.length === 0 && (
             <div className="text-center py-10 text-stone-400 italic">
               No birds sighted recently. Quiet skies.
             </div>
          )}
        </div>
      )}

      {/* VIEW: REPORT */}
      {view === 'report' && (
        <div className="p-4">
          <h2 className="text-xl font-bold mb-6 text-emerald-900">Log Sighting</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {THREAT_TYPES.map((type) => (
              <button
                key={type.code}
                onClick={() => handleReport(type.code, prompt(`Describe the ${type.code} activity (Direction, Count):`))}
                disabled={loading}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                  ${loading ? 'opacity-50' : 'hover:scale-105 active:scale-95'}
                  ${type.bgColor} border-${type.color.split('-')[1]}-200`}
              >
                <span className="text-2xl">{type.icon}</span>
                <span className={`font-bold text-sm ${type.color}`}>{type.code}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-stone-500">
            *Ensure location services are active for accurate migratory tracking.
          </p>
          <button 
            onClick={() => setView('feed')}
            className="w-full mt-6 py-3 text-stone-500 font-bold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      {view === 'feed' && (
        <button
          onClick={() => setView('report')}
          className="fixed bottom-6 right-6 bg-emerald-700 text-white p-4 rounded-full shadow-lg hover:bg-emerald-600 transition-colors z-20"
        >
          <Feather size={24} />
        </button>
      )}

      {/* Bottom Nav / Guide */}
      <div className="fixed bottom-0 w-full bg-white border-t border-stone-200 p-2 flex justify-center text-xs text-stone-400 max-w-md">
        <span>Altoona Ornithology Group &copy; 2026</span>
      </div>
    </div>
  );
}