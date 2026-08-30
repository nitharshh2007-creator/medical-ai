import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, CheckCircle2, Clock, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Phase3WaitingRoomProps {
  quizRoomId: string;
}

export const Phase3WaitingRoom: React.FC<Phase3WaitingRoomProps> = ({ quizRoomId }) => {
  const [room, setRoom] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timer, setTimer] = useState<number>(10);
  const [result, setResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const studentId = sessionStorage.getItem('active_student_id');

  useEffect(() => {
    // Fetch questions
    supabase.from('quiz_questions').select('*').order('question_order', { ascending: true })
      .then(({ data }) => { if (data) setQuestions(data); });

    // Initial fetch of room state
    const fetchRoomState = async () => {
      const { data } = await supabase.from('quiz_rooms').select('*').eq('id', quizRoomId).single();
      if (data) setRoom(data);
    };
    
    // Fetch user's previous answers in case of refresh
    if (studentId) {
      supabase.from('quiz_answers').select('*').eq('quiz_room_id', quizRoomId).eq('student_id', studentId)
        .then(({ data }) => {
          if (data) {
            const ansMap: Record<string, string> = {};
            data.forEach(a => ansMap[a.question_id] = a.answer || '');
            setAnswers(ansMap);
          }
        });
    }

    fetchRoomState();

    const channelName = `room_${quizRoomId}_${Math.random().toString(36).substring(7)}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_rooms', filter: `id=eq.${quizRoomId}` }, 
        (payload) => {
          if (payload.new) setRoom(payload.new);
        }
      )
      .subscribe();

    // Fallback polling every 2 seconds in case Realtime drops
    const pollId = setInterval(fetchRoomState, 2000);

    return () => { 
      supabase.removeChannel(subscription); 
      clearInterval(pollId);
    };
  }, [quizRoomId, studentId]);

  // Handle Timers and State Transitions
  useEffect(() => {
    if (!room) return;

    let intervalId: any;

    if (room.status === 'countdown' && room.started_at) {
      intervalId = setInterval(() => {
        const start = new Date(room.started_at).getTime();
        const elapsed = (Date.now() - start) / 1000;
        const remain = Math.max(0, 3 - elapsed);
        setCountdown(Math.ceil(remain));
        
        if (remain <= 0) {
          clearInterval(intervalId);
          const advance = async () => {
            const { error } = await supabase.rpc('advance_quiz_state', { p_room_id: quizRoomId });
            if (error) console.error(error);
          };
          advance();
          // Retry after a small delay to handle clock skew where client is ahead of server
          setTimeout(advance, 1500);
        }
      }, 250);
    } 
    else if (room.status === 'active' && room.question_started_at) {
      const currentQuestionId = questions[room.current_question_index - 1]?.id;
      // Reset lock state for the new question if they haven't answered it yet
      setLocked(answers[currentQuestionId] !== undefined);
      
      intervalId = setInterval(() => {
        const start = new Date(room.question_started_at).getTime();
        const elapsed = (Date.now() - start) / 1000;
        const remain = Math.max(0, 10 - elapsed);
        setTimer(Math.ceil(remain));
        
        if (remain <= 0) {
          clearInterval(intervalId);
          setLocked(true);
          const advance = async () => {
            const { error } = await supabase.rpc('advance_quiz_state', { p_room_id: quizRoomId });
            if (error) console.error(error);
          };
          advance();
          // Retry after a small delay to handle clock skew
          setTimeout(advance, 1500);
        }
      }, 250);
    }
    else if (room.status === 'completed' && studentId) {
      // Fetch this student's result
      supabase.from('quiz_results').select('*').eq('quiz_room_id', quizRoomId).eq('student_id', studentId).single()
        .then(({ data }) => { if (data) setResult(data); });
        
      // Fetch leaderboard
      supabase.from('quiz_results').select('*, students(name, roll_number)')
        .eq('quiz_room_id', quizRoomId)
        .order('total_points', { ascending: false })
        .order('completion_time', { ascending: true })
        .then(({ data }) => { if (data) setLeaderboard(data); });
    }

    return () => clearInterval(intervalId);
  }, [room, questions, answers, studentId, quizRoomId]);

  const handleSelectAnswer = async (answer: string) => {
    if (locked || room?.status !== 'active') return;
    
    const questionId = questions[room.current_question_index - 1]?.id;
    if (!questionId || !studentId) return;

    setLocked(true);
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    await supabase.rpc('submit_quiz_answer', {
      p_room_id: quizRoomId,
      p_student_id: studentId,
      p_question_id: questionId,
      p_answer: answer
    });
  };

  if (!room) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F8FC] justify-center items-center py-10 px-4">
      <AnimatePresence mode="wait">
        
        {room.status === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white border border-[#D5E5EE] p-12 rounded-2xl max-w-lg w-full shadow-[0_8px_30px_rgba(30,90,130,0.08)] text-center space-y-6">
            <div className="w-20 h-20 bg-[#E1F1F9] rounded-full mx-auto flex items-center justify-center text-[#0B6FE8]">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#12324A] uppercase">PHASE 3</h2>
            <h3 className="text-xl font-bold tracking-tight text-[#0B6FE8] uppercase">LIVE Q&A CHALLENGE</h3>
            <div className="pt-4 border-t border-[#D5E5EE]">
              <p className="text-[#49677F] leading-relaxed font-medium">WAITING FOR INSTRUCTOR</p>
              <p className="text-sm text-[#6E879A] mt-2">You have joined the quiz.<br/>Please wait while the instructor prepares the session.</p>
            </div>
          </motion.div>
        )}

        {room.status === 'countdown' && (
          <motion.div key="countdown" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-[#6E879A] tracking-widest uppercase">Quiz Starts In</h2>
            <div className="text-8xl font-black text-[#0B6FE8] drop-shadow-md">
              {countdown === 0 ? "QUIZ STARTS" : countdown}
            </div>
          </motion.div>
        )}

        {room.status === 'active' && questions.length > 0 && (
          <motion.div key={`question-${room.current_question_index}`} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="w-full max-w-3xl">
            <div className="flex justify-between items-end mb-6">
              <div>
                <span className="text-sm font-bold text-[#6E879A] tracking-wider uppercase">Question {room.current_question_index} of {questions.length}</span>
                <h2 className="text-2xl md:text-3xl font-black text-[#12324A] mt-2 leading-tight">
                  {questions[room.current_question_index - 1]?.question_text}
                </h2>
              </div>
              <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-[#D5E5EE] shadow-sm min-w-[80px]">
                <Clock className="w-5 h-5 text-[#0B6FE8] mb-1" />
                <span className={`text-2xl font-black ${timer <= 3 ? 'text-red-500 animate-pulse' : 'text-[#0B6FE8]'}`}>{timer}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {questions[room.current_question_index - 1]?.options.map((opt: string, i: number) => {
                const isSelected = answers[questions[room.current_question_index - 1].id] === opt;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectAnswer(opt)}
                    disabled={locked}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                      isSelected ? 'border-[#0B6FE8] bg-[#E1F1F9] shadow-md' : 'border-[#D5E5EE] bg-white hover:border-[#0B6FE8]/50 hover:bg-slate-50'
                    } ${locked && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-[#0B6FE8] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className={`font-semibold text-lg ${isSelected ? 'text-[#0B6FE8]' : 'text-[#12324A]'}`}>{opt}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {locked && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center flex items-center justify-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl border border-green-200">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider">Answer Locked</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {room.status === 'completed' && result && (
          <motion.div key="completed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border border-[#D5E5EE] p-8 md:p-12 rounded-2xl max-w-2xl w-full shadow-lg text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center text-green-600 mb-4">
              <Award className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-[#12324A] uppercase mb-1">QUIZ COMPLETE</h2>
            </div>
            
            {!showLeaderboard ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-[#F8FBFD] p-6 rounded-xl border border-[#D5E5EE]">
                  <div className="text-sm font-bold text-[#6E879A] tracking-widest uppercase mb-1">YOUR SCORE</div>
                  <div className="text-5xl font-black text-[#0B6FE8] mb-1">{result.total_points} <span className="text-2xl text-[#6E879A]">/ {result.total_questions * 1000}</span></div>
                  <div className="text-2xl font-bold text-[#12324A] mb-4">{result.percentage}%</div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#D5E5EE]">
                    <div>
                      <div className="text-2xl font-black text-[#12324A]">{result.correct_answers} / {result.total_questions}</div>
                      <div className="text-xs font-bold text-[#6E879A] tracking-widest uppercase mt-1">CORRECT ANSWERS</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-[#12324A]">{Number(result.completion_time).toFixed(1)}s</div>
                      <div className="text-xs font-bold text-[#6E879A] tracking-widest uppercase mt-1">COMPLETION TIME</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowLeaderboard(true)} className="w-full bg-[#12324A] hover:bg-[#062B5C] text-white py-4 rounded-xl font-bold tracking-wider uppercase transition-colors">
                  VIEW LEADERBOARD
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="overflow-x-auto border border-[#D5E5EE] rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F8FBFD] text-[#6E879A] font-bold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="p-3 border-b border-[#D5E5EE]">Rank</th>
                        <th className="p-3 border-b border-[#D5E5EE]">Name</th>
                        <th className="p-3 border-b border-[#D5E5EE]">Roll</th>
                        <th className="p-3 border-b border-[#D5E5EE]">Score</th>
                        <th className="p-3 border-b border-[#D5E5EE]">%</th>
                        <th className="p-3 border-b border-[#D5E5EE]">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((lb, index) => (
                        <tr key={lb.id} className={`border-b border-[#D5E5EE] last:border-0 ${lb.student_id === studentId ? 'bg-blue-50 font-bold' : ''}`}>
                          <td className="p-3 text-[#12324A] font-black">{index + 1}</td>
                          <td className="p-3 text-[#12324A]">{lb.students?.name}</td>
                          <td className="p-3 text-[#6E879A] font-mono">{lb.students?.roll_number}</td>
                          <td className="p-3 text-[#0B6FE8] font-black">{lb.total_points}</td>
                          <td className="p-3 text-[#12324A]">{lb.percentage}%</td>
                          <td className="p-3 text-[#6E879A]">{Number(lb.completion_time).toFixed(1)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setShowLeaderboard(false)} className="w-full bg-white border-2 border-[#12324A] text-[#12324A] hover:bg-slate-50 py-3 rounded-xl font-bold tracking-wider uppercase transition-colors">
                  BACK TO SCORE
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

