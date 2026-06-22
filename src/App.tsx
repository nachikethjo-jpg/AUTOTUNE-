import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Settings, 
  Activity, 
  ShieldAlert, 
  RotateCcw, 
  Check, 
  Zap, 
  Play, 
  Smartphone, 
  Wifi, 
  Search, 
  AlertTriangle, 
  Flame, 
  TrendingUp, 
  Compass, 
  ChevronRight, 
  HelpCircle, 
  BadgeAlert, 
  FileCode2, 
  Sparkles,
  RefreshCw,
  Gauge,
  Cloud,
  Lock,
  Plus,
  Trash2,
  ListTodo,
  User,
  Save,
  Download,
  LogOut,
  FolderSync,
  Undo,
  Redo,
  BookOpen
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { googleSignIn, initAuth, logout } from './firebase.ts';
import { INDIAN_VEHICLES, DEMO_DTCS, RPM_GRID, LOAD_GRID } from './vehicleDb';
import { Vehicle, DTC, RemapPreset, TuningResult, GeminiTuneResponse } from './types';
import { PowerCurveChart } from './components/PowerCurveChart';

export default function App() {
  // Navigation & System state
  const [activeTab, setActiveTab] = useState<'obd' | 'maps' | 'ai' | 'flash' | 'cloud'>('obd');
  
  // User Authentication & Sync States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');

  // Cloud Saved Tunes List
  const [dbTunes, setDbTunes] = useState<any[]>([]);
  const [isLoadingTunes, setIsLoadingTunes] = useState<boolean>(false);
  const [isSavingTune, setIsSavingTune] = useState<boolean>(false);

  // Google Tasks API States
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [isCreatingTask, setIsCreatingTask] = useState<boolean>(false);
  
  // Simulated Vehicle OBD-II States
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(INDIAN_VEHICLES[0]);
  const [selectedPinNum, setSelectedPinNum] = useState<number | null>(6);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [obdProtocol, setObdProtocol] = useState<string>('ISO 15765-4 (CAN-29bit/500kb)');
  const [volts, setVolts] = useState<number>(12.4);
  const [obdLog, setObdLog] = useState<string[]>([
    "System Initialized. Ready for BT/USB OBD-II channel linking."
  ]);
  
  // Real-time engine simulation parameters (when vehicle "runs")
  const [simRpm, setSimRpm] = useState<number>(800);
  const [simThrottle, setSimThrottle] = useState<number>(15);
  const [simBoost, setSimBoost] = useState<number>(0.0);
  const [simAfr, setSimAfr] = useState<number>(14.7);
  const [simTemp, setSimTemp] = useState<number>(82);
  const [liveCycle, setLiveCycle] = useState<boolean>(false);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Active Map Calibration Data (Copied upon selection, directly editable by user)
  const [ignitionMap, setIgnitionMap] = useState<number[][]>([]);
  const [fuelMap, setFuelMap] = useState<number[][]>([]);
  const [boostMap, setBoostMap] = useState<number[][]>([]);
  const [activeMapType, setActiveMapType] = useState<'ignition' | 'fuel' | 'boost'>('ignition');
  
  // Active selected map cell for manual editing
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [cellEditVal, setCellEditVal] = useState<string>('');

  // Selection range states for range editing/interpolation
  const [rangeStart, setRangeStart] = useState<{ r: number; c: number } | null>(null);
  const [rangeEnd, setRangeEnd] = useState<{ r: number; c: number } | null>(null);

  // Map Editor Undo/Redo Local History States
  const [editHistory, setEditHistory] = useState<{ ignition: number[][]; fuel: number[][]; boost: number[][] }[]>([]);
  const [redoHistory, setRedoHistory] = useState<{ ignition: number[][]; fuel: number[][] | null; boost: number[][] }[]>([]);

  // Google Keep Notes & Sync States
  const [keepNotes, setKeepNotes] = useState<{ id: string; title: string; text: string; date?: string; isLocalFallback?: boolean }[]>([]);
  const [isKeepLoading, setIsKeepLoading] = useState<boolean>(false);
  const [newKeepTitle, setNewKeepTitle] = useState<string>('');
  const [newKeepText, setNewKeepText] = useState<string>('');
  const [keepStatus, setKeepStatus] = useState<'synced' | 'local_fallback'>('local_fallback');

  // Active Remapping & Delta Stats
  const [activePreset, setActivePreset] = useState<RemapPreset>('Stock');
  const [dtcs, setDtcs] = useState<DTC[]>([DEMO_DTCS[1], DEMO_DTCS[2], DEMO_DTCS[5]]); // default pre-scanned codes
  const [scanningDtcs, setScanningDtcs] = useState<boolean>(false);

  // Flashing States
  const [flashState, setFlashState] = useState<'ready' | 'erasing' | 'writing' | 'verifying' | 'completed'>('ready');
  const [flashProgress, setFlashProgress] = useState<number>(0);
  const [flashLog, setFlashLog] = useState<string[]>([]);

  // AI Tuning advisor states
  const [aiPrompt, setAiPrompt] = useState<string>('Requesting Stage 1 tuning profile for local high-temperature driveability and low-end torque improvement.');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<GeminiTuneResponse | null>(null);

  // Spark Knock warning threshold simulation
  const [knockWarning, setKnockWarning] = useState<boolean>(false);

  // User Guide / Instructions manual State
  const [showHelpManual, setShowHelpManual] = useState<boolean>(false);
  const [helpActiveTab, setHelpActiveTab] = useState<'overview' | 'obd' | 'editor' | 'ai' | 'cloud'>('overview');

  // Heatmap overlay toggle state
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState<boolean>(false);

  // Local Draft States and Refs
  const restoringDraftRef = useRef<boolean>(false);
  const [savedDraft, setSavedDraft] = useState<any | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState<boolean>(false);
  const [pendingTabDestination, setPendingTabDestination] = useState<string | null>(null);
  const [lastDraftSavedTime, setLastDraftSavedTime] = useState<string | null>(null);

  const isMapModified = () => {
    if (!selectedVehicle || ignitionMap.length === 0 || fuelMap.length === 0 || boostMap.length === 0) return false;
    return JSON.stringify(ignitionMap) !== JSON.stringify(selectedVehicle.defaultIgnitionMap) ||
           JSON.stringify(fuelMap) !== JSON.stringify(selectedVehicle.defaultFuelMap) ||
           JSON.stringify(boostMap) !== JSON.stringify(selectedVehicle.defaultBoostMap);
  };

  // Check for saved drafts in local storage on mount
  useEffect(() => {
    const local = localStorage.getItem('indimap_local_draft');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && parsed.ignitionMap && parsed.fuelMap) {
          setSavedDraft(parsed);
        }
      } catch (e) {
        console.error("Failed to parse local draft:", e);
      }
    }
  }, []);

  // Periodically saves map when modified (debounce 3 seconds)
  useEffect(() => {
    if (ignitionMap.length === 0 || fuelMap.length === 0 || boostMap.length === 0) return;
    if (!isMapModified()) {
      return;
    }

    const timer = setTimeout(() => {
      const draft = {
        vehicleId: selectedVehicle.id,
        vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.variant}`,
        activePreset,
        ignitionMap,
        fuelMap,
        boostMap,
        timestamp: Date.now()
      };
      localStorage.setItem('indimap_local_draft', JSON.stringify(draft));
      setLastDraftSavedTime(new Date().toLocaleTimeString());
    }, 3000);

    return () => clearTimeout(timer);
  }, [ignitionMap, fuelMap, boostMap, activePreset, selectedVehicle.id]);

  // Intercept window unload events
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isMapModified()) {
        const msg = "You have unsaved engine calibration maps! Leaving without saving may cause you to lose your workspace draft.";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ignitionMap, fuelMap, boostMap, selectedVehicle]);

  // Handle restoring saved draft
  const handleRestoreDraft = () => {
    if (!savedDraft) return;
    const targetVehicle = INDIAN_VEHICLES.find(v => v.id === savedDraft.vehicleId);
    restoringDraftRef.current = true;
    if (targetVehicle && targetVehicle.id !== selectedVehicle.id) {
      setSelectedVehicle(targetVehicle);
    }
    setIgnitionMap(savedDraft.ignitionMap.map((row: any) => [...row]));
    setFuelMap(savedDraft.fuelMap.map((row: any) => [...row]));
    setBoostMap(savedDraft.boostMap.map((row: any) => [...row]));
    setActivePreset(savedDraft.activePreset || 'Stock');
    setSavedDraft(null);
  };

  // Handle discarding saved draft
  const handleDiscardDraft = () => {
    localStorage.removeItem('indimap_local_draft');
    setSavedDraft(null);
  };

  // Handle transition validation
  const handleTabNavigate = (targetTab: string) => {
    if (activeTab === 'maps' && isMapModified()) {
      setPendingTabDestination(targetTab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  // Load active vehicle default map upon selection
  useEffect(() => {
    if (restoringDraftRef.current) {
      restoringDraftRef.current = false;
      return;
    }
    // Deep clone matrices so user edits do not affect static vehicle DB
    setIgnitionMap(selectedVehicle.defaultIgnitionMap.map(row => [...row]));
    setFuelMap(selectedVehicle.defaultFuelMap.map(row => [...row]));
    setBoostMap(selectedVehicle.defaultBoostMap.map(row => [...row]));
    setSelectedCell(null);
    setRangeStart(null);
    setRangeEnd(null);
    setActivePreset('Stock');
    setKnockWarning(false);
    setEditHistory([]);
    setRedoHistory([]);
  }, [selectedVehicle]);

  // Helper to fetch the exact wiring diagram array of 16 pins for the currently active vehicle's ECU model
  const getCurrentVehiclePins = () => {
    const vId = selectedVehicle.id;
    const base = [
      { num: 1, name: "Aux / OEM Switch", signal: "AUX_OEM", color: "—", voltage: "0 V", type: "vendor-optional", desc: "Reserved by manufacturer for dealer-specific tooling or alternative gas map switches." },
      { num: 2, name: "SAE-J1850 PWM+", signal: "J1850_POS", color: "—", voltage: "0 - 5 V pulse", type: "standard-bus", desc: "SAE class-B pulse bus positive differential line (PWM / VPW protocol standard)." },
      { num: 3, name: "Vendor Option / AUX", signal: "AUX_VENDOR", color: "—", voltage: "0 V / 12 V", type: "vendor-optional", desc: "Carmaker custom communication path or auxiliary voltage trigger path." },
      { num: 4, name: "Chassis Ground", signal: "GND_CHASSIS", color: "Black", voltage: "0 V", type: "ground", desc: "Main vehicle metal safety grounding return wire connected to chassis frame." },
      { num: 5, name: "Signal Ground", signal: "GND_SIGNAL", color: "Brown", voltage: "0 V", type: "ground", desc: "Differential interface circuit zero-reference ground path to eliminate voltage offset noise." },
      { num: 6, name: "CAN High (ISO 15765-4)", signal: "CAN_H", color: "Yellow/Silver", voltage: "2.5 V - 3.5 V", desc: "High-speed controller area network J2284 differential transceiver line (High)." },
      { num: 7, name: "K-Line (ISO 9141-2)", signal: "K_LINE", color: "Orange/Black", voltage: "0 - 12 V pulse", desc: "Bi-directional serial path for initial wakeups, fault-code requests and diagnostic handshakes." },
      { num: 8, name: "Switched Ignition Power", signal: "IGN_SWITCHED", color: "—", voltage: "0 V / 12 V", type: "power", desc: "Ignition power rail (+15). Operates only when vehicle key is switched to the ON position." },
      { num: 9, name: "Engine Speed (Tachometer)", signal: "TACH_PULSE", color: "—", voltage: "0 - 12 V pulse", type: "vendor-optional", desc: "Tachometer count reference pulse signal for dyno and diagnostic console tracking." },
      { num: 10, name: "SAE-J1850 VPW-", signal: "J1850_NEG", color: "—", voltage: "0 - 5 V pulse", type: "standard-bus", desc: "SAE class-B pulse bus negative differential return path." },
      { num: 11, name: "OEM Discretionary", signal: "AUX_OEM", color: "—", voltage: "0 V", type: "vendor-optional", desc: "Carmaker proprietary diagnostic lane (e.g. for automatic gearbox or ABS controller)." },
      { num: 12, name: "OEM Accessory Block", signal: "AUX_OEM", color: "—", voltage: "0 V", type: "vendor-optional", desc: "Dedicated line for internal passenger cabin network diagnostics or infotainment setups." },
      { num: 13, name: "EPROM Programming Voltage", signal: "VPP_WRITE", color: "—", voltage: "0 V / 12 - 18 V", type: "vendor-optional", desc: "Discretionary high writing potential used to command target microchip flash overloads." },
      { num: 14, name: "CAN Low (ISO 15765-4)", signal: "CAN_L", color: "Blue/Silver", voltage: "1.5 V - 2.5 V", desc: "High-speed controller area network J2284 differential transceiver line (Low)." },
      { num: 15, name: "L-Line (ISO 9141-2)", signal: "L_LINE", color: "—", voltage: "0 - 12 V pulse", type: "standard-bus", desc: "Uni-directional serial transmission line utilized to initialize diagnosis on legacy systems." },
      { num: 16, name: "Battery Positive (+12V Unswitched)", signal: "BAT_POS", color: "Red/White", voltage: "12 V - 14.4 V", type: "power", desc: "Continuous permanent hot battery positive power link (+30). Protected by diagnostic loop fuse." }
    ];

    if (vId === 'maruti_swift_k12') {
      return base.map(p => {
        if (p.num === 1) return { ...p, color: "Yellow/Green", desc: "ECU CNG selection switch feedback. Enables secondary gas-trim calibration tables." };
        if (p.num === 4) return { ...p, color: "Thick Solid Black", desc: "Routed directly to cabin bulkhead common grounding lug. Zero Ohm resistance path." };
        if (p.num === 5) return { ...p, color: "Thin Brown/Black", desc: "Direct pin on ME17.9.64 plug B (Pin 44). Isolated grounds reference point." };
        if (p.num === 6) return { ...p, color: "Yellow/Silver stripe", desc: "High Speed J2284 Powertrain CAN-H bus. Links to Pin 52 on Bosch ME17 plug B." };
        if (p.num === 7) return { ...p, color: "Orange/Black stripe", desc: "Legacy KWP2000 bi-directional diagnostic query line. Connected to Pin 31 on main ECU plug B." };
        if (p.num === 14) return { ...p, color: "Blue/Silver stripe", desc: "High Speed J2284 Powertrain CAN-L bus. Links to Pin 53 on Bosch ME17 plug B." };
        if (p.num === 16) return { ...p, color: "Red/White stripe", desc: "Continuous 12V battery power, fed through 15A dome fuse under the hood." };
        return p;
      });
    } else if (vId === 'tata_nexon_revotron') {
      return base.map(p => {
        if (p.num === 4) return { ...p, color: "Deep Solid Brown", desc: "Direct structural grounding link on the center dashboard firewall console." };
        if (p.num === 5) return { ...p, color: "Brown with Silver trace", desc: "Clean signal return connected to internal logic boards in Bosch MED17.9.62 plug A." };
        if (p.num === 6) return { ...p, color: "Green/Black stripe", desc: "High speed CAN-H channel. Routed directly to Pin 72 on Tata Bosch MED17 plug." };
        if (p.num === 7) return { ...p, color: "Solid Violet", desc: "Diagnostic single-line wakeup path. Operates under ISO 14230 protocol rules." };
        if (p.num === 8) return { ...p, color: "Solid Yellow", desc: "Accessory / Switched ignition signal link. Activates diagnostic equipment powers." };
        if (p.num === 14) return { ...p, color: "White/Black stripe", desc: "High speed CAN-L channel. Routed directly to Pin 73 on Tata Bosch MED17 plug." };
        if (p.num === 16) return { ...p, color: "Solid Hot Red", desc: "Direct continuous 12V supply routed from main firewall power distribution block." };
        return p;
      });
    } else if (vId === 'mahindra_thar_mhawk') {
      return base.map(p => {
        if (p.num === 4) return { ...p, color: "Thick Slate/Black", desc: "Heavy grounding terminal attached directly underneath the main lower steering column brace." };
        if (p.num === 5) return { ...p, color: "Thick Solid Black", desc: "Digital interface ground loop path connecting back to Mahindra EDC17C55 module plug." };
        if (p.num === 6) return { ...p, color: "Yellow with Orange trace", desc: "Differential high network transceiver bus line bound to heavy mHawk diesel engine controller." };
        if (p.num === 7) return { ...p, color: "Brown/Blue stripe", desc: "Diagnostic fallback trace. Operates at slower baud speeds for older scanner tools." };
        if (p.num === 14) return { ...p, color: "Green/Red stripe", desc: "Differential low network transceiver bus line bound to heavy mHawk diesel engine controller." };
        if (p.num === 16) return { ...p, color: "Thick Red/Yellow stripe", desc: "Heavy unswitched 12V battery power supply line back-up from cabin backup circuit." };
        return p;
      });
    }
    return base;
  };

  // Auth State & Token fetch on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        setUser(firebaseUser);
        setGoogleToken(token);
        setAuthInitialized(true);
        handleBackendSync(firebaseUser);
      },
      () => {
        setUser(null);
        setGoogleToken(null);
        setAuthInitialized(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync Google Tasks list & Google Keep notes when Google Task OAuth token is declared in memory
  useEffect(() => {
    if (googleToken) {
      fetchTaskLists();
      fetchKeepNotes(googleToken);
    } else {
      setTaskLists([]);
      setTasks([]);
      setKeepNotes([]);
    }
  }, [googleToken]);

  // Sync details from our custom Express backend
  const handleBackendSync = async (firebaseUser: FirebaseUser) => {
    setSyncStatus('syncing');
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (res.ok) {
        setSyncStatus('synced');
        fetchTunes(idToken);
      } else {
        setSyncStatus('failed');
      }
    } catch (err) {
      console.error('Error synchronizing user session with Postgres:', err);
      setSyncStatus('failed');
    }
  };

  // List all tunes saved in Postgres for this user
  const fetchTunes = async (idToken: string) => {
    setIsLoadingTunes(true);
    try {
      const res = await fetch('/api/tunes', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        setDbTunes(await res.json());
      }
    } catch (err) {
      console.error('Error fetching Postgres tunes database list:', err);
    } finally {
      setIsLoadingTunes(false);
    }
  };

  // Add active tune into Postgres database record
  const handleSaveTune = async () => {
    if (!user) return;
    setIsSavingTune(true);
    try {
      const idToken = await user.getIdToken();
      let peakHp = selectedVehicle.baseHp;
      let peakTorque = selectedVehicle.baseTorque;
      
      const multiplier = activePreset === 'Stage1_Sport' ? 1.25 : activePreset === 'Stage1_Eco' ? 0.95 : activePreset === 'CNG_Optimize' ? 1.10 : 1.0;
      
      const actualPeakHp = Math.round(peakHp * (aiResult?.suggestedPeakHp ? (aiResult.suggestedPeakHp / peakHp) : multiplier));
      const actualPeakTorque = Math.round(peakTorque * (aiResult?.suggestedPeakTorque ? (aiResult.suggestedPeakTorque / peakTorque) : multiplier));

      const payload = {
        brand: selectedVehicle.brand,
        model: selectedVehicle.model,
        engineName: selectedVehicle.engineName,
        ecuModel: selectedVehicle.ecuModel,
        fuelType: selectedVehicle.fuelType,
        stockHp: selectedVehicle.baseHp,
        stockTorque: selectedVehicle.baseTorque,
        suggestedPeakHp: actualPeakHp,
        suggestedPeakTorque: actualPeakTorque,
        recommendation: aiResult?.recommendation || `Manual coordinate map settings calibrated under preset: ${activePreset}`,
        expectedGainsSummary: aiResult?.expectedGainsSummary || `Ignition timing shifted globally by ${activePreset === 'CNG_Optimize' ? '+4.0' : '+2.5'} degrees.`,
        suggestedOffsetIgnitionDegrees: aiResult?.suggestedOffsetIgnitionDegrees || (activePreset === 'CNG_Optimize' ? 4.0 : activePreset === 'Stage1_Sport' ? 2.5 : 0),
        suggestedOffsetBoostPct: aiResult?.suggestedOffsetBoostPct || (selectedVehicle.isTurbo && activePreset === 'Stage1_Sport' ? 12 : 0),
        checksumHex: aiResult?.checksumHex || `0x${Math.floor(Math.random() * 16777215).toString(16).toUpperCase()}`
      };

      const res = await fetch('/api/tunes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchTunes(idToken);
        alert('Calibrations pushed to Cloud SQL database!');
      } else {
        alert('Failed to save calibration profile.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connection server database.');
    } finally {
      setIsSavingTune(false);
    }
  };

  // Securely delete a saved calibrate profile with confirmation dialog
  const handleDeleteTune = async (tuneId: number) => {
    if (!user) return;
    const confirmed = window.confirm('Are you sure you want to delete this custom saved calibration from the Cloud SQL database? This action is permanent.');
    if (!confirmed) return;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/tunes/${tuneId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        await fetchTunes(idToken);
      } else {
        alert('Failed to delete tuning record.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Google Tasks API lists loader
  const fetchTaskLists = async () => {
    if (!googleToken) return;
    setIsLoadingTasks(true);
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTaskLists(data.items || []);
        if (data.items && data.items.length > 0) {
          // Default to first list
          setSelectedTaskListId(data.items[0].id);
          fetchTasks(data.items[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching Google Task lists:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Google Tasks fetch
  const fetchTasks = async (listId: string) => {
    if (!googleToken || !listId) return;
    setIsLoadingTasks(true);
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching workshop repair tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Create workshop repair task in Google Tasks
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleToken || !selectedTaskListId || !newTaskTitle) return;
    setIsCreatingTask(true);
    try {
      const payload: any = {
        title: newTaskTitle,
        notes: newTaskNotes,
      };
      if (newTaskDueDate) {
        payload.due = `${newTaskDueDate}T00:00:00Z`;
      }
      
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskNotes('');
        setNewTaskDueDate('');
        fetchTasks(selectedTaskListId);
      } else {
        alert('Failed to save repair task onto Google Tasks.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Complete/uncomplete workshop task in Google Tasks
  const handleToggleTaskStatus = async (task: any) => {
    if (!googleToken || !selectedTaskListId) return;
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleToken}`
        },
        body: JSON.stringify({
          id: task.id,
          status: newStatus,
        })
      });
      if (res.ok) {
        fetchTasks(selectedTaskListId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete workshop task from Google Tasks with confirmation
  const handleDeleteTask = async (taskId: string) => {
    if (!googleToken || !selectedTaskListId) return;
    const confirmed = window.confirm('Are you sure you want to delete this task from Google Tasks? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });
      if (res.ok) {
        fetchTasks(selectedTaskListId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setGoogleToken(result.accessToken);
        handleBackendSync(result.user);
      }
    } catch (err) {
      console.error('Google authorization failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out?');
    if (!confirmed) return;
    try {
      await logout();
      setUser(null);
      setGoogleToken(null);
      setDbTunes([]);
      setTaskLists([]);
      setTasks([]);
      setKeepNotes([]);
      setEditHistory([]);
      setRedoHistory([]);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Handle active preset logic (calculates default tuning offsets instantly)
  const applyPresetMap = (preset: RemapPreset) => {
    pushStateToHistory();
    setActivePreset(preset);
    const ignClone = selectedVehicle.defaultIgnitionMap.map(row => [...row]);
    const fuelClone = selectedVehicle.defaultFuelMap.map(row => [...row]);
    const boostClone = selectedVehicle.defaultBoostMap.map(row => [...row]);

    switch (preset) {
      case 'Stage1_Sport':
        // Advance spark timing slightly across all lines
        for (let r = 0; r < ignClone.length; r++) {
          for (let c = 0; c < ignClone[r].length; c++) {
            ignClone[r][c] = Math.round((ignClone[r][c] + 2.5) * 10) / 10;
            // Enrich fuel target mixtures on full load (index >= 4)
            if (c >= 4) {
              fuelClone[r][c] = Math.round((fuelClone[r][c] * 0.96) * 100) / 100;
            }
            // Add Boost if vehicle is dynamic turbo
            if (selectedVehicle.isTurbo) {
              boostClone[r][c] = Math.round((boostClone[r][c] + 0.18) * 100) / 100;
            }
          }
        }
        break;
      case 'Stage1_Eco':
        // Retard spark values slightly or keep standard timing to prevent octane pinging
        // Lean out intermediate cruising zones (loads 30, 50, 70) for fuel saving
        for (let r = 0; r < ignClone.length; r++) {
          for (let c = 0; c < ignClone[r].length; c++) {
            if (c >= 1 && c <= 3) {
              fuelClone[r][c] = Math.round((fuelClone[r][c] * 1.05) * 100) / 100; // 5% leaner target
            }
            if (selectedVehicle.isTurbo && c >= 4) {
              boostClone[r][c] = Math.round((boostClone[r][c] * 0.95) * 100) / 100; // slightly target less boost for saving
            }
          }
        }
        break;
      case 'CNG_Optimize':
        // CNG fuel has high octane (~120 RON) and slower combustion speed
        // Strongly advance ignition timing across all regions to optimize CNG thermal speed (+4.0 degrees spark advance)
        for (let r = 0; r < ignClone.length; r++) {
          for (let c = 0; c < ignClone[r].length; c++) {
            ignClone[r][c] = Math.round((ignClone[r][c] + 4.0) * 10) / 10;
            // Fuel ratios require specific targets depending on engine type
            if (c >= 3) {
              fuelClone[r][c] = Math.round((fuelClone[r][c] * 0.98) * 100) / 100;
            }
          }
        }
        break;
      case 'PopAndBang':
        // Retard timing massively at zero throttle/deceleration load under high RPM (above 3000)
        // Fuel target enriched at 10% load to dump unburnt petrol into hot catalytic converter
        for (let r = 0; r < ignClone.length; r++) {
          for (let c = 0; c < ignClone[r].length; c++) {
            if (c === 0 && RPM_GRID[r] >= 2500) {
              ignClone[r][c] = -6.0; // severe timing delay to push combustion in exhaust manifold
              fuelClone[r][c] = 0.82; // dump raw fuel
            }
          }
        }
        break;
      case 'Stock':
      default:
        // Already loaded original template
        break;
    }

    setIgnitionMap(ignClone);
    setFuelMap(fuelClone);
    setBoostMap(boostClone);
    setSelectedCell(null);
    setRangeStart(null);
    setRangeEnd(null);
  };

  // Compute live horsepower and torque based on changes relative to stock defaults
  const calculateTuningStats = (): TuningResult => {
    let ignAccumulator = 0;
    let ignCount = 0;
    let fuelAccumulator = 0;
    let boostAccumulator = 0;
    
    // Average variance calculation
    for (let r = 0; r < RPM_GRID.length; r++) {
      for (let c = 0; c < LOAD_GRID.length; c++) {
        const defaultIgn = selectedVehicle.defaultIgnitionMap[r]?.[c] || 0;
        const activeIgn = ignitionMap[r]?.[c] || 0;
        ignAccumulator += (activeIgn - defaultIgn);
        ignCount++;

        const defaultFuel = selectedVehicle.defaultFuelMap[r]?.[c] || 1.0;
        const activeFuel = fuelMap[r]?.[c] || 1.0;
        // richer fuel value (smaller lambda ratio means richer) can slightly affect power or heat EGT
        fuelAccumulator += (defaultFuel - activeFuel); // positive means enriched

        const defaultBst = selectedVehicle.defaultBoostMap[r]?.[c] || 0;
        const activeBst = boostMap[r]?.[c] || 0;
        boostAccumulator += (activeBst - defaultBst);
      }
    }

    const avgIgnShift = ignAccumulator / ignCount;
    const avgFuelShift = fuelAccumulator / ignCount;
    const avgBoostShift = boostAccumulator / ignCount;

    // HP calculation model
    let hpGainPct = 0;
    let torqueGainPct = 0;
    let fuelEfficiencyDelta = 0;

    // Advanced spark timing improves thermal cycle efficiency (+1.2% power per shifted degree) unless too advanced
    if (avgIgnShift > 0) {
      if (avgIgnShift > 4.5) {
        // knock zone
        hpGainPct += 4.5 * 1.5;
        // high heat timing delay reduces performance slightly
        hpGainPct -= (avgIgnShift - 4.5) * 1.0; 
      } else {
        hpGainPct += avgIgnShift * 1.4;
      }
    } else {
      // retarded timing reduces power
      hpGainPct += avgIgnShift * 0.8;
    }

    // Boost pressure factor
    if (selectedVehicle.isTurbo) {
      // 1 Bar shift typically doubles theoretical power, we simulate 65% engine volumetric increase
      hpGainPct += (avgBoostShift * 60);
      torqueGainPct += (avgBoostShift * 75);
      fuelEfficiencyDelta -= (avgBoostShift * 10); // wastes fuel at high loads
    }

    // Enrichment fuel delta
    if (avgFuelShift > 0) {
      hpGainPct += (avgFuelShift * 12); // raw enrichment gains
      fuelEfficiencyDelta -= (avgFuelShift * 35);
    } else if (avgFuelShift < 0) {
      // running leaner targets saves fuel but cuts performance
      hpGainPct += (avgFuelShift * 8); 
      fuelEfficiencyDelta += (Math.abs(avgFuelShift) * 22);
    }

    const calculatedHp = Math.round(selectedVehicle.stockHp * (1 + hpGainPct / 100));
    const calculatedTorque = Math.round(selectedVehicle.stockTorque * (1 + (torqueGainPct || hpGainPct * 0.95) / 100));
    
    // Safety check limiters
    const peakIgnAdvance = Math.max(...ignitionMap.map(row => Math.max(...row)));
    const peakBoost = selectedVehicle.isTurbo ? Math.max(...boostMap.map(row => Math.max(...row))) : 0.0;

    return {
      hp: calculatedHp,
      torque: calculatedTorque,
      fuelEfficiencyDeltaPct: Math.round(fuelEfficiencyDelta * 10) / 10,
      peakBoostBar: Math.round(peakBoost * 100) / 100,
      checksumStatus: flashState === 'completed' ? 'Verified' : 'Pending',
      ignitionAdvanceMax: peakIgnAdvance
    };
  };

  const currentTuning = calculateTuningStats();

  // Watch for dangerous advanced timing (knock detection simulation)
  useEffect(() => {
    let knockFound = false;
    for (let r = 0; r < ignitionMap.length; r++) {
      for (let c = 0; c < ignitionMap[r]?.length; c++) {
        const stockV = selectedVehicle.defaultIgnitionMap[r]?.[c] || 0;
        const currentV = ignitionMap[r]?.[c] || 0;
        if (currentV - stockV > 4.5) {
          knockFound = true;
          break;
        }
      }
    }
    setKnockWarning(knockFound);
  }, [ignitionMap, selectedVehicle]);

  // Connect / disconnect simulated OBD port
  const toggleObdConnection = () => {
    if (isConnected) {
      setIsConnected(false);
      setLiveCycle(false);
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      addObdLog("OBD-II Bluetooth Link terminated cleanly.");
    } else {
      setIsConnecting(true);
      addObdLog("Searching Bluetooth OBD scanners near 2.4GHz...");
      setTimeout(() => {
        setIsConnecting(false);
        setIsConnected(true);
        setVolts(13.8 + Math.round((Math.random() - 0.5) * 4) / 10);
        addObdLog("Connected to high-speed ELM327 Android adapter!");
        addObdLog(`Auto-Negotiating Protocol: ${obdProtocol}`);
        addObdLog(`ECU Recognized: CAN-ID 0x7DF [${selectedVehicle.ecuModel}]`);
        addObdLog(`Stored EPROM checksum parsed correctly.`);
      }, 1500);
    }
  };

  const addObdLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setObdLog(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 39)]);
  };

  const addFlashLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setFlashLog(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  // Simulated engine runtime generator
  useEffect(() => {
    if (liveCycle && isConnected) {
      liveIntervalRef.current = setInterval(() => {
        // Randomly simulate throttle fluctuations (like a car revving on a dyno platform)
        setSimThrottle(prev => {
          let change = Math.round((Math.random() - 0.45) * 12);
          let target = prev + change;
          if (target < 10) target = 10;
          if (target > 85) target = 85;
          return target;
        });
      }, 1200);
    } else {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      setSimRpm(800);
      setSimThrottle(15);
      setSimBoost(0.0);
      setSimAfr(14.7);
    }

    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, [liveCycle, isConnected]);

  // Trigger state fluctuations for dashboard running gauges
  useEffect(() => {
    if (liveCycle && isConnected) {
      // Convert throttle to RPM estimation
      const targetRpm = Math.round(800 + (simThrottle * 65));
      setSimRpm(targetRpm);

      // Convert loaded RPM to corresponding boost
      if (selectedVehicle.isTurbo) {
        const maxCarBoost = currentTuning.peakBoostBar || selectedVehicle.defaultBoostBar;
        const currentB = (simThrottle / 100) * maxCarBoost * (1.1 - Math.random() * 0.15);
        setSimBoost(Math.round(Math.max(0, currentB) * 100) / 100);
      } else {
        setSimBoost(0.0);
      }

      // Air Fuel Ratio fluctuations based on fuel configuration
      const avgFuelCell = selectedVehicle.fuelType === 'Diesel' ? 2.1 : 1.0;
      const deviation = (Math.random() - 0.5) * 0.2;
      setSimAfr(Math.round((avgFuelCell * 14.7 + deviation) * 10) / 10);
      
      // Update engine temperature fluidly
      setSimTemp(prev => {
        let cooling = Math.random() > 0.5 ? 1 : -1;
        let baseT = 88;
        if (simRpm > 4000) baseT = 96;
        if (prev < baseT) return prev + 1;
        if (prev > baseT) return prev - 1;
        return prev;
      });
    }
  }, [simThrottle, liveCycle, isConnected, selectedVehicle, currentTuning.peakBoostBar]);

  // Read DTC codes
  const handleScanDtc = () => {
    setScanningDtcs(true);
    addObdLog("Initiating full OBD DTC trouble memory dump...");
    setTimeout(() => {
      setScanningDtcs(false);
      setDtcs(DEMO_DTCS);
      addObdLog(`DTC Scan completed. Identified ${DEMO_DTCS.length} active diagnostic faults.`);
    }, 1200);
  };

  // Reset DTC codes
  const handleClearDtc = () => {
    addObdLog("Sending Mode $04 Clear Diagnostic Trouble Codes request...");
    setDtcs([]);
    setTimeout(() => {
      addObdLog("MIL MIL-off code parsed successfully. Dashboard error lamp cleared.");
    }, 500);
  };

  // History Management Helpers
  const pushStateToHistory = () => {
    const snapshot = {
      ignition: ignitionMap.map(row => [...row]),
      fuel: fuelMap.map(row => [...row]),
      boost: boostMap.map(row => [...row])
    };
    setEditHistory(prev => {
      const next = [...prev, snapshot];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoHistory([]); // Clear redo stack on incremental edit
  };

  const handleUndo = () => {
    if (editHistory.length === 0) return;
    const previous = editHistory[editHistory.length - 1];
    setEditHistory(prev => prev.slice(0, -1));

    // Save current state to redo history
    const current = {
      ignition: ignitionMap.map(row => [...row]),
      fuel: fuelMap.map(row => [...row]),
      boost: boostMap.map(row => [...row])
    };
    setRedoHistory(prev => [...prev, current]);

    // Restore previous state
    setIgnitionMap(previous.ignition);
    setFuelMap(previous.fuel);
    setBoostMap(previous.boost);

    // Sync input textbox value
    if (selectedCell) {
      const { r, c } = selectedCell;
      let val = 0;
      if (activeMapType === 'ignition') {
        val = previous.ignition[r][c];
      } else if (activeMapType === 'fuel') {
        val = previous.fuel[r][c];
      } else if (activeMapType === 'boost') {
        val = previous.boost[r][c];
      }
      setCellEditVal(val.toString());
    }
    
    addObdLog("Calibration step undone to previous EPROM snapshot.");
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));

    // Save current state to we can undo it again
    const current = {
      ignition: ignitionMap.map(row => [...row]),
      fuel: fuelMap.map(row => [...row]),
      boost: boostMap.map(row => [...row])
    };
    setEditHistory(prev => [...prev, current]);

    // Restore next state
    setIgnitionMap(next.ignition);
    if (next.fuel) setFuelMap(next.fuel);
    setBoostMap(next.boost);

    // Sync input textbox value
    if (selectedCell) {
      const { r, c } = selectedCell;
      let val = 0;
      if (activeMapType === 'ignition') {
        val = next.ignition[r][c];
      } else if (activeMapType === 'fuel' && next.fuel) {
        val = next.fuel[r][c];
      } else if (activeMapType === 'boost') {
        val = next.boost[r][c];
      }
      setCellEditVal(val.toString());
    }

    addObdLog("Calibration step redone to next EPROM snapshot.");
  };

  // Google Keep API Sync and Fallbacks
  const fetchKeepNotes = async (token = googleToken) => {
    if (!token) return;
    setIsKeepLoading(true);
    try {
      const res = await fetch('https://keep.googleapis.com/v1/notes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const apiNotes = (data.notes || []).map((note: any) => {
          const id = note.name || '';
          const title = note.title || '';
          const text = note.body?.text?.text || '';
          return { id, title, text, date: new Date().toLocaleDateString(), isLocalFallback: false };
        });
        setKeepNotes(apiNotes);
        setKeepStatus('synced');
      } else {
        throw new Error(`Google Keep restricted with status ${res.status}`);
      }
    } catch (err) {
      console.warn("Failing back to offline persistent Keep notes because Keep API is enterprise restricted:", err);
      const cached = localStorage.getItem('ecu_backup_notes');
      if (cached) {
        setKeepNotes(JSON.parse(cached));
      } else {
        const defaultNotes = [
          { id: '1', title: 'STAGE 1 MARUTI SWIFT', text: 'Target rail pressure 1800 bar. Smooth off-the-line torque delivery. Verified zero spark knocking.', date: new Date().toLocaleDateString(), isLocalFallback: true },
          { id: '2', title: 'MAHINDRA THAR CRDE', text: 'Increased boost target slightly to 1.15 Bar to reduce low rpm turbo lag.', date: new Date().toLocaleDateString(), isLocalFallback: true }
        ];
        setKeepNotes(defaultNotes);
        localStorage.setItem('ecu_backup_notes', JSON.stringify(defaultNotes));
      }
      setKeepStatus('local_fallback');
    } finally {
      setIsKeepLoading(false);
    }
  };

  const handleCreateKeepNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeepTitle.trim() && !newKeepText.trim()) return;

    if (googleToken && keepStatus === 'synced') {
      setIsKeepLoading(true);
      try {
        const res = await fetch('https://keep.googleapis.com/v1/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${googleToken}`
          },
          body: JSON.stringify({
            title: newKeepTitle,
            body: { text: { text: newKeepText } }
          })
        });
        if (res.ok) {
          setNewKeepTitle('');
          setNewKeepText('');
          fetchKeepNotes();
        } else {
          throw new Error('POST failed');
        }
      } catch (err) {
        console.error(err);
        saveKeepNoteLocally(newKeepTitle, newKeepText);
      } finally {
        setIsKeepLoading(false);
      }
    } else {
      saveKeepNoteLocally(newKeepTitle, newKeepText);
    }
  };

  const saveKeepNoteLocally = (title: string, text: string) => {
    const freshNote = {
      id: Date.now().toString(),
      title,
      text,
      date: new Date().toLocaleDateString(),
      isLocalFallback: true
    };
    const nextNotes = [freshNote, ...keepNotes];
    setKeepNotes(nextNotes);
    localStorage.setItem('ecu_backup_notes', JSON.stringify(nextNotes));
    setNewKeepTitle('');
    setNewKeepText('');
  };

  const handleDeleteKeepNote = async (id: string, isLocal?: boolean) => {
    const confirmed = window.confirm('Are you sure you want to delete this calibration note?');
    if (!confirmed) return;

    if (googleToken && !isLocal && keepStatus === 'synced') {
      setIsKeepLoading(true);
      try {
        const res = await fetch(`https://keep.googleapis.com/v1/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${googleToken}` }
        });
        if (res.ok) {
          fetchKeepNotes();
        } else {
          throw new Error('DELETE failed');
        }
      } catch (err) {
        console.error(err);
        deleteKeepNoteLocally(id);
      } finally {
        setIsKeepLoading(false);
      }
    } else {
      deleteKeepNoteLocally(id);
    }
  };

  const deleteKeepNoteLocally = (id: string) => {
    const nextNotes = keepNotes.filter(n => n.id !== id);
    setKeepNotes(nextNotes);
    localStorage.setItem('ecu_backup_notes', JSON.stringify(nextNotes));
  };

  // Modify individual cell value and range selection
  const handleCellSelect = (r: number, c: number, activeMap: number[][], shiftKey = false) => {
    setSelectedCell({ r, c });
    setCellEditVal(activeMap[r][c].toString());

    if (shiftKey && rangeStart) {
      setRangeEnd({ r, c });
    } else {
      setRangeStart({ r, c });
      setRangeEnd({ r, c });
    }
  };

  // Perform Bilinear or Linear Interpolation on selected cell range
  const handleInterpolateRange = () => {
    if (!rangeStart || !rangeEnd) {
      alert("Please highlight a cell range first (Shift-Click to select a range of cells).");
      return;
    }

    const minR = Math.min(rangeStart.r, rangeEnd.r);
    const maxR = Math.max(rangeStart.r, rangeEnd.r);
    const minC = Math.min(rangeStart.c, rangeEnd.c);
    const maxC = Math.max(rangeStart.c, rangeEnd.c);

    if (minR === maxR && minC === maxC) {
      alert("Please select a range of at least 2 cells to interpolate (e.g. 1x2, 2x1, or 2x2).");
      return;
    }

    // Save history prior to major interpolation batch change
    pushStateToHistory();

    // Determine target map to interpolate
    let targetMap: number[][] = [];
    if (activeMapType === 'ignition') {
      targetMap = ignitionMap.map(row => [...row]);
    } else if (activeMapType === 'fuel') {
      targetMap = fuelMap.map(row => [...row]);
    } else if (activeMapType === 'boost') {
      targetMap = boostMap.map(row => [...row]);
    }

    const valTL = targetMap[minR][minC]; // Top Left
    const valTR = targetMap[minR][maxC]; // Top Right
    const valBL = targetMap[maxR][minC]; // Bottom Left
    const valBR = targetMap[maxR][maxC]; // Bottom Right

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        // Compute normalized coefficients (0 to 1) inside bounded range selection
        const tx = maxC > minC ? (c - minC) / (maxC - minC) : 0;
        const ty = maxR > minR ? (r - minR) / (maxR - minR) : 0;

        let interpolatedVal = 0;

        if (maxR > minR && maxC > minC) {
          // Bilinear Interpolation for 2D Grid Section
          const valTop = (1 - tx) * valTL + tx * valTR;
          const valBottom = (1 - tx) * valBL + tx * valBR;
          interpolatedVal = (1 - ty) * valTop + ty * valBottom;
        } else if (maxC > minC) {
          // 1D Horizontal Linear Interpolation
          interpolatedVal = (1 - tx) * valTL + tx * valTR;
        } else if (maxR > minR) {
          // 1D Vertical Linear Interpolation
          interpolatedVal = (1 - ty) * valTL + ty * valBL;
        } else {
          interpolatedVal = valTL;
        }

        // Apply type constraints and rounding
        if (activeMapType === 'ignition') {
          // Limit -20 to +45 deg, round to 1 decimal place
          interpolatedVal = parseFloat(Math.min(45, Math.max(-20, interpolatedVal)).toFixed(1));
        } else if (activeMapType === 'fuel') {
          // Limit Lambda 0.65 to 3.0, round to 2 decimal places
          interpolatedVal = parseFloat(Math.min(3.0, Math.max(0.65, interpolatedVal)).toFixed(2));
        } else if (activeMapType === 'boost') {
          // Limit Boost 0.0 to 3.5 bar, round to 2 decimal places
          interpolatedVal = parseFloat(Math.min(3.5, Math.max(0.0, interpolatedVal)).toFixed(2));
        }

        targetMap[r][c] = interpolatedVal;
      }
    }

    // Update corresponding map state
    if (activeMapType === 'ignition') {
      setIgnitionMap(targetMap);
    } else if (activeMapType === 'fuel') {
      setFuelMap(targetMap);
    } else if (activeMapType === 'boost') {
      setBoostMap(targetMap);
    }

    // Sync input textbox value if focused cell is inside
    if (selectedCell) {
      setCellEditVal(targetMap[selectedCell.r][selectedCell.c].toString());
    }

    addObdLog(`Smoothing linear interpolation applied across selected ${maxR - minR + 1}x${maxC - minC + 1} grid sector.`);
  };

  const updateSelectedCellValue = (valStr: string) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const valNum = parseFloat(valStr);
    if (isNaN(valNum)) return;

    // Apply exact boundary safeguards
    let finalVal = valNum;
    if (activeMapType === 'ignition') {
      // Cap timing advance between -20 and +45
      finalVal = Math.min(45, Math.max(-20, valNum));
      const currentVal = ignitionMap[r][c];
      if (finalVal !== currentVal) {
        pushStateToHistory();
        const nextIgn = ignitionMap.map(row => [...row]);
        nextIgn[r][c] = finalVal;
        setIgnitionMap(nextIgn);
      }
    } else if (activeMapType === 'fuel') {
      // Lambda bounds 0.65 (super rich) to 3.0 (super lean)
      finalVal = Math.min(3.0, Math.max(0.65, valNum));
      const currentVal = fuelMap[r][c];
      if (finalVal !== currentVal) {
        pushStateToHistory();
        const nextFuel = fuelMap.map(row => [...row]);
        nextFuel[r][c] = finalVal;
        setFuelMap(nextFuel);
      }
    } else if (activeMapType === 'boost') {
      // Boost bounded max 3.5 Bar limit
      finalVal = Math.min(3.5, Math.max(0.0, valNum));
      const currentVal = boostMap[r][c];
      if (finalVal !== currentVal) {
        pushStateToHistory();
        const nextBst = boostMap.map(row => [...row]);
        nextBst[r][c] = finalVal;
        setBoostMap(nextBst);
      }
    }

    setCellEditVal(finalVal.toString());
  };

  const adjustCellValueStep = (increment: number) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    let currVal = 0;
    if (activeMapType === 'ignition') {
      currVal = ignitionMap[r][c];
    } else if (activeMapType === 'fuel') {
      currVal = fuelMap[r][c];
    } else if (activeMapType === 'boost') {
      currVal = boostMap[r][c];
    }

    const step = activeMapType === 'fuel' ? 0.02 : 0.5;
    const nextVal = Math.round((currVal + (increment * step)) * 100) / 100;
    updateSelectedCellValue(nextVal.toString());
  };

  // Calling server-side proxy route `/api/gemini/tune` using the recommended SDK guidelines
  const consultAiAdvisor = async () => {
    setIsAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const response = await fetch('/api/gemini/tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: selectedVehicle.brand,
          model: selectedVehicle.model,
          engineName: selectedVehicle.engineName,
          ecuModel: selectedVehicle.ecuModel,
          fuelType: selectedVehicle.fuelType,
          tunerRequest: aiPrompt,
          stockHp: selectedVehicle.stockHp,
          stockTorque: selectedVehicle.stockTorque,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP bad response: ${response.status}`);
      }

      const rawJson = await response.json();
      if (rawJson.error) {
        throw new Error(rawJson.error);
      }

      setAiResult(rawJson);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Error occurred while contacting Indian ECU tuning expert database.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Inject computed AI Tuning values directly into our Active Remap memory
  const applyAiOffsetsToMap = () => {
    if (!aiResult) return;
    
    const ignOffset = aiResult.suggestedOffsetIgnitionDegrees || 0.0;
    const bstFactorPct = aiResult.suggestedOffsetBoostPct || 0.0;

    const ignClone = selectedVehicle.defaultIgnitionMap.map(row => 
      row.map(val => Math.round((val + ignOffset) * 10) / 10)
    );

    const boostClone = selectedVehicle.defaultBoostMap.map(row => 
      row.map(val => Math.round((val * (1 + bstFactorPct / 100)) * 100) / 100)
    );

    // Slightly enrich standard fuel table for reliability with advanced timing
    const fuelClone = selectedVehicle.defaultFuelMap.map(row => 
      row.map((val, c) => c >= 4 ? Math.round((val * 0.97) * 100) / 100 : val)
    );

    setIgnitionMap(ignClone);
    setBoostMap(boostClone);
    setFuelMap(fuelClone);
    setActivePreset('Stock'); // Reset preset highlighting as this is AI custom
    setSelectedCell(null);
    setRangeStart(null);
    setRangeEnd(null);
    setActiveTab('maps'); // Switch back to map page so they can view results!
    addObdLog(`Applied AI Calibrated offsets into active EPROM Emu: Ign timing shifts (+${ignOffset}°), Boost scale (+${bstFactorPct}%).`);
  };

  // Download summary of the current calibration settings as a text file
  const handleDownloadCalibrationSheet = () => {
    const reportText = `======================================================================
                 INDIMAP v3.9 PRO CALIBRATION BUILD SHEET
           Bharat Garage Engine Remapping & Tuning Diagnostics Suite
======================================================================
REPORT TIMESTAMP      : ${new Date().toLocaleString()}
DATABASE VEHICLE REFC : IND-${selectedVehicle.id.toUpperCase()}
WORKSHOP OPERATOR     : ${user?.email || 'nachiketh.JO@gmail.com'} (AUTHORIZED)
SECURITY HASH STATUS  : ${currentTuning.checksumStatus.toUpperCase()} (${aiResult?.checksumHex || '0xBD4D2A91'})
======================================================================

1. VEHICLE PLATFORM CONFIGURATION:
----------------------------------------------------------------------
  * Brand & Model     : ${selectedVehicle.brand?.toUpperCase()} ${selectedVehicle.model?.toUpperCase()}
  * Variant Index     : ${selectedVehicle.variant?.toUpperCase()}
  * Cylinder Config   : ${selectedVehicle.engineName} (${selectedVehicle.displacementCc} cc)
  * Combustion Cycle  : ${selectedVehicle.fuelType?.toUpperCase()}
  * Integrated ECU    : ${selectedVehicle.ecuModel} (Freescale EPROM Flash Security)

2. MEASURED POWER DYNAMICS & TUNING DEFLECT:
----------------------------------------------------------------------
  * OEM Factory Rating: ${selectedVehicle.stockHp} HP / ${selectedVehicle.stockTorque} Nm
  * Tuned Level Est.  : ${currentTuning.hp} HP / ${currentTuning.torque} Nm
  * Net Gain Delta    : +${Math.round(currentTuning.hp - selectedVehicle.stockHp)} HP (+${Math.round(((currentTuning.hp - selectedVehicle.stockHp) / selectedVehicle.stockHp) * 100)}%)
  * Target Peak Boost : ${selectedVehicle.isTurbo ? `${currentTuning.peakBoostBar} bar (Stock: ${selectedVehicle.defaultBoostBar} bar)` : "N/A (Naturally Aspirated Engine)"}
  * Fuel Cycle Shift  : ${currentTuning.fuelEfficiencyDeltaPct > 0 ? `+${currentTuning.fuelEfficiencyDeltaPct}% Efficiency Gain` : `${currentTuning.fuelEfficiencyDeltaPct}% Enrichment Delta`}
  * Peak Spark Advance: ${currentTuning.ignitionAdvanceMax}° BTDC (Stock Max: ${Math.max(...selectedVehicle.defaultIgnitionMap.flat())}°)

3. ACTIVE ECU EPROM CHIP PARAMETERS:
----------------------------------------------------------------------
  * Core Map Selection: ${activePreset?.toUpperCase() || 'CUSTOM MANUAL OVERRIDE'}
  * Ignition Offsets  : Applied timing maps calibrated via ${aiResult ? "Google Gemini AI Engine" : "Manual Grid Shader"}
  * Spark Knock Status: ${knockWarning ? "WARNING: HIGH TEMPERATURE ADVANCE RISK PRESENT" : "CLEAN: Spark offset curves inside thermal threshold boundaries"}

======================================================================
    Always flash maps with stable battery auxiliary supply (13.8V).
    END OF REPORT - BHARAT GARAGE TUNING PROTOCOLS (c) 2026.
======================================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `INDIMAP-CalibSheet-${selectedVehicle.id}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Simulated ROM Flashing Sequence
  const beginRomFlashSequence = () => {
    if (!isConnected) {
      addObdLog("OBD Link Error: Establish simulated bluetooth link before sector-level EEPROM write.");
      setActiveTab('obd');
      return;
    }
    
    setFlashState('erasing');
    setFlashProgress(0);
    setFlashLog([]);
    
    addFlashLog("Flashing sequence engaged...");
    addFlashLog(`Target vehicle identified: ${selectedVehicle.brand} ${selectedVehicle.model}`);
    addFlashLog(`Preparing security unlock seed key authorization...`);

    const runProgressStep = (curPct: number) => {
      if (curPct <= 100) {
        setFlashProgress(curPct);
        
        if (curPct === 10) {
          addFlashLog("Security access handshake granted (Level 3 - Calibrator).");
          addFlashLog("Executing full flash sector erase [Sectors 0x004000 to 0x1A8000]...");
        }
        if (curPct === 30) {
          setFlashState('writing');
          addFlashLog("Flash memory blocks blank check: CLEAN.");
          addFlashLog("Writing new calibration vectors partition [Timing, Lambda, Boost Pressure]...");
        }
        if (curPct === 60) {
          addFlashLog(`Writing offset map indexes... target timing limit calculated.`);
        }
        if (curPct === 80) {
          setFlashState('verifying');
          addFlashLog("Calibration blocks successfully committed to Flash ROM.");
          addFlashLog(`Verifying ROM partition checksum index...`);
          addFlashLog(`Target CRC32 Sum expected: ${aiResult?.checksumHex || '0xBD4D2A91'}`);
        }
        
        let delay = curPct < 30 ? 600 : (curPct < 80 ? 400 : 800);
        setTimeout(() => runProgressStep(curPct + Math.floor(Math.random() * 8) + 4), delay);
      } else {
        setFlashProgress(100);
        setFlashState('completed');
        addFlashLog("Checksum fully verified (SHA-256 Validated).");
        addFlashLog("ECU EPROM programming session completed perfectly.");
        addFlashLog("Action Required: Please turn vehicle ignition OFF, wait 10 seconds, then cycle ON.");
        addObdLog(`Flashed Custom Remap parameters successfully compiled & saved.`);
      }
    };

    setTimeout(() => {
      runProgressStep(4);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none selection:bg-red-600 selection:text-white">
      
      {/* Top Engineering Banner Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-600 flex items-center justify-center font-black text-xl italic text-white shrink-0">T</div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-white">
              INDIMAP <span className="text-red-600 font-black italic text-sm">v3.9 PRO</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">ECU Remap & Diagnosis Android Suite</span>
              <span className="text-zinc-700 hidden sm:inline">|</span>
              <button
                id="open-help-btn"
                onClick={() => setShowHelpManual(true)}
                className="text-[9px] text-amber-500 hover:text-amber-400 font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-all bg-amber-500/10 border border-amber-550/20 px-2 py-0.5 rounded-sm hover:bg-amber-500/20"
              >
                <BookOpen className="w-3 h-3 text-amber-500" />
                <span>APP GUIDE / MANUAL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Vehicle Summary Widget */}
        <div className="flex items-center gap-6 bg-zinc-900 text-zinc-100 font-sans">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-neutral-600"}`}></div>
            <span className="text-xs font-bold text-green-500 uppercase tracking-widest">
              {isConnected ? "OBD-II Connected" : "OBD-II STANDBY"}
            </span>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">Active Vehicle</p>
            <p className="font-extrabold text-sm uppercase">{selectedVehicle.brand} {selectedVehicle.model}</p>
          </div>
          <div className="border-l border-zinc-800 h-8 pl-4 font-mono text-left">
            <p className="text-red-500 font-black tracking-tighter text-sm uppercase leading-none">{selectedVehicle.ecuModel}</p>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-1">{selectedVehicle.variant}</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Interactive panel (Android Device Shell emulation viewport) */}
        <section className="lg:col-span-4 bg-zinc-900 border border-zinc-800 p-6 relative overflow-hidden flex flex-col gap-6 self-stretch justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 blur-3xl rounded-full" />
          
          {/* Device Bezels status panel */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <div className="flex items-center gap-1.5 text-red-500">
              <Smartphone className="w-3.5 h-3.5" />
              <span>OBD-II DATASTREAM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Wifi className={`w-3 h-3 ${isConnected ? "text-green-500 animate-pulse" : "text-zinc-650"}`} />
                <span className={isConnected ? "text-green-500" : "text-zinc-500"}>
                  {isConnected ? "ACTIVE LINK" : "DISCONNECTED"}
                </span>
              </div>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-300">{volts}V</span>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center justify-between">
              <span>ECU Profile</span>
              <span className="px-1.5 py-0.5 bg-red-600/10 border border-red-600/25 text-red-500 text-[9px] font-black italic tracking-widest">
                {selectedVehicle.fuelType?.toUpperCase()}
              </span>
            </h2>

            {/* Quick Selector Dropdown */}
            <div className="relative mb-4">
              <label htmlFor="vehicle-select" className="sr-only">Select Vehicle</label>
              <select 
                id="vehicle-select"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 py-3 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-red-600 text-xs font-black uppercase tracking-wider"
                value={selectedVehicle.id}
                onChange={(e) => {
                  const found = INDIAN_VEHICLES.find(v => v.id === e.target.value);
                  if (found) setSelectedVehicle(found);
                }}
              >
                {INDIAN_VEHICLES.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id} className="bg-zinc-900 font-sans">
                    {vehicle.brand?.toUpperCase()} - {vehicle.model?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Simulated Engine Spec Sheet */}
            <div className="bg-zinc-950 p-4 border border-zinc-800 mb-6 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-550 font-black uppercase text-[9px] tracking-wider">Engine Architecture</span>
                <span className="text-zinc-200 font-extrabold uppercase">{selectedVehicle.engineName} ({selectedVehicle.displacementCc} cc)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-550 font-black uppercase text-[9px] tracking-wider">MCU Controller Type</span>
                <span className="font-mono text-red-500 font-black tracking-tight">{selectedVehicle.ecuModel}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-2">
                <span className="text-zinc-550 font-black uppercase text-[9px] tracking-wider">OEM Power Output</span>
                <span className="text-zinc-200 font-bold tracking-tight">{selectedVehicle.stockHp} HP / {selectedVehicle.stockTorque} Nm</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-zinc-400 font-black uppercase text-[10px] tracking-wider">Tuning Forecast Output</span>
                <span className="text-green-500 font-black italic text-sm leading-none flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {currentTuning.hp} HP / {currentTuning.torque} Nm
                </span>
              </div>
              
              <div className="pt-2 flex gap-2 justify-between text-[11px] text-zinc-400 bg-zinc-900/40 p-2.5 border border-zinc-900 mt-2">
                <span className="font-black uppercase text-[9px] text-zinc-500 tracking-wider">Delta Variance:</span>
                <strong className="text-green-500 font-black italic">
                  +{Math.round((currentTuning.hp - selectedVehicle.stockHp))} HP (+{Math.round(((currentTuning.hp - selectedVehicle.stockHp)/selectedVehicle.stockHp)*100)}%)
                </strong>
              </div>

              <button
                id="download-build-sheet-btn"
                onClick={handleDownloadCalibrationSheet}
                className="w-full mt-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-750 text-amber-500 hover:text-amber-405 font-mono text-[9px] font-black uppercase tracking-widest py-2 px-3 rounded-none flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export EPROM Build Sheet</span>
              </button>
            </div>

            {/* Interactive Dynamic State Presets Selector */}
            <div className="space-y-3 mb-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Select Base Calibration Preset</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="preset-stock"
                  onClick={() => applyPresetMap('Stock')}
                  className={`py-2.5 px-3 text-left border-l-4 transition-all cursor-pointer ${
                    activePreset === 'Stock' 
                    ? 'bg-zinc-950 border-red-600 text-white font-black italic uppercase tracking-tighter' 
                    : 'bg-zinc-950/40 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">STAGE 00</span>
                  <span className="text-[11px] font-black italic uppercase tracking-tighter block leading-none">OEM STOCK</span>
                </button>
                <button
                  id="preset-sport"
                  onClick={() => applyPresetMap('Stage1_Sport')}
                  className={`py-2.5 px-3 text-left border-l-4 transition-all cursor-pointer ${
                    activePreset === 'Stage1_Sport' 
                    ? 'bg-zinc-950 border-red-600 text-white font-black italic uppercase tracking-tighter' 
                    : 'bg-zinc-950/40 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">STAGE 01</span>
                  <span className="text-[11px] font-black italic uppercase tracking-tighter block leading-none">STREET HP</span>
                </button>
                <button
                  id="preset-eco"
                  onClick={() => applyPresetMap('Stage1_Eco')}
                  className={`py-2.5 px-3 text-left border-l-4 transition-all cursor-pointer ${
                    activePreset === 'Stage1_Eco' 
                    ? 'bg-zinc-950 border-red-600 text-white font-black italic uppercase tracking-tighter' 
                    : 'bg-zinc-950/40 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">STAGE 01</span>
                  <span className="text-[11px] font-black italic uppercase tracking-tighter block leading-none">ECO TUNER</span>
                </button>
                {selectedVehicle.fuelType === 'Petrol + CNG' ? (
                  <button
                    id="preset-cng"
                    onClick={() => applyPresetMap('CNG_Optimize')}
                    className={`py-2.5 px-3 text-left border-l-4 transition-all cursor-pointer ${
                      activePreset === 'CNG_Optimize' 
                      ? 'bg-zinc-955 border-red-600 text-white font-black italic uppercase tracking-tighter' 
                      : 'bg-zinc-950/40 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">OCTANE FOCUS</span>
                    <span className="text-[11px] font-black italic uppercase tracking-tighter block leading-none">CNG TIMING</span>
                  </button>
                ) : (
                  <button
                    id="preset-pop"
                    onClick={() => applyPresetMap('PopAndBang')}
                    className={`py-2.5 px-3 text-left border-l-4 transition-all cursor-pointer ${
                      activePreset === 'PopAndBang' 
                      ? 'bg-zinc-955 border-red-600 text-white font-black italic uppercase tracking-tighter' 
                      : 'bg-zinc-950/40 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <span className="block text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">EXHAUST MOD</span>
                    <span className="text-[11px] font-black italic uppercase tracking-tighter block leading-none">POP & BANG</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6 space-y-4">
            {/* Quick Live Spark timing ping warning limit check */}
            {knockWarning && (
              <div className="bg-red-500/10 border border-red-600/40 text-red-400 p-3 rounded-none flex items-start gap-2.5 text-[11px]">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-black uppercase tracking-wider block">TIMING EXPLOSION KNOCK RISK!</span>
                  <p className="text-zinc-400 leading-relaxed mt-0.5">Ignition calibration exceeds safe timing vectors. Advanced spark threshold recommended below +4.5°.</p>
                </div>
              </div>
            )}

            {/* OBD-II Connection interface manager */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Link Interface channel</span>
              <div className="flex gap-2">
                <button
                  id="connect-btn"
                  onClick={toggleObdConnection}
                  className={`flex-1 py-4.5 px-6 rounded-none font-black italic uppercase tracking-wider text-xs select-none transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isConnected 
                    ? 'bg-zinc-955 hover:bg-zinc-900 border border-red-600 text-red-500 shadow-lg' 
                    : isConnecting 
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 animate-pulse'
                    : 'bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs shadow-lg'
                  }`}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      <span>Negotiating Link...</span>
                    </>
                  ) : isConnected ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Disconnect Protocol Link</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current text-white" />
                      <span>Connect OBD-II Adapter</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Live OBD Engine Test cycle toggle */}
            {isConnected && (
              <div className="flex items-center justify-between bg-zinc-950 p-3 border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${liveCycle ? "bg-green-500 animate-ping" : "bg-zinc-700"}`} />
                  <div>
                    <p className="text-[11px] text-zinc-100 font-extrabold uppercase tracking-wider">Engine Cycle Simulator</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Fluctuating Dynamic loads</p>
                  </div>
                </div>
                <button
                  onClick={() => setLiveCycle(!liveCycle)}
                  className={`text-[9px] px-3 py-1.5 border font-mono select-none font-black tracking-widest cursor-pointer ${
                    liveCycle 
                    ? "bg-zinc-900 border-green-500/50 text-green-500" 
                    : "bg-zinc-950 border-zinc-850 text-zinc-550 hover:text-white"
                  }`}
                >
                  {liveCycle ? "ACTIVE" : "STANDBY"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Tab Pages Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Workspace Navigation and Tab Selectors */}
          <nav className="flex bg-zinc-900 p-1 border border-zinc-800 overflow-x-auto gap-1">
            <button
              onClick={() => handleTabNavigate('obd')}
              className={`flex-1 py-3 px-4 min-w-[100px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'obd' 
                ? 'bg-zinc-950 text-red-600 border-b-2 border-red-600 font-extrabold' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Gauge className="w-4 h-4 text-red-600" />
              <span>OBD LIVE STREAM</span>
            </button>
            <button
              id="tab-maps"
              onClick={() => handleTabNavigate('maps')}
              className={`flex-1 py-3 px-4 min-w-[100px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'maps' 
                ? 'bg-zinc-950 text-red-600 border-b-2 border-red-600 font-extrabold' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Cpu className="w-4 h-4 text-red-600" />
              <span>ROM MAP EDITOR</span>
            </button>
            <button
              id="tab-ai"
              onClick={() => handleTabNavigate('ai')}
              className={`flex-1 py-3 px-4 min-w-[100px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'ai' 
                ? 'bg-zinc-950 text-red-600 border-b-2 border-red-600 font-extrabold' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>AI CALIBRATOR</span>
            </button>
            <button
              id="tab-flash"
              onClick={() => handleTabNavigate('flash')}
              className={`flex-1 py-3 px-4 min-w-[100px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'flash' 
                ? 'bg-zinc-950 text-red-600 border-b-2 border-red-600 font-extrabold' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Check className="w-4 h-4 text-red-600" />
              <span>EPROM FLASH CODES</span>
            </button>
            <button
              id="tab-cloud"
              onClick={() => handleTabNavigate('cloud')}
              className={`flex-1 py-3 px-4 min-w-[130px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'cloud' 
                ? 'bg-zinc-950 text-red-600 border-b-2 border-red-600 font-extrabold' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Cloud className="w-4 h-4 text-red-600" />
              <span>CLOUD SQL & TASKS</span>
            </button>
          </nav>          {/* TAB 1: OBD LIVE MONITOR & OBD CODES */}
          {activeTab === 'obd' && (
            <div className="space-y-6">
              
              {/* Telemetry Realtime Dials Container */}
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  <span>Real-Time EPROM OBD Telemetry</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {/* Gauge 1: RPM */}
                  <div className="bg-zinc-950 p-4 border border-zinc-800 relative flex flex-col items-center text-center">
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Engine Speed</span>
                    <span className="text-3xl font-black italic tracking-tighter text-white mt-2">
                      {isConnected ? simRpm : "---"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">RPM</span>
                    {isConnected && (
                      <div className="w-full bg-zinc-900 h-1 mt-4">
                        <div 
                          className="bg-red-600 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (simRpm / 7000) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Gauge 2: Throttle Position */}
                  <div className="bg-zinc-950 p-4 border border-zinc-800 relative flex flex-col items-center text-center">
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Throttle Load</span>
                    <span className="text-3xl font-black italic tracking-tighter text-white mt-2">
                      {isConnected ? `${simThrottle}%` : "---"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">SPS</span>
                    {isConnected && (
                      <div className="w-full bg-zinc-900 h-1 mt-4">
                        <div 
                          className="bg-green-500 h-full transition-all duration-300"
                          style={{ width: `${simThrottle}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Gauge 3: AFR Ratio */}
                  <div className="bg-zinc-950 p-4 border border-zinc-800 relative flex flex-col items-center text-center">
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">A/F Ratio</span>
                    <span className="text-3xl font-black italic tracking-tighter text-red-500 mt-2">
                      {isConnected ? simAfr : "---"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Lambda</span>
                    {isConnected && (
                      <span className={`text-[10px] uppercase font-black tracking-widest mt-2 ${simAfr < 14.2 ? "text-amber-500" : simAfr > 15.2 ? "text-red-500" : "text-green-500"}`}>
                        {simAfr < 14.2 ? "RICH" : simAfr > 15.2 ? "LEAN" : "STOICH"}
                      </span>
                    )}
                  </div>

                  {/* Gauge 4: Dynamic Boost */}
                  <div className="bg-zinc-950 p-4 border border-zinc-800 relative flex flex-col items-center text-center">
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">MAP Pressure</span>
                    <span className="text-3xl font-black italic tracking-tighter text-white mt-2">
                      {isConnected ? `${simBoost} bar` : "---"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Boost</span>
                    {isConnected && (
                      <div className="w-full bg-zinc-900 h-1 mt-4">
                        <div 
                          className="bg-red-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (simBoost / 2.0) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Gauge 5: Water Temperature */}
                  <div className="bg-zinc-950 p-4 border border-zinc-800 relative flex flex-col items-center text-center">
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Coolant Temp</span>
                    <span className="text-3xl font-black italic tracking-tighter text-white mt-2">
                      {isConnected ? `${simTemp}°C` : "---"}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Radiator</span>
                    {isConnected && (
                      <span className={`text-[10px] font-black uppercase tracking-widest leading-none mt-2.5 ${simTemp >= 100 ? "text-red-500 animate-pulse" : "text-green-500"}`}>
                        {simTemp >= 100 ? "OVERHEAT" : "STABLE"}
                      </span>
                    )}
                  </div>
                </div>

                {!isConnected && (
                  <div className="mt-6 p-6 text-center border-2 border-dashed border-zinc-800 text-xs text-zinc-500 uppercase font-black tracking-widest">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-3 text-zinc-650" />
                    Please connect OBD-II interface before reading stream telemetry values.
                  </div>
                )}
              </div>

              {/* DTC Trouble Diagnosis Section */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Diagnoses Scan Interface */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100">MIL MALFUNCTION ENGINE MEMORY</h4>
                      <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">Query standard emission faults and diagnostic trouble codes.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleScanDtc}
                        className={`text-xs font-black uppercase italic tracking-wider py-2 px-4 border cursor-pointer ${
                          scanningDtcs 
                          ? "bg-zinc-900 text-zinc-500 border-zinc-800" 
                          : "bg-red-600 text-white border-red-700 hover:bg-red-700"
                        }`}
                        disabled={scanningDtcs || !isConnected}
                        title={!isConnected ? "Please connect OBD first" : ""}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${scanningDtcs ? "animate-spin" : ""}`} />
                        <span>{scanningDtcs ? "Scanning..." : "SCAN BOARD"}</span>
                      </button>
                      <button
                        onClick={handleClearDtc}
                        disabled={dtcs.length === 0 || !isConnected}
                        className="text-xs font-black uppercase italic tracking-wider py-2 px-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                        title={!isConnected ? "Please connect OBD first" : ""}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Logs</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {dtcs.length > 0 ? (
                      dtcs.map((dtc, index) => (
                        <div key={index} className="bg-zinc-950 p-4 border border-zinc-800 flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-red-500 font-black bg-red-500/10 px-2 py-0.5 border border-red-500/25 text-[11px]">
                                {dtc.code}
                              </span>
                              <span className={`px-2 py-0.5 font-mono text-[9px] uppercase font-black tracking-widest ${
                                dtc.severity === 'high' 
                                ? 'bg-red-600/20 border border-red-600/35 text-red-500' 
                                : 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                              }`}>
                                {dtc.severity} FAULT LEVEL
                              </span>
                              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">• {dtc.category}</span>
                            </div>
                            <p className="text-zinc-200 font-extrabold uppercase mt-1 text-xs">{dtc.description}</p>
                            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mt-1">
                              <strong>Possibilities:</strong> {dtc.possibleCauses.join(', ')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-xs text-zinc-500 bg-zinc-950/70 border border-dashed border-zinc-800">
                        <Check className="w-8 h-8 bg-zinc-900 border border-zinc-850 text-green-500 mx-auto mb-3 p-1.5" />
                        All EPROM dynamic logic addresses operate within stock emission parameters. Code checklist clear.
                      </div>
                    )}
                  </div>
                </div>

                {/* OBD Terminal Log Feed */}
                <div className="md:col-span-5 flex flex-col justify-between">
                  <div className="mb-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100">Android Log diagnostics</h4>
                    <span className="text-[9px] text-zinc-500 block uppercase tracking-widest mt-1 font-bold">Bluetooth raw ELM327 stream</span>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 p-4 font-mono text-[10px] text-red-500/90 space-y-2 h-[220px] overflow-y-auto shadow-inner flex flex-col-reverse">
                    {obdLog.map((log, idx) => (
                      <div key={idx} className="border-b border-zinc-900 pb-1.5 last:border-0 uppercase select-text">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* INTERACTIVE OBD-II PORT PINOUT DETAILS & ECU TERMINAL SCHEMATIC */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
                <div className="border-b border-zinc-850 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-red-600" />
                      <span>OBD-II Coupler & ECU Terminal Wiring Schematic</span>
                    </h3>
                    <p className="text-[11px] text-zinc-550 mt-1 uppercase tracking-wider font-extrabold leading-normal">
                      Interactive diagnostic wiring map specifically configured for {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.ecuModel})
                    </p>
                  </div>
                  <span className="bg-red-600/10 border border-red-500/20 text-red-500 font-mono text-[9px] font-black uppercase px-2 py-1 tracking-wider shrink-0">
                    {selectedVehicle.ecuModel} CONFIG
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left panel: Visual Port Coupler */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-zinc-950 border border-zinc-855 p-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 font-black uppercase tracking-wider">
                        <span>J1962 Female Socket View</span>
                        <span className="text-red-500 font-black tracking-widest block font-sans">INTERACTIVE PANEL</span>
                      </div>

                      {/* Trapezoidal OBD2 Socket in pure CSS with hover states */}
                      <div className="flex flex-col items-center py-6 px-1 bg-zinc-900/40 border border-zinc-855 relative rounded-none shadow-md">
                        <div 
                          className="relative w-full max-w-[316px] h-[106px] bg-zinc-950 border-2 border-zinc-800 pt-5 pb-3 px-6 shadow-2xl flex flex-col justify-between transition-all"
                          style={{
                            clipPath: 'polygon(3% 0%, 97% 0%, 86% 100%, 14% 100%)',
                          }}
                        >
                          {/* Row 1: Pins 1-8 */}
                          <div className="flex justify-between items-center px-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(pNum => {
                              const isSelected = selectedPinNum === pNum;
                              const currentPins = getCurrentVehiclePins();
                              const pinData = currentPins.find(p => p.num === pNum);
                              
                              // Select highlight colors based on active pin functions
                              let borderCol = 'border-zinc-805';
                              let glowCol = '';
                              let pinFill = 'bg-zinc-900';
                              
                              if (pNum === 6) { borderCol = 'border-emerald-600/50'; glowCol = 'shadow-[0_0_4px_#10b981]'; pinFill = 'bg-emerald-950/30'; }
                              if (pNum === 7) { borderCol = 'border-amber-600/50'; glowCol = 'shadow-[0_0_4px_#f59e0b]'; pinFill = 'bg-amber-950/30'; }
                              if (pNum === 4 || pNum === 5) { borderCol = 'border-zinc-600/60'; pinFill = 'bg-zinc-800/60'; }
                              
                              if (isSelected) {
                                borderCol = 'border-red-500 ring-2 ring-red-500/50';
                                glowCol = 'shadow-[0_0_8px_#ef4444]';
                                pinFill = 'bg-red-500/20';
                              }

                              return (
                                <button
                                  key={pNum}
                                  onClick={() => setSelectedPinNum(pNum)}
                                  className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full border flex flex-col items-center justify-center cursor-pointer transition-all ${borderCol} ${glowCol} ${pinFill} group hover:border-red-400`}
                                  title={`Pin ${pNum}: ${pinData?.name}`}
                                >
                                  <div className="w-1 h-1 rounded-full bg-black border border-zinc-750 block mb-0.5 group-hover:bg-red-500" />
                                  <span className="text-[7px] font-black font-mono text-zinc-500 group-hover:text-red-500">{pNum}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Center Key Notch */}
                          <div className="w-12 h-1.5 bg-zinc-900 border-t border-zinc-800 mx-auto self-center rounded-b-md" />

                          {/* Row 2: Pins 9-16 */}
                          <div className="flex justify-between items-center px-3">
                            {[9, 10, 11, 12, 13, 14, 15, 16].map(pNum => {
                              const isSelected = selectedPinNum === pNum;
                              const currentPins = getCurrentVehiclePins();
                              const pinData = currentPins.find(p => p.num === pNum);
                              
                              let borderCol = 'border-zinc-805';
                              let glowCol = '';
                              let pinFill = 'bg-zinc-900';
                              
                              if (pNum === 14) { borderCol = 'border-blue-600/50'; glowCol = 'shadow-[0_0_4px_#3b82f6]'; pinFill = 'bg-blue-950/30'; }
                              if (pNum === 16) { borderCol = 'border-red-650/55'; glowCol = 'shadow-[0_0_4px_#ef4444]'; pinFill = 'bg-red-950/30'; }

                              if (isSelected) {
                                borderCol = 'border-red-500 ring-2 ring-red-500/50';
                                glowCol = 'shadow-[0_0_8px_#ef4444]';
                                pinFill = 'bg-red-500/20';
                              }

                              return (
                                <button
                                  key={pNum}
                                  onClick={() => setSelectedPinNum(pNum)}
                                  className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full border flex flex-col items-center justify-center cursor-pointer transition-all ${borderCol} ${glowCol} ${pinFill} group hover:border-red-400`}
                                  title={`Pin ${pNum}: ${pinData?.name}`}
                                >
                                  <div className="w-1 h-1 rounded-full bg-black border border-zinc-750 block mb-0.5 group-hover:bg-red-500" />
                                  <span className="text-[7px] font-black font-mono text-zinc-500 group-hover:text-red-500">{pNum}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-4 font-mono text-center font-bold">
                          ℹ️ Click any metallic socket receptacle to analyze live terminal wiring lines
                        </p>
                      </div>

                      {/* Important Pin Index Legend */}
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono uppercase tracking-wider">
                        <div className="bg-zinc-900 p-2.5 border border-zinc-850 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                          <span className="text-zinc-450 font-bold">CAN High Transceiver</span>
                        </div>
                        <div className="bg-zinc-900 p-2.5 border border-zinc-850 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                          <span className="text-zinc-450 font-bold">CAN Low Transceiver</span>
                        </div>
                        <div className="bg-zinc-900 p-2.5 border border-zinc-850 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
                          <span className="text-zinc-450 font-bold">ISO K-Line Wake</span>
                        </div>
                        <div className="bg-zinc-900 p-2.5 border border-zinc-850 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-600 shadow-sm" />
                          <span className="text-zinc-450 font-bold">+12V Constant Batt</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right panel: Active Pin Specifications Terminal HUD */}
                  <div className="lg:col-span-7 space-y-4">
                    {(() => {
                      const currentPins = getCurrentVehiclePins();
                      const pin = currentPins.find(p => p.num === selectedPinNum) || currentPins[5];
                      
                      // Find direct color swatch representations
                      let swatchBg = 'bg-zinc-800';
                      let swatchBorder = 'border-zinc-700';
                      
                      const cLower = pin.color.toLowerCase();
                      if (cLower.includes('yellow/silver')) { swatchBg = 'bg-yellow-400 shadow-[inset_0_0_0_2px_#cbd5e1]'; swatchBorder = 'border-zinc-600'; }
                      else if (cLower.includes('blue/silver')) { swatchBg = 'bg-blue-600 shadow-[inset_0_0_0_2px_#cbd5e1]'; swatchBorder = 'border-zinc-650'; }
                      else if (cLower.includes('orange/black')) { swatchBg = 'bg-orange-500 shadow-[inset_0_0_0_2px_#000]'; swatchBorder = 'border-zinc-800'; }
                      else if (cLower.includes('red/white')) { swatchBg = 'bg-red-600 shadow-[inset_0_0_0_2px_#fff]'; swatchBorder = 'border-zinc-850'; }
                      else if (cLower.includes('green/black')) { swatchBg = 'bg-green-600 shadow-[inset_0_0_0_2px_#000]'; swatchBorder = 'border-zinc-850'; }
                      else if (cLower.includes('white/black')) { swatchBg = 'bg-white shadow-[inset_0_0_0_2px_#000]'; swatchBorder = 'border-zinc-850'; }
                      else if (cLower.includes('violet')) { swatchBg = 'bg-fuchsia-600'; swatchBorder = 'border-fuchsia-700'; }
                      else if (cLower.includes('yellow/orange')) { swatchBg = 'bg-yellow-400 shadow-[inset_0_0_0_2px_#f97316]'; swatchBorder = 'border-orange-500'; }
                      else if (cLower.includes('green/red')) { swatchBg = 'bg-green-500 shadow-[inset_0_0_0_2px_#ef4444]'; swatchBorder = 'border-red-600'; }
                      else if (cLower.includes('brown/blue')) { swatchBg = 'bg-amber-800 shadow-[inset_0_0_0_2px_#3b82f6]'; swatchBorder = 'border-zinc-700'; }
                      else if (cLower.includes('red/yellow')) { swatchBg = 'bg-red-650 shadow-[inset_0_0_0_2px_#eab308]'; swatchBorder = 'border-zinc-850'; }
                      else if (cLower.includes('black')) { swatchBg = 'bg-black'; swatchBorder = 'border-zinc-850'; }
                      else if (cLower.includes('brown')) { swatchBg = 'bg-amber-900'; swatchBorder = 'border-zinc-800'; }

                      return (
                        <div className="bg-zinc-950 p-5 border border-zinc-855 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900 pb-3 gap-2">
                            <div className="space-y-1">
                              <span className="font-mono text-red-500 font-extrabold text-[9px] tracking-widest uppercase">
                                TERMINAL PORT CONTROLLER PINOUT
                              </span>
                              <h4 className="text-xs font-black uppercase text-zinc-100 flex items-center gap-2">
                                <span>PIN {pin.num}: {pin.name}</span>
                              </h4>
                            </div>

                            <div className="px-3 py-1 bg-zinc-900 border border-zinc-850 font-mono text-[10px] font-black text-white shrink-0 uppercase tracking-wider text-right">
                              Signal: <span className="text-red-500 italic">{pin.signal}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                            <div className="bg-zinc-900 p-3 border border-zinc-850">
                              <span className="text-zinc-550 uppercase tracking-widest text-[8px] block mb-1">
                                CANBUS / ISO COLOR
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 border ${swatchBorder} ${swatchBg}`} />
                                <span className="text-zinc-200 font-bold uppercase text-[10px]">
                                  {pin.color !== '—' ? pin.color : "N/A (NOT WIRED)"}
                                </span>
                              </div>
                            </div>

                            <div className="bg-zinc-900 p-3 border border-zinc-850">
                              <span className="text-zinc-550 uppercase tracking-widest text-[8px] block mb-1 font-mono">
                                EXPECTED VOLTS
                              </span>
                              <span className="text-zinc-200 font-black tracking-wide block text-[10px]">
                                {pin.voltage}
                              </span>
                            </div>

                            <div className="bg-zinc-900 p-3 border border-zinc-850">
                              <span className="text-zinc-550 uppercase tracking-widest text-[8px] block mb-1">
                                PHYSICAL INTERFACE
                              </span>
                              <span className="text-zinc-200 font-bold block uppercase text-[10px]">
                                {pin.color !== '—' ? `${selectedVehicle.ecuModel} terminal` : "FLOATING PORT"}
                              </span>
                            </div>
                          </div>

                          <div className="bg-zinc-900/65 p-4 border border-l-2 border-zinc-850 border-l-red-600 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                            <p className="font-extrabold uppercase text-[9px] text-zinc-300 tracking-wider font-mono">
                              ECU harness diagnostic trace details:
                            </p>
                            <p className="font-sans text-xs text-zinc-400">
                              {pin.desc}
                            </p>
                          </div>

                          {/* Common Mechanic Workshop Verification Procedures */}
                          <div className="pt-2 border-t border-zinc-900 space-y-2.5">
                            <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase font-mono block">
                              Required Workshop Multimeter Verifications
                            </span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-mono leading-relaxed">
                              <div className="bg-zinc-900/30 p-2.5 border border-zinc-850 space-y-1">
                                <span className="text-red-500 font-black block uppercase text-[9px]">1. CAN-Bus Impedance Check:</span>
                                <span className="text-zinc-400 uppercase text-[9px] font-extrabold leading-relaxed">
                                  With vehicle battery off, measure ohms across Pin 6 and Pin 14. Reading must be roughly <strong className="text-zinc-100 font-black">60 OHMS</strong>. Lower or higher values indicate open trunks or bad terminating resistors in cluster/ECU.
                                </span>
                              </div>
                              <div className="bg-zinc-900/30 p-2.5 border border-zinc-850 space-y-1">
                                <span className="text-red-500 font-black block uppercase text-[9px]">2. Direct Power Check:</span>
                                <span className="text-zinc-400 uppercase text-[9px] font-extrabold leading-relaxed">
                                  Measure voltage from Pin 16 (+12V) to Pin 4 (Chassis Ground). Must read stable battery voltage <strong className="text-zinc-100 font-black">(&gt; 12.0V)</strong>, confirming core fuse integration stays continuous.
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>

            </div>
          )}
          {/* TAB 2: ROM MAP WORKSPACE EDITOR */}
          {activeTab === 'maps' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
              
              {/* Local Draft Recovery Banner */}
              {savedDraft && (
                <div id="local-draft-banner" className="bg-amber-950/70 border border-amber-600/30 p-4 font-mono text-[10px] space-y-3 rounded-none">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-zinc-100 font-black uppercase tracking-wider">
                        Unsaved Calibration Draft Recovered
                      </p>
                      <p className="text-zinc-400 font-bold uppercase leading-relaxed text-[9px]">
                        We recovered an autosaved draft ({savedDraft.activePreset || 'Custom'} Profile) for vehicle "{savedDraft.vehicleName || 'Engine Reference Board'}" from {new Date(savedDraft.timestamp).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-900/30 justify-end">
                    <button
                      onClick={handleRestoreDraft}
                      className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black px-3.5 py-1.5 uppercase tracking-wider text-[9px] cursor-pointer rounded-xs"
                    >
                      Restore Saved Workspace
                    </button>
                    <button
                      onClick={handleDiscardDraft}
                      className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-300 font-bold px-3 py-1.5 uppercase tracking-wider text-[9px] cursor-pointer rounded-xs"
                    >
                      Discard Draft
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100">
                      EPROM Coordinate Parameter Matrix Shader
                    </h3>
                    {lastDraftSavedTime && (
                      <span className="text-[8px] font-bold bg-zinc-950 border border-zinc-800 text-green-500 px-1.5 py-0.5 uppercase tracking-widest animate-pulse">
                        Autosaved: {lastDraftSavedTime}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">Edit individual load lines to scale rail pressure, throttle offsets, ignition timing, and turbo targeting.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Map Undo & Redo History Controller */}
                  <div className="flex bg-zinc-950 p-1 border border-zinc-850 gap-0.5">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={editHistory.length === 0}
                      title="Undo last EPROM coordinate change"
                      className="p-1 px-2 pb-1.5 bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:bg-zinc-850 text-amber-500 disabled:text-zinc-550 rounded-none cursor-pointer transition-all flex items-center gap-1 text-[10px] uppercase font-mono font-bold tracking-wider disabled:cursor-not-allowed"
                    >
                      <Undo className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={redoHistory.length === 0}
                      title="Redo previously undone change"
                      className="p-1 px-2 pb-1.5 bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:bg-zinc-850 text-amber-500 disabled:text-zinc-550 rounded-none cursor-pointer transition-all flex items-center gap-1 text-[10px] uppercase font-mono font-bold tracking-wider disabled:cursor-not-allowed"
                    >
                      <Redo className="w-3.5 h-3.5" />
                      <span>Redo</span>
                    </button>
                  </div>

                  {/* Heatmap Overlay Toggle */}
                  <button
                    type="button"
                    id="toggle-heatmap-btn"
                    onClick={() => setShowHeatmapOverlay(prev => !prev)}
                    title="Toggle visual delta intensity heatmap overlay relative to stock"
                    className={`p-1.5 px-3 border font-mono text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-1.5 cursor-pointer rounded-none ${
                      showHeatmapOverlay 
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-black' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${showHeatmapOverlay ? 'fill-zinc-950 stroke-zinc-950 text-zinc-950' : 'text-zinc-500'}`} />
                    <span>Delta Heatmap: {showHeatmapOverlay ? 'ACTIVE' : 'OFF'}</span>
                  </button>

                  {/* Map Type Switcher Tabs */}
                  <div className="flex bg-zinc-950 p-1 border border-zinc-800">
                  <button
                    onClick={() => { setActiveMapType('ignition'); setSelectedCell(null); }}
                    className={`py-1.5 px-3 z-10 transition-all font-mono text-xs uppercase cursor-pointer ${
                      activeMapType === 'ignition' 
                      ? 'bg-red-600 text-white font-black italic' 
                      : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    Ign Timing (°)
                  </button>
                  <button
                    onClick={() => { setActiveMapType('fuel'); setSelectedCell(null); }}
                    className={`py-1.5 px-3 z-10 transition-all font-mono text-xs uppercase cursor-pointer ${
                      activeMapType === 'fuel' 
                      ? 'bg-red-600 text-white font-black italic' 
                      : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    Fuel Lambda (λ)
                  </button>
                  {selectedVehicle.isTurbo && (
                    <button
                      onClick={() => { setActiveMapType('boost'); setSelectedCell(null); }}
                      className={`py-1.5 px-3 z-10 transition-all font-mono text-xs uppercase cursor-pointer ${
                        activeMapType === 'boost' 
                        ? 'bg-red-600 text-white font-black italic' 
                        : 'text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      Boost Target (Bar)
                    </button>
                  )}
                </div>
              </div>
            </div>

              {/* GRID COORDINATE MAP TABLES */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* The main table matrix */}
                <div className="md:col-span-8 overflow-x-auto">
                  <div className="min-w-[480px]">
                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] text-zinc-500 mb-1">
                      <div className="text-left font-sans font-black uppercase tracking-widest text-[9px]">RPM / LOAD</div>
                      {LOAD_GRID.map((load, lIdx) => (
                        <div key={lIdx} className="font-extrabold py-1 bg-zinc-950 border border-zinc-850 uppercase tracking-widest">
                          {load}% Ld
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 font-mono text-xs">
                      {RPM_GRID.map((rpm, rIdx) => {
                        let currentMatrixRow: number[] = [];
                        let defaultMatrixRow: number[] = [];
                        
                        if (activeMapType === 'ignition') {
                          currentMatrixRow = ignitionMap[rIdx] || [];
                          defaultMatrixRow = selectedVehicle.defaultIgnitionMap[rIdx] || [];
                        } else if (activeMapType === 'fuel') {
                          currentMatrixRow = fuelMap[rIdx] || [];
                          defaultMatrixRow = selectedVehicle.defaultFuelMap[rIdx] || [];
                        } else if (activeMapType === 'boost') {
                          currentMatrixRow = boostMap[rIdx] || [];
                          defaultMatrixRow = selectedVehicle.defaultBoostMap[rIdx] || [];
                        }

                        return (
                          <div key={rIdx} className="grid grid-cols-7 gap-1 items-center">
                            {/* RPM Indicator Header column */}
                            <div className="text-left py-2 font-black text-zinc-400 block pr-2 text-[10px] w-14">
                              {rpm} PM
                            </div>

                            {/* 6 load cells */}
                            {LOAD_GRID.map((_, cIdx) => {
                              const cellVal = currentMatrixRow[cIdx] !== undefined ? currentMatrixRow[cIdx] : 0;
                              const stockVal = defaultMatrixRow[cIdx] !== undefined ? defaultMatrixRow[cIdx] : 0;
                              const isEdited = cellVal !== stockVal;
                              const isSelected = selectedCell?.r === rIdx && selectedCell?.c === cIdx;

                              // Generate dynamic shader colors representing cell values index safely
                              let bgShade = 'bg-zinc-950';
                              let borderShade = 'border-zinc-850';
                              let textTone = 'text-zinc-300';
                              
                              if (showHeatmapOverlay) {
                                const diff = Math.abs(cellVal - stockVal);
                                if (diff === 0) {
                                  bgShade = 'bg-zinc-950/40 opacity-40';
                                  textTone = 'text-zinc-600';
                                } else {
                                  let scaleVal = 0;
                                  if (activeMapType === 'ignition') {
                                    scaleVal = Math.min(1, diff / 6); // scale 0 to 6 degrees of ignition advance/retard
                                  } else if (activeMapType === 'fuel') {
                                    scaleVal = Math.min(1, diff / 0.12); // scale 0 to 0.12 lambda target deviation
                                  } else if (activeMapType === 'boost') {
                                    scaleVal = Math.min(1, diff / 0.6); // scale 0 to 0.6 bar boost deviation
                                  }

                                  if (scaleVal > 0.8) {
                                    bgShade = 'bg-zinc-200';
                                    textTone = 'text-zinc-950 font-black';
                                  } else if (scaleVal > 0.5) {
                                    bgShade = 'bg-zinc-400';
                                    textTone = 'text-zinc-950 font-black';
                                  } else if (scaleVal > 0.3) {
                                    bgShade = 'bg-zinc-600';
                                    textTone = 'text-zinc-50 font-extrabold';
                                  } else if (scaleVal > 0.15) {
                                    bgShade = 'bg-zinc-800';
                                    textTone = 'text-zinc-200';
                                  } else {
                                    bgShade = 'bg-zinc-900';
                                    textTone = 'text-zinc-400';
                                  }
                                }
                              } else {
                                if (activeMapType === 'ignition') {
                                  // Timing advance usually goes up to 35-40 deg (warmer colors)
                                  const ratio = Math.min(1, Math.max(0, (cellVal + 5) / 45));
                                  if (ratio > 0.8) {
                                    bgShade = 'bg-red-950/60';
                                    textTone = 'text-red-300 font-extrabold';
                                  } else if (ratio > 0.5) {
                                    bgShade = 'bg-amber-950/30';
                                    textTone = 'text-amber-300';
                                  } else if (ratio > 0.2) {
                                    bgShade = 'bg-zinc-900';
                                  } else {
                                    bgShade = 'bg-blue-950/40';
                                    textTone = 'text-blue-100';
                                  }
                                } else if (activeMapType === 'fuel') {
                                  // Lambda target (rich mixtures < 0.90 represent power -> red/orange context)
                                  if (cellVal <= 0.86) {
                                    bgShade = 'bg-red-900/20';
                                    textTone = 'text-red-400 font-extrabold';
                                  } else if (cellVal <= 0.94) {
                                    bgShade = 'bg-amber-950/30';
                                    textTone = 'text-amber-350';
                                  } else if (cellVal >= 1.05) {
                                    bgShade = 'bg-green-950/20';
                                    textTone = 'text-green-400';
                                  } else {
                                    bgShade = 'bg-zinc-900';
                                  }
                                } else if (activeMapType === 'boost') {
                                  // Boost target up to 2.0 bar
                                  const bRatio = Math.min(1, Math.max(0, cellVal / 1.6));
                                  if (bRatio > 0.7) {
                                    bgShade = 'bg-red-650/20';
                                    textTone = 'text-red-400 font-black animate-pulse';
                                  } else if (bRatio > 0.4) {
                                    bgShade = 'bg-amber-950/30';
                                    textTone = 'text-amber-300';
                                  } else if (bRatio > 0.05) {
                                    bgShade = 'bg-zinc-800';
                                    textTone = 'text-zinc-200';
                                  } else {
                                    bgShade = 'bg-zinc-950';
                                    textTone = 'text-zinc-650';
                                  }
                                }
                              }

                              const isInRange = rangeStart && rangeEnd && (
                                rIdx >= Math.min(rangeStart.r, rangeEnd.r) &&
                                rIdx <= Math.max(rangeStart.r, rangeEnd.r) &&
                                cIdx >= Math.min(rangeStart.c, rangeEnd.c) &&
                                cIdx <= Math.max(rangeStart.c, rangeEnd.c)
                              );

                              if (isSelected) {
                                borderShade = 'border-red-600 ring-1 ring-red-650 z-10 scale-105 shadow-xl bg-zinc-900/50';
                              } else if (isInRange) {
                                borderShade = 'border-amber-500 ring-1 ring-amber-500/50 z-10 bg-zinc-900/90 shadow-lg';
                              } else if (isEdited) {
                                borderShade = 'border-red-500/80';
                              }

                              return (
                                <button
                                  key={cIdx}
                                  onClick={(e) => handleCellSelect(
                                    rIdx, 
                                    cIdx, 
                                    activeMapType === 'ignition' ? ignitionMap : activeMapType === 'fuel' ? fuelMap : boostMap,
                                    e.shiftKey
                                  )}
                                  className={`py-3.5 px-1 rounded-none border text-center transition-all cursor-pointer relative font-bold ${bgShade} ${borderShade} ${textTone} hover:border-zinc-400 shadow-sm`}
                                >
                                  {cellVal}
                                  
                                  {/* Small helper dots indicating edited or focused status cell */}
                                  {isEdited && !isSelected && !isInRange && (
                                    <span className="w-1.5 h-1.5 bg-red-600 absolute top-1 right-1" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Heatmap Legend */}
                  {showHeatmapOverlay && (
                    <div id="heatmap-legend" className="mt-3 bg-zinc-950 p-3 border border-zinc-900 font-mono text-[9px] flex flex-wrap items-center justify-between gap-3 text-zinc-400">
                      <div className="flex items-center gap-1.5 uppercase font-bold text-[8px] tracking-wider text-zinc-500">
                        <Flame className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400" />
                        <span>Deviation Scale (Vs. Stock Baseline):</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-zinc-950/40 border border-zinc-900 opacity-40 inline-block" />
                          <span>No Change (0)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-zinc-900 border border-zinc-850 inline-block" />
                          <span>Minimal</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-zinc-800 inline-block" />
                          <span>Low</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-zinc-600 inline-block" />
                          <span>Medium</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-zinc-400 inline-block" />
                          <span>Major</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-zinc-200 inline-block" />
                          <span>Extreme</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Cell Controller Panel */}
                <div className="md:col-span-4 bg-zinc-950 border border-zinc-800 p-5 space-y-4">
                  <div className="border-b border-zinc-900 pb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block font-mono">Cell Controller</h4>
                    <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">Select any cell on the matrix to perform precision modifications.</p>
                  </div>

                  {selectedCell ? (
                    <div className="space-y-4 text-xs font-mono">
                      <div className="bg-zinc-900 p-3 border border-zinc-850">
                        <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Focused Cell Coordinate</p>
                        <p className="text-white font-black mt-1 text-xs uppercase">
                          {RPM_GRID[selectedCell.r]} RPM @ {LOAD_GRID[selectedCell.c]}% Load
                        </p>
                        <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-zinc-800 text-[11px]">
                          <span className="text-zinc-550 uppercase font-bold text-[9px] tracking-wider">OEM Stock:</span>
                          <strong className="text-zinc-300 font-bold">
                            {activeMapType === 'ignition' 
                              ? selectedVehicle.defaultIgnitionMap[selectedCell.r]?.[selectedCell.c] 
                              : activeMapType === 'fuel' 
                              ? selectedVehicle.defaultFuelMap[selectedCell.r]?.[selectedCell.c] 
                              : selectedVehicle.defaultBoostMap[selectedCell.r]?.[selectedCell.c]
                            }
                          </strong>
                        </div>
                      </div>

                      {/* Direct Slider Offset modification */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black tracking-widest text-zinc-500 uppercase block">Active Value</label>
                        <div className="flex gap-1.5 items-center">
                          <input 
                            type="number"
                            step={activeMapType === 'fuel' ? '0.01' : '0.1'}
                            value={cellEditVal}
                            onChange={(e) => {
                              setCellEditVal(e.target.value);
                              updateSelectedCellValue(e.target.value);
                            }}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-100 py-3 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-red-600 w-full text-xs font-black uppercase tracking-wider"
                          />
                        </div>

                        {/* Adjust steps buttons */}
                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          <button
                            onClick={() => adjustCellValueStep(-1)}
                            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-100 font-black py-2 rounded-none cursor-pointer text-xs uppercase"
                          >
                            - Step
                          </button>
                          <button
                            onClick={() => adjustCellValueStep(1)}
                            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-100 font-black py-2 rounded-none cursor-pointer text-xs uppercase"
                          >
                            + Step
                          </button>
                        </div>
                      </div>

                      {/* Quick reset button for selected cell */}
                      <button
                        onClick={() => {
                          const stockVal = activeMapType === 'ignition' 
                            ? selectedVehicle.defaultIgnitionMap[selectedCell.r]?.[selectedCell.c] 
                            : activeMapType === 'fuel' 
                            ? selectedVehicle.defaultFuelMap[selectedCell.r]?.[selectedCell.c] 
                            : selectedVehicle.defaultBoostMap[selectedCell.r]?.[selectedCell.c];
                          updateSelectedCellValue(stockVal.toString());
                        }}
                        className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 py-3 text-red-500 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Stock Cell</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-zinc-550 uppercase tracking-wider font-extrabold text-[10px] border border-dashed border-zinc-850">
                      No cell coordinate highlighted. Click any box in the EPROM block map to inspect timing levels.
                    </div>
                  )}

                  {/* Range Interpolation tool controller */}
                  {rangeStart && rangeEnd && (rangeStart.r !== rangeEnd.r || rangeStart.c !== rangeEnd.c) ? (
                    <div className="bg-zinc-900 p-4 border border-zinc-850 space-y-3 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 w-max">
                          Range Target Selected
                        </span>
                        <button
                          type="button"
                          onClick={() => { setRangeStart(null); setRangeEnd(null); }}
                          className="text-[9px] text-zinc-500 hover:text-red-400 font-extrabold uppercase tracking-wide cursor-pointer"
                        >
                          Clear Range
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-zinc-200 font-extrabold text-[11px] uppercase">
                          {RPM_GRID[Math.min(rangeStart.r, rangeEnd.r)]} - {RPM_GRID[Math.max(rangeStart.r, rangeEnd.r)]} RPM
                        </p>
                        <p className="text-zinc-400 font-bold text-[10px] uppercase">
                          {LOAD_GRID[Math.min(rangeStart.c, rangeEnd.c)]}% - {LOAD_GRID[Math.max(rangeStart.c, rangeEnd.c)]}% Bounding Block
                        </p>
                        <p className="text-zinc-550 text-[9px] uppercase font-bold tracking-wider pt-1 border-t border-zinc-900">
                          Span: {Math.abs(rangeStart.r - rangeEnd.r) + 1} Rows × {Math.abs(rangeStart.c - rangeEnd.c) + 1} Columns ({ (Math.abs(rangeStart.r - rangeEnd.r) + 1) * (Math.abs(rangeStart.c - rangeEnd.c) + 1) } Cells)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleInterpolateRange}
                        className="w-full bg-amber-550 hover:bg-amber-650 border border-amber-500 text-black font-black py-2.5 rounded-none cursor-pointer text-xs uppercase flex items-center justify-center gap-1.5 transition-all shadow-md mt-1"
                      >
                        <span>SMOOTH INTERPOLATION</span>
                      </button>
                      
                      <p className="text-[9px] text-zinc-500 font-bold uppercase leading-relaxed text-center">
                        Creates smooth linear transition gradients using bounding corners as anchors.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-zinc-950 p-3.5 border border-zinc-900 border-dashed text-[10px] text-zinc-500 uppercase leading-relaxed font-mono">
                      <span className="text-zinc-400 font-extrabold block mb-1">🚀 Multi-Cell Editing tip:</span>
                      Hold <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-sans font-bold">SHIFT</kbd> and click any other EPROM block coordinate to select a rectangular map range, then perform linear interpolation smoothing!
                    </div>
                  )}

                  {/* Dynamic Help tip depending on Active map types */}
                  <div className="bg-zinc-900/50 p-4 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
                    <span className="font-extrabold text-zinc-200 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5 text-red-500" />
                      <span>Calibration Safeguard</span>
                    </span>
                    {activeMapType === 'ignition' && (
                      <p className="uppercase text-[9px] tracking-wide text-zinc-500 font-bold">Advancing Petrol timing improves low range torque. Advancing beyond 4.5° over stock requires 95 octane power fuels to avoid hazardous engine misfires!</p>
                    )}
                    {activeMapType === 'fuel' && (
                      <p className="uppercase text-[9px] tracking-wide text-zinc-500 font-bold">Richer target Lambda ratios (&lt; 0.90) lower exhaust temperature and yield maximum power. Leaner Targets (&gt; 1.05) improve Indian highway fuel efficiency.</p>
                    )}
                    {activeMapType === 'boost' && (
                      <p className="uppercase text-[9px] tracking-wide text-zinc-500 font-bold">Ensure targets do not exceed stock structural ceilings (usually +0.3 Bar above OEM threshold) to avoid turbocharger compressor surge damage.</p>
                    )}
                  </div>

                </div>
              </div>

              {/* D3 Dynamic Power/Torque Curves Dyno Plot Chart */}
              <PowerCurveChart 
                stockHp={selectedVehicle.stockHp}
                stockTorque={selectedVehicle.stockTorque}
                tunedHp={currentTuning.hp}
                tunedTorque={currentTuning.torque}
                vehicleName={`${selectedVehicle.brand} ${selectedVehicle.model}`}
              />

            </div>
          )}

          {/* TAB 3: AI TUNING CONSULTANT ADVISOR */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              
              <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-5">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-red-600" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100">
                    AI Auto-Tuning Calibration Expert
                  </h3>
                </div>
                
                <p className="text-xs text-zinc-400 leading-relaxed uppercase tracking-wide font-medium">
                  Provide custom tuning requirements for Indian specific road contexts (high altitudes driving like Manali-Leh, heavy stop-and-go metro traffic, high humidity or ambient temperature protection, or fuel quality compromises). Our server-side Gemini AI model calculates optimal calibration coefficients, fuel corrections, and safety warnings.
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="ai-instructions" className="text-[10px] text-zinc-500 font-extrabold block mb-2 uppercase tracking-widest">Tuning Target & Parameters Instructions:</label>
                    <textarea
                      id="ai-instructions"
                      className="w-full bg-zinc-950 border border-zinc-800 p-4 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-600 h-24 max-h-36 resize-none transition-all leading-relaxed uppercase font-bold tracking-wider"
                      placeholder="e.g., I want to optimize low range torque for Maruti Swift CNG, advancing timing offsets cleanly under 3000 rpm."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <span className="text-[9px] text-zinc-500 font-mono leading-relaxed uppercase font-bold tracking-wider">
                      * Uses server-side gemini-3.5-flash for diagnostic mapping vectors estimation.
                    </span>
                    <button
                      id="ai-consult-btn"
                      onClick={consultAiAdvisor}
                      className="px-6 py-4.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all select-none cursor-pointer disabled:opacity-40 rounded-none uppercase italic tracking-widest shrink-0"
                      disabled={isAiLoading}
                    >
                      {isAiLoading ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin text-zinc-100" />
                          <span>AI Running Calibration Checks...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>Consult AI Advisory</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {aiError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-none text-xs flex gap-2.5 items-start">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                    <p className="uppercase text-[10px] font-bold tracking-wider leading-relaxed">{aiError}</p>
                  </div>
                )}
              </div>

              {/* AI Expert Results Screen */}
              {aiResult && (
                <div className="bg-zinc-900 border border-zinc-805 p-6 space-y-6">
                  
                  {/* Performance Forecast stats cards */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-5">
                    <div>
                      <span className="text-[9px] text-red-500 font-mono font-black uppercase tracking-widest block">Generated Vector Summary</span>
                      <h4 className="text-sm uppercase text-zinc-100 font-black mt-1">
                        Professional Remap Calibrations for {selectedVehicle.brand} ({selectedVehicle.ecuModel})
                      </h4>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest block">Estimated Output</span>
                      <span className="text-xl font-black italic text-green-500 font-sans tracking-tight leading-none block mt-1">
                        {aiResult.suggestedPeakHp} HP / {aiResult.suggestedPeakTorque} Nm
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Advice recommendations column */}
                    <div className="md:col-span-7 space-y-5">
                      
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Step-By-Step Engineering Strategy</span>
                        <p className="text-xs bg-zinc-950 p-4 border border-zinc-800 text-zinc-300 leading-relaxed whitespace-pre-line uppercase font-bold tracking-wider">
                          {aiResult.recommendation}
                        </p>
                      </div>

                      <div className="bg-zinc-950 p-4 border border-zinc-800 space-y-2">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Expected Gains Delivery</span>
                        <p className="text-xs text-zinc-300 font-extrabold leading-relaxed uppercase tracking-wider">
                          {aiResult.expectedGainsSummary}
                        </p>
                      </div>

                    </div>

                    {/* Right column: offset controls, warnings */}
                    <div className="md:col-span-5 space-y-5">
                      
                      {/* Derived Offset coefficients */}
                      <div className="bg-zinc-950 border border-zinc-800 p-5 space-y-4">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Derived global Calibration Offsets</span>
                        
                        <div className="space-y-2.5 text-xs font-mono">
                          <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500 uppercase text-[9px] font-bold">Spark Advance Shift:</span>
                            <strong className="text-red-500 font-black">
                              {aiResult.suggestedOffsetIgnitionDegrees > 0 ? `+${aiResult.suggestedOffsetIgnitionDegrees}°` : `${aiResult.suggestedOffsetIgnitionDegrees}°`}
                            </strong>
                          </div>

                          <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500 uppercase text-[9px] font-bold">Turbo Boost Map multiplier:</span>
                            <strong className="text-red-500 font-black">
                              +{aiResult.suggestedOffsetBoostPct}%
                            </strong>
                          </div>

                          <div className="flex justify-between pb-0.5">
                            <span className="text-zinc-500 uppercase text-[9px] font-bold">Predicted CRC32 Hash:</span>
                            <strong className="text-zinc-305 font-black uppercase text-[10px]">
                              {aiResult.checksumHex}
                            </strong>
                          </div>
                        </div>

                        {/* Critical Override Integration Action Button */}
                        <button
                          onClick={applyAiOffsetsToMap}
                          className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-none text-xs flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer uppercase italic tracking-widest"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Load and View AI Calibration Map</span>
                        </button>
                      </div>

                      {/* Warnings lists */}
                      <div className="bg-red-900/10 border border-red-650/30 p-4 space-y-3">
                        <span className="text-xs text-red-400 font-black flex items-center gap-1.5 uppercase tracking-widest">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Thermal & Structural Warnings</span>
                        </span>

                        <ul className="list-disc list-inside space-y-1.5 text-[10px] text-zinc-400 pl-1 leading-relaxed uppercase font-bold tracking-wider">
                          {aiResult.safetyWarnings.map((warning, idx) => (
                            <li key={idx} className="marker:text-red-500">
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>

                  </div>

                </div>
              )}

            </div>
          )}
              {/* TAB 4: FLASHER CONSOLE ROM FLASH */}
          {activeTab === 'flash' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
              
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100">
                  Dual-SPI EEPROM Programming Deck (OBD-II protocol)
                </h3>
                <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">Flash your updated ignition offsets, Lambda fuel trims, and wastegate targets directly onto target memory blocks.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Visual Programming Block sectors represent physical memory */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex justify-between text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    <span>Selected MCU Partition: AM29F400BT</span>
                    <span>Checksum Size: 512 KB</span>
                  </div>

                  {/* Simulated Memory chip cells layout */}
                  <div className="bg-zinc-950 border border-zinc-850 p-4 relative overflow-hidden">
                    <div className="grid grid-cols-8 gap-2">
                      {Array.from({ length: 64 }).map((_, idx) => {
                        let sectorState = 'bg-zinc-900 border-zinc-800 text-zinc-600';
                        
                        if (flashState === 'erasing') {
                          // sectors fade sequentially representing erase
                          const sectorPct = (idx / 64) * 100;
                          sectorState = flashProgress > sectorPct 
                            ? 'bg-zinc-950 border-zinc-900 border-dashed animate-pulse text-zinc-800' 
                            : 'bg-red-950/40 border-red-800/40 text-red-550 font-bold';
                        } else if (flashState === 'writing') {
                          const sectorPct = (idx / 64) * 100;
                          sectorState = flashProgress > sectorPct 
                            ? 'bg-zinc-800 border-red-600/60 shadow-inner text-white font-extrabold' 
                            : 'bg-zinc-950 border-zinc-900 text-zinc-650';
                        } else if (flashState === 'verifying') {
                          const sectorPct = (idx / 64) * 100;
                          sectorState = flashProgress > sectorPct 
                            ? 'bg-zinc-850 border-green-500/30 text-green-305 font-bold' 
                            : 'bg-zinc-800 border-red-600/30 text-zinc-400';
                        } else if (flashState === 'completed') {
                          sectorState = 'bg-zinc-900 border-green-500/50 text-green-400 font-extrabold';
                        }

                        return (
                          <div 
                            key={idx} 
                            className={`h-4 rounded-none border text-[8px] font-mono flex items-center justify-center select-none ${sectorState} transition-all duration-300`}
                            title={`ROM Sector Offset 0x00${idx.toString(16).toUpperCase()}0`}
                          >
                            {/* Simple hex preview for layout authenticity */}
                            {idx.toString(16).toUpperCase()}
                          </div>
                        );
                      })}
                    </div>

                    {/* Overlay Progress status */}
                    {flashState !== 'ready' && (
                      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-[2.5px] p-4 flex flex-col justify-between font-mono z-20 border border-red-600/30">
                        {/* Upper panel showing animated transmission gateway */}
                        <div className="bg-zinc-900 border border-zinc-850 p-3 flex flex-col gap-2 relative overflow-hidden">
                          {/* Animated laser scan lines sweeping the chip */}
                          <div className="absolute inset-x-0 h-0.5 bg-red-500/30 blur-[1px] animate-scan-line" />
                          
                          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                              <span className="text-zinc-300">SPI CH-A BUS PROTOCOL: ACTIVE</span>
                            </span>
                            <span className="text-red-500 font-bold">VOLTS: 13.6V (OK)</span>
                          </div>
                          
                          {/* Streaming channels animation */}
                          <div className="flex items-center justify-between bg-zinc-950 p-2 border border-zinc-900 text-center relative rounded-sm">
                            {/* Device terminal node */}
                            <div className="flex flex-col items-center w-1/4">
                              <span className="text-[7px] text-zinc-500 uppercase font-black">Link Origin</span>
                              <div className="flex items-center gap-1 text-amber-500 text-[9px] font-black uppercase mt-1">
                                <Smartphone className="w-3 h-3" />
                                <span>OBD CELL</span>
                              </div>
                            </div>
                            
                            {/* Transmission pathway with sliding packets */}
                            <div className="flex-1 h-8 mx-4 border-y border-dashed border-zinc-850 relative flex items-center overflow-hidden">
                              <div className="absolute left-0 right-0 h-0.5 bg-zinc-900" />
                              {/* Glowing slider beads representing the data packets */}
                              {flashState === 'writing' && (
                                <>
                                  <div className="absolute h-1.5 w-1.5 bg-red-500 rounded-full blur-[1px] animate-packet-slide" style={{ animationDelay: '0s' }} />
                                  <div className="absolute h-1.5 w-1.5 bg-amber-500 rounded-full blur-[1px] animate-packet-slide" style={{ animationDelay: '0.4s' }} />
                                  <div className="absolute h-1.5 w-1.5 bg-green-500 rounded-full blur-[1px] animate-packet-slide" style={{ animationDelay: '0.8s' }} />
                                  <div className="absolute h-1.5 w-1.5 bg-blue-400 rounded-full blur-[1px] animate-packet-slide" style={{ animationDelay: '1.2s' }} />
                                </>
                              )}
                              {flashState === 'erasing' && (
                                <div className="w-full text-center text-[8px] text-red-500 font-bold tracking-widest animate-pulse">
                                  [ PURGING MEMORY BLOCK SECTORS ]
                                </div>
                              )}
                              {flashState === 'verifying' && (
                                <div className="w-full text-center text-[8px] text-green-400 font-bold tracking-widest animate-signal-pulse">
                                  [ COMPRESSOR CRC CHECKSUM CONTROL ]
                                </div>
                              )}
                            </div>
                            
                            {/* Destination controller node */}
                            <div className="flex flex-col items-center w-1/4">
                              <span className="text-[7px] text-zinc-500 uppercase font-black">MCU TARGET</span>
                              <div className="flex items-center gap-1 text-zinc-300 text-[9px] font-black uppercase mt-1">
                                <Cpu className="w-3 h-3 text-red-650" />
                                <span>AM29F400BT</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Live Payload Stream Tracker */}
                          <div className="flex justify-between items-center bg-zinc-950 p-1.5 text-[8px] text-zinc-400 font-mono select-none rounded-xs border border-zinc-900">
                            <span className="text-zinc-500 font-bold uppercase">Tx packet payload:</span>
                            <span className="text-amber-500 animate-pulse uppercase font-black">
                              {flashState === 'writing' 
                                ? `0x${(4096 + flashProgress * 154).toString(16).toUpperCase()} : 0F 5A 7B ${Math.floor(Date.now() / 100) % 2 === 0 ? "8C" : "3D"} (WRITING_BLOCK)`
                                : flashState === 'erasing'
                                ? `0x${(4096 + flashProgress * 154).toString(16).toUpperCase()} : FF FF FF FF (ERASING_SECTOR)`
                                : `CRC32 CHECK : OK - MATCHED ${aiResult?.checksumHex || '0xBD4D2A91'}`
                              }
                            </span>
                          </div>
                        </div>

                        {/* Progress and status controls at the bottom */}
                        <div className="bg-zinc-900 border border-zinc-800 p-4 shadow-xl space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono font-black uppercase tracking-wider">
                            <span className="text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                              <span className="text-red-500 capitalize">{flashState} EPROM SECTORS...</span>
                            </span>
                            <span className="text-white text-xs font-black">{flashProgress}%</span>
                          </div>
                          
                          <div className="w-full bg-zinc-950 h-2.5 overflow-hidden border border-zinc-800 shadow-inner p-[1px]">
                            <div 
                              className={`h-full transition-all duration-200 ${
                                flashState === 'erasing' 
                                ? 'bg-gradient-to-r from-red-600 to-red-400' 
                                : flashState === 'writing' 
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                                : 'bg-gradient-to-r from-green-500 to-emerald-400'
                              }`}
                              style={{ width: `${flashProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual trigger controllers */}
                  <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center pt-2">
                    <div className="text-[10px] text-zinc-500 leading-normal uppercase font-bold tracking-wider">
                      <span className="text-red-500 font-black block mb-1">⚠️ Ignition Safety Protocol:</span>
                      Keep android terminal stable within range. Voltage must stay above 12.5V. Do not disrupt link.
                    </div>
                    
                    <button
                      id="begin-flash-btn"
                      onClick={beginRomFlashSequence}
                      disabled={flashState !== 'ready' && flashState !== 'completed'}
                      className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg transition-all select-none disabled:opacity-40 flex items-center gap-1.5 cursor-pointer rounded-none uppercase italic tracking-widest shrink-0 self-stretch sm:self-auto justify-center"
                    >
                      <Zap className="w-4 h-4 fill-current text-white" />
                      <span>{flashState === 'completed' ? "Flash ROM Again" : "Freescale Sector Write"}</span>
                    </button>
                  </div>

                </div>

                {/* Vertical Terminal Output details */}
                <div className="md:col-span-5 flex flex-col h-[280px]">
                  <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase font-mono mb-2">SPI Flasher Logger Pipe</span>
                  
                  <div className="flex-1 bg-zinc-950 border border-zinc-850 p-4 font-mono text-[9px] text-red-500/95 space-y-1.5 overflow-y-auto shadow-inner">
                    {flashLog.length > 0 ? (
                      flashLog.map((log, idx) => (
                        <div key={idx} className="border-b border-zinc-900 pb-1.5 last:border-0 leading-normal uppercase">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 text-zinc-650 uppercase font-bold tracking-wide">
                        Initiate sector writes to trace SPI diagnostic log files.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: CLOUD PERSISTENCE & GOOGLE TASKS SYNC */}
          {activeTab === 'cloud' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
              {!user ? (
                <div className="text-center py-12 max-w-lg mx-auto space-y-6">
                  <div className="bg-zinc-950 p-6 border border-zinc-850 inline-block relative">
                    <Lock className="w-10 h-10 text-red-650 mx-auto" />
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono text-[8px] font-black uppercase px-2 py-0.5 tracking-wider">SECURE</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100">
                      ECU Workshop Cloud Engine
                    </h3>
                    <p className="text-xs text-zinc-450 mt-2 leading-relaxed uppercase tracking-wider font-extrabold">
                      Unlock persistent Cloud SQL database storage and synchronize workshop tasks directly with Google Tasks.
                    </p>
                  </div>

                  <button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-4.5 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black italic uppercase tracking-widest text-xs rounded-none shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>AUTHORIZING OAUTH CHANNEL...</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4" />
                        <span>AUTHORIZE WITH GOOGLE OAUTH</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-6 border-t border-zinc-850">
                    <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-2">
                      <FolderSync className="w-5 h-5 text-red-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-100">Persistent Cloud SQL</h4>
                      <p className="text-[10px] text-zinc-550 uppercase font-black leading-relaxed">
                        Securely store custom-designed EPROM coordinates, engine stage parameters, and safety diagnostics with Cloud run persistence.
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-2">
                      <ListTodo className="w-5 h-5 text-red-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-100">Google Tasks Sync</h4>
                      <p className="text-[10px] text-zinc-550 uppercase font-black leading-relaxed">
                        Track tuning jobs, mechanical inspections, and customer delivery schedules synced to your real Google workspace.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Authenticated Dashboard Header */}
                  <div className="bg-zinc-950 p-4 border border-zinc-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'Calibrator'} 
                          className="w-10 h-10 border border-zinc-805"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-red-500">
                          {user.email?.charAt(0).toUpperCase() || 'C'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-zinc-100">
                            {user.displayName || 'Indian Calibrator Master'}
                          </span>
                          <span className={`px-1.5 py-0.5 font-mono text-[8px] uppercase font-black tracking-widest ${
                            syncStatus === 'synced' ? 'bg-green-600/10 text-green-500 border border-green-500/20' : 'bg-amber-600/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {syncStatus === 'synced' ? 'Postgres Active' : 'Connecting to Postgres...'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono lower mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border border-zinc-800 hover:border-red-655 text-zinc-100 hover:text-red-500 bg-zinc-950 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>DISCONNECT ENGINE</span>
                    </button>
                  </div>

                  {/* Main Cloud Panel Grid Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN: PERSISTED TUNES */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="flex justify-between items-center bg-zinc-950 p-3 border border-zinc-850">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-200">
                            Cloud SQL Master Catalog
                          </h4>
                          <span className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block mt-0.5">
                            Drizzle pooled transactions
                          </span>
                        </div>
                        <button
                          onClick={handleSaveTune}
                          disabled={isSavingTune}
                          className="px-4 py-2 bg-red-600 hover:bg-red-750 disabled:opacity-40 text-white font-black italic uppercase text-[9px] tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingTune ? "BACKING UP..." : "SAVE ACTIVE MAP"}</span>
                        </button>
                      </div>

                      {/* Tunes Catalogue List */}
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {isLoadingTunes ? (
                          <div className="text-center py-10 font-mono text-[10px] text-zinc-550 flex items-center justify-center gap-2 uppercase font-bold tracking-widest">
                            <RefreshCw className="w-4 h-4 animate-spin text-red-555" />
                            <span>Interrogating Postgres Tables...</span>
                          </div>
                        ) : dbTunes.length > 0 ? (
                          dbTunes.map((tune) => (
                            <div key={tune.id} className="bg-zinc-950 p-4 border border-zinc-850 space-y-3 text-xs">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <span className="px-1.5 py-0.5 font-mono text-[8px] bg-red-600/15 border border-red-500/25 text-red-500 font-black uppercase tracking-wide">
                                    {tune.ecuModel}
                                  </span>
                                  <h5 className="font-extrabold uppercase text-zinc-100 text-xs mt-1.5">
                                    {tune.brand} {tune.model}
                                  </h5>
                                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5 block font-bold font-mono">
                                    Engine: {tune.engineName} ({tune.fuelType})
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteTune(tune.id)}
                                  className="p-1 border border-zinc-850 hover:bg-red-955/20 text-zinc-550 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer"
                                  title="Delete Calibration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-2 border border-zinc-850/50 text-[10px] font-mono">
                                <div>
                                  <span className="text-zinc-500 uppercase text-[8px] block">Ig Offset</span>
                                  <span className="text-white font-bold">{tune.suggestedOffsetIgnitionDegrees > 0 ? `+${tune.suggestedOffsetIgnitionDegrees}°` : `${tune.suggestedOffsetIgnitionDegrees}°`}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-500 uppercase text-[8px] block">Boost Target</span>
                                  <span className="text-white font-bold">{tune.suggestedOffsetBoostPct > 0 ? `+${tune.suggestedOffsetBoostPct}%` : 'Stock'}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-500 uppercase text-[8px] block">Checksum</span>
                                  <span className="text-red-500 font-bold truncate block">{tune.checksumHex}</span>
                                </div>
                              </div>

                              <div className="text-[10px] bg-zinc-900/30 p-2 border-l border-red-600 text-zinc-400 font-sans leading-normal">
                                <strong className="text-zinc-300 uppercase block text-[9px] tracking-wide mb-0.5">EXPECTED PERFORMANCE GAINS:</strong>
                                <span>{tune.stockHp} HP → <strong className="text-green-500">{tune.suggestedPeakHp} HP</strong> | {tune.stockTorque} NM → <strong className="text-green-500">{tune.suggestedPeakTorque} NM</strong></span>
                                <p className="text-[9px] text-zinc-550 italic mt-1 font-bold leading-relaxed">{tune.recommendation}</p>
                              </div>

                              <div className="pt-1 flex gap-2">
                                <button
                                  onClick={() => {
                                    // RESTORE offsets to local editor timing matrices
                                    const confirmed = window.confirm(`Restore active timing matrix offsets for ${tune.brand} ${tune.model}? Current map adjustments will be overwritten.`);
                                    if (!confirmed) return;

                                    // Deep clone vehicle coordinates but scale timing offsets manually
                                    const ignClone = selectedVehicle.defaultIgnitionMap.map(row => [...row]);
                                    const fuelClone = selectedVehicle.defaultFuelMap.map(row => [...row]);
                                    const boostClone = selectedVehicle.defaultBoostMap.map(row => [...row]);

                                    const timingOffset = parseFloat(tune.suggestedOffsetIgnitionDegrees || '0');
                                    const boostOffset = parseFloat(tune.suggestedOffsetBoostPct || '0') / 100;

                                    for (let r = 0; r < ignClone.length; r++) {
                                      for (let c = 0; c < ignClone[r].length; c++) {
                                        ignClone[r][c] = Math.round((ignClone[r][c] + timingOffset) * 10) / 10;
                                        if (selectedVehicle.isTurbo && boostOffset > 0) {
                                          boostClone[r][c] = Math.round((boostClone[r][c] + boostOffset) * 100) / 100;
                                        }
                                      }
                                    }

                                    setIgnitionMap(ignClone);
                                    setBoostMap(boostClone);
                                    setActivePreset('Stock'); // Reset preset flag as it's a restored custom timing map
                                    alert(`Successfully restored ${tune.brand} configuration parameters directly into active map spreadsheet Workspace view.`);
                                  }}
                                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Load Into Active spreadsheet</span>
                                </button>
                              </div>

                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-zinc-550 border border-dashed border-zinc-855 uppercase font-black tracking-widest text-[10px] bg-zinc-950/50">
                            Cloud backup database is empty. Calibrate timing maps and press 'Save Active Map' to backup parameters.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CENTER COLUMN: GOOGLE KEEP CALIBRATION NOTES */}
                    <div className="lg:col-span-4 space-y-4">
                      
                      <div className="bg-zinc-950 p-3 border border-zinc-850 text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 block animate-pulse" />
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-200">
                                Calibration Note Pad
                              </h4>
                              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mt-0.5 animate-pulse">
                                Google Keep Integration
                              </span>
                            </div>
                          </div>
                          
                          <span className={`px-1.5 py-0.5 text-[8px] font-mono font-black uppercase border tracking-wider ${
                            keepStatus === 'synced'
                              ? 'bg-green-600/10 text-green-500 border-green-500/20'
                              : 'bg-yellow-600/10 text-yellow-500 border-yellow-500/20'
                          }`}>
                            {keepStatus === 'synced' ? 'Google Keep Active' : 'Offline Mode Fallback'}
                          </span>
                        </div>
                      </div>

                      {/* Create Note Form */}
                      <form onSubmit={handleCreateKeepNote} className="bg-zinc-950 p-4 border border-zinc-850 space-y-3.5 text-xs">
                        <span className="text-[9px] font-black tracking-widest text-zinc-300 bg-yellow-600/10 px-2 py-0.5 border border-yellow-650/20 uppercase block w-max">
                          CREATE NEW CALIBRATION NOTE
                        </span>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black tracking-widest text-zinc-500 uppercase block">Note Title</label>
                          <input 
                            type="text" 
                            required
                            value={newKeepTitle}
                            onChange={(e) => setNewKeepTitle(e.target.value)}
                            placeholder="e.g. Maruti Swift Timing offset specs"
                            className="w-full bg-zinc-900 border border-zinc-850 text-zinc-100 py-2.5 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-yellow-600 text-xs font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black tracking-widest text-zinc-500 uppercase block">Brief Calibration Notes</label>
                          <textarea 
                            required
                            value={newKeepText}
                            onChange={(e) => setNewKeepText(e.target.value)}
                            placeholder="Set spark timing back by -1.5 deg under 4500 RPM full load to offset carbon knock."
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-850 text-zinc-100 py-2.5 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-yellow-600 text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isKeepLoading}
                          className="w-full py-2.5 bg-yellow-550 hover:bg-yellow-650 disabled:opacity-40 text-black font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-black" />
                          <span>{isKeepLoading ? "SAVING..." : "SAVE CALIBRATION NOTE"}</span>
                        </button>
                      </form>

                      {/* Notes list */}
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {isKeepLoading ? (
                          <div className="text-center py-8 font-mono text-[10px] text-zinc-550 flex items-center justify-center gap-2 uppercase font-bold tracking-widest">
                            <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />
                            <span>Connecting Keep API Channel...</span>
                          </div>
                        ) : keepNotes.length > 0 ? (
                          keepNotes.map((note) => (
                            <div key={note.id} className="p-4 border bg-zinc-950 border-zinc-850 text-xs flex justify-between gap-4 items-start">
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-505 block shrink-0" />
                                  <h5 className="font-extrabold uppercase text-zinc-200 text-xs truncate">
                                    {note.title}
                                  </h5>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans whitespace-pre-wrap break-words">
                                  {note.text}
                                </p>
                                {note.date && (
                                  <span className="inline-block font-mono text-[8px] bg-zinc-900 border border-zinc-850 text-zinc-500 font-bold px-1.5 py-0.5 tracking-wider uppercase">
                                    Saved: {note.date}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleDeleteKeepNote(note.id, note.isLocalFallback)}
                                className="p-1 border border-zinc-850 hover:bg-red-955/20 text-zinc-500 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer shrink-0"
                                title="Delete note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-zinc-550 border border-dashed border-zinc-850 uppercase font-black tracking-widest text-[10px] bg-zinc-950/50">
                            No active tuning notes logged. Record safety presets or timing levels above.
                          </div>
                        )}
                      </div>

                    </div>

                    {/* RIGHT COLUMN: GOOGLE WORKSHOP TASKS */}
                    <div className="lg:col-span-4 space-y-4">
                      
                      <div className="bg-zinc-950 p-3 border border-zinc-850 text-xs space-y-3">
                        <div className="flex items-center gap-2.5">
                          <ListTodo className="w-4 h-4 text-red-500" />
                          <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-200">
                              Workshop logistics controller
                            </h4>
                            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mt-0.5">
                              Google Tasks Integration
                            </span>
                          </div>
                        </div>

                        {/* Task List Selector */}
                        {taskLists.length > 0 && (
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-black tracking-widest text-zinc-500 uppercase block">Target Task List</label>
                            <select 
                              value={selectedTaskListId} 
                              onChange={(e) => {
                                setSelectedTaskListId(e.target.value);
                                fetchTasks(e.target.value);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-850 text-zinc-350 py-2.5 px-3 rounded-none focus:outline-none focus:border-red-650 text-xs font-bold uppercase tracking-wider"
                            >
                              {taskLists.map(list => (
                                <option key={list.id} value={list.id}>
                                  {list.title.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Create Task Form */}
                      <form onSubmit={handleCreateTask} className="bg-zinc-950 p-4 border border-zinc-850 space-y-3.5 text-xs">
                        <span className="text-[9px] font-black tracking-widest text-zinc-300 bg-red-600/10 px-2 py-0.5 border border-red-650/20 uppercase block w-max font-mono">
                          REGISTER REMAP SERVICE TASK
                        </span>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black tracking-widest text-zinc-500 uppercase block">Tuning Task Title</label>
                          <input 
                            type="text" 
                            required
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="e.g. Maruti Swift Stage 1 calibration"
                            className="w-full bg-zinc-900 border border-zinc-850 text-zinc-100 py-2.5 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-red-650 text-xs font-bold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black tracking-widest text-zinc-500 uppercase block">Due Date</label>
                            <input 
                              type="date" 
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-850 text-zinc-300 py-2 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-red-655 text-xs font-mono"
                            />
                          </div>
                          
                          <div className="space-y-1 flex flex-col justify-end">
                            <button
                              type="submit"
                              disabled={isCreatingTask || !selectedTaskListId}
                              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-750 disabled:opacity-40 text-white font-black italic uppercase text-[10px] tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isCreatingTask ? "GENERATING TASK..." : "ADD TO GOOGLE TASKS"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black tracking-widest text-zinc-500 uppercase block">Calibration Specifications & Notes</label>
                          <textarea 
                            value={newTaskNotes}
                            onChange={(e) => setNewTaskNotes(e.target.value)}
                            placeholder="e.g. Target values, customer complaints, dynamic testing requirements"
                            rows={2}
                            className="w-full bg-zinc-900 border border-zinc-850 text-zinc-100 py-2.5 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-red-650 text-xs"
                          />
                        </div>
                      </form>

                      {/* Dynamic Tasks list */}
                      <div className="space-y-2 max-h-[350px] overflow-y-auto">
                        {isLoadingTasks ? (
                          <div className="text-center py-8 font-mono text-[10px] text-zinc-550 flex items-center justify-center gap-2 uppercase font-bold tracking-widest">
                            <RefreshCw className="w-4 h-4 animate-spin text-red-540" />
                            <span>Interlocking Google Tasks Engine...</span>
                          </div>
                        ) : tasks.length > 0 ? (
                          tasks.map((task) => (
                            <div key={task.id} className={`p-4 border text-xs flex justify-between gap-4 items-start ${
                              task.status === 'completed'
                              ? 'bg-zinc-950 border-zinc-900/40 opacity-50' 
                              : 'bg-zinc-950 border-zinc-850'
                            }`}>
                              <div className="flex gap-3 items-start">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskStatus(task)}
                                  className={`mt-0.5 w-4.5 h-4.5 border cursor-pointer transition-all flex items-center justify-center rounded-none shrink-0 ${
                                    task.status === 'completed'
                                    ? 'bg-green-600 border-green-700 text-white'
                                    : 'bg-zinc-900 border-zinc-800 hover:border-red-500'
                                  }`}
                                >
                                  {task.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                                </button>
                                
                                <div className="space-y-1">
                                  <h5 className={`font-bold uppercase text-xs ${task.status === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                    {task.title}
                                  </h5>
                                  
                                  {task.notes && (
                                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                                      {task.notes}
                                    </p>
                                  )}

                                  {task.due && (
                                    <span className="inline-block mt-1 font-mono text-[9px] bg-zinc-900 border border-zinc-850 text-amber-500 font-bold px-1.5 py-0.5 tracking-wider uppercase">
                                      Due: {new Date(task.due).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 border border-zinc-855 hover:bg-red-955/20 text-zinc-550 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer shrink-0"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-zinc-550 border border-dashed border-zinc-850 uppercase font-black tracking-widest text-[10px] bg-zinc-950/50">
                            No repair tickets on active select line task catalog.
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </main>

      {/* Footer credits and information */}
      <footer className="bg-zinc-900 border-t border-zinc-805 py-6 px-6 mt-12 text-center text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-wide">
        <p className="max-w-2xl mx-auto">
          Bharat ECU Calibration & Diagnostic software designed for local repair garages, automotive calibrators, and DIY tuners in India. This is a fully functional web simulation supporting offline local coordinate modifications.
        </p>
        <p className="mt-2 text-[10px] text-zinc-600 font-mono tracking-widest">
          Project ID: 193e1a25-487f-4da4-9fe2-646f56b783e0 | Handshake Protocols: ISO 14230 (KWP2000), SAE J1850 PWM, ISO 9141-2
        </p>
      </footer>

      {/* APP MANUAL / USER GUIDE MODAL OVERLAY */}
      {showHelpManual && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl h-[90vh] sm:h-[80vh] flex flex-col shadow-2xl relative">
            
            {/* Header */}
            <div className="flex justify-between items-center bg-zinc-950 p-4 border-b border-zinc-850">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 font-mono">
                    INDIMAP Official Garage Operations Manual
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                    Interactive Calibration Guide & Workspace Instructions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpManual(false)}
                className="p-1 px-2.5 border border-zinc-800 hover:border-zinc-500 bg-zinc-900 text-zinc-400 hover:text-white font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {/* Sidebar & Body Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Internal Help Navigation Tab Rail */}
              <div className="w-full md:w-56 bg-zinc-950 border-r border-zinc-850 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 pb-1 md:pb-0 font-mono">
                
                <button
                  onClick={() => setHelpActiveTab('overview')}
                  className={`flex-1 md:flex-none text-left py-3 px-4 text-[10px] uppercase font-bold tracking-wider border-b md:border-b-0 md:border-l-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    helpActiveTab === 'overview'
                      ? 'bg-zinc-900 text-amber-500 border-amber-500'
                      : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-900/40'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>01. System Overview</span>
                </button>

                <button
                  onClick={() => setHelpActiveTab('obd')}
                  className={`flex-1 md:flex-none text-left py-3 px-4 text-[10px] uppercase font-bold tracking-wider border-b md:border-b-0 md:border-l-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    helpActiveTab === 'obd'
                      ? 'bg-zinc-900 text-amber-500 border-amber-500'
                      : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-900/40'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>02. Live Diagnostics</span>
                </button>

                <button
                  onClick={() => setHelpActiveTab('editor')}
                  className={`flex-1 md:flex-none text-left py-3 px-4 text-[10px] uppercase font-bold tracking-wider border-b md:border-b-0 md:border-l-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    helpActiveTab === 'editor'
                      ? 'bg-zinc-900 text-amber-500 border-amber-500'
                      : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-900/40'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>03. ROM map Editor</span>
                </button>

                <button
                  onClick={() => setHelpActiveTab('ai')}
                  className={`flex-1 md:flex-none text-left py-3 px-4 text-[10px] uppercase font-bold tracking-wider border-b md:border-b-0 md:border-l-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    helpActiveTab === 'ai'
                      ? 'bg-zinc-900 text-amber-500 border-amber-500'
                      : 'text-zinc-505 hover:text-zinc-300 border-transparent hover:bg-zinc-900/40'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>04. AI Tuning & Flash</span>
                </button>

                <button
                  onClick={() => setHelpActiveTab('cloud')}
                  className={`flex-1 md:flex-none text-left py-3 px-4 text-[10px] uppercase font-bold tracking-wider border-b md:border-b-0 md:border-l-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    helpActiveTab === 'cloud'
                      ? 'bg-zinc-900 text-amber-500 border-amber-500'
                      : 'text-zinc-505 hover:text-zinc-300 border-transparent hover:bg-zinc-900/40'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>05. Garage Cloud Sync</span>
                </button>

              </div>

              {/* Scrolling Content Block */}
              <div className="flex-1 p-6 overflow-y-auto text-xs space-y-6">
                
                {helpActiveTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="border-l-2 border-amber-500 pl-3">
                      <h4 className="text-zinc-100 font-black uppercase text-sm tracking-wide">01. INDIMAP v3.9 Core Architecture</h4>
                      <p className="text-zinc-400 mt-1">
                        INDIMAP is a professional EPROM engine remapping software designed to help mechanics and builders flash engine control module (ECU) fuel timing and boost levels.
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-3">
                      <h5 className="font-extrabold text-amber-500 uppercase text-[10px] tracking-wider font-mono">How the Simulation Ecosystem Works</h5>
                      <ul className="space-y-2 text-zinc-300 list-disc list-inside">
                        <li>
                          <strong className="text-zinc-200">ECU Profile:</strong> Choose your target vehicle from the Indian vehicle database on the left side (including Maruti Suzuki Swift, Hyundai Creta, Mahindra XUV700, and Tata Nexon). This loads their authentic micro-controller models and stock lookup tables.
                        </li>
                        <li>
                          <strong className="text-zinc-200">Engine Tuning Output:</strong> Displays direct forecasts of Engine HP & Torque based on active lookup map adjustments.
                        </li>
                        <li>
                          <strong className="text-zinc-200">Stage Tuning Presets:</strong> Instantly hot-reload Stage 0 (OEM stock), Stage 1 (Street Performance), Eco Tuner (fuel economy optimization), or Pop & Bang (decibel crackle map) to compare base calibrations instantly.
                        </li>
                      </ul>
                    </div>

                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      Use this workspace to diagnose existing trouble codes, modify active ROM parameters manually or via Google Gemini AI models, execute safe CRC-checked flashing procedures, and maintain synchronization logs using Cloud integration.
                    </p>
                  </div>
                )}

                {helpActiveTab === 'obd' && (
                  <div className="space-y-4">
                    <div className="border-l-2 border-amber-500 pl-3">
                      <h4 className="text-zinc-100 font-black uppercase text-sm tracking-wide">02. OBD Live Monitor & Telemetry Diagnostics</h4>
                      <p className="text-zinc-400 mt-1">
                        Accurately read running diagnostics parameter channels directly from the virtual ECU before or after flashing maps.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="bg-zinc-955 p-4 border border-zinc-850 space-y-2">
                        <span className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest block">OBD Link Protocol</span>
                        <p className="text-zinc-300 leading-relaxed">
                          Click the <strong className="text-red-500">Connect OBD-II Adapter</strong> on the left panel to negotiate state connections. Standard operating voltage is around <code className="text-zinc-200 bg-zinc-900 border border-zinc-800 px-1 py-0.5 font-mono">13.8V - 14.1V</code> when running normal battery charging.
                        </p>
                        <p className="text-zinc-400 leading-relaxed text-[11px]">
                          Once linked, you can toggle the <strong className="text-zinc-200">Engine Cycle Simulator</strong> to simulate real-time engine loads, causing fluctuating dynamic telemetry.
                        </p>
                      </div>

                      <div className="bg-zinc-955 p-4 border border-zinc-850 space-y-2">
                        <span className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest block">OBD Diagnostics Trouble Codes (DTC)</span>
                        <p className="text-zinc-300 leading-relaxed">
                          Under the <strong className="text-zinc-100">OBD Live Stream</strong> tab, you will find active emissions or drivetrain fault codes currently logged by the memory banks.
                        </p>
                        <p className="text-zinc-400 leading-relaxed text-[11px]">
                          Click <strong className="text-zinc-200">Trigger OBD Scan</strong> to scan for secondary faults. Clear them instantly using <strong className="text-zinc-200">Reset DTCs</strong> once electronic sensor repairs are completed on the line.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {helpActiveTab === 'editor' && (
                  <div className="space-y-4">
                    <div className="border-l-2 border-amber-500 pl-3">
                      <h4 className="text-zinc-100 font-black uppercase text-sm tracking-wide">03. Calibration Map Editor, Multi-Cell Selection, & Smoothing</h4>
                      <p className="text-zinc-400 mt-1">
                        Direct access to physical fuel lookup tables. Standard calibrations exist for Ignition Advance (°BTDC), target Lambda ratio, and Turbocharger Boost (Bar).
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-3">
                      <h5 className="font-extrabold text-amber-500 uppercase text-[10px] tracking-wider font-mono">Selecting & Modifying Grid Coordinates</h5>
                      
                      <div className="space-y-2 text-zinc-300">
                        <p>
                          1. Choose your active map dimension parameter (<strong className="text-zinc-100">Ignition Map</strong>, <strong className="text-zinc-100">Fuel Map</strong>, or <strong className="text-zinc-100">Boost Map</strong>) using the navigation buttons in the editor tab.
                        </p>
                        <p>
                          2. Click any coordinate cell inside the RPM grid lines versus Load grid lines matrix. This highlights the cell in red and loads its current float value inside the sidebar edit controller.
                        </p>
                        <p>
                          3. Use the edit panel on the right to manually write a new value, or hit the <strong className="text-zinc-100">+</strong> or <strong className="text-zinc-100">-</strong> buttons to increment or decrement the EPROM level incrementally.
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-3">
                      <h5 className="font-extrabold text-amber-500 uppercase text-[10px] tracking-wider font-mono">🚀 How to Use Range Interpolation & Smoothing</h5>
                      <p className="text-zinc-300 leading-relaxed">
                        To smooth jagged transitions over multiple grid cells (such as RPM spool up or throttle transitions):
                      </p>
                      <ol className="space-y-1.5 text-zinc-300 list-decimal list-inside pl-1">
                        <li>Left-click any cell to designate the <strong className="text-amber-500">Range Start</strong> anchor bounding coordinate.</li>
                        <li>Hold down the <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 text-zinc-300 rounded font-bold">SHIFT</kbd> key on your hardware keyboard.</li>
                        <li>While holding shift, left-click on any other EPROM coordinate to define the <strong className="text-amber-500">Range End</strong> bounding corner.</li>
                        <li>Verify the highlighted amber area bounds on the map.</li>
                        <li>Inside the range control utility block on the right, review the coordinates span, and click <strong className="text-amber-500 font-extrabold">SMOOTH INTERPOLATION</strong>.</li>
                      </ol>
                      <p className="text-zinc-400 mt-1 text-[11px]">
                        INDIMAP automatically calculates horizontal, vertical, or 2D Bilinear interpolations using the 4 bounding matrix corners as anchors. This applies smooth linear slope transitioning across the entire selected EPROM region.
                      </p>
                    </div>

                    <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-2">
                      <h5 className="font-extrabold text-amber-500 uppercase text-[10px] tracking-wider font-mono">🛠 Calibration History Undo / Redo engine</h5>
                      <p className="text-zinc-300">
                        Adjusting tables with precision is critical. Hit the <strong className="text-zinc-105 inline-flex items-center gap-1 bg-zinc-900 border border-zinc-850 px-1 py-0.5 text-[10px] rounded"><Undo className="w-3 h-3 text-red-500" /> Undo</strong> button at the top right of the Map Editor panel to restore previous cell coordinate values. If you undo too far, hit the <strong className="text-zinc-105 inline-flex items-center gap-1 bg-zinc-900 border border-zinc-850 px-1 py-0.5 text-[10px] rounded"><Redo className="w-3 h-3 text-red-500" /> Redo</strong> button to safe-forward map edits.
                      </p>
                    </div>
                  </div>
                )}

                {helpActiveTab === 'ai' && (
                  <div className="space-y-4">
                    <div className="border-l-2 border-amber-500 pl-3">
                      <h4 className="text-zinc-100 font-black uppercase text-sm tracking-wide">04. AI-Powered Calibration & Checked Firmware Burning</h4>
                      <p className="text-zinc-400 mt-1">
                        Automate performance profiles using Gemini models and flash your finalized calibration safely to the micro-controller storage.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-2">
                        <span className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest block">AI Calibration Assist</span>
                        <p className="text-zinc-300 leading-relaxed">
                          Navigate to the <strong className="text-zinc-100">AI Calibrator</strong> tab. Here, you can prompt the Gemini integration to automatically correct timing maps.
                        </p>
                        <p className="text-zinc-400 leading-relaxed text-[11px]">
                          Gemini analyzes current knock threshold alerts, current temperature limits, and target boost to compute calculated safe advancements. Review the output response and hit <strong className="text-zinc-200 font-bold">Apply Calibration Offset</strong> to update live RAM instantly.
                        </p>
                      </div>

                      <div className="bg-zinc-955 p-4 border border-zinc-850 space-y-2">
                        <span className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest block">EPROM Burning & Verification</span>
                        <p className="text-zinc-350 leading-relaxed">
                          To make changes permanent, open the <strong className="text-zinc-100">EPROM Flash Codes</strong> tab. Under security protocol checks, click <strong className="text-zinc-250 font-black">Generate Micro-Flasher Checksum</strong>.
                        </p>
                        <p className="text-zinc-400 leading-relaxed text-[11px]">
                          This processes the altered hex cells and generates a static SHA-256 verification hash. Once authorized, click <strong className="text-red-500">EXECUTE ECU FLASH MODE</strong>. Keep vehicle ignition ON and auxiliary voltage above 12.5V during process.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

                {helpActiveTab === 'cloud' && (
                  <div className="space-y-4">
                    <div className="border-l-2 border-amber-500 pl-3">
                      <h4 className="text-zinc-100 font-black uppercase text-sm tracking-wide">05. Garage Cloud Sync, Keep Notebook, & Tasks</h4>
                      <p className="text-zinc-400 mt-1">
                        Authorize remote workshop tools using Cloud integrations. Maintain persistent backups of customized vehicle profiles.
                      </p>
                    </div>

                    <div className="bg-zinc-955 p-4 border border-zinc-850 space-y-3">
                      <h5 className="font-extrabold text-amber-500 uppercase text-[10px] tracking-wider font-mono">Google Authentication & Persisted Tunes</h5>
                      <p className="text-zinc-300">
                        Sign In using Google accounts in the right sidebar or on the Cloud page. This connects online storage repositories, allowing you to back up successful tune profiles, naming specific setups like "Creta High-Temp E85" or "Swift Drag Track Stage 2" for permanent records.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-2">
                        <span className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest block">Google Keep Notebook</span>
                        <p className="text-zinc-300">
                          Save brief tuning calibration notes directly under the Cloud SQL tab. Notes sync safely to Google Keep accounts if calibrated online, or fallback to encrypted local storage if offline. Record spark offsets or mechanical configurations to prevent torque damage.
                        </p>
                      </div>

                      <div className="bg-zinc-950 p-4 border border-zinc-850 space-y-2">
                        <span className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest block">Workshop Repair Checklist</span>
                        <p className="text-zinc-300">
                          Create active repair order checklists under the Google Tasks list. Create new tickets mapping spark plug replacements, fuel pump cleaning, oxygen sensor checkups, and clear them once vehicle line repairs are finalized on-site.
                        </p>
                      </div>

                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Footer Control */}
            <div className="bg-zinc-950 p-3 border-t border-zinc-850 flex items-center justify-between font-mono text-[9px] text-zinc-500">
              <span className="hidden sm:inline">Bharat garage ECU standard calibration guidelines. Always verify checksum integrity before burning flash maps.</span>
              <button
                onClick={() => setShowHelpManual(false)}
                className="px-4 py-1.5 bg-red-650 hover:bg-red-750 text-white font-bold uppercase transition-all tracking-widest cursor-pointer border border-red-500/25 text-[10px]"
              >
                PROCEED TO CALIBRATION ✕
              </button>
            </div>

          </div>
        </div>
      )}

      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
          <div className="bg-zinc-900 border border-red-500/30 w-full max-w-md shadow-2xl relative">
            
            {/* Header */}
            <div className="flex items-center gap-2.5 bg-zinc-950 p-4 border-b border-zinc-850">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100">
                  Unsaved EPROM Calibrations
                </h3>
                <span className="text-[8px] text-red-550 font-bold uppercase tracking-widest">
                  Memory Buffer Conflict Detected
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 text-center space-y-4">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide leading-relaxed font-bold">
                You have unsaved changes in your active Map coordinates for vehicle "{selectedVehicle.brand} {selectedVehicle.model}". Leaving the editor will preserve a temporary draft in browser cache.
              </p>
              
              <div className="bg-zinc-950 p-3 border border-zinc-855 text-left space-y-1 text-[9px] text-zinc-505 uppercase leading-relaxed font-bold rounded-xs">
                <span className="text-zinc-400 text-[10px] font-black block mb-1">DRAFT ACTION REGISTER:</span>
                <div>• CURRENT SELECTION: {(activePreset || "Manual custom") + " profile"}</div>
                <div>• MAP ADJUSTMENT STATUS: {isMapModified() ? "MODIFIED (UNFLASHED)" : "CLEAN"}</div>
                <div>• CACHE PRESERVATION: AUTOMATIC SESSION RECOVERY</div>
              </div>
            </div>

            {/* Footer Options */}
            <div className="bg-zinc-950 p-4 border-t border-zinc-850 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[9px]">
              <button
                onClick={() => {
                  // Explicitly save draft
                  const draft = {
                    vehicleId: selectedVehicle.id,
                    vehicleName: `${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.variant}`,
                    activePreset,
                    ignitionMap,
                    fuelMap,
                    boostMap,
                    timestamp: Date.now()
                  };
                  localStorage.setItem('indimap_local_draft', JSON.stringify(draft));
                  setLastDraftSavedTime(new Date().toLocaleTimeString());
                  
                  // Move to tab
                  if (pendingTabDestination) {
                    setActiveTab(pendingTabDestination);
                  }
                  setShowUnsavedDialog(false);
                  setPendingTabDestination(null);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2 px-3 uppercase tracking-wider cursor-pointer rounded-xs"
              >
                Save & Proceed
              </button>
              
              <button
                onClick={() => {
                  // Revert changes back to vehicle default maps
                  setIgnitionMap(selectedVehicle.defaultIgnitionMap.map(row => [...row]));
                  setFuelMap(selectedVehicle.defaultFuelMap.map(row => [...row]));
                  setBoostMap(selectedVehicle.defaultBoostMap.map(row => [...row]));
                  localStorage.removeItem('indimap_local_draft');
                  setSavedDraft(null);
                  
                  if (pendingTabDestination) {
                    setActiveTab(pendingTabDestination);
                  }
                  setShowUnsavedDialog(false);
                  setPendingTabDestination(null);
                }}
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-red-500 hover:text-red-400 font-bold py-2 px-3 uppercase tracking-wider cursor-pointer rounded-xs"
              >
                Discard & Exit
              </button>

              <button
                onClick={() => {
                  setShowUnsavedDialog(false);
                  setPendingTabDestination(null);
                }}
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-805 text-zinc-400 hover:text-zinc-300 font-black py-2 px-3 uppercase tracking-wider cursor-pointer rounded-xs"
              >
                Cancel ✕
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
