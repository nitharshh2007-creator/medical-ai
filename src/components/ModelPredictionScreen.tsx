import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Stethoscope, ChevronDown, ArrowRight } from 'lucide-react'
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
  onFinish: (threshold: number) => void
}

export const ModelPredictionScreen: React.FC<ModelPredictionScreenProps> = ({
  xrayCases,
  // predictions is unused in the simplified UI, but kept in props to avoid breaking App.tsx
  studentName = 'Aarav Kumar',
  studentRoll = '24CS1001',
  onFinish
}) => {
  const singleCase = xrayCases[2] || xrayCases[0]
  const caseProbability = singleCase ? singleCase.modelProbability : 0.009
  
  // PART A STATE: Decision Threshold Activity (Slider)
  const [thresholdSlider, setThresholdSlider] = useState(0.76)
  // The user explicitly requested: "0 to 50 is normal above 50 is pnemonia"
  const predictionA = thresholdSlider > 0.50 ? 'PNEUMONIA' : 'NORMAL'

  // PART B STATE: Python Threshold Coding Activity
  const [pythonProbability, setPythonProbability] = useState('0.009')
  const [pythonThreshold, setPythonThreshold] = useState('0.76')

  const probB = parseFloat(pythonProbability) || 0
  const threshB = parseFloat(pythonThreshold) || 0
  const predictionB = probB >= threshB ? 'PNEUMONIA' : 'NORMAL'

  // Animation constants
  const springEntrance = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 18 } }
  } as const

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  } as const

  const initials = studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <motion.div
      key="model-prediction-screen"
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      variants={containerVariants}
      className="flex flex-col min-h-screen bg-[#F2F8FC]"
    >
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
                Applied ML &middot; Medical Imaging
              </span>
            </div>
          </div>
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

      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col items-center gap-8 text-center">
        
        <motion.div variants={springEntrance} className="space-y-3">
          <h1 className="text-3xl font-extrabold text-[#12324A] tracking-tight">Understanding Decision Thresholds</h1>
          <p className="text-[#49677F] max-w-lg mx-auto text-sm leading-relaxed">
            Move the slider to change the decision threshold. Observe how the required level of abnormality (simulated as haze) corresponds to the threshold, and how it impacts the AI's final decision.
          </p>
        </motion.div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-16">
          {/* ONE X-RAY IMAGE */}
          <motion.div variants={springEntrance} className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-black">
            {singleCase && (
              <img src={singleCase.imagePath} alt="Chest X-Ray" className="w-full h-full object-cover opacity-90" />
            )}
            
            {/* Haze overlay linked to threshold (gradually increases above 50% as requested) */}
            <div 
              className="absolute inset-0 transition-opacity duration-300 pointer-events-none mix-blend-screen"
              style={{ 
                opacity: thresholdSlider > 0.50 ? (thresholdSlider - 0.50) * 2 : 0, 
                background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, transparent 70%)' 
              }}
            />
            
            {/* Label indicating model prediction */}
            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-[10px] font-bold tracking-widest text-white uppercase block mb-0.5 opacity-70">AI DECISION</span>
              <span className={`text-sm font-black ${predictionA === 'PNEUMONIA' ? 'text-red-400' : 'text-[#0B6FE8]'}`}>
                {predictionA}
              </span>
            </div>
          </motion.div>

          {/* THRESHOLD SLIDER */}
          <motion.div variants={springEntrance} className="w-full space-y-6 bg-white p-8 rounded-2xl shadow-[0_4px_18px_rgba(30,90,130,0.06)] border border-[#D5E5EE]">
            <div className="flex justify-between items-end">
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#6E879A] uppercase tracking-wider block">DECISION THRESHOLD</span>
                <span className="text-4xl font-black text-[#12324A]">{(thresholdSlider * 100).toFixed(0)}%</span>
              </div>
              <div className="text-right hidden md:block">
                <span className="text-[10px] font-bold text-[#6E879A] uppercase tracking-wider block">MODEL PROBABILITY</span>
                <span className="text-xl font-bold text-[#0B6FE8]">{(caseProbability * 100).toFixed(1)}%</span>
              </div>
            </div>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={thresholdSlider}
              onChange={(e) => setThresholdSlider(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#EAF4F9] rounded-lg appearance-none cursor-pointer accent-[#0B6FE8]"
            />

            <div className="text-xs text-[#49677F] space-y-2 text-left bg-[#F8FBFD] p-4 rounded-xl border border-[#EAF4F9]">
              <p><strong>Decision threshold: {(thresholdSlider * 100).toFixed(0)}%</strong></p>
              <p>Lower threshold &rarr; model is more sensitive to pneumonia.</p>
              <p>Higher threshold &rarr; model requires stronger evidence before calling pneumonia.</p>
            </div>
          </motion.div>
        </div>

        <div className="w-full max-w-4xl border-t border-[#D5E5EE] mb-8" />

        <motion.div variants={springEntrance} className="space-y-3 mb-4">
          <h2 className="text-3xl font-extrabold text-[#12324A] tracking-tight">Python Threshold Exercise</h2>
          <p className="text-[#49677F] max-w-lg mx-auto text-sm leading-relaxed">
            Enter different values into the Python code below to see how the logic determines the final prediction output.
          </p>
        </motion.div>

        {/* PYTHON THRESHOLD CODE & MODEL OUTPUT */}
        <motion.div variants={springEntrance} className="w-full max-w-4xl text-left grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Code */}
          <div className="bg-[#1E293B] rounded-xl p-5 overflow-hidden shadow-lg border border-[#334155] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
              <span className="text-[10px] font-mono text-slate-400 ml-2">threshold.py</span>
            </div>
            
            <div className="font-mono text-sm leading-relaxed text-slate-300 mt-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">probability =</span>
                <input 
                  type="number"
                  step="0.001"
                  value={pythonProbability}
                  onChange={(e) => setPythonProbability(e.target.value)}
                  className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded outline-none border border-slate-600 w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">threshold &nbsp;&nbsp;=</span>
                <input 
                  type="number"
                  step="0.01"
                  value={pythonThreshold}
                  onChange={(e) => setPythonThreshold(e.target.value)}
                  className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded outline-none border border-slate-600 w-24"
                />
              </div>
              
              <div className="mt-4">
                <span className="text-pink-400">if</span> probability &gt;= threshold:<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;prediction = <span className="text-amber-300">"PNEUMONIA"</span><br/>
                <span className="text-pink-400">else</span>:<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;prediction = <span className="text-amber-300">"NORMAL"</span>
              </div>
            </div>
          </div>

          {/* Right Column: Model Output */}
          <div className="bg-white rounded-xl p-6 overflow-hidden shadow-[0_4px_18px_rgba(30,90,130,0.06)] border border-[#D5E5EE] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#D5E5EE]">
              <div className="w-2 h-2 rounded-full bg-[#0B6FE8]" />
              <span className="text-xs font-bold tracking-widest text-[#12324A] uppercase">MODEL OUTPUT</span>
            </div>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#6E879A]">Probability</span>
                <span className="font-bold text-[#12324A]">{(probB * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6E879A]">Threshold</span>
                <span className="font-bold text-[#12324A]">{(threshB * 100).toFixed(1)}%</span>
              </div>
              <div className="pt-4 mt-2 border-t border-dashed border-[#D5E5EE] flex justify-between items-center">
                <span className="text-[#6E879A]">Prediction</span>
                <span className={`text-base font-black ${predictionB === 'PNEUMONIA' ? 'text-red-500' : 'text-[#0B6FE8]'}`}>
                  {predictionB}
                </span>
              </div>
            </div>
          </div>
          
        </motion.div>

        {/* FINISH BUTTON */}
        <motion.div variants={springEntrance} className="pt-8 pb-12">
          <button
            onClick={() => onFinish(thresholdSlider)}
            className="group flex items-center justify-center gap-3 bg-[#0B6FE8] hover:bg-[#0F5E9C] text-white font-extrabold px-12 py-4 rounded-xl shadow-[0_6px_16px_rgba(22,120,200,0.18)] cursor-pointer transition-all duration-300 tracking-wider text-xs uppercase"
          >
            <span>SAVE & FINISH PHASE 2</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </motion.div>

      </div>

      <footer className="w-full mt-auto bg-[#062B5C] border-t border-white/10 text-white py-12 px-6">
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
