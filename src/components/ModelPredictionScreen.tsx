import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BrainCircuit,
  Database,
  Scan,
  ArrowRight,
  Info,
  Stethoscope,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Check
} from 'lucide-react'
import type { XRayCase } from '../data/xrayCases'

interface ModelPredictionScreenProps {
  xrayCases: XRayCase[]
  predictions: Array<{
    prediction: 'PNEUMONIA' | 'NORMAL' | null
    confidence: number
    note: string
  }>
  studentName?: string
  studentRoll?: string
  onNext: () => void
}

export const ModelPredictionScreen: React.FC<ModelPredictionScreenProps> = ({
  xrayCases,
  predictions,
  studentName = 'Aarav Kumar',
  studentRoll = '24CS1001',
  onNext
}) => {
  const [threshold, setThreshold] = useState(0.50)
  const [apiOnline, setApiOnline] = useState(false)
  const [fullMetrics, setFullMetrics] = useState<any>(null)
  const [presetMetrics, setPresetMetrics] = useState<{
    [key: number]: { recall: number; fpr: number }
  }>({
    0.30: { recall: 97.2, fpr: 28.3 },
    0.50: { recall: 91.4, fpr: 15.6 },
    0.70: { recall: 82.1, fpr: 6.4 },
    0.80: { recall: 67.3, fpr: 2.1 }
  })

  // Fetch metrics dynamically from FastAPI whenever threshold changes
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/metrics?threshold=${threshold}`)
      .then(res => {
        if (!res.ok) throw new Error("API metrics fetch failed");
        return res.json();
      })
      .then(data => {
        setFullMetrics(data);
        setApiOnline(true);
      })
      .catch(err => {
        console.warn("FastAPI offline, using static metrics fallback.", err);
        setApiOnline(false);
      });
  }, [threshold]);

  // Fetch preset metrics on mount
  useEffect(() => {
    const thresholds = [0.30, 0.50, 0.70, 0.80];
    thresholds.forEach(t => {
      fetch(`http://127.0.0.1:8000/api/metrics?threshold=${t}`)
        .then(res => {
          if (!res.ok) throw new Error("Fetch error");
          return res.json();
        })
        .then(data => {
          setPresetMetrics(prev => ({
            ...prev,
            [t]: { recall: data.recall, fpr: data.fpr }
          }));
        })
        .catch(err => console.warn(`Offline metrics preset fetch failed for ${t}`, err));
    });
  }, []);

  // 1. Calculate local 5-case sample metrics based on the active threshold state
  let tp = 0
  let tn = 0
  let fp = 0
  let fn = 0

  xrayCases.forEach((c) => {
    const pred = c.modelProbability >= threshold ? 'PNEUMONIA' : 'NORMAL'
    const actual = c.actualLabel

    if (pred === 'PNEUMONIA' && actual === 'PNEUMONIA') tp++
    else if (pred === 'NORMAL' && actual === 'NORMAL') tn++
    else if (pred === 'PNEUMONIA' && actual === 'NORMAL') fp++
    else if (pred === 'NORMAL' && actual === 'PNEUMONIA') fn++
  })

  const sampleRecall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0
  const samplePrecision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0
  const sampleAccuracy = xrayCases.length > 0 ? ((tp + tn) / xrayCases.length) * 100 : 0
  const sampleF1Score = (samplePrecision + sampleRecall) > 0 ? 2 * (samplePrecision * sampleRecall) / (samplePrecision + sampleRecall) : 0

  // Calculate student investigation metrics dynamically
  let studentCorrectCount = 0
  const studentMissedCases: string[] = []

  xrayCases.forEach((c, idx) => {
    const studentPred = predictions[idx]?.prediction
    if (studentPred === c.actualLabel) {
      studentCorrectCount++
    } else {
      studentMissedCases.push(c.caseId.replace('case-', 'CASE '))
    }
  })

  const studentMissedCount = xrayCases.length - studentCorrectCount

  // Animation constants
  const springEntrance = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 18 } }
  } as const

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.02
      }
    }
  } as const

  // Initials for avatar
  const initials = studentName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Identify any False Negatives in the sample to highlight as study case
  // Falls back to Case 03 if none found
  const fnCase = xrayCases.find(c => {
    const pred = c.modelProbability >= threshold ? 'PNEUMONIA' : 'NORMAL'
    return pred === 'NORMAL' && c.actualLabel === 'PNEUMONIA'
  }) || xrayCases[2]

  return (
    <motion.div
      key="model-prediction-screen"
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      variants={containerVariants}
      className="flex flex-col min-h-screen bg-[#F2F8FC]"
    >
      {/* Dark Navy Navigation Bar */}
      <motion.header
        variants={springEntrance}
        className="w-full bg-[#062B5C] text-white shadow-md sticky top-0 z-50 px-6"
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
                Applied ML &middot; Medical Imaging
              </span>
            </div>
          </div>

          {/* Student Profile */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:flex flex-col">
              <span className="text-xs font-bold text-white leading-none mb-1">{studentName}</span>
              <span className="text-[9px] text-slate-300 font-mono uppercase tracking-wider">Roll: {studentRoll}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#0B6FE8] flex items-center justify-center text-xs font-black text-white border-2 border-white/20">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-300 cursor-pointer hidden sm:block" />
          </div>
        </div>
      </motion.header>

      {/* Main Body Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        
        {/* Local API Status Banner */}
        {!apiOnline && (
          <div className="bg-[#FFF5E5] border border-[#F0D6A6] text-[#A66A13] text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5" />
              <span><strong>Local API offline:</strong> Python server on http://localhost:8000 not responding. Using static dataset fallbacks.</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#A66A13]/10 px-2 py-0.5 rounded uppercase">Offline fallback</span>
          </div>
        )}

        {/* Strong Hero Section with clinical SVG illustration */}
        <motion.div 
          variants={springEntrance} 
          className="bg-white border border-[#D5E5EE] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_4px_18px_rgba(30,90,130,0.06)]"
        >
          <div className="flex-1 text-left space-y-4">
            <div className="inline-flex items-center gap-2 text-[#0B6FE8] font-bold tracking-widest text-[11px] font-mono bg-[#E1F1F9] border border-[#0B6FE8]/25 rounded-full px-3 py-1">
              <BrainCircuit className="w-4 h-4 text-[#0B6FE8]" />
              MODEL ANALYSIS
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#12324A]">
              Now look at the <span className="text-[#0B6FE8]">model.</span>
            </h1>
            <p className="text-sm md:text-base text-[#49677F] leading-relaxed max-w-2xl">
              You made your predictions first. Now see how the model evaluated the same five X-rays at decision threshold <strong>{(threshold * 100).toFixed(0)}%</strong>.
            </p>
          </div>
          
          {/* Clinical Chest X-Ray SVG Illustration */}
          <div className="w-48 h-32 shrink-0 bg-[#EAF4F9] rounded-xl border border-[#D5E5EE] relative overflow-hidden flex items-center justify-center p-4">
            <svg viewBox="0 0 100 100" className="w-20 h-20 text-[#0B6FE8]/40">
              <path d="M25,25 C15,40 10,75 35,80 C40,80 43,70 43,65 C43,45 35,30 25,25 Z" fill="currentColor" />
              <path d="M75,25 C85,40 90,75 65,80 C60,80 57,70 57,65 C57,45 65,30 75,25 Z" fill="currentColor" />
              <line x1="5" y1="50" x2="95" y2="50" stroke="#0B6FE8" strokeWidth="1" strokeDasharray="3,1" />
            </svg>
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#0B6FE8]/10 px-1.5 py-0.5 rounded text-[8px] font-mono text-[#0B6FE8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B6FE8] animate-pulse" />
              MODEL ACTIVE
            </div>
          </div>
        </motion.div>

        {/* Student Investigation Summary Banner */}
        <motion.div
          variants={springEntrance}
          className="bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_18px_rgba(30,90,130,0.06)]"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-widest text-[#0B6FE8] uppercase block font-semibold">
              YOUR INVESTIGATION
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#12324A]">{studentCorrectCount} / {xrayCases.length} CORRECT</span>
              <span className="text-sm font-semibold text-[#6E879A]">({((studentCorrectCount / xrayCases.length) * 100).toFixed(0)}% Accuracy)</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {studentMissedCount > 0 ? (
              <div className="bg-[#FFF5E5] border border-[#F0D6A6] text-[#A66A13] text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#A66A13]" />
                <span>{studentMissedCount} {studentMissedCount === 1 ? 'CASE' : 'CASES'} MISSED: {studentMissedCases.join(' · ')}</span>
              </div>
            ) : (
              <div className="bg-[#EAF7F2] border border-[#BFE5D5] text-[#147A58] text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-[#147A58]" />
                <span>NO CASES MISSED! PERFECT SCORE</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Model Information Grid */}
        <motion.div 
          variants={springEntrance}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Card 1: Model */}
          <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-5 text-left flex flex-col justify-between shadow-[0_4px_18px_rgba(30,90,130,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#EAF4F9] text-[#0B6FE8] rounded-xl shrink-0">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#6E879A] uppercase tracking-wider block">MODEL</span>
                <span className="text-base font-extrabold text-[#12324A]">PneumoDetect v2.1</span>
              </div>
            </div>
            <p className="text-xs text-[#49677F] leading-relaxed">
              A DenseNet-121 model trained to detect pneumonia from chest X-rays.
            </p>
          </div>

          {/* Card 2: Dataset */}
          <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-5 text-left flex flex-col justify-between shadow-[0_4px_18px_rgba(30,90,130,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#EAF4F9] text-[#0B6FE8] rounded-xl shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#6E879A] uppercase tracking-wider block">DATASET</span>
                <span className="text-base font-extrabold text-[#12324A]">ChestX-ray14 (Subset)</span>
              </div>
            </div>
            <p className="text-xs text-[#49677F] leading-relaxed">
              Trained on 112,120 images from diverse hospital sources.
            </p>
          </div>

          {/* Card 3: Task */}
          <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-5 text-left flex flex-col justify-between shadow-[0_4px_18px_rgba(30,90,130,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#EAF4F9] text-[#0B6FE8] rounded-xl shrink-0">
                <Scan className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#6E879A] uppercase tracking-wider block">TASK</span>
                <span className="text-base font-extrabold text-[#12324A]">Binary Classification</span>
              </div>
            </div>
            <p className="text-xs text-[#49677F] leading-relaxed">
              Classifies each X-ray as PNEUMONIA or NORMAL.
            </p>
          </div>

          {/* Card 4: Note */}
          <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-5 text-left flex flex-col justify-between shadow-[0_4px_18px_rgba(30,90,130,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#EAF4F9] text-[#0B6FE8] rounded-xl shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#6E879A] uppercase tracking-wider block">NOTE</span>
                <span className="text-base font-extrabold text-[#12324A]">Local Connection</span>
              </div>
            </div>
            <p className="text-xs text-[#49677F] leading-relaxed">
              Model inference is performed offline in D:\ml-model via FastAPI.
            </p>
          </div>
        </motion.div>

        {/* Five-Case Evaluation Table Container */}
        <motion.div 
          variants={springEntrance}
          className="bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left space-y-6 shadow-[0_4px_18px_rgba(30,90,130,0.06)]"
        >
          <span className="text-xs font-bold tracking-widest text-[#0B6FE8] uppercase block">
            5-CASE SAMPLE (THRESHOLD: {(threshold).toFixed(2)})
          </span>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-[#D5E5EE] text-[#49677F] uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3 text-left w-32">CASE</th>
                  <th className="pb-3 text-left">YOUR PREDICTION</th>
                  <th className="pb-3 text-left">ACTUAL LABEL</th>
                  <th className="pb-3 text-left">MODEL SCORE</th>
                  <th className="pb-3 text-left">MODEL PREDICTION</th>
                  <th className="pb-3 text-right">COMPARISON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF4F9]">
                {xrayCases.map((c, idx) => {
                  const studentPred = predictions[idx]?.prediction || 'N/A'
                  const modelPred = c.modelProbability >= threshold ? 'PNEUMONIA' : 'NORMAL'
                  const isStudentMissed = studentPred !== 'N/A' && studentPred !== c.actualLabel
                  const isModelMissed = modelPred !== c.actualLabel
                  
                  let comparisonResult = ''
                  let comparisonColor = ''
                  if (modelPred === 'PNEUMONIA' && c.actualLabel === 'PNEUMONIA') {
                    comparisonResult = 'TRUE POSITIVE'
                    comparisonColor = 'text-success bg-success-soft border border-success-border'
                  } else if (modelPred === 'NORMAL' && c.actualLabel === 'NORMAL') {
                    comparisonResult = 'TRUE NEGATIVE'
                    comparisonColor = 'text-success bg-success-soft border border-success-border'
                  } else if (modelPred === 'PNEUMONIA' && c.actualLabel === 'NORMAL') {
                    comparisonResult = 'FALSE POSITIVE'
                    comparisonColor = 'text-warning bg-warning-soft border border-warning-border'
                  } else {
                    comparisonResult = 'FALSE NEGATIVE'
                    comparisonColor = 'text-danger bg-danger-soft border border-danger-border font-bold'
                  }



                  return (
                    <tr 
                      key={c.caseId} 
                      className={`transition-colors ${
                        isStudentMissed
                          ? 'bg-[#FCECEE] hover:bg-[#F9DFE3] border-l-4 border-red-500' 
                          : isModelMissed
                            ? 'bg-[#FFF9E6] hover:bg-[#FFF2CC] border-l-4 border-yellow-500'
                            : 'hover:bg-[#F8FBFD]'
                      }`}
                    >
                      <td className="py-4.5 text-left text-[#12324A] font-extrabold uppercase pl-3">
                        {c.caseId.replace('case-', 'Case ')}
                        {isStudentMissed && (
                          <span className="ml-2 text-[8px] font-bold text-danger bg-danger-soft border border-danger-border px-2 py-0.5 rounded-full uppercase">
                            YOU MISSED
                          </span>
                        )}
                        {isModelMissed && (
                          <span className="ml-2 text-[8px] font-bold text-[#A66A13] bg-[#FFF5E5] border border-[#F0D6A6] px-2 py-0.5 rounded-full uppercase">
                            AI MISSED
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 text-left text-[#49677F]">{studentPred}</td>
                      <td className="py-4.5 text-left text-[#49677F]">{c.actualLabel}</td>
                      <td className="py-4.5 text-left text-[#12324A] font-bold font-mono">{(c.modelProbability).toFixed(4)}</td>
                      <td className={`py-4.5 text-left font-extrabold ${modelPred === 'PNEUMONIA' ? 'text-[#0B6FE8]' : 'text-[#49677F]'}`}>
                        {modelPred}
                      </td>
                      <td className="py-4.5 text-right pr-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1.5 ${comparisonColor}`}>
                          {comparisonResult}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Table View */}
          <div className="md:hidden space-y-4">
            {xrayCases.map((c, idx) => {
              const studentPred = predictions[idx]?.prediction || 'N/A'
              const modelPred = c.modelProbability >= threshold ? 'PNEUMONIA' : 'NORMAL'
              const isStudentMissed = studentPred !== 'N/A' && studentPred !== c.actualLabel
              const isModelMissed = modelPred !== c.actualLabel
              
              let comparisonResult = ''
              let comparisonColor = ''
              if (modelPred === 'PNEUMONIA' && c.actualLabel === 'PNEUMONIA') {
                comparisonResult = 'TRUE POSITIVE'
                comparisonColor = 'text-success bg-success-soft border border-success-border'
              } else if (modelPred === 'NORMAL' && c.actualLabel === 'NORMAL') {
                comparisonResult = 'TRUE NEGATIVE'
                comparisonColor = 'text-success bg-success-soft border border-success-border'
              } else if (modelPred === 'PNEUMONIA' && c.actualLabel === 'NORMAL') {
                comparisonResult = 'FALSE POSITIVE'
                comparisonColor = 'text-warning bg-warning-soft border border-warning-border'
              } else {
                comparisonResult = 'FALSE NEGATIVE'
                comparisonColor = 'text-danger bg-danger-soft border border-danger-border font-bold'
              }

              return (
                <div 
                  key={c.caseId} 
                  className={`p-4 rounded-xl border text-left space-y-3 ${
                    isStudentMissed 
                      ? 'bg-[#FCECEE] border-red-300' 
                      : isModelMissed
                        ? 'bg-[#FFF9E6] border-yellow-300'
                        : 'bg-[#F8FBFD] border-[#D5E5EE]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[#12324A] uppercase flex items-center gap-1">
                      {c.caseId.replace('case-', 'Case ')}
                      {isStudentMissed && (
                        <span className="text-[7px] font-bold text-danger bg-danger-soft border border-danger-border px-1.5 py-0.5 rounded-full uppercase">
                          YOU
                        </span>
                      )}
                      {isModelMissed && (
                        <span className="text-[7px] font-bold text-[#A66A13] bg-[#FFF5E5] border border-[#F0D6A6] px-1.5 py-0.5 rounded-full uppercase">
                          AI
                        </span>
                      )}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${comparisonColor}`}>
                      {comparisonResult}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs text-[#49677F]">
                    <div>
                      <span className="text-[9px] text-[#6E879A] block uppercase font-bold">YOUR PREDICTION</span>
                      <span className="text-[#12324A] font-semibold">{studentPred}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6E879A] block uppercase font-bold">ACTUAL LABEL</span>
                      <span className="text-[#12324A] font-semibold">{c.actualLabel}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6E879A] block uppercase font-bold">MODEL SCORE</span>
                      <span className="text-[#12324A] font-semibold">{(c.modelProbability).toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6E879A] block uppercase font-bold">MODEL PREDICTION</span>
                      <span className="text-[#0B6FE8] font-extrabold">{modelPred}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Model Pneumonia Score Vs Decision Threshold (Interactive slider preset rows) */}
        <motion.div 
          variants={springEntrance}
          className="bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left space-y-6 shadow-[0_4px_18px_rgba(30,90,130,0.06)]"
        >
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold tracking-widest text-[#0B6FE8] uppercase block">
                MODEL PNEUMONIA SCORE VS DECISION THRESHOLD
              </span>
              <p className="text-xs text-[#6E879A] mt-1">Select a row to change the active threshold and update performance metrics.</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-[#6E879A] block">ACTIVE THRESHOLD</span>
              <span className="text-2xl font-black text-[#0B6FE8] font-mono">{(threshold).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Threshold Row 1: 0.30 */}
            <button
              onClick={() => setThreshold(0.30)}
              className={`w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border text-left transition-all ${
                threshold === 0.30 
                  ? 'border-2 border-[#0B6FE8] bg-[#E1F1F9] shadow-sm' 
                  : 'border-[#D5E5EE] bg-[#F8FBFD] hover:border-[#BCD4E3]'
              }`}
            >
              <div className="w-56 shrink-0">
                <span className="text-xs font-bold text-[#12324A] block">THRESHOLD: 0.30</span>
                <span className="text-[10px] text-[#6E879A] block">Very sensitive (catches more cases)</span>
              </div>
              <div className="flex-1 flex items-center px-4 relative pointer-events-none">
                <div className="h-1.5 w-full bg-[#EAF4F9] rounded-full relative">
                  <div className="absolute h-1.5 bg-[#0B6FE8]/40 rounded-full" style={{ width: '30%' }} />
                  <div className="absolute w-3.5 h-3.5 bg-white border-2 border-[#0B6FE8] rounded-full -top-1" style={{ left: '30%', transform: 'translateX(-50%)' }} />
                </div>
              </div>
              <div className="w-48 shrink-0 flex items-center justify-end gap-6 text-xs text-[#12324A] pointer-events-none">
                <span>RECALL: <strong className="font-extrabold font-mono text-[#0B6FE8]">{presetMetrics[0.30].recall.toFixed(1)}%</strong></span>
                <span>FPR: <strong className="font-extrabold font-mono text-[#49677F]">{presetMetrics[0.30].fpr.toFixed(1)}%</strong></span>
              </div>
            </button>

            {/* Threshold Row 2: 0.50 */}
            <button
              onClick={() => setThreshold(0.50)}
              className={`w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border text-left transition-all ${
                threshold === 0.50 
                  ? 'border-2 border-[#0B6FE8] bg-[#E1F1F9] shadow-sm' 
                  : 'border-[#D5E5EE] bg-[#F8FBFD] hover:border-[#BCD4E3]'
              }`}
            >
              <div className="w-56 shrink-0">
                <span className="text-xs font-bold text-[#12324A] block">THRESHOLD: 0.50 (CURRENT)</span>
                <span className="text-[10px] text-[#6E879A] block">Balanced threshold</span>
              </div>
              <div className="flex-1 flex items-center px-4 relative pointer-events-none">
                <div className="h-1.5 w-full bg-[#EAF4F9] rounded-full relative">
                  <div className="absolute h-1.5 bg-[#0B6FE8]/40 rounded-full" style={{ width: '50%' }} />
                  <div className="absolute w-3.5 h-3.5 bg-white border-2 border-[#0B6FE8] rounded-full -top-1" style={{ left: '50%', transform: 'translateX(-50%)' }} />
                </div>
              </div>
              <div className="w-48 shrink-0 flex items-center justify-end gap-6 text-xs text-[#12324A] pointer-events-none">
                <span>RECALL: <strong className="font-extrabold font-mono text-[#0B6FE8]">{presetMetrics[0.50].recall.toFixed(1)}%</strong></span>
                <span>FPR: <strong className="font-extrabold font-mono text-[#49677F]">{presetMetrics[0.50].fpr.toFixed(1)}%</strong></span>
              </div>
            </button>

            {/* Threshold Row 3: 0.70 */}
            <button
              onClick={() => setThreshold(0.70)}
              className={`w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border text-left transition-all ${
                threshold === 0.70 
                  ? 'border-2 border-[#0B6FE8] bg-[#E1F1F9] shadow-sm' 
                  : 'border-[#D5E5EE] bg-[#F8FBFD] hover:border-[#BCD4E3]'
              }`}
            >
              <div className="w-56 shrink-0">
                <span className="text-xs font-bold text-[#12324A] block">THRESHOLD: 0.70</span>
                <span className="text-[10px] text-[#6E879A] block">Higher precision</span>
              </div>
              <div className="flex-1 flex items-center px-4 relative pointer-events-none">
                <div className="h-1.5 w-full bg-[#EAF4F9] rounded-full relative">
                  <div className="absolute h-1.5 bg-[#0B6FE8]/40 rounded-full" style={{ width: '70%' }} />
                  <div className="absolute w-3.5 h-3.5 bg-white border-2 border-[#0B6FE8] rounded-full -top-1" style={{ left: '70%', transform: 'translateX(-50%)' }} />
                </div>
              </div>
              <div className="w-48 shrink-0 flex items-center justify-end gap-6 text-xs text-[#12324A] pointer-events-none">
                <span>RECALL: <strong className="font-extrabold font-mono text-[#0B6FE8]">{presetMetrics[0.70].recall.toFixed(1)}%</strong></span>
                <span>FPR: <strong className="font-extrabold font-mono text-[#49677F]">{presetMetrics[0.70].fpr.toFixed(1)}%</strong></span>
              </div>
            </button>

            {/* Threshold Row 4: 0.80 */}
            <button
              onClick={() => setThreshold(0.80)}
              className={`w-full flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border text-left transition-all ${
                threshold === 0.80 
                  ? 'border-2 border-[#0B6FE8] bg-[#E1F1F9] shadow-sm' 
                  : 'border-[#D5E5EE] bg-[#F8FBFD] hover:border-[#BCD4E3]'
              }`}
            >
              <div className="w-56 shrink-0">
                <span className="text-xs font-bold text-[#12324A] block">THRESHOLD: 0.80</span>
                <span className="text-[10px] text-[#6E879A] block">Very high precision (risk of missing cases)</span>
              </div>
              <div className="flex-1 flex items-center px-4 relative pointer-events-none">
                <div className="h-1.5 w-full bg-[#EAF4F9] rounded-full relative">
                  <div className="absolute h-1.5 bg-[#0B6FE8]/40 rounded-full" style={{ width: '80%' }} />
                  <div className="absolute w-3.5 h-3.5 bg-white border-2 border-[#0B6FE8] rounded-full -top-1" style={{ left: '80%', transform: 'translateX(-50%)' }} />
                </div>
              </div>
              <div className="w-48 shrink-0 flex items-center justify-end gap-6 text-xs text-[#12324A] pointer-events-none">
                <span>RECALL: <strong className="font-extrabold font-mono text-[#0B6FE8]">{presetMetrics[0.80].recall.toFixed(1)}%</strong></span>
                <span>FPR: <strong className="font-extrabold font-mono text-[#49677F]">{presetMetrics[0.80].fpr.toFixed(1)}%</strong></span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Dynamic Metrics Section (Separated into 5-Case Sample and Full Test-Set) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Block: Full Test-Set Performance */}
          <motion.div 
            variants={springEntrance}
            className="lg:col-span-6 bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left space-y-6 shadow-[0_4px_18px_rgba(30,90,130,0.06)]"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold tracking-widest text-[#0B6FE8] uppercase block">
                FULL TEST-SET PERFORMANCE (100 CASES)
              </span>
              {apiOnline && (
                <span className="text-[9px] font-mono font-bold bg-[#EAF7F2] text-[#147A58] border border-[#BFE5D5] px-2 py-0.5 rounded uppercase">
                  API Connected
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">ACCURACY</span>
                <span className="text-xl font-extrabold text-[#12324A]">
                  {apiOnline && fullMetrics ? `${fullMetrics.accuracy.toFixed(1)}%` : '89.6%'}
                </span>
              </div>

              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">PRECISION</span>
                <span className="text-xl font-extrabold text-[#12324A]">
                  {apiOnline && fullMetrics ? `${fullMetrics.precision.toFixed(1)}%` : '88.0%'}
                </span>
              </div>

              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">RECALL</span>
                <span className="text-xl font-extrabold text-[#12324A]">
                  {apiOnline && fullMetrics ? `${fullMetrics.recall.toFixed(1)}%` : '91.4%'}
                </span>
              </div>

              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">F1 SCORE</span>
                <span className="text-xl font-extrabold text-[#12324A]">
                  {apiOnline && fullMetrics ? `${fullMetrics.f1Score.toFixed(1)}%` : '89.6%'}
                </span>
              </div>
            </div>
            
            {/* Detailed Confusion Matrix breakdown from API */}
            {apiOnline && fullMetrics && (
              <div className="border-t border-[#EAF4F9] pt-4 grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="bg-[#EAF7F2] p-2 rounded">
                  <span className="block text-[8px] text-[#147A58] uppercase font-bold">TP</span>
                  <span className="font-bold text-[#147A58]">{fullMetrics.confusionMatrix.tp}</span>
                </div>
                <div className="bg-[#EAF7F2] p-2 rounded">
                  <span className="block text-[8px] text-[#147A58] uppercase font-bold">TN</span>
                  <span className="font-bold text-[#147A58]">{fullMetrics.confusionMatrix.tn}</span>
                </div>
                <div className="bg-[#FFF5E5] p-2 rounded">
                  <span className="block text-[8px] text-[#A66A13] uppercase font-bold">FP</span>
                  <span className="font-bold text-[#A66A13]">{fullMetrics.confusionMatrix.fp}</span>
                </div>
                <div className="bg-[#FCECEE] p-2 rounded">
                  <span className="block text-[8px] text-danger uppercase font-bold">FN</span>
                  <span className="font-bold text-danger">{fullMetrics.confusionMatrix.fn}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Block: 5-Case Sample Performance */}
          <motion.div 
            variants={springEntrance}
            className="lg:col-span-6 bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left space-y-6 shadow-[0_4px_18px_rgba(30,90,130,0.06)]"
          >
            <span className="text-xs font-bold tracking-widest text-[#0B6FE8] uppercase block">
              5-CASE SAMPLE PERFORMANCE (LOCAL EVALUATION)
            </span>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">ACCURACY</span>
                <span className="text-xl font-extrabold text-[#12324A]">{sampleAccuracy.toFixed(1)}%</span>
              </div>

              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">PRECISION</span>
                <span className="text-xl font-extrabold text-[#12324A]">{samplePrecision.toFixed(1)}%</span>
              </div>

              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">RECALL</span>
                <span className="text-xl font-extrabold text-[#12324A]">{sampleRecall.toFixed(1)}%</span>
              </div>

              <div className="bg-[#F8FBFD] border border-[#D5E5EE] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-[#6E879A] uppercase tracking-wider font-bold">F1 SCORE</span>
                <span className="text-xl font-extrabold text-[#12324A]">{sampleF1Score.toFixed(1)}%</span>
              </div>
            </div>

            <div className="border-t border-[#EAF4F9] pt-4 grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="bg-[#EAF7F2] p-2 rounded">
                <span className="block text-[8px] text-[#147A58] uppercase font-bold">TP</span>
                <span className="font-bold text-[#147A58]">{tp}</span>
              </div>
              <div className="bg-[#EAF7F2] p-2 rounded">
                <span className="block text-[8px] text-[#147A58] uppercase font-bold">TN</span>
                <span className="font-bold text-[#147A58]">{tn}</span>
              </div>
              <div className="bg-[#FFF5E5] p-2 rounded">
                <span className="block text-[8px] text-[#A66A13] uppercase font-bold">FP</span>
                <span className="font-bold text-[#A66A13]">{fp}</span>
              </div>
              <div className="bg-[#FCECEE] p-2 rounded">
                <span className="block text-[8px] text-danger uppercase font-bold">FN</span>
                <span className="font-bold text-danger">{fn}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Detailed Fail Case Analysis for FnCase */}
        <motion.div 
          variants={springEntrance}
          className="bg-white border border-[#D5E5EE] rounded-2xl p-6 text-left space-y-4 shadow-[0_4px_18px_rgba(30,90,130,0.06)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-[#0B6FE8] uppercase block">
              WHY DID THE MODEL SAY THAT?
            </span>
            <span className="text-[10px] font-bold text-danger bg-danger-soft border border-danger-border px-2.5 py-0.5 rounded-full uppercase">
              {fnCase.caseId.replace('case-', 'Case ')} Evaluation Analysis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-[#F8FBFD] border border-[#D5E5EE] p-4 rounded-xl">
            <div className="w-full h-18 bg-[#EDF5F9] rounded border border-[#BBD3E1] flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#0B6FE8]/30">
                <path d="M25,25 C15,40 10,75 35,80 C40,80 43,70 43,65 C43,45 35,30 25,25 Z" fill="currentColor" />
                <path d="M75,25 C85,40 90,75 65,80 C60,80 57,70 57,65 C57,45 65,30 75,25 Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="text-[9px] text-[#6E879A] uppercase tracking-wider block font-bold">MODEL SCORE</span>
              <span className="text-sm font-extrabold text-[#12324A]">{(fnCase.modelProbability).toFixed(4)}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#6E879A] uppercase tracking-wider block font-bold">ACTUAL LABEL</span>
              <span className="text-sm font-extrabold text-danger">{fnCase.actualLabel}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#6E879A] uppercase tracking-wider block font-bold">MODEL PREDICTION</span>
              <span className="text-sm font-extrabold text-[#0B6FE8]">
                {fnCase.modelProbability >= threshold ? 'PNEUMONIA' : 'NORMAL'}
              </span>
            </div>
          </div>

          {/* Explanation based on active threshold */}
          <div className="flex items-start gap-3 bg-[#FFF5E5] border border-[#F0D6A6] p-4 rounded-xl text-xs text-[#A66A13] leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#A66A13]" />
            <p>
              At active decision threshold <strong>{(threshold).toFixed(2)}</strong>, the model prediction is set to 
              <strong> {fnCase.modelProbability >= threshold ? 'PNEUMONIA' : 'NORMAL'}</strong> because the model score 
              ({(fnCase.modelProbability).toFixed(4)}) is {fnCase.modelProbability >= threshold ? 'above or equal to' : 'below'} the threshold. 
              {fnCase.modelProbability < threshold && fnCase.actualLabel === 'PNEUMONIA' && (
                <span> This clinical case represents a <strong>FALSE NEGATIVE</strong> (missed pneumonia pathology).</span>
              )}
            </p>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div 
          variants={springEntrance}
          className="bg-[#EAF4F9] border border-[#C5E0EF] rounded-xl p-5 text-left flex items-start gap-3.5"
        >
          <Info className="w-5 h-5 text-[#1678C8] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-extrabold uppercase text-[#12324A] tracking-wider block">IMPORTANT DISCLAIMER</span>
            <p className="text-[#49677F] leading-relaxed">
              Research model output &mdash; educational use only. These scores are not clinical diagnoses and have not been validated for use in real-world settings.
            </p>
          </div>
        </motion.div>

        {/* CTA to proceed */}
        <motion.div 
          variants={springEntrance}
          className="flex flex-col items-center gap-4 py-8"
        >
          <span className="text-xs font-bold tracking-widest text-[#6E879A] uppercase">
            READY TO TEST THIS MODEL?
          </span>
          <button
            onClick={onNext}
            className="group flex items-center justify-center gap-3 bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white font-extrabold px-12 py-4 rounded-xl shadow-[0_6px_16px_rgba(22,120,200,0.18)] cursor-pointer transition-all duration-300 tracking-wider text-xs uppercase"
          >
            <span>EXPLORE THE THRESHOLD</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </motion.div>
      </div>

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
  )
}
