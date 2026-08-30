import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phase3WaitingRoom } from './components/Phase3WaitingRoom'
import { InstructorQuizControl } from './components/InstructorQuizControl'
import {
  ArrowRight,
  AlertCircle,
  Search,
  BarChart2,
  ShieldCheck,
  Star,
  Check,
  X,
  Activity,
  Stethoscope,
  CalendarDays,
  Clock3,
  Target,
  Scan,
  BrainCircuit,
  UserRoundCheck,
  Route,
  ScanSearch,
  ChartNoAxesCombined,
  CircleAlert,
  CircleX,
  TriangleAlert,
  Info,
  ZoomIn,
  RotateCcw,
  CircleCheck,
  EyeOff,
  Maximize2,
  MessageSquareText,
  FileCheck2,
  UserRound,
  BadgeCheck,
  Eye,
  Lightbulb
} from 'lucide-react'
import xrayImg from './assets/xray.jpg'
import { xrayCases } from './data/xrayCases'
import { ModelPredictionScreen } from './components/ModelPredictionScreen'
import { supabase } from './supabaseClient'

// Custom Lungs Icon to support Lucide version constraints and prevent build errors
const Lungs = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10 22c-3-2-5-5-5-9 0-3 1-5 2-7 1-1 2-2 3-2" />
    <path d="M10 13c-1.5 0-3-1-3-3s1.5-3 3-3" />
    <path d="M14 22c3-2 5-5 5-9 0-3-1-5-2-7-1-1-2-2-3-2" />
    <path d="M14 13c1.5 0 3-1 3-3s-1.5-3-3-3" />
    <path d="M12 2v6" />
    <path d="M12 8l-2 2" />
    <path d="M12 8l2 2" />
  </svg>
)

function App() {
  const [screenState, setScreenState] = useState<'LANDING' | 'CASE_BRIEF' | 'XRAY_INVESTIGATION' | 'CASE_RESULT' | 'MODEL_PREDICTION' | 'COMPLETION' | 'INSTRUCTOR_LOGIN' | 'INSTRUCTOR_DASHBOARD' | 'PHASE_3_WAITING' | 'INSTRUCTOR_QUIZ_CONTROL'>('LANDING')
  const [name, setName] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [batch, setBatch] = useState('BATCH 1')
  const [loading, setLoading] = useState(false)
  const [_studentId, setStudentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // X-Ray viewer states
  const [zoom, setZoom] = useState(1.0)
  
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0)
  const [imageError, setImageError] = useState(false)

  // API ML Model integration states
  const [apiCases, setApiCases] = useState<any[]>(xrayCases)

  // Instructor dashboard states
  const [instructorEmail, setInstructorEmail] = useState('')
  const [instructorPassword, setInstructorPassword] = useState('')
  const [_instructorLoggedIn, setInstructorLoggedIn] = useState(false)
  const [dashboardTab, setDashboardTab] = useState<'DAY_01' | 'DAY_02' | 'DAY_03' | 'DAY_04'>('DAY_01')
  const [dashboardBatch, setDashboardBatch] = useState('BATCH 1')
  const [instructorError, setInstructorError] = useState('')
  const [dashboardStudents, setDashboardStudents] = useState<any[]>([])

  // Instructor routing & list filters
  const [searchName, setSearchName] = useState('')
  const [searchRoll, setSearchRoll] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in_progress'>('all')
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)

  // Instructor dashboard data fetching
  const fetchDashboardData = async () => {
    setIsRefreshing(true)
    try {
      const { data: studentsList, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          roll_number,
          batch,
          sessions (
            id,
            status,
            day_number,
            started_at,
            completed_at,
            results (
              score,
              completion_time
            ),
            predictions (
              case_id,
              student_prediction,
              confidence,
              observation
            )
          )
        `)
      
      if (studentsError) throw studentsError
      console.log('Dashboard fetched studentsList:', studentsList)
      setDashboardStudents(studentsList || [])
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Navigate helper
  const navigate = async (path: string) => {
    window.history.pushState({}, '', path)
    const { data: { session } } = await supabase.auth.getSession()
    handleRouting(path, session?.user || null)
  }

  const handleRouting = (path: string, sessionUser: any) => {
    if (path === '/instructor') {
      if (sessionUser) {
        setScreenState('INSTRUCTOR_DASHBOARD')
        fetchDashboardData()
      } else {
        window.history.replaceState({}, '', '/instructor/login')
        setScreenState('INSTRUCTOR_LOGIN')
      }
    } else if (path === '/instructor/quiz') {
      if (sessionUser) {
        setScreenState('INSTRUCTOR_QUIZ_CONTROL')
      } else {
        window.history.replaceState({}, '', '/instructor/login')
        setScreenState('INSTRUCTOR_LOGIN')
      }
    } else if (path === '/instructor/login') {
      if (sessionUser) {
        window.history.replaceState({}, '', '/instructor')
        setScreenState('INSTRUCTOR_DASHBOARD')
        fetchDashboardData()
      } else {
        setScreenState('INSTRUCTOR_LOGIN')
      }
    } else {
      // Always start at the landing page when visiting the root URL
      setScreenState('LANDING')
    }
  }

  useEffect(() => {
    setImageError(false)
  }, [currentCaseIndex])

  // Session persistence and dynamic state reloading from localStorage/Supabase
  useEffect(() => {
    const initApp = async () => {
      const savedStudentId = sessionStorage.getItem('active_student_id')
      const savedSessionId = sessionStorage.getItem('active_session_id')
      const savedName = sessionStorage.getItem('active_student_name')
      const savedReg = sessionStorage.getItem('active_student_reg')
      const savedBatch = sessionStorage.getItem('active_student_batch')
      const savedCaseIdx = localStorage.getItem('active_case_index')

      if (savedStudentId) setStudentId(savedStudentId)
      if (savedSessionId) {
        setSessionId(savedSessionId)
        // Check if existing session has all 5 predictions and needs to be marked completed
        try {
          const { data: preds } = await supabase
            .from('predictions')
            .select('id')
            .eq('session_id', savedSessionId)
          if (preds && preds.length === 5) {
            const { data: sessionData } = await supabase
              .from('sessions')
              .select('status')
              .eq('id', savedSessionId)
              .maybeSingle()
            if (sessionData && sessionData.status === 'in_progress') {
              await supabase
                .from('sessions')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', savedSessionId)
            }
          }
        } catch (e) {
          console.error("Error auto-completing session on init:", e)
        }
      }
      if (savedName) setName(savedName)
      if (savedReg) setRegNumber(savedReg)
      if (savedBatch) setBatch(savedBatch)
      if (savedCaseIdx) setCurrentCaseIndex(parseInt(savedCaseIdx))

      const savedPredictions = localStorage.getItem('active_predictions')
      if (savedPredictions) {
        try {
          setPredictions(JSON.parse(savedPredictions))
        } catch (e) {
          console.error(e)
        }
      }

      // Check if instructor is authenticated already
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user || null
      if (user) {
        setInstructorLoggedIn(true)
      } else {
        setInstructorLoggedIn(false)
      }

      handleRouting(window.location.pathname, user)
    }

    initApp()

    const handlePopState = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      handleRouting(window.location.pathname, session?.user || null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Fetch initial cases from FastAPI
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/cases")
      .then(res => {
        if (!res.ok) throw new Error("API server not responding");
        return res.json();
      })
      .then(data => {
        setApiCases(data);
      })
      .catch(err => {
        console.warn("FastAPI offline, using static xrayCases fallback.", err);
        setApiCases(xrayCases);
      });
  }, []);

  const currentCase = apiCases[currentCaseIndex] || xrayCases[currentCaseIndex]

  // Track student prediction values per case index
  const [predictions, setPredictions] = useState<Array<{
    prediction: 'PNEUMONIA' | 'NORMAL' | null
    confidence: number
    note: string
  }>>(() => Array.from({ length: 5 }, () => ({ prediction: null, confidence: 75, note: '' })))

  // Sync predictions to localStorage
  useEffect(() => {
    localStorage.setItem('active_predictions', JSON.stringify(predictions))
  }, [predictions])

  const currentStudentPrediction = predictions[currentCaseIndex]

  const handleScrollToEntry = () => {
    const element = document.getElementById('student-entry')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Phase 1: Connect - Create/Find Student Record on Registration
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regNumber.trim()) return;

    setLoading(true);
    setRegistrationError(null);
    try {
      // Find existing student or insert
      const { data: existingStudent, error: findError } = await supabase
        .from('students')
        .select('*')
        .eq('roll_number', regNumber.trim())
        .maybeSingle();

      if (findError) {
        console.error('[DIAGNOSTIC] SELECT Error:', { message: findError.message, code: findError.code, details: findError.details, hint: findError.hint });
        throw findError;
      }

      let activeId = '';
      if (existingStudent) {
        activeId = existingStudent.id;
        // Update batch if they are logging in again and selected a batch
        if (existingStudent.batch !== batch) {
          const { error: updateBatchErr } = await supabase
            .from('students')
            .update({ batch })
            .eq('id', activeId);
          if (updateBatchErr) {
            console.error('Failed to update existing student batch', updateBatchErr);
          }
        }
      } else {
        const { data: newStudent, error: insertError } = await supabase
          .from('students')
          .insert({ name: name.trim(), roll_number: regNumber.trim(), batch })
          .select()
          .single();
        if (insertError) {
          console.error('[DIAGNOSTIC] INSERT Error:', { message: insertError.message, code: insertError.code, details: insertError.details, hint: insertError.hint });
          throw insertError;
        }
        if (!newStudent) throw new Error('Failed to insert student record.');
        activeId = newStudent.id;
      }

      console.log('Student ID:', activeId);

      // Look for an existing Day 01 session for this student
      const { data: existingSession, error: sessFindErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('student_id', activeId)
        .eq('day_number', 1)
        .maybeSingle();
      if (sessFindErr) throw sessFindErr;

      let sessionRecord: any = null;
      if (existingSession) {
        sessionRecord = existingSession;
        console.log('Reusing existing session:', sessionRecord.id);
      } else {
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
          .insert({ student_id: activeId, day_number: 1, status: 'in_progress' })
          .select()
          .single();
        if (sessionError) throw sessionError;
        if (!newSession) throw new Error('Failed to create student session.');
        sessionRecord = newSession;
        console.log('Created new session:', sessionRecord.id);
      }

      setStudentId(activeId);
      setSessionId(sessionRecord.id);
      sessionStorage.setItem('active_student_id', activeId);
      sessionStorage.setItem('active_session_id', sessionRecord.id);
      sessionStorage.setItem('active_student_name', name.trim());
      sessionStorage.setItem('active_student_reg', regNumber.trim());
      sessionStorage.setItem('active_student_batch', batch);

      // Always explicitly start at Case 01 when entering investigation
      setCurrentCaseIndex(0);
      localStorage.setItem('active_case_index', '0');
      const emptyPredictions = Array.from({ length: 5 }, () => ({ prediction: null, confidence: 75, note: '' }));
      setPredictions(emptyPredictions);
      localStorage.setItem('active_predictions', JSON.stringify(emptyPredictions));

      localStorage.setItem('active_screen_state', 'CASE_BRIEF');
      setScreenState('CASE_BRIEF');
    } catch (err: any) {
      console.error('Error creating student/session:', err);
      setRegistrationError(err.message || 'Failed to connect to Supabase. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const handlePredictionSelect = (pred: 'PNEUMONIA' | 'NORMAL') => {
    setPredictions(prev => {
      const next = [...prev]
      next[currentCaseIndex] = { ...next[currentCaseIndex], prediction: pred }
      return next
    })
  }

  const handleConfidenceChange = (val: number) => {
    setPredictions(prev => {
      const next = [...prev]
      next[currentCaseIndex] = { ...next[currentCaseIndex], confidence: val }
      return next
    })
  }

  const handleNoteChange = (text: string) => {
    setPredictions(prev => {
      const next = [...prev]
      next[currentCaseIndex] = { ...next[currentCaseIndex], note: text }
      return next
    })
  }

  // Phase 1: Connect - Save predictions to Supabase
  const handleSubmitPrediction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentStudentPrediction.prediction) return

    try {
      if (sessionId) {
        // Avoid duplicate predictions for the same case in the same session
        const { data: existingPred } = await supabase
          .from('predictions')
          .select('id')
          .eq('session_id', sessionId)
          .eq('case_id', currentCase.caseId)
          .maybeSingle()

        if (existingPred) {
          await supabase
            .from('predictions')
            .update({
              student_prediction: currentStudentPrediction.prediction,
              confidence: currentStudentPrediction.confidence,
              observation: currentStudentPrediction.note
            })
            .eq('id', existingPred.id)
        } else {
          await supabase
            .from('predictions')
            .insert({
              session_id: sessionId,
              case_id: currentCase.caseId,
              student_prediction: currentStudentPrediction.prediction,
              confidence: currentStudentPrediction.confidence,
              observation: currentStudentPrediction.note
            })
        }

        // If this is Case 05 (the 5th prediction), mark the session as completed
        if (currentCaseIndex === 4) {
          try {
            const { data: updateResult, error: updateError } = await supabase
              .from('sessions')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('id', sessionId)
              .select()
            if (updateError) {
              console.error('Supabase session completion error:', updateError)
            } else {
              console.log('Session marked completed:', updateResult)
            }
          } catch (updErr) {
            console.error('Unexpected error during session completion:', updErr)
          }
        }
      }
    } catch (err) {
      console.error("Error saving prediction:", err)
    }

    localStorage.setItem('active_screen_state', 'CASE_RESULT')
    setScreenState('CASE_RESULT')
  }

  const handleContinueNext = () => {
    if (currentCaseIndex < 4) {
      // Advance to next case and reset viewer zoom
      setZoom(1.0)
      const nextIndex = currentCaseIndex + 1
      setCurrentCaseIndex(nextIndex)
      localStorage.setItem('active_case_index', String(nextIndex))
      localStorage.setItem('active_screen_state', 'XRAY_INVESTIGATION')
      setScreenState('XRAY_INVESTIGATION')
    } else {
      // Case 05 complete, navigate to Model Prediction page
      localStorage.setItem('active_screen_state', 'MODEL_PREDICTION')
      setScreenState('MODEL_PREDICTION')
    }
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 1.0))
  const handleResetZoom = () => setZoom(1.0)

  // AI model prediction logic: Threshold of 0.5
  const aiPrediction = currentCase.modelProbability >= 0.5 ? 'PNEUMONIA' : 'NORMAL'

  // Handle Instructor Signin
  const handleInstructorLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setInstructorError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: instructorEmail.trim(),
        password: instructorPassword
      })

      if (error) throw error

      setInstructorLoggedIn(true)
      navigate('/instructor')
    } catch (err: any) {
      setInstructorError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleInstructorLogout = async () => {
    await supabase.auth.signOut()
    setInstructorLoggedIn(false)
    navigate('/instructor/login')
  }

  // CSV Export utility
  const handleExportCSV = () => {
    const headers = ['Student Name', 'Roll Number', 'Day 1 Status', 'Score (%)', 'Started At', 'Completed At']
    const rows = dashboardStudents.map(student => {
      const day1Session = student.sessions?.find((s: any) => s.day_number === 1)
      const score = day1Session?.results?.[0]?.score ?? 'N/A'
      return [
        student.name,
        student.roll_number,
        day1Session?.status || 'Not Started',
        score,
        day1Session?.started_at ? new Date(day1Session.started_at).toLocaleString() : 'N/A',
        day1Session?.completed_at ? new Date(day1Session.completed_at).toLocaleString() : 'N/A'
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ai_doctor_lab_instructor_dashboard_day01.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate educational classification details
  const getResultInfo = (student: 'PNEUMONIA' | 'NORMAL' | null, actual: 'PNEUMONIA' | 'NORMAL') => {
    if (!student) return null

    if (student === actual) {
      return {
        title: "CORRECT",
        icon: CircleCheck,
        subtext: "Your prediction matched the ground-truth label.",
        color: "text-success border-success-border bg-surfacemerald-950/5 hover:border-success-border hover:bg-surfacemerald-950/10",
        clinical: "A correct prediction is useful, but one case cannot establish whether a model is reliable. We need many cases and appropriate metrics.",
        lesson: "One correct prediction is only one data point. Model quality must be evaluated across many cases using appropriate metrics."
      }
    }
    if (student === 'NORMAL' && actual === 'PNEUMONIA') {
      return {
        title: "FALSE NEGATIVE",
        icon: TriangleAlert,
        subtext: "Sick patient classified as normal.",
        color: "text-danger border-danger-border bg-danger-soft hover:border-danger-border hover:bg-danger-soft",
        clinical: "A false negative means the system failed to identify a positive case. In a clinical setting, this type of miss can be especially important because it may delay further evaluation.",
        lesson: "In medical AI, the type of mistake matters. A model can appear accurate overall while still missing cases that matter clinically."
      }
    }
    // student === 'PNEUMONIA' && actual === 'NORMAL'
    return {
      title: "FALSE POSITIVE",
      icon: CircleX,
      subtext: "Healthy patient flagged as positive.",
      color: "text-warning border-warning-border bg-warning-soft hover:border-warning-border hover:bg-warning-soft",
      clinical: "A false positive means a healthy case was flagged as positive. This can lead to additional review, testing, or unnecessary concern.",
      lesson: "Reducing false positives can be useful, but doing so may increase false negatives. Model thresholds involve trade-offs."
    }
  }

  const resultDetails = getResultInfo(currentStudentPrediction.prediction, currentCase.actualLabel as 'PNEUMONIA' | 'NORMAL')

  // Animation constants for a premium spring feel
  const springEntrance = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15 } }
  } as const

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.03
      }
    }
  } as const

  return (
        <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans antialiased overflow-x-hidden selection:bg-blue-500/30 relative">
      {/* Faint visual grid overlay behind the workspace */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(35,110,150,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(35,110,150,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {/* ==========================================
            SCREEN 1: EXISTING LANDING PAGE
            ========================================== */}
        {screenState === 'LANDING' && (
          <motion.div
            key="landing-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col min-h-screen bg-[#F2F8FC]"
          >
            {/* Header */}
            <motion.header
              className="w-full bg-[#062B5C] text-white shadow-md sticky top-0 z-50 px-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <div className="max-w-7xl mx-auto flex items-center justify-between h-18">
                {/* Logo & Lab Branding */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#0B6FE8]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-base font-bold tracking-wider leading-none mb-1">AI DOCTOR LAB</span>
                    <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-medium">
                      APPLY. LEARN. SAVE LIVES.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-extrabold tracking-widest bg-white/10 text-white border border-white/20 px-3 py-1 rounded">
                    DAY 01
                  </span>
                  <button
                    onClick={() => setScreenState('INSTRUCTOR_LOGIN')}
                    className="text-xs font-bold font-mono text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded border border-white/10 hover:border-white/30 transition-all cursor-pointer"
                  >
                    INSTRUCTOR LOGIN
                  </button>
                </div>
              </div>
            </motion.header>

            {/* Hero */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col justify-center">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                <motion.div
                  className="lg:col-span-7 flex flex-col items-start text-left space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-[#0B6FE8] bg-[#E1F1F9] px-3 py-1 rounded-full border border-[#0B6FE8]/25 font-mono">
                    HOSPITAL AI INVESTIGATION
                  </span>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#12324A] leading-tight">
                    A pneumonia model<br />
                    <span className="text-[#0B6FE8]">missed a real case.</span>
                  </h1>
                  <p className="text-base sm:text-lg text-[#49677F] max-w-xl leading-relaxed">
                    You are part of the hospital's applied ML team. Investigate where the model failed, evaluate its performance, and decide whether it should be deployed.
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                    <motion.button
                      onClick={handleScrollToEntry}
                      className="group flex items-center gap-3 bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white font-extrabold px-8 py-4 rounded-xl shadow-lg shadow-[#0B6FE8]/20 transition-all duration-300 cursor-pointer text-sm uppercase tracking-wider"
                      whileHover={{ y: -2, boxShadow: "0 12px 20px rgba(11,111,232,0.3)" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ENTER INVESTIGATION
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </motion.button>
                  </div>
                  
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#6E879A] flex items-center gap-2">
                    <Clock3 className="w-4 h-4" /> 20 MIN &middot; INDIVIDUAL CHALLENGE
                  </span>
                </motion.div>

                {/* Right Column: Hero Preview Card */}
                <motion.div
                  className="lg:col-span-5 relative w-full max-w-md mx-auto lg:max-w-none bg-white p-4 rounded-2xl border border-[#D5E5EE] shadow-[0_8px_30px_rgba(30,90,130,0.08)]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                >
                  <div className="relative aspect-[4/5] bg-slate-950 rounded-xl overflow-hidden shadow-inner">
                    <img 
                      src={xrayImg} 
                      alt="Clinical Chest X-Ray Scan" 
                      className="w-full h-full object-cover opacity-80 contrast-125 brightness-90 select-none pointer-events-none"
                    />
                    
                    {/* Bounding box for ROI target */}
                    <div className="absolute left-[20%] top-[40%] w-[32%] h-[28%] border-2 border-dashed border-blue-500 rounded bg-blue-500/10 z-20">
                      <div className="absolute -top-[2px] -left-[2px] w-2 h-2 border-t-4 border-l-4 border-blue-500" />
                      <div className="absolute -top-[2px] -right-[2px] w-2 h-2 border-t-4 border-r-4 border-blue-500" />
                      <div className="absolute -bottom-[2px] -left-[2px] w-2 h-2 border-b-4 border-l-4 border-blue-500" />
                      <div className="absolute -bottom-[2px] -right-[2px] w-2 h-2 border-b-4 border-r-4 border-blue-500" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border border-blue-500/40 flex items-center justify-center animate-ping" />
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                      </div>
                    </div>
                    
                    {/* Top brackets */}
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/60 pointer-events-none" />
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/60 pointer-events-none" />
                  </div>
                  
                  {/* Info banner at bottom of card */}
                  <div className="mt-4 p-4 bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl text-left">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono tracking-widest text-[#6E879A] uppercase font-bold">AT RISK: PNEUMONIA</span>
                      <span className="text-[10px] font-mono text-[#6E879A] uppercase tracking-widest font-bold">PATIENT 001</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-xl font-black text-[#0B6FE8] tracking-wider">NORMAL</span>
                        <span className="text-xs text-[#49677F] ml-2 font-semibold">87% confidence</span>
                      </div>
                      <span className="text-[10px] font-mono text-danger font-extrabold flex items-center gap-1 bg-[#FCECEE] border border-red-200 px-2.5 py-0.5 rounded-full uppercase">
                        <AlertCircle className="w-3.5 h-3.5" /> MISSED TARGET
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </main>

            {/* Case Brief Info Graphic */}
            <section className="w-full border-t border-[#D5E5EE] bg-white py-24 relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center mb-20 space-y-3">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#0B6FE8] bg-[#E1F1F9] px-3 py-1 rounded-full border border-[#0B6FE8]/25">
                    YOUR MISSION
                  </span>
                  <div className="text-[#0B6FE8]/50">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#12324A]">
                    Case Brief
                  </h2>
                  <p className="text-sm md:text-base text-[#49677F] max-w-xl leading-relaxed">
                    Follow the steps of a real clinical AI investigation.<br />
                    <span className="text-[#0B6FE8] font-bold font-mono">Analyze. Understand. Decide.</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative mb-16">
                  {/* Subtle connecting lines */}
                  <div className="hidden md:flex absolute top-[15%] left-[27%] w-[13%] items-center justify-between pointer-events-none -z-10">
                    <div className="h-[1px] w-full border-t border-dashed border-[#0B6FE8]/30" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6FE8] shadow-sm" />
                    <div className="h-[1px] w-full border-t border-dashed border-[#0B6FE8]/30" />
                  </div>
                  <div className="hidden md:flex absolute top-[15%] left-[60%] w-[13%] items-center justify-between pointer-events-none -z-10">
                    <div className="h-[1px] w-full border-t border-dashed border-[#0B6FE8]/30" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6FE8] shadow-sm" />
                    <div className="h-[1px] w-full border-t border-dashed border-[#0B6FE8]/30" />
                  </div>

                  {/* Card 1: INSPECT */}
                  <motion.div 
                    className="flex flex-col items-start p-8 pt-12 rounded-2xl border border-[#D5E5EE] bg-[#F8FBFD] transition-all duration-300 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.06)] group relative"
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute -top-7 left-8 w-14 h-14 rounded-full bg-[#E1F1F9] border border-[#0B6FE8]/35 flex items-center justify-center text-[#0B6FE8] shadow-sm group-hover:bg-[#0B6FE8] group-hover:text-white transition-all duration-300">
                      <Search className="w-5 h-5 transition-transform duration-300 group-hover:scale-1.1" />
                    </div>
                    <div className="mb-3">
                      <span className="text-[11px] font-mono font-bold text-[#0B6FE8] border-b border-[#0B6FE8]/20 pb-0.5 tracking-wider">01</span>
                    </div>
                    <h3 className="text-lg font-black text-[#12324A] mb-2 uppercase tracking-wide">INSPECT</h3>
                    <p className="text-xs text-[#49677F] leading-relaxed mb-6">
                      Examine chest X-rays and make your own prediction.
                    </p>
                    
                    {/* Visual Drawing */}
                    <div className="w-full bg-white border border-[#D5E5EE] rounded-lg p-3 flex gap-3 h-28 items-center overflow-hidden">
                      <div className="w-16 h-full rounded bg-slate-900 border border-[#D5E5EE]/40 overflow-hidden relative">
                        <img src={xrayImg} alt="Thumbnail" className="w-full h-full object-cover opacity-60 contrast-125" />
                        <div className="absolute inset-0 border border-[#0B6FE8]/20" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-2">
                        <div className="h-1 bg-slate-200 rounded w-full" />
                        <div className="h-1 bg-slate-200 rounded w-[80%]" />
                        <svg className="w-full h-6 text-[#0B6FE8]/40" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M0,10 Q10,2 20,10 T40,10 T60,10 T80,10 T100,10" />
                        </svg>
                        <div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/40" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 2: INVESTIGATE */}
                  <motion.div 
                    className="flex flex-col items-start p-8 pt-12 rounded-2xl border border-[#D5E5EE] bg-[#F8FBFD] transition-all duration-300 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.06)] group relative"
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute -top-7 left-8 w-14 h-14 rounded-full bg-[#E1F1F9] border border-[#0B6FE8]/35 flex items-center justify-center text-[#0B6FE8] shadow-sm group-hover:bg-[#0B6FE8] group-hover:text-white transition-all duration-300">
                      <BarChart2 className="w-5 h-5 transition-transform duration-300 group-hover:scale-1.1" />
                    </div>
                    <div className="mb-3">
                      <span className="text-[11px] font-mono font-bold text-[#0B6FE8] border-b border-[#0B6FE8]/20 pb-0.5 tracking-wider">02</span>
                    </div>
                    <h3 className="text-lg font-black text-[#12324A] mb-2 uppercase tracking-wide">INVESTIGATE</h3>
                    <p className="text-xs text-[#49677F] leading-relaxed mb-6">
                      Compare your decisions with the model and identify its errors.
                    </p>
                    
                    {/* Visual Drawing */}
                    <div className="w-full bg-white border border-[#D5E5EE] rounded-lg p-4 flex justify-between h-28 relative overflow-hidden">
                      <div className="w-full h-full flex items-center justify-between relative">
                        <div className="absolute left-[50%] top-0 bottom-0 border-l border-dashed border-[#D5E5EE]" />
                        <div className="w-[45%] h-full relative">
                          <span className="absolute top-2 left-4 w-2 h-2 rounded-full bg-[#0B6FE8]/40" />
                          <span className="absolute top-6 left-12 w-2 h-2 rounded-full bg-[#0B6FE8]" />
                          <span className="absolute bottom-4 left-6 w-2 h-2 rounded-full bg-[#0B6FE8]/60" />
                        </div>
                        <div className="w-[45%] h-full relative">
                          <span className="absolute bottom-6 right-16 w-2 h-2 rounded-full bg-red-500/60" />
                          <span className="absolute bottom-2 right-4 w-2 h-2 rounded-full bg-red-500/40" />
                          <div className="absolute top-4 right-8 w-5 h-5 border border-red-500/60 rounded flex items-center justify-center bg-red-500/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Card 3: DECIDE */}
                  <motion.div 
                    className="flex flex-col items-start p-8 pt-12 rounded-2xl border border-[#D5E5EE] bg-[#F8FBFD] transition-all duration-300 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.06)] group relative"
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute -top-7 left-8 w-14 h-14 rounded-full bg-[#E1F1F9] border border-[#0B6FE8]/35 flex items-center justify-center text-[#0B6FE8] shadow-sm group-hover:bg-[#0B6FE8] group-hover:text-white transition-all duration-300">
                      <ShieldCheck className="w-5 h-5 transition-transform duration-300 group-hover:scale-1.1" />
                    </div>
                    <div className="mb-3">
                      <span className="text-[11px] font-mono font-bold text-[#0B6FE8] border-b border-[#0B6FE8]/20 pb-0.5 tracking-wider">03</span>
                    </div>
                    <h3 className="text-lg font-black text-[#12324A] mb-2 uppercase tracking-wide">DECIDE</h3>
                    <p className="text-xs text-[#49677F] leading-relaxed mb-6">
                      Tune the model threshold and decide whether the system should be deployed.
                    </p>
                    
                    {/* Visual Drawing */}
                    <div className="w-full bg-white border border-[#D5E5EE] rounded-lg p-3 flex flex-col justify-between h-28">
                      <div className="w-full relative mt-2">
                        <div className="h-[2px] bg-[#D5E5EE] w-full rounded relative">
                          <div className="absolute top-[-3px] left-0 bottom-[-3px] w-[1px] bg-slate-400" />
                          <div className="absolute top-[-3px] left-[50%] bottom-[-3px] w-[1px] bg-slate-400" />
                          <div className="absolute top-[-3px] right-0 bottom-[-3px] w-[1px] bg-slate-400" />
                          <div className="absolute top-[-5px] left-[50%] w-3 h-3 rounded-full bg-[#0B6FE8] border border-white shadow-sm" />
                        </div>
                        <span className="text-[8px] font-mono tracking-widest text-[#6E879A] block text-center mt-2 font-bold">THRESHOLD 0.50</span>
                      </div>
                      <div className="flex gap-2 justify-between">
                        <div className="flex-1 flex items-center justify-center gap-1 border border-success-border bg-success-soft text-success py-1 rounded text-[9px] font-bold font-mono">
                          <Check className="w-2.5 h-2.5" /> Deploy
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-1 border border-danger-border bg-danger-soft text-danger py-1 rounded text-[9px] font-bold font-mono">
                          <X className="w-2.5 h-2.5" /> Reject
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Star Role Matters Banner */}
                <div className="w-full max-w-4xl mx-auto border border-[#0B6FE8]/20 bg-[#E1F1F9]/40 rounded-2xl py-4 px-6 flex flex-col sm:flex-row items-center gap-4 text-left backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-full bg-[#E1F1F9] border border-[#0B6FE8]/25 flex items-center justify-center text-[#0B6FE8] shrink-0 shadow-sm">
                    <Star className="w-4 h-4" />
                  </div>
                  <p className="text-xs sm:text-sm text-[#49677F] leading-relaxed font-semibold">
                    <span className="text-[#12324A] font-black uppercase tracking-wide text-xs block sm:inline mr-2">Your role matters.</span>
                    <span className="mx-2 text-slate-300 hidden sm:inline">|</span>
                    <span className="text-[#49677F] block sm:inline">Your investigation helps determine if this AI system is safe for real-world clinical use.</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Student Entry Form */}
            <section id="student-entry" className="w-full border-t border-[#D5E5EE] py-20 bg-[#F2F8FC]">
              <div className="max-w-md mx-auto px-6 text-center space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#0B6FE8] block mb-2 font-mono">
                    BEGIN YOUR INVESTIGATION
                  </span>
                  <h2 className="text-3xl font-black tracking-tight text-[#12324A]">
                    Enter your details to start.
                  </h2>
                </div>

                {registrationError && (
                  <div className="bg-[#FCECEE] border border-[#F1C5CC] text-[#B84C59] text-xs p-3.5 rounded-xl font-medium text-left">
                    {registrationError}
                  </div>
                )}

                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-[#D5E5EE] rounded-xl px-4 py-3.5 text-sm text-[#12324A] placeholder-[#6E879A] focus:outline-none focus:border-[#0B6FE8] focus:ring-4 focus:ring-[#0B6FE8]/10 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Registration / Roll Number"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      className="w-full bg-white border border-[#D5E5EE] rounded-xl px-4 py-3.5 text-sm text-[#12324A] placeholder-[#6E879A] focus:outline-none focus:border-[#0B6FE8] focus:ring-4 focus:ring-[#0B6FE8]/10 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <select
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="w-full bg-white border border-[#D5E5EE] rounded-xl px-4 py-3.5 text-sm text-[#12324A] focus:outline-none focus:border-[#0B6FE8] focus:ring-4 focus:ring-[#0B6FE8]/10 transition-all font-semibold appearance-none cursor-pointer"
                    >
                      <option value="BATCH 1">BATCH 1</option>
                      <option value="BATCH 2">BATCH 2</option>
                      <option value="BATCH 3">BATCH 3</option>
                      <option value="BATCH 8">BATCH 8</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0B6FE8] hover:bg-[#0F5E9C] disabled:bg-blue-900/40 text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-lg shadow-[#0B6FE8]/10 text-xs uppercase tracking-wider"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        START INVESTIGATION
                        <ArrowRight className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>
                </form>

                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6E879A] block pt-2">
                  ONE ATTEMPT &middot; INDIVIDUAL ASSESSMENT
                </span>
              </div>
            </section>

            {/* Dark Navy Footer */}
            <footer className="w-full bg-[#062B5C] border-t border-white/10 text-white py-12 px-6">
              <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center space-y-3">
                <div className="flex items-center gap-2.5">
                  <Stethoscope className="w-5 h-5 text-[#0B6FE8]" />
                  <span className="text-sm font-bold tracking-wider">AI DOCTOR LAB</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed max-w-md">
                  Exploring the future of AI in healthcare through hands-on learning.
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  &copy; 2026 AI Doctor Lab. All rights reserved.
                </p>
              </div>
            </footer>
          </motion.div>
        )}
        {/* ==========================================
            SCREEN 2: EXISTING CASE BRIEF SCREEN
            ========================================== */}
        {screenState === 'CASE_BRIEF' && (
          <motion.div
            key="case-brief-screen"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="flex flex-col min-h-screen bg-[#F2F8FC]"
          >
            {/* Case Brief Header */}
            <motion.header
              variants={springEntrance}
              className="w-full bg-[#062B5C] text-white shadow-md sticky top-0 z-50 px-6"
            >
              <div className="max-w-7xl mx-auto flex items-center justify-between h-18">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#0B6FE8]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-base font-bold tracking-wider leading-none mb-1">AI DOCTOR LAB</span>
                    <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-medium">
                      APPLY. LEARN. SAVE LIVES.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-xs font-bold text-white/90">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/15">
                    <CalendarDays className="w-4 h-4 text-[#0B6FE8]" />
                    <span className="font-mono tracking-wider uppercase">DAY 01</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/15">
                    <Clock3 className="w-4 h-4 text-[#0B6FE8]" />
                    <span className="font-mono tracking-wider uppercase">20 MIN</span>
                  </div>
                </div>
              </div>
            </motion.header>

            {/* Main Content Area */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-16 space-y-16">
              
              {/* Introduction & X-ray column block */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                
                {/* Left side text */}
                <motion.div variants={springEntrance} className="lg:col-span-7 flex flex-col items-start text-left space-y-5">
                  <div className="inline-flex items-center gap-2 text-[#0B6FE8] font-bold tracking-widest uppercase text-[10px] font-mono bg-[#E1F1F9] border border-[#0B6FE8]/25 rounded-full px-3 py-1">
                    <Activity className="w-3.5 h-3.5 text-[#0B6FE8] animate-pulse" />
                    HOSPITAL AI INVESTIGATION
                  </div>
                  
                  {name && (
                    <span className="block text-xs font-bold text-[#6E879A] uppercase tracking-widest font-mono">
                      Welcome, {name}
                    </span>
                  )}
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#12324A] leading-tight">
                    YOUR MODEL<br />
                    <span className="text-[#0B6FE8] mt-2 block">MISSED A PATIENT.</span>
                  </h1>
                  
                  <div className="text-[#49677F] space-y-4 text-sm sm:text-base leading-relaxed max-w-xl">
                    <p>
                      Last week, the hospital's pneumonia-detection model classified a patient's chest X-ray as normal. A radiologist later identified pneumonia.
                    </p>
                    <p className="text-[#6E879A]">
                      You're joining the hospital's applied ML team to investigate what happened.
                    </p>
                  </div>
                </motion.div>

                {/* Right side X-ray preview */}
                <motion.div 
                  variants={springEntrance} 
                  className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none bg-white p-4 rounded-2xl border border-[#D5E5EE] shadow-[0_8px_30px_rgba(30,90,130,0.08)]"
                >
                  <div className="relative aspect-[4/5] bg-slate-950 rounded-xl overflow-hidden shadow-inner">
                    <img 
                      src={xrayImg} 
                      alt="Clinical Chest X-Ray Scan" 
                      className="w-full h-full object-cover opacity-80 contrast-125 brightness-90 select-none pointer-events-none"
                    />
                    
                    {/* Target region box */}
                    <div className="absolute left-[20%] top-[40%] w-[32%] h-[28%] border-2 border-dashed border-blue-500 rounded bg-blue-500/10 z-20">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border border-blue-500/40 flex items-center justify-center animate-ping" />
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                      </div>
                    </div>
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-white/60 pointer-events-none" />
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-white/60 pointer-events-none" />
                  </div>

                  {/* Info Panel under X-ray inside the card */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-left bg-[#F8FBFD] border border-[#D5E5EE] p-3 rounded-xl">
                    <div>
                      <span className="text-[8px] text-[#6E879A] uppercase tracking-wider block font-bold">AI RESULT</span>
                      <span className="text-xs font-black text-[#0B6FE8]">NORMAL</span>
                      <span className="text-[8px] text-[#6E879A] block font-mono">87% confidence</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#6E879A] uppercase tracking-wider block font-bold">ACTUAL FINDING</span>
                      <span className="text-xs font-black text-danger">PNEUMONIA</span>
                      <span className="text-[8px] text-[#6E879A] block font-mono">Radiologist Confirmed</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#6E879A] uppercase tracking-wider block font-bold">CASE ID</span>
                      <span className="text-xs font-bold text-[#12324A] block">PATIENT 001</span>
                      <span className="text-[8px] font-bold text-danger bg-[#FCECEE] border border-red-200 px-1 rounded inline-block uppercase mt-0.5">
                        MISSED CASE
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Case Objective Panel */}
              <motion.div
                variants={springEntrance}
                className="bg-white border border-[#D5E5EE] rounded-2xl p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative overflow-hidden shadow-[0_4px_18px_rgba(30,90,130,0.04)]"
              >
                <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-[#0B6FE8]" />
                
                {/* Objective details */}
                <div className="flex gap-4 items-start max-w-xl text-left">
                  <motion.div 
                    className="w-12 h-12 rounded-full border border-[#0B6FE8]/25 bg-[#E1F1F9] flex items-center justify-center text-[#0B6FE8] shrink-0 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Target className="w-5 h-5" />
                  </motion.div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-mono font-bold tracking-widest text-[#6E879A] uppercase">CASE OBJECTIVES</h3>
                    <p className="text-xs sm:text-sm text-[#49677F] leading-relaxed">
                      Investigate how the model made a mistake, understand the clinical cost of those mistakes, and decide whether the system should be trusted for deployment.
                    </p>
                  </div>
                </div>

                {/* Vertical Divider (Desktop) */}
                <div className="hidden lg:block w-[1px] h-12 bg-[#D5E5EE]" />

                {/* Information Items */}
                <div className="grid grid-cols-3 gap-6 w-full lg:w-auto shrink-0 text-center border-t border-[#D5E5EE] pt-6 lg:border-t-0 lg:pt-0">
                  <div className="flex flex-col items-center gap-2">
                    <Scan className="w-5 h-5 text-[#0B6FE8]" />
                    <span className="font-mono text-[9px] font-bold text-[#6E879A] uppercase tracking-wider">CHEST X-RAY</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-[#0B6FE8]" />
                    <span className="font-mono text-[9px] font-bold text-[#6E879A] uppercase tracking-wider">DETECTION MODEL</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <UserRoundCheck className="w-5 h-5 text-[#0B6FE8]" />
                    <span className="font-mono text-[9px] font-bold text-[#6E879A] uppercase tracking-wider">HUMAN + AI DECISION</span>
                  </div>
                </div>
              </motion.div>

              {/* Your Mission */}
              <motion.div variants={springEntrance} className="space-y-10">
                <div className="text-left flex gap-3 items-center">
                  <div className="w-9 h-9 bg-[#E1F1F9] border border-[#0B6FE8]/25 text-[#0B6FE8] rounded-lg flex items-center justify-center">
                    <Route className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-[#12324A] uppercase leading-none mb-1.5">YOUR MISSION</h2>
                    <p className="text-xs text-[#6E879A] uppercase tracking-wider font-mono leading-none">
                      <span className="text-[#0B6FE8] font-bold">Follow the investigation</span> from image &rarr; model &rarr; decision.
                    </p>
                  </div>
                </div>

                {/* Stages Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 relative">
                  {/* Connected line horizontal */}
                  <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-[1px] bg-[#D5E5EE] -z-10" />

                  {/* Stage 01 */}
                  <motion.div 
                    className="flex flex-col items-start text-left p-6 rounded-2xl border border-[#D5E5EE] bg-white transition-all duration-300 group hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.06)]"
                    whileHover={{ y: -4 }}
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <span className="text-xs font-mono font-bold text-[#0B6FE8] bg-[#E1F1F9] border border-[#0B6FE8]/25 px-2.5 py-0.5 rounded">01</span>
                      <span className="text-xs font-bold text-[#12324A] uppercase tracking-wider">INSPECT</span>
                    </div>
                    <div className="flex gap-3.5 items-start mt-2">
                      <div className="p-2 bg-[#E1F1F9] border border-[#0B6FE8]/25 text-[#0B6FE8] rounded-lg shrink-0 group-hover:bg-[#0B6FE8] group-hover:text-white transition-colors duration-300">
                        <ScanSearch className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-[#49677F] leading-relaxed pt-0.5">
                        Look at chest X-rays yourself and make a prediction before seeing the AI's answer.
                      </p>
                    </div>
                  </motion.div>

                  {/* Stage 02 */}
                  <motion.div 
                    className="flex flex-col items-start text-left p-6 rounded-2xl border border-[#D5E5EE] bg-white transition-all duration-300 group hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.06)]"
                    whileHover={{ y: -4 }}
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <span className="text-xs font-mono font-bold text-[#0B6FE8] bg-[#E1F1F9] border border-[#0B6FE8]/25 px-2.5 py-0.5 rounded">02</span>
                      <span className="text-xs font-bold text-[#12324A] uppercase tracking-wider">INVESTIGATE</span>
                    </div>
                    <div className="flex gap-3.5 items-start mt-2">
                      <div className="p-2 bg-[#E1F1F9] border border-[#0B6FE8]/25 text-[#0B6FE8] rounded-lg shrink-0 group-hover:bg-[#0B6FE8] group-hover:text-white transition-colors duration-300">
                        <ChartNoAxesCombined className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-[#49677F] leading-relaxed pt-0.5">
                        Compare your decisions with the model and understand its false positives and false negatives.
                      </p>
                    </div>
                  </motion.div>

                  {/* Stage 03 */}
                  <motion.div 
                    className="flex flex-col items-start text-left p-6 rounded-2xl border border-[#D5E5EE] bg-white transition-all duration-300 group hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.06)]"
                    whileHover={{ y: -4 }}
                  >
                    <div className="flex items-center justify-between w-full mb-4">
                      <span className="text-xs font-mono font-bold text-[#0B6FE8] bg-[#E1F1F9] border border-[#0B6FE8]/25 px-2.5 py-0.5 rounded">03</span>
                      <span className="text-xs font-bold text-[#12324A] uppercase tracking-wider">DECIDE</span>
                    </div>
                    <div className="flex gap-3.5 items-start mt-2">
                      <div className="p-2 bg-[#E1F1F9] border border-[#0B6FE8]/25 text-[#0B6FE8] rounded-lg shrink-0 group-hover:bg-[#0B6FE8] group-hover:text-white transition-colors duration-300">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-[#49677F] leading-relaxed pt-0.5">
                        Adjust the model's threshold, evaluate its performance, and decide whether it should be deployed.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Why This Matters */}
              <motion.div variants={springEntrance} className="space-y-6 pt-4">
                <div className="text-left flex gap-3 items-center">
                  <div className="w-9 h-9 bg-[#E1F1F9] border border-[#0B6FE8]/25 text-[#0B6FE8] rounded-lg flex items-center justify-center">
                    <CircleAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-[#12324A] uppercase leading-none mb-1.5">WHY THIS MATTERS</h2>
                    <p className="text-xs text-[#6E879A] uppercase tracking-wider font-mono leading-none">
                      In medicine, AI's wrong choice isn't just a data point. The type of mistake matters.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* False Positive card */}
                  <motion.div 
                    className="flex gap-4 p-5 rounded-2xl border border-[#D5E5EE] bg-white items-center text-left transition-all duration-300 hover:border-red-300 hover:bg-[#FCECEE] group cursor-default"
                    whileHover={{ y: -2 }}
                  >
                    <div className="p-2.5 bg-[#FCECEE] border border-red-200 text-danger rounded-xl shrink-0">
                      <CircleX className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#12324A] uppercase tracking-wider mb-1 font-mono">FALSE POSITIVE</h4>
                      <p className="text-xs text-[#49677F]">Healthy patient flagged as positive.</p>
                    </div>
                  </motion.div>

                  {/* False Negative card (More prominent as it is central to investigation) */}
                  <motion.div 
                    className="flex gap-4 p-5 rounded-2xl border-2 border-red-350 bg-[#FCECEE] items-center text-left transition-all duration-300 hover:border-red-400 group cursor-default shadow-sm"
                    whileHover={{ y: -2 }}
                  >
                    <div className="p-2.5 bg-red-500 text-white rounded-xl shrink-0 shadow-sm animate-pulse">
                      <TriangleAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-danger uppercase tracking-wider mb-1 font-mono">FALSE NEGATIVE (CRITICAL)</h4>
                      <p className="text-xs text-danger font-semibold">Sick patient classified as normal.</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Educational Simulation Box */}
              <motion.div 
                variants={springEntrance}
                className="flex items-center gap-4 max-w-4xl w-full mx-auto border border-[#D5E5EE] bg-white py-5 px-6 rounded-2xl text-left relative overflow-hidden transition-all duration-300 hover:border-[#BCD4E3] shadow-sm"
              >
                <div className="w-10 h-10 rounded-full border border-[#0B6FE8]/25 bg-[#E1F1F9] flex items-center justify-center text-[#0B6FE8] shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="text-xs leading-relaxed text-[#49677F] relative z-10">
                  <span className="font-bold text-[#0B6FE8] block mb-0.5 uppercase font-mono tracking-wider text-[10px]">EDUCATIONAL SIMULATION</span>
                  This experience uses de-identified public medical imaging for educational purposes. It is not intended for clinical diagnosis.
                </div>
              </motion.div>

              {/* Primary CTA */}
              <motion.div variants={springEntrance} className="flex flex-col items-center gap-4 pt-6 pb-12">
                <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-[#6E879A] uppercase">
                  READY TO INVESTIGATE?
                </div>
                
                <motion.button
                  onClick={() => setScreenState('XRAY_INVESTIGATION')}
                  className="group relative flex items-center gap-2.5 bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white font-extrabold px-12 py-4.5 rounded-xl shadow-lg shadow-[#0B6FE8]/10 cursor-pointer overflow-hidden text-xs uppercase tracking-wider"
                  whileHover={{ y: -2, boxShadow: "0 12px 20px rgba(11,111,232,0.2)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10 font-bold">BEGIN X-RAY INVESTIGATION</span>
                  <ArrowRight className="w-4.5 h-4.5 relative z-10 transition-transform duration-300 group-hover:translate-x-1.5" />
                </motion.button>
              </motion.div>
            </div>

            {/* Footer */}
            <footer className="w-full border-t border-slate-950 bg-surface py-8 mt-auto">
              <div className="max-w-7xl mx-auto px-6 text-center">
                <span className="text-xs font-semibold tracking-wider text-slate-500 block mb-2">
                  AI Doctor Lab &middot; Educational Simulation
                </span>
              </div>
            </footer>
          </motion.div>
        )}

        {/* ==========================================
            SCREEN 3: X-RAY INVESTIGATION SCREEN (REFINED & INTERACTIVE)
            ========================================== */}
        {screenState === 'XRAY_INVESTIGATION' && (
          <motion.div
            key="xray-investigation-screen"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="flex flex-col min-h-screen bg-[#F2F8FC]"
          >
            {/* Header */}
            <motion.header
              variants={springEntrance}
              className="w-full bg-[#062B5C] text-white shadow-md sticky top-0 z-50 px-6"
            >
              <div className="max-w-7xl mx-auto flex items-center justify-between h-18">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#0B6FE8]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-base font-bold tracking-wider leading-none mb-1">AI DOCTOR LAB</span>
                    <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-medium">
                      APPLY. LEARN. SAVE LIVES.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-xs font-bold text-white/90">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/15">
                    <CalendarDays className="w-4 h-4 text-[#0B6FE8]" />
                    <span className="font-mono tracking-wider uppercase">DAY 01</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/15">
                    <Clock3 className="w-4 h-4 text-[#0B6FE8]" />
                    <span className="font-mono tracking-wider uppercase">20 MIN</span>
                  </div>
                </div>
              </div>
            </motion.header>

            {/* Progress Bar Container */}
            <motion.div 
              variants={springEntrance}
              className="w-full bg-white border-b border-[#D5E5EE] py-4"
            >
              <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <ScanSearch className="w-5 h-5 text-[#0B6FE8]" />
                  <span className="text-xs font-mono font-bold tracking-widest text-[#12324A] uppercase">X-RAY INVESTIGATION</span>
                </div>
                
                {/* Multi-node progress line (01 - 02 - 03 - 04 - 05) */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold text-[#6E879A] uppercase tracking-wider">
                      CASE {String(currentCaseIndex + 1).padStart(2, '0')} OF 05
                    </span>
                    
                    {/* Node line */}
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <div className={`w-3.5 h-[1.5px] ${currentCaseIndex >= idx ? 'bg-[#0B6FE8]' : 'bg-[#D5E5EE]'}`} />}
                          <div 
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              currentCaseIndex === idx 
                                ? 'bg-[#0B6FE8] ring-4 ring-[#0B6FE8]/20' 
                                : currentCaseIndex > idx 
                                  ? 'bg-[#0B6FE8]' 
                                  : 'bg-[#D5E5EE]'
                            }`}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#0B6FE8] bg-[#E1F1F9] px-2 py-0.5 rounded border border-[#0B6FE8]/20">
                    {currentCaseIndex + 1} / 5
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Subtle "Blind" Concept Label near top of workspace */}
            <motion.div 
              variants={springEntrance}
              className="max-w-7xl w-full mx-auto px-6 pt-6 text-left"
            >
              <div className="inline-flex items-center gap-3 p-4 rounded-xl border border-[#D5E5EE] bg-white shadow-sm w-full">
                <div className="w-8 h-8 rounded-lg bg-[#E1F1F9] border border-[#0B6FE8]/25 flex items-center justify-center text-[#0B6FE8]">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[#12324A] uppercase tracking-wider font-mono">BLIND ASSESSMENT</span>
                  <span className="text-xs text-[#49677F]">Your prediction is recorded before the AI's output is revealed.</span>
                </div>
              </div>
            </motion.div>

            {/* Main Interactive Grid */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 md:py-8 flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch justify-center">
              
              {/* Left Column: X-ray viewer */}
              <motion.div 
                variants={springEntrance}
                className="flex-1 flex flex-col gap-4 min-w-0"
              >
                {/* Clinical Controls Header */}
                <div className="bg-white border border-[#D5E5EE] rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2 px-1 text-[#12324A]">
                    <span className="text-[10px] font-mono font-bold text-[#6E879A] uppercase tracking-wider">CASE {String(currentCaseIndex + 1).padStart(2, '0')}</span>
                    <span className="text-[#D5E5EE] font-bold">|</span>
                    <span className="text-[10px] font-mono font-bold text-[#0B6FE8] uppercase tracking-wider">CHEST X-RAY VIEWER</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      type="button"
                      onClick={handleZoomOut}
                      className="p-1.5 bg-white border border-[#D5E5EE] hover:border-[#0B6FE8] text-[#12324A] hover:text-[#0B6FE8] rounded transition-colors cursor-pointer"
                      title="Zoom Out"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ZoomIn className="w-4 h-4 rotate-180" />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleZoomIn}
                      className="p-1.5 bg-white border border-[#D5E5EE] hover:border-[#0B6FE8] text-[#12324A] hover:text-[#0B6FE8] rounded transition-colors cursor-pointer"
                      title="Zoom In"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleResetZoom}
                      className="p-1.5 bg-white border border-[#D5E5EE] hover:border-[#0B6FE8] text-[#12324A] hover:text-[#0B6FE8] rounded transition-colors cursor-pointer"
                      title="Reset Zoom"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      type="button"
                      className="p-1.5 bg-white border border-[#D5E5EE] hover:border-[#0B6FE8] text-[#12324A] hover:text-[#0B6FE8] rounded transition-colors cursor-pointer"
                      title="Toggle Fullscreen"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* X-ray Film Container */}
                <div className="relative aspect-[4/5] max-h-[460px] md:max-h-[480px] w-full bg-[#062B5C] p-4 rounded-2xl border-4 border-[#062B5C] overflow-hidden shadow-lg mx-auto flex items-center justify-center">
                  <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-white/40 pointer-events-none z-20" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-white/40 pointer-events-none z-20" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-white/40 pointer-events-none z-20" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-white/40 pointer-events-none z-20" />

                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:6px_6px] pointer-events-none z-10" />

                  <div className="w-full h-full overflow-hidden flex items-center justify-center rounded-lg">
                    <img 
                      src={imageError ? xrayImg : currentCase.imagePath} 
                      alt="Clinical Chest X-Ray Specimen" 
                      onError={() => setImageError(true)}
                      style={{ 
                        transform: `scale(${zoom})`, 
                        transformOrigin: 'center', 
                        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' 
                      }}
                      className="w-full h-full object-cover opacity-85 contrast-125 brightness-95 select-none pointer-events-none"
                    />
                  </div>

                  <div className="absolute left-6 right-6 top-6 bottom-6 border border-dashed border-blue-500/10 pointer-events-none z-20">
                    <div className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t border-l border-primary/30" />
                    <div className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t border-r border-primary/30" />
                    <div className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b border-l border-primary/30" />
                    <div className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b border-r border-primary/30" />
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Prediction Decision Workspace */}
              <motion.div 
                variants={springEntrance}
                className="w-full lg:w-[420px] flex flex-col justify-between border border-[#D5E5EE] bg-white rounded-2xl p-6 md:p-7 shrink-0 space-y-6 shadow-sm"
              >
                <form onSubmit={handleSubmitPrediction} className="space-y-6 text-left flex flex-col justify-between h-full">
                  
                  {/* Step 1: Decision Selection */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2 text-[#6E879A]">
                      <Target className="w-4 h-4 text-[#0B6FE8] animate-pulse" />
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase">YOUR PREDICTION</span>
                    </div>
                    
                    <h3 className="text-base font-bold text-[#12324A]">What do you think this X-ray shows?</h3>
                    <p className="text-xs text-[#6E879A] leading-none">Make your assessment before seeing the AI's decision.</p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Pneumonia Option */}
                      <motion.button
                        type="button"
                        onClick={() => handlePredictionSelect('PNEUMONIA')}
                        className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                          currentStudentPrediction.prediction === 'PNEUMONIA'
                            ? 'border-[#0B6FE8] bg-[#E1F1F9] text-[#0B6FE8] shadow-sm font-bold'
                            : 'border-[#D5E5EE] bg-white hover:border-[#0B6FE8] text-[#49677F]'
                        }`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <Lungs className="w-5 h-5 text-[#0B6FE8]" />
                          {currentStudentPrediction.prediction === 'PNEUMONIA' && <Check className="w-4.5 h-4.5 text-[#0B6FE8]" />}
                        </div>
                        <span className="text-xs font-bold text-[#12324A] tracking-wide uppercase block">PNEUMONIA</span>
                        <span className="text-[10px] text-[#6E879A] leading-snug mt-1 block">Findings suggest pneumonia.</span>
                      </motion.button>

                      {/* Normal Option */}
                      <motion.button
                        type="button"
                        onClick={() => handlePredictionSelect('NORMAL')}
                        className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                          currentStudentPrediction.prediction === 'NORMAL'
                            ? 'border-[#0B6FE8] bg-[#E1F1F9] text-[#0B6FE8] shadow-sm font-bold'
                            : 'border-[#D5E5EE] bg-white hover:border-[#0B6FE8] text-[#49677F]'
                        }`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <CircleCheck className="w-5 h-5 text-[#0B6FE8]" />
                          {currentStudentPrediction.prediction === 'NORMAL' && <Check className="w-4.5 h-4.5 text-[#0B6FE8]" />}
                        </div>
                        <span className="text-xs font-bold text-[#12324A] tracking-wide uppercase block">NORMAL</span>
                        <span className="text-[10px] text-[#6E879A] leading-snug mt-1 block">No obvious pneumonia.</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Step 2: Confidence slider */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-[#6E879A]">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-3.5 h-3.5 text-[#0B6FE8]" />
                        <span className="text-[10px] font-mono font-bold tracking-widest uppercase">YOUR CONFIDENCE</span>
                      </div>
                      <span className="text-xl font-black text-[#0B6FE8]">
                        {currentStudentPrediction.confidence}%
                      </span>
                    </div>
                    
                    <p className="text-xs text-[#6E879A] leading-normal">How certain are you about your prediction?</p>

                    <div className="space-y-2">
                      <input 
                        type="range"
                        min="50"
                        max="100"
                        value={currentStudentPrediction.confidence}
                        onChange={(e) => handleConfidenceChange(Number(e.target.value))}
                        className="w-full h-1 bg-[#D5E5EE] rounded-lg appearance-none cursor-pointer accent-[#0B6FE8]"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-[#6E879A]">
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Optional Observation Note */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-[#6E879A]">
                      <MessageSquareText className="w-3.5 h-3.5 text-[#0B6FE8]" />
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase">OPTIONAL OBSERVATION</span>
                    </div>
                    <p className="text-xs text-[#6E879A] leading-none">What made this case difficult?</p>
                    <textarea
                      placeholder="Briefly describe what made you uncertain..."
                      value={currentStudentPrediction.note}
                      maxLength={150}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      className="w-full h-14 bg-white border border-[#D5E5EE] hover:border-[#0B6FE8] rounded-xl p-2.5 text-xs text-[#12324A] placeholder-text-muted focus:outline-none focus:border-[#0B6FE8]/50 resize-none transition-colors"
                    />
                    <div className="flex justify-end text-[9px] font-mono text-[#6E879A]">
                      <span>{currentStudentPrediction.note.length} / 150</span>
                    </div>
                  </div>

                  {/* Step 4: Decision Summary Card */}
                  <div className="border border-[#D5E5EE] bg-[#F8FBFD] rounded-xl p-3 text-xs space-y-1">
                    <span className="text-[9px] font-mono text-[#6E879A] uppercase tracking-widest block font-bold">YOUR DECISION</span>
                    {currentStudentPrediction.prediction ? (
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0B6FE8] capitalize">{currentStudentPrediction.prediction.toLowerCase()}</span>
                        <span className="text-[#6E879A] font-mono font-bold">{currentStudentPrediction.confidence}% CONFIDENCE</span>
                      </div>
                    ) : (
                      <span className="text-[#6E879A] italic block font-medium">WAITING FOR PREDICTION</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={!currentStudentPrediction.prediction}
                    className={`w-full flex items-center justify-center gap-2.5 font-extrabold py-4 rounded-xl shadow-md cursor-pointer overflow-hidden transition-all duration-300 group mt-4 text-xs uppercase tracking-wider ${
                      currentStudentPrediction.prediction 
                        ? 'bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white shadow-[#0B6FE8]/10' 
                        : 'bg-[#D5E5EE] text-[#6E879A] shadow-none cursor-not-allowed'
                    }`}
                    whileHover={currentStudentPrediction.prediction ? { scale: 1.01 } : {}}
                    whileTap={currentStudentPrediction.prediction ? { scale: 0.99 } : {}}
                  >
                    <span className="font-bold">SUBMIT PREDICTION</span>
                    <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </motion.button>
                </form>
              </motion.div>
            </div>

            {/* Footer */}
            <footer className="w-full bg-[#062B5C] text-white py-8 mt-auto px-6">
              <div className="max-w-7xl mx-auto text-center flex flex-col sm:flex-row justify-between items-center gap-2">
                <span className="text-sm font-bold tracking-wider">AI DOCTOR LAB</span>
                <span className="text-xs text-slate-300">
                  Educational Simulation &middot; Medical AI Research Dashboard
                </span>
              </div>
            </footer>
          </motion.div>
        )}

        {/* ==========================================
            SCREEN 4: REFINED CASE RESULT REVEAL SCREEN
            ========================================== */}
        {screenState === 'CASE_RESULT' && (
          <motion.div
            key="case-result-screen"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="flex flex-col min-h-screen bg-[#F2F8FC]"
          >
            {/* Header */}
            <motion.header
              variants={springEntrance}
              className="w-full bg-[#062B5C] text-white shadow-md sticky top-0 z-50 px-6"
            >
              <div className="max-w-7xl mx-auto flex items-center justify-between h-18">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#0B6FE8]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-base font-bold tracking-wider leading-none mb-1">AI DOCTOR LAB</span>
                    <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-medium">
                      APPLY. LEARN. SAVE LIVES.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-xs font-bold text-white/90">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/15">
                    <CalendarDays className="w-4 h-4 text-[#0B6FE8]" />
                    <span className="font-mono tracking-wider uppercase">DAY 01</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/15">
                    <Clock3 className="w-4 h-4 text-[#0B6FE8]" />
                    <span className="font-mono tracking-wider uppercase">20 MIN</span>
                  </div>
                </div>
              </div>
            </motion.header>

            {/* Main Content container */}
            <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 md:py-12 space-y-10">
              
              {/* Dynamic Result Header Hero */}
              <motion.div 
                variants={springEntrance} 
                className="text-center space-y-4 max-w-2xl mx-auto"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="inline-flex items-center gap-2 text-[#0B6FE8] font-bold tracking-widest text-[10px] font-mono bg-[#E1F1F9] border border-[#0B6FE8]/25 rounded-full px-3 py-1">
                  <FileCheck2 className="w-4 h-4 text-[#0B6FE8]" />
                  CASE RESULT
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight text-[#12324A] uppercase leading-none">
                  {currentStudentPrediction.prediction === currentCase.actualLabel ? (
                    <span>YOUR PREDICTION <span className="text-[#00A86B]">CORRECT.</span></span>
                  ) : (
                    <span>YOUR PREDICTION <span className="text-danger">MISSED.</span></span>
                  )}
                </h1>
                
                <p className="text-sm md:text-base text-[#49677F]">
                  Now compare your judgment with the model.
                </p>

                <div className="inline-flex items-center gap-2 text-[10px] font-mono text-[#6E879A] uppercase tracking-widest pt-1">
                  <Eye className="w-3.5 h-3.5 text-[#0B6FE8]" />
                  <span>CASE 0{currentCaseIndex + 1} &middot; BLIND PREDICTION REVEALED</span>
                </div>
              </motion.div>

              {/* Case Comparison (3 Columns Layout with arrow connectors) */}
              <motion.div 
                variants={springEntrance} 
                className="flex flex-col md:flex-row items-stretch justify-between gap-4 md:gap-2"
              >
                {/* Column 1: Student Prediction */}
                <motion.div 
                  className="flex-1 bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left flex flex-col justify-between shadow-sm min-h-[140px] transition-all duration-300 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.04)]"
                  whileHover={{ y: -3 }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#6E879A]">
                      <UserRound className="w-4 h-4 text-[#0B6FE8]" />
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase">YOUR PREDICTION</span>
                    </div>
                    <div className="text-2xl font-black text-[#12324A] tracking-wide uppercase font-mono">
                      {currentStudentPrediction.prediction}
                    </div>
                  </div>
                  <div className="text-xs text-[#6E879A] font-mono mt-4 pt-3 border-t border-[#D5E5EE] flex items-center justify-between font-bold">
                    <span>CONFIDENCE</span>
                    <span className="text-[#0B6FE8] font-black text-sm">{currentStudentPrediction.confidence}%</span>
                  </div>
                </motion.div>

                {/* Desktop Arrow Connector */}
                <div className="hidden md:flex items-center justify-center px-2 text-[#BCD4E3]">
                  <ArrowRight className="w-5 h-5" />
                </div>
                {/* Mobile visual connection line */}
                <div className="md:hidden flex justify-center py-1">
                  <div className="w-[1px] h-4 border-l border-dashed border-[#D5E5EE]" />
                </div>

                {/* Column 2: Ground Truth Actual Label */}
                <motion.div 
                  className="flex-1 bg-[#F0FAF6] border border-[#A7F3D0] rounded-2xl p-6 text-left flex flex-col justify-between shadow-sm relative overflow-hidden min-h-[140px] transition-all duration-300 hover:border-[#00A86B] hover:shadow-[0_8px_24px_rgba(0,168,107,0.04)]"
                  whileHover={{ y: -3 }}
                >
                  <div className="absolute right-0 top-0 bottom-0 flex items-center opacity-[0.02]">
                    <BadgeCheck className="w-20 h-20 text-[#00A86B]" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-2 text-[#00A86B] font-bold">
                      <BadgeCheck className="w-4.5 h-4.5 text-[#00A86B]" />
                      <span className="text-[10px] font-mono tracking-widest uppercase">ACTUAL LABEL</span>
                    </div>
                    <div className="text-3xl font-black text-[#00A86B] tracking-wide uppercase font-mono">
                      {currentCase.actualLabel}
                    </div>
                  </div>
                  <div className="text-[10px] text-[#00A86B] font-mono mt-4 pt-3 border-t border-[#A7F3D0] uppercase tracking-wider relative z-10 font-bold">
                    GROUND TRUTH REFERENT
                  </div>
                </motion.div>

                {/* Desktop Arrow Connector */}
                <div className="hidden md:flex items-center justify-center px-2 text-[#BCD4E3]">
                  <ArrowRight className="w-5 h-5" />
                </div>
                {/* Mobile visual connection line */}
                <div className="md:hidden flex justify-center py-1">
                  <div className="w-[1px] h-4 border-l border-dashed border-[#D5E5EE]" />
                </div>

                {/* Column 3: AI prediction */}
                <motion.div 
                  className="flex-1 bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left flex flex-col justify-between shadow-sm min-h-[160px] transition-all duration-300 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.04)]"
                  whileHover={{ y: -3 }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#6E879A]">
                      <BrainCircuit className="w-4 h-4 text-[#0B6FE8]" />
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase">AI PREDICTION</span>
                    </div>
                    <div className="text-2xl font-black text-[#12324A] tracking-wide uppercase font-mono">
                      {aiPrediction}
                    </div>
                  </div>
                  <div className="text-[10px] text-[#6E879A] font-mono mt-4 pt-3 border-t border-[#D5E5EE] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-wider font-bold">MODEL PNEUMONIA SCORE</span>
                      <span className="text-[#0B6FE8] font-black text-sm">{(currentCase.modelProbability * 100).toFixed(2)}%</span>
                    </div>
                    <p className="text-[9px] text-[#6E879A] leading-relaxed normal-case font-sans">
                      Model pneumonia score from the pretrained research model. This is an educational demonstration, not a clinical diagnosis.
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Agreement Indicators immediately underneath */}
              <motion.div 
                variants={springEntrance}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-[#D5E5EE] bg-white rounded-2xl p-4 text-left text-xs transition-colors hover:border-[#BCD4E3] shadow-sm"
              >
                <div className="flex items-center justify-between sm:justify-start gap-3 px-2 py-1">
                  <span className="text-[#6E879A] font-mono text-[10px] uppercase tracking-wider w-24 font-bold">YOUR RESULT:</span>
                  {currentStudentPrediction.prediction === currentCase.actualLabel ? (
                    <span className="text-[#00A86B] font-extrabold flex items-center gap-1.5 bg-[#F0FAF6] border border-[#A7F3D0] px-3 py-1 rounded-full text-[10px]">
                      <CircleCheck className="w-3.5 h-3.5" /> CORRECT
                    </span>
                  ) : (
                    <span className="text-danger font-extrabold flex items-center gap-1.5 bg-[#FCECEE] border border-red-200 px-3 py-1 rounded-full text-[10px]">
                      <CircleX className="w-3.5 h-3.5" /> {currentStudentPrediction.prediction === 'NORMAL' ? 'FALSE NEGATIVE' : 'FALSE POSITIVE'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3 px-2 py-1 sm:border-l sm:border-[#D5E5EE]">
                  <span className="text-[#6E879A] font-mono text-[10px] uppercase tracking-wider w-24 font-bold">AI RESULT:</span>
                  {aiPrediction === currentCase.actualLabel ? (
                    <span className="text-[#00A86B] font-extrabold flex items-center gap-1.5 bg-[#F0FAF6] border border-[#A7F3D0] px-3 py-1 rounded-full text-[10px]">
                      <CircleCheck className="w-3.5 h-3.5" /> CORRECT
                    </span>
                  ) : (
                    <span className="text-danger font-extrabold flex items-center gap-1.5 bg-[#FCECEE] border border-red-200 px-3 py-1 rounded-full text-[10px]">
                      <CircleX className="w-3.5 h-3.5" /> {aiPrediction === 'NORMAL' ? 'FALSE NEGATIVE' : 'FALSE POSITIVE'}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Error Classification Panel */}
              {resultDetails && (
                <motion.div 
                  variants={springEntrance}
                  className={`border rounded-2xl p-6 text-left flex flex-col gap-4 transition-all duration-300 ${
                    currentStudentPrediction.prediction === currentCase.actualLabel
                      ? 'border-[#A7F3D0] bg-[#F0FAF6] text-[#00A86B]'
                      : 'border-red-200 bg-[#FCECEE] text-danger'
                  } shadow-sm`}
                  whileHover={{ scale: 1.005 }}
                >
                  <div className="flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${currentStudentPrediction.prediction === currentCase.actualLabel ? 'text-[#00A86B]' : 'text-danger'}`} />
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase">WHAT HAPPENED?</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className={`p-2.5 rounded-xl border shrink-0 bg-white ${
                        currentStudentPrediction.prediction === currentCase.actualLabel
                          ? 'border-[#A7F3D0] text-[#00A86B]'
                          : 'border-red-200 text-danger'
                      }`}>
                        {currentStudentPrediction.prediction === currentCase.actualLabel ? (
                          <CircleCheck className="w-6 h-6" />
                        ) : (
                          <CircleX className="w-6 h-6" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xl md:text-2xl font-black tracking-wide uppercase font-mono">
                          {currentStudentPrediction.prediction === currentCase.actualLabel 
                            ? 'CORRECT PREDICTION' 
                            : currentStudentPrediction.prediction === 'NORMAL' 
                              ? 'FALSE NEGATIVE' 
                              : 'FALSE POSITIVE'
                          }
                        </h4>
                        <p className="text-xs leading-normal">
                          {currentStudentPrediction.prediction === currentCase.actualLabel 
                            ? 'Your prediction correctly matches the ground truth label.' 
                            : currentStudentPrediction.prediction === 'NORMAL' 
                              ? 'Sick patient classified as normal. This could delay treatment.' 
                              : 'Healthy patient flagged as positive. This might lead to unnecessary concern.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Clinical Significance Explanation & Observation side by side on desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left block: Clinical Significance & Observation */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Clinical Significance */}
                  {resultDetails && (
                    <motion.div 
                      variants={springEntrance}
                      className="bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left space-y-4 transition-all duration-300 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.04)] shadow-sm"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center gap-2 text-[#6E879A]">
                        <Stethoscope className="w-4 h-4 text-[#0B6FE8]" />
                        <span className="text-[10px] font-mono font-bold tracking-widest uppercase">WHY IT MATTERS</span>
                      </div>
                      <p className="text-sm md:text-base text-[#49677F] leading-relaxed">
                        {resultDetails.clinical}
                      </p>
                    </motion.div>
                  )}

                  {/* Student Observation */}
                  <motion.div 
                    variants={springEntrance}
                    className="bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left space-y-3 transition-all duration-300 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.04)] shadow-sm"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center gap-2 text-[#6E879A]">
                      <MessageSquareText className="w-4 h-4 text-[#0B6FE8]" />
                      <span className="text-[10px] font-mono font-bold tracking-widest uppercase">YOUR OBSERVATION</span>
                    </div>
                    <blockquote className="text-sm text-[#49677F] italic pl-1 leading-relaxed">
                      {currentStudentPrediction.note.trim() 
                        ? `"${currentStudentPrediction.note}"` 
                        : "No observation recorded."}
                    </blockquote>
                  </motion.div>
                </div>

                {/* Right block: Key Lesson Panel */}
                {resultDetails && (
                  <motion.div 
                    variants={springEntrance}
                    className="lg:col-span-5 bg-white border border-[#D5E5EE] rounded-2xl p-6 flex flex-col gap-4 text-left items-start min-h-[220px] relative overflow-hidden transition-all duration-350 hover:border-[#0B6FE8] hover:shadow-[0_8px_24px_rgba(11,111,232,0.04)] shadow-sm"
                    whileHover={{ scale: 1.015, y: -2 }}
                  >
                    <div className="absolute right-4 bottom-4 opacity-[0.02] text-[#6E879A]">
                      <Lightbulb className="w-28 h-28" />
                    </div>
                    <div className="p-2.5 bg-[#E1F1F9] border border-[#0B6FE8]/20 text-[#0B6FE8] rounded shrink-0 relative z-10">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="relative z-10 space-y-2">
                      <h5 className="text-[10px] font-mono font-bold tracking-wider text-[#6E879A] uppercase">
                        KEY INSIGHT
                      </h5>
                      <p className="text-sm text-[#49677F] leading-relaxed">
                        {resultDetails.lesson}
                      </p>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Model Source Educational Transparency Panel */}
              <motion.div 
                variants={springEntrance}
                className="bg-white border border-[#D5E5EE] rounded-2xl p-5 text-left space-y-2.5 transition-colors hover:border-[#BCD4E3] shadow-sm"
              >
                <div className="flex items-center gap-2 text-[#6E879A]">
                  <BrainCircuit className="w-4 h-4 text-[#0B6FE8]" />
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase">MODEL NOTICE</span>
                </div>
                <div className="text-xs text-[#49677F] space-y-1.5 leading-relaxed">
                  <p>
                    <span className="text-[#12324A] font-bold">Pretrained TorchXRayVision DenseNet-121 research model.</span>
                  </p>
                  <p className="text-[#6E879A]">
                    AI-generated predictions are experimental and shown for educational purposes only. They should not be interpreted as clinical diagnosis.
                  </p>
                </div>
              </motion.div>

              {/* Case Progress Dots */}
              <motion.div 
                variants={springEntrance}
                className="flex flex-col items-center gap-2 pt-6"
              >
                <span className="text-[9px] font-mono font-bold text-[#6E879A] uppercase tracking-widest">
                  CASE 0{currentCaseIndex + 1} OF 05
                </span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <motion.div 
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-200 ${
                        currentCaseIndex === idx 
                          ? 'bg-[#0B6FE8] shadow-sm scale-110' 
                          : currentCaseIndex > idx 
                            ? 'bg-[#0B6FE8]/60' 
                            : 'bg-[#D5E5EE]'
                      }`} 
                      whileHover={{ scale: 1.25 }} 
                    />
                  ))}
                </div>
              </motion.div>

              {/* Next Action Footer block */}
              <motion.div 
                variants={springEntrance}
                className="flex flex-col items-center gap-4 pt-2 pb-10"
              >
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-widest text-[#6E879A] uppercase leading-none">
                  <span>CASE 0{currentCaseIndex + 1} COMPLETE</span>
                </div>
                
                <button
                  onClick={handleContinueNext}
                  className="group flex items-center gap-2.5 bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white font-extrabold px-12 py-4.5 rounded-xl shadow-lg shadow-[#0B6FE8]/10 cursor-pointer transition-all duration-300 w-full sm:w-auto text-center justify-center text-xs uppercase tracking-wider"
                >
                  <span className="font-bold">
                    {currentCaseIndex < 4 ? `CONTINUE TO CASE 0${currentCaseIndex + 2}` : "CONTINUE TO MODEL ANALYSIS"}
                  </span>
                  <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1.5" />
                </button>
              </motion.div>

            </div>

            {/* Footer */}
            <footer className="w-full bg-[#062B5C] text-white py-8 mt-auto px-6">
              <div className="max-w-7xl mx-auto text-center flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                <span className="font-bold tracking-wider">AI DOCTOR LAB &middot; Educational Simulation</span>
                <span className="text-slate-300">
                  For educational use only &middot; Not intended for clinical diagnosis.
                </span>
              </div>
            </footer>
          </motion.div>
        )}

        {screenState === 'MODEL_PREDICTION' && (
          <ModelPredictionScreen
            xrayCases={apiCases}
            predictions={predictions}
            studentName={name || 'Aarav Kumar'}
            studentRoll={regNumber || '24CS1001'}
            onFinish={async (finalThreshold) => {
              if (sessionId) {
                // Save model_evaluations
                const evaluations = apiCases.map(c => ({
                  session_id: sessionId,
                  case_id: c.caseId,
                  actual_label: c.actualLabel,
                  ai_probability: c.modelProbability,
                  ai_prediction: c.modelProbability >= finalThreshold ? 'PNEUMONIA' : 'NORMAL',
                  threshold: finalThreshold
                }));
                await supabase.from('model_evaluations').insert(evaluations);
                
                // Save threshold_history
                await supabase.from('threshold_history').insert({
                  session_id: sessionId,
                  selected_threshold: finalThreshold,
                  timestamp: new Date().toISOString()
                });
              }
              // Move student to COMPLETION state safely
              setZoom(1.0);
              setScreenState('COMPLETION');
              localStorage.setItem('active_screen_state', 'COMPLETION');
            }}
          />
        )}

        {/* ==========================================
            SCREEN 6: COMPLETION / PHASE 3 PLACEHOLDER
            ========================================== */}
        {screenState === 'COMPLETION' && (
          <motion.div
            key="completion-screen"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="flex flex-col min-h-screen bg-[#F2F8FC] justify-center items-center py-10"
          >
            <div className="bg-white border border-[#D5E5EE] p-12 rounded-2xl max-w-lg w-full shadow-[0_8px_30px_rgba(30,90,130,0.08)] text-center space-y-6">
              <div className="w-20 h-20 bg-[#E1F1F9] rounded-full mx-auto flex items-center justify-center text-[#0B6FE8]">
                <Check className="w-10 h-10" />
              </div>
              
              <h2 className="text-3xl font-black tracking-tight text-[#12324A] uppercase">
                PHASE 2 COMPLETE
              </h2>
              
              <p className="text-[#49677F] leading-relaxed text-sm">
                You have successfully completed the threshold investigation.
                <br /><br />
                <strong>You are now ready for the live Q&A challenge.</strong>
              </p>

              <button
                onClick={async () => {
                  try {
                    const savedStudentId = sessionStorage.getItem('active_student_id');
                    const savedStudentBatch = sessionStorage.getItem('active_student_batch');
                    
                    if (!savedStudentId || !savedStudentBatch) {
                      alert("Student ID or Batch not found. Please register again.");
                      return;
                    }

                    const { data: room, error: roomError } = await supabase
                      .from('quiz_rooms')
                      .select('id')
                      .eq('batch', savedStudentBatch)
                      .in('status', ['waiting', 'countdown', 'active'])
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .single();
                      
                    if (roomError || !room) {
                      alert(`No active Phase 3 room found for ${savedStudentBatch}. Please wait for the instructor to start it.`);
                      return;
                    }
                    
                    
                    const { error: joinError } = await supabase
                      .from('quiz_participants')
                      .insert({ quiz_room_id: room.id, student_id: savedStudentId, status: 'READY' });
                      
                    if (joinError && joinError.code !== '23505') {
                      console.error('Failed to join quiz room', joinError);
                      alert("Failed to join the quiz room. Please try again.");
                      return;
                    }
                    
                    setScreenState('PHASE_3_WAITING');
                    localStorage.setItem('active_screen_state', 'PHASE_3_WAITING');
                    localStorage.setItem('active_quiz_room_id', room.id);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg text-xs uppercase tracking-wider mt-4"
              >
                ENTER PHASE 3 QUIZ
              </button>
              
              <div className="pt-4 border-t border-[#D5E5EE]">
                <p className="text-[10px] font-mono tracking-widest text-[#6E879A] uppercase">
                  SESSION SAVED &middot; PLEASE PROCEED TO QUIZ
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {screenState === 'PHASE_3_WAITING' && (
          <Phase3WaitingRoom quizRoomId={localStorage.getItem('active_quiz_room_id') || ''} />
        )}
        
        {screenState === 'INSTRUCTOR_QUIZ_CONTROL' && (
          <InstructorQuizControl />
        )}
        {/* ==========================================
            SCREEN 7: INSTRUCTOR LOGIN SCREEN
            ========================================== */}
        {screenState === 'INSTRUCTOR_LOGIN' && (
          <motion.div
            key="instructor-login-screen"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            variants={containerVariants}
            className="flex flex-col min-h-screen bg-[#F2F8FC] justify-center items-center py-10"
          >
            <div className="bg-white border border-[#D5E5EE] p-8 rounded-2xl max-w-md w-full shadow-lg space-y-6 text-left">
              <div className="text-center space-y-2">
                <span className="text-sm font-extrabold uppercase tracking-widest text-[#062B5C] font-mono block">
                  AI DOCTOR LAB
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-[#0B6FE8] bg-[#E1F1F9] px-3 py-1 rounded-full border border-[#0B6FE8]/25 font-mono inline-block">
                  INSTRUCTOR PORTAL
                </span>
                <p className="text-xs text-[#6E879A] pt-1">Enter your credentials to access the Dashboard.</p>
              </div>

              {instructorError && (
                <div className="bg-[#FCECEE] border border-[#F1C5CC] text-[#B84C59] text-xs p-3.5 rounded-xl font-medium">
                  {instructorError}
                </div>
              )}

              <form onSubmit={handleInstructorLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold tracking-wider text-[#6E879A] uppercase block">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="instructor@hospital.org"
                    value={instructorEmail}
                    onChange={(e) => setInstructorEmail(e.target.value)}
                    className="w-full bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl px-4 py-3 text-sm text-[#12324A] placeholder-text-muted focus:outline-none focus:border-[#0B6FE8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold tracking-wider text-[#6E879A] uppercase block">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={instructorPassword}
                    onChange={(e) => setInstructorPassword(e.target.value)}
                    className="w-full bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl px-4 py-3 text-sm text-[#12324A] placeholder-text-muted focus:outline-none focus:border-[#0B6FE8]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0B6FE8] hover:bg-[#0F5E9C] disabled:bg-blue-900/40 text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-lg shadow-[#0B6FE8]/10 text-xs uppercase tracking-wider"
                >
                  {loading ? 'AUTHENTICATING...' : 'SIGN IN →'}
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  onClick={() => navigate('/')}
                  className="text-xs font-mono font-bold text-[#6E879A] hover:text-[#0B6FE8] transition-colors cursor-pointer"
                >
                  &larr; BACK TO STUDENT WORKSPACE
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            SCREEN 8: INSTRUCTOR DASHBOARD SCREEN
            ========================================== */}
        {screenState === 'INSTRUCTOR_DASHBOARD' && (() => {
          // Filter by selected batch
          const batchStudents = dashboardStudents.filter(s => s.batch === dashboardBatch)

          // Calculate Day 1 statistics based on batch
          const day1Sessions = batchStudents.map(student => student.sessions?.find((s: any) => s.day_number === 1)).filter(Boolean)
          const totalStudentsCount = batchStudents.length
          const completedCount = day1Sessions.filter((s: any) => s.status === 'completed').length
          const inProgressCount = day1Sessions.filter((s: any) => s.status === 'in_progress').length

          // Filter Students list based on search and status
          const filteredStudents = batchStudents.filter(student => {
            const session = student.sessions?.find((s: any) => s.day_number === 1)
            const matchesName = student.name.toLowerCase().includes(searchName.toLowerCase())
            const matchesRoll = student.roll_number.toLowerCase().includes(searchRoll.toLowerCase())
            const matchesStatus = filterStatus === 'all' || (session?.status === filterStatus)
            return matchesName && matchesRoll && matchesStatus
          })

          // Sorting logic: Sort by highest score first, then fastest completion time
          const getSortedStudents = (list: any[]) => {
            return [...list].sort((a, b) => {
              const sessionA = a.sessions?.find((s: any) => s.day_number === 1)
              const sessionB = b.sessions?.find((s: any) => s.day_number === 1)
              const resultA = sessionA?.results?.[0]
              const resultB = sessionB?.results?.[0]
              
              const scoreA = resultA ? Number(resultA.score) : -1
              const scoreB = resultB ? Number(resultB.score) : -1
              const timeA = resultA ? Number(resultA.completion_time) : Infinity
              const timeB = resultB ? Number(resultB.completion_time) : Infinity
              
              if (scoreB !== scoreA) return scoreB - scoreA
              return timeA - timeB
            })
          }

          const sortedStudentsForList = getSortedStudents(filteredStudents)

          return (
            <motion.div
              key="instructor-dashboard-screen"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              variants={containerVariants}
              className="flex flex-col min-h-screen bg-[#F2F8FC]"
            >
              {/* Header */}
              <motion.header
                variants={springEntrance}
                className="w-full bg-[#062B5C] text-white shadow-md sticky top-0 z-50 px-6"
              >
                <div className="max-w-7xl mx-auto flex items-center justify-between h-18">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-[#0B6FE8]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-base font-bold tracking-wider leading-none mb-1">AI DOCTOR LAB</span>
                      <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-medium">
                        INSTRUCTOR DASHBOARD
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setScreenState('INSTRUCTOR_QUIZ_CONTROL')}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold font-mono px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      PHASE 3 QUIZ
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white text-xs font-bold font-mono px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      CSV EXPORT
                    </button>
                    <button
                      onClick={handleInstructorLogout}
                      className="border border-white/20 hover:border-white/40 text-xs font-bold font-mono px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      LOG OUT
                    </button>
                  </div>
                </div>
              </motion.header>

              {/* Dashboard Tabs & Metrics */}
              <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
                {/* Dashboard Tabs & Metrics */}
                <div className="border-b border-[#D5E5EE] flex gap-2">
                  {(['DAY_01', 'DAY_02', 'DAY_03', 'DAY_04'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDashboardTab(tab)}
                      className={`pb-3 px-4 text-xs font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                        dashboardTab === tab 
                          ? 'border-[#0B6FE8] text-[#0B6FE8]' 
                          : 'border-transparent text-[#6E879A] hover:text-[#12324A]'
                      }`}
                    >
                      {tab === 'DAY_01' ? 'DAY 01' : `${tab.replace('DAY_', 'DAY ')}`}
                    </button>
                  ))}
                </div>

                {/* Batch Navigation */}
                <div className="border-b border-[#D5E5EE] flex gap-2 mt-4">
                  {(['BATCH 1', 'BATCH 2', 'BATCH 3', 'BATCH 8'] as const).map(batch => (
                    <button
                      key={batch}
                      onClick={() => setDashboardBatch(batch)}
                      className={`pb-3 px-4 text-xs font-mono font-bold tracking-wider transition-all border-b-2 cursor-pointer ${
                        dashboardBatch === batch 
                          ? 'border-[#0B6FE8] text-[#0B6FE8]' 
                          : 'border-transparent text-[#6E879A] hover:text-[#12324A]'
                      }`}
                    >
                      {batch}
                    </button>
                  ))}
                </div>

                {dashboardTab !== 'DAY_01' ? (
                  <div className="bg-white border border-[#D5E5EE] p-12 rounded-2xl text-center space-y-2">
                    <span className="text-2xl font-black text-[#12324A] uppercase block">COMING SOON</span>
                    <p className="text-xs text-[#6E879A]">Day {dashboardTab.replace('DAY_0', '')} course module is coming soon.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Day 1 Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-[#D5E5EE] p-5 rounded-2xl text-left shadow-sm">
                        <span className="text-[9px] font-mono font-bold text-[#6E879A] uppercase tracking-wider block">TOTAL STUDENTS</span>
                        <span className="text-3xl font-black text-[#12324A]">{totalStudentsCount}</span>
                      </div>
                      <div className="bg-white border border-[#D5E5EE] p-5 rounded-2xl text-left shadow-sm">
                        <span className="text-[9px] font-mono font-bold text-[#6E879A] uppercase tracking-wider block">COMPLETED</span>
                        <span className="text-3xl font-black text-success">{completedCount}</span>
                      </div>
                      <div className="bg-white border border-[#D5E5EE] p-5 rounded-2xl text-left shadow-sm">
                        <span className="text-[9px] font-mono font-bold text-[#6E879A] uppercase tracking-wider block">IN PROGRESS</span>
                        <span className="text-3xl font-black text-warning">{inProgressCount}</span>
                      </div>
                      <div className="bg-white border border-[#D5E5EE] p-5 rounded-2xl text-left shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-mono font-bold text-[#6E879A] uppercase tracking-wider block">AVERAGE SCORE</span>
                        <span className="text-xs font-mono font-extrabold text-[#6E879A] tracking-wider mt-2">AWAITING SCORING</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      {/* Student Table Area */}
                      <div className="bg-white border border-[#D5E5EE] rounded-2xl p-6 shadow-sm text-left space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-mono font-black text-[#12324A] uppercase tracking-wider">DAY 01 STUDENTS</h3>
                            <p className="text-[11px] text-[#6E879A] font-mono mt-0.5">Manage and track student diagnostic progress.</p>
                          </div>
                          
                          {/* Refresh Button */}
                          <button
                            onClick={fetchDashboardData}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 border border-[#D5E5EE] hover:border-[#0B6FE8] hover:text-[#0B6FE8] bg-white text-[#6E879A] text-xs font-mono font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span>REFRESH</span>
                          </button>
                        </div>

                        {/* Search and Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search by name..."
                              value={searchName}
                              onChange={(e) => setSearchName(e.target.value)}
                              className="w-full bg-[#F8FBFD] border border-[#D5E5EE] rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-[#12324A] focus:outline-none focus:border-[#0B6FE8]"
                            />
                          </div>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search by roll..."
                              value={searchRoll}
                              onChange={(e) => setSearchRoll(e.target.value)}
                              className="w-full bg-[#F8FBFD] border border-[#D5E5EE] rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-[#12324A] focus:outline-none focus:border-[#0B6FE8]"
                            />
                          </div>
                          <div>
                            <select
                              value={filterStatus}
                              onChange={(e) => setFilterStatus(e.target.value as any)}
                              className="w-full bg-[#F8FBFD] border border-[#D5E5EE] rounded-lg px-3 py-2 text-xs font-mono text-[#12324A] focus:outline-none focus:border-[#0B6FE8] cursor-pointer"
                            >
                              <option value="all">All Statuses</option>
                              <option value="completed">Completed Only</option>
                              <option value="in_progress">In Progress Only</option>
                            </select>
                          </div>
                        </div>

                        {/* Students Table */}
                        <div className="overflow-x-auto border border-[#D5E5EE]/55 rounded-xl pt-2">
                          <table className="w-full text-xs font-mono">
                            <thead>
                              <tr className="bg-[#F8FBFD] border-b border-[#D5E5EE] text-[#6E879A] uppercase text-[9px]">
                                <th className="p-3 text-left w-12">RANK</th>
                                <th className="p-3 text-left">STUDENT</th>
                                <th className="p-3 text-left">ROLL NUMBER</th>
                                <th className="p-3 text-left">STATUS</th>
                                <th className="p-3 text-left">SCORE</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D5E5EE]/40">
                              {sortedStudentsForList.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400">
                                    No student matching the filters found.
                                  </td>
                                </tr>
                              ) : (
                                sortedStudentsForList.map((student, idx) => {
                                  const session = student.sessions?.find((se: any) => se.day_number === 1)
                                  return (
                                    <tr 
                                      key={student.id} 
                                      onClick={() => setSelectedStudent(student)}
                                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                      <td className="p-3 text-left font-bold text-[#6E879A]">{idx + 1}</td>
                                      <td className="p-3 text-left font-bold text-[#12324A]">{student.name}</td>
                                      <td className="p-3 text-left text-[#6E879A]">{student.roll_number}</td>
                                      <td className="p-3 text-left">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          session?.status === 'completed' 
                                            ? 'text-success bg-[#EAF7F2] border border-[#BFE5D5]' 
                                            : 'text-warning bg-[#FFF5E5] border border-[#F0D6A6]'
                                        }`}>
                                          {session?.status === 'completed' ? 'Completed' : 'In Progress'}
                                        </span>
                                      </td>
                                      <td className="p-3 text-left font-extrabold text-[#6E879A]">
                                        Awaiting Score
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Student details panel/modal */}
              {selectedStudent && (() => {
                const session = selectedStudent.sessions?.find((s: any) => s.day_number === 1)
                const casesList = ['case-01', 'case-02', 'case-03', 'case-04', 'case-05']
                return (
                  <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-[#D5E5EE] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-left">
                      {/* Close button */}
                      <button 
                        onClick={() => setSelectedStudent(null)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      
                      <div className="space-y-6">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest text-[#0B6FE8] bg-[#E1F1F9] px-2.5 py-0.5 rounded-full border border-[#0B6FE8]/25 font-mono">
                            STUDENT INFORMATION
                          </span>
                          <h3 className="text-2xl font-black text-[#12324A] mt-2 uppercase">{selectedStudent.name}</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-[#F8FBFD] border border-[#D5E5EE] p-4 rounded-xl">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#6E879A] uppercase block">Roll Number</span>
                            <span className="text-sm font-semibold text-[#12324A]">{selectedStudent.roll_number}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#6E879A] uppercase block">Day</span>
                            <span className="text-sm font-semibold text-[#12324A]">Day 01</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#6E879A] uppercase block">Status</span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                              session?.status === 'completed' 
                                ? 'text-success bg-[#EAF7F2] border border-[#BFE5D5]' 
                                : 'text-warning bg-[#FFF5E5] border border-[#F0D6A6]'
                            }`}>
                              {session?.status === 'completed' ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#6E879A] uppercase block">Start Time</span>
                            <span className="text-sm font-semibold text-[#12324A]">
                              {session?.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#6E879A] uppercase block">Completion Time</span>
                            <span className="text-sm font-semibold text-[#12324A]">
                              {session?.completed_at ? new Date(session.completed_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest text-[#0B6FE8] bg-[#E1F1F9] px-2.5 py-0.5 rounded-full border border-[#0B6FE8]/25 font-mono block w-max mb-4">
                            BLIND INVESTIGATION
                          </span>
                          <div className="overflow-x-auto border border-[#D5E5EE] rounded-xl">
                            <table className="w-full text-xs font-mono">
                              <thead>
                                <tr className="bg-[#F8FBFD] border-b border-[#D5E5EE] text-[#6E879A] uppercase text-[9px]">
                                  <th className="p-3 text-left">CASE</th>
                                  <th className="p-3 text-left">PREDICTION</th>
                                  <th className="p-3 text-left">CONFIDENCE</th>
                                  <th className="p-3 text-left">OBSERVATION</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#D5E5EE]/40">
                                {casesList.map((caseId, idx) => {
                                  const pred = session?.predictions?.find((p: any) => p.case_id === caseId)
                                  return (
                                    <tr key={caseId} className="hover:bg-slate-50 transition-colors">
                                      <td className="p-3 text-left font-bold text-[#12324A]">Case 0{idx + 1}</td>
                                      <td className="p-3 text-left">
                                        {pred ? (
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            pred.student_prediction === 'PNEUMONIA'
                                              ? 'text-danger bg-danger-soft border border-danger-border'
                                              : 'text-success bg-[#EAF7F2] border border-[#BFE5D5]'
                                          }`}>
                                            {pred.student_prediction}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">Pending</span>
                                        )}
                                      </td>
                                      <td className="p-3 text-left text-[#12324A] font-bold">
                                        {pred ? `${pred.confidence}%` : '-'}
                                      </td>
                                      <td className="p-3 text-left text-slate-600 max-w-xs truncate" title={pred?.observation}>
                                        {pred ? (pred.observation || 'No observation recorded') : '-'}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          )
        })()}
</AnimatePresence>
    </div>
  )
}

export default App
