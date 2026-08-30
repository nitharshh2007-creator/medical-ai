import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Clock } from 'lucide-react';

interface Participant {
  id: string;
  student_id: string;
  status: string;
  joined_at: string;
  students: {
    name: string;
    roll_number: string;
  };
}

export const InstructorQuizControl: React.FC = () => {
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timer, setTimer] = useState<number>(0);
  const [answeredMap, setAnsweredMap] = useState<Record<string, boolean>>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('BATCH 1');

  useEffect(() => {
    fetchActiveRoom(selectedBatch);
  }, [selectedBatch]);

  useEffect(() => {
    if (!room?.id) return;

    // Fetch initial participants
    fetchParticipants(room.id);

    // Fetch who has answered the current question
    const fetchAnswers = async () => {
      if (room.status === 'active' && room.current_question_index) {
        const { data } = await supabase.from('quiz_answers')
          .select('student_id')
          .eq('quiz_room_id', room.id);
        
        if (data) {
          const amap: Record<string, boolean> = {};
          // Only map if they have answered exactly the current number of questions (or more, which shouldn't happen)
          // Actually, we should just query by current question ID, but it's easier to just fetch all answers for this room
          // and count them. If count == current_question_index, they answered.
          const counts: Record<string, number> = {};
          data.forEach(a => {
            counts[a.student_id] = (counts[a.student_id] || 0) + 1;
          });
          
          Object.keys(counts).forEach(sid => {
            if (counts[sid] >= room.current_question_index) {
              amap[sid] = true;
            }
          });
          setAnsweredMap(amap);
        }
      } else if (room.status === 'completed') {
        const { data } = await supabase.from('quiz_results').select('*, students(name, roll_number)')
          .eq('quiz_room_id', room.id)
          .order('total_points', { ascending: false })
          .order('completion_time', { ascending: true });
        if (data) setLeaderboard(data);
      }
    };
    fetchAnswers();

    // Subscribe to participants joining
    const partSub = supabase
      .channel(`participants_${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_participants', filter: `quiz_room_id=eq.${room.id}` }, 
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new;
            const { data: studentData } = await supabase
              .from('students')
              .select('name, roll_number')
              .eq('id', newRecord.student_id)
              .single();

            setParticipants(prev => {
              const exists = prev.find(p => p.student_id === newRecord.student_id);
              const updatedParticipant = {
                ...newRecord,
                students: studentData || exists?.students || { name: 'Unknown', roll_number: 'N/A' }
              } as any;

              if (exists) {
                return prev.map(p => p.student_id === newRecord.student_id ? updatedParticipant : p);
              }
              return [...prev, updatedParticipant];
            });
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to room changes
    const roomChannelName = `room_${room.id}_${Math.random().toString(36).substring(7)}`;
    const roomSub = supabase
      .channel(roomChannelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_rooms', filter: `id=eq.${room.id}` }, 
        (payload) => setRoom(payload.new)
      )
      .subscribe();
      
    // Polling fallback for room state
    const pollId = setInterval(async () => {
      const { data } = await supabase.from('quiz_rooms').select('*').eq('id', room.id).single();
      if (data) setRoom(data);
    }, 2000);
      
    // Subscribe to answers
    const ansSub = supabase
      .channel(`answers_${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_answers', filter: `quiz_room_id=eq.${room.id}` }, 
        (payload) => {
          setAnsweredMap(prev => ({ ...prev, [payload.new.student_id]: true }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(partSub);
      supabase.removeChannel(roomSub);
      supabase.removeChannel(ansSub);
      clearInterval(pollId);
    };
  }, [room?.id, room?.current_question_index, room?.status]);

  // Handle Timers
  useEffect(() => {
    if (!room) return;
    let intervalId: any;

    if (room.status === 'countdown' && room.started_at) {
      intervalId = setInterval(() => {
        const start = new Date(room.started_at).getTime();
        setTimer(Math.max(0, Math.ceil(3 - (Date.now() - start) / 1000)));
      }, 250);
    } else if (room.status === 'active' && room.question_started_at) {
      intervalId = setInterval(() => {
        const start = new Date(room.question_started_at).getTime();
        setTimer(Math.max(0, Math.ceil(10 - (Date.now() - start) / 1000)));
      }, 250);
    }

    return () => clearInterval(intervalId);
  }, [room]);

  const fetchActiveRoom = async (batchStr: string) => {
    const { data, error } = await supabase
      .from('quiz_rooms')
      .select('*')
      .eq('batch', batchStr)
      .in('status', ['waiting', 'countdown', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setRoom(data);
    } else {
      setRoom(null);
      setParticipants([]);
      setLeaderboard([]);
    }
  };

  const fetchParticipants = async (roomId: string) => {
    const { data, error } = await supabase
      .from('quiz_participants')
      .select(`id, student_id, status, joined_at, students (name, roll_number)`)
      .eq('quiz_room_id', roomId)
      .order('joined_at', { ascending: true });

    if (!error && data) {
      setParticipants(data as any as Participant[]);
    }
  };

  const createRoom = async () => {
    const { data, error } = await supabase
      .from('quiz_rooms')
      .insert({ status: 'waiting', batch: selectedBatch })
      .select()
      .single();

    if (!error && data) {
      setRoom(data);
    } else {
      console.error('Failed to create room', error);
    }
  };

  const startQuiz = async () => {
    if (!room?.id) return;
    const { error } = await supabase
      .from('quiz_rooms')
      .update({ status: 'countdown', started_at: new Date().toISOString() })
      .eq('id', room.id);

    if (!error) {
      setShowConfirm(false);
    } else {
      console.error('Failed to start quiz', error);
    }
  };

  if (!room?.id) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 bg-[#F2F8FC] min-h-screen">
        <h1 className="text-3xl font-black tracking-tight text-[#12324A] uppercase">PHASE 3 — LIVE QUIZ CONTROL</h1>
        
        {/* Batch Selector */}
        <div className="bg-white p-4 rounded-xl border border-[#D5E5EE] shadow-sm mb-6 flex gap-2">
          <span className="font-bold text-[#6E879A] uppercase tracking-wider text-xs flex items-center px-2">SELECT BATCH:</span>
          {(['BATCH 1', 'BATCH 2', 'BATCH 3', 'BATCH 8'] as const).map(b => (
            <button
              key={b}
              onClick={() => setSelectedBatch(b)}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                selectedBatch === b 
                  ? 'bg-[#0B6FE8] text-white shadow' 
                  : 'bg-[#F8FBFD] border border-[#D5E5EE] text-[#6E879A] hover:border-[#0B6FE8] hover:text-[#0B6FE8]'
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded shadow border border-[#D5E5EE]">
          <p className="text-gray-600 mb-4">No active quiz room found for {selectedBatch}.</p>
          <button onClick={createRoom} className="bg-[#0B6FE8] text-white px-6 py-3 rounded font-bold uppercase tracking-wider">
            Create New Room for {selectedBatch}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 bg-[#F2F8FC] min-h-screen">
      
      {/* Batch Selector */}
      <div className="bg-white p-4 rounded-xl border border-[#D5E5EE] shadow-sm flex gap-2">
        <span className="font-bold text-[#6E879A] uppercase tracking-wider text-xs flex items-center px-2">ACTIVE BATCH:</span>
        {(['BATCH 1', 'BATCH 2', 'BATCH 3', 'BATCH 8'] as const).map(b => (
          <button
            key={b}
            onClick={() => setSelectedBatch(b)}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
              selectedBatch === b 
                ? 'bg-[#0B6FE8] text-white shadow' 
                : 'bg-[#F8FBFD] border border-[#D5E5EE] text-[#6E879A] hover:border-[#0B6FE8] hover:text-[#0B6FE8]'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded shadow border border-[#D5E5EE]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black tracking-tight text-[#12324A] uppercase">PHASE 3 - {selectedBatch}</h1>
          
          {room.status === 'active' && (
            <div className="flex items-center gap-2 bg-[#E1F1F9] text-[#0B6FE8] px-4 py-2 rounded-full font-bold">
              <span className="uppercase tracking-wider">QUIZ IN PROGRESS</span>
            </div>
          )}
        </div>
        
        {room.status === 'waiting' && (
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#0B6FE8]">LIVE WAITING ROOM</h2>
              <p className="text-lg font-medium mt-1">{participants.length} STUDENTS JOINED</p>
            </div>
            
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded font-bold uppercase tracking-wider shadow"
              >
                START QUIZ
              </button>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-right space-y-3">
                <p className="font-bold text-yellow-800">START QUIZ?</p>
                <div className="space-x-3">
                  <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-bold uppercase">Cancel</button>
                  <button onClick={startQuiz} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold uppercase">Confirm Start</button>
                </div>
              </div>
            )}
          </div>
        )}

        {room.status === 'countdown' && (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 mb-6">
            <h2 className="text-xl font-bold text-slate-500 uppercase tracking-widest mb-2">QUIZ STARTING IN</h2>
            <div className="text-6xl font-black text-[#0B6FE8] animate-pulse">{timer}</div>
          </div>
        )}

        {room.status === 'active' && (
          <div className="flex justify-between items-center p-6 bg-slate-50 rounded-xl border border-slate-200 mb-6">
            <div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Current Question</div>
              <div className="text-3xl font-black text-[#12324A]">QUESTION {room.current_question_index} OF 10</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                <Clock className="w-4 h-4" /> TIME REMAINING
              </div>
              <div className={`text-4xl font-black ${timer <= 3 ? 'text-red-500 animate-pulse' : 'text-[#0B6FE8]'}`}>
                {timer}
              </div>
            </div>
          </div>
        )}

        {(room.status === 'waiting' || room.status === 'active' || room.status === 'countdown') && (
          <div className="overflow-x-auto mt-6">
            <h3 className="text-lg font-bold text-[#12324A] mb-3 uppercase tracking-wider border-b pb-2">Participant Status</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="p-3 border-b">Name</th>
                  <th className="p-3 border-b">Roll Number</th>
                  <th className="p-3 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const hasAnswered = answeredMap[p.student_id];
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 font-medium text-[#12324A]">{p.students?.name}</td>
                      <td className="p-3 text-gray-600 font-mono text-sm">{p.students?.roll_number}</td>
                      <td className="p-3">
                        {room.status === 'active' ? (
                          hasAnswered ? (
                            <span className="text-green-600 font-bold flex items-center gap-1">Answered</span>
                          ) : (
                            <span className="text-slate-400 font-bold flex items-center gap-1">Waiting...</span>
                          )
                        ) : (
                          <span className="text-slate-500 font-bold">Ready</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-400">Waiting for students to join...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {room.status === 'completed' && (
          <div className="space-y-6">
            <div className="text-center py-6 bg-green-50 rounded-xl border border-green-200">
              <h2 className="text-3xl font-black text-green-700 uppercase tracking-widest mb-1">QUIZ COMPLETE</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#F8FBFD] p-4 rounded-xl border border-[#D5E5EE] text-center">
                <div className="text-3xl font-black text-[#12324A]">{leaderboard.length}</div>
                <div className="text-xs font-bold text-[#6E879A] tracking-widest uppercase mt-1">Total Participants</div>
              </div>
              <div className="bg-[#F8FBFD] p-4 rounded-xl border border-[#D5E5EE] text-center">
                <div className="text-3xl font-black text-[#0B6FE8]">
                  {leaderboard.length > 0 ? Math.round(leaderboard.reduce((acc, curr) => acc + curr.total_points, 0) / leaderboard.length) : 0}
                </div>
                <div className="text-xs font-bold text-[#6E879A] tracking-widest uppercase mt-1">Average Score</div>
              </div>
              <div className="bg-[#F8FBFD] p-4 rounded-xl border border-[#D5E5EE] text-center">
                <div className="text-3xl font-black text-[#0B6FE8]">
                  {leaderboard.length > 0 ? leaderboard[0].total_points : 0}
                </div>
                <div className="text-xs font-bold text-[#6E879A] tracking-widest uppercase mt-1">Highest Score</div>
              </div>
              <div className="bg-[#F8FBFD] p-4 rounded-xl border border-[#D5E5EE] text-center">
                <div className="text-3xl font-black text-[#12324A]">
                  {leaderboard.length > 0 ? (leaderboard.reduce((acc, curr) => acc + curr.completion_time, 0) / leaderboard.length).toFixed(1) : 0}s
                </div>
                <div className="text-xs font-bold text-[#6E879A] tracking-widest uppercase mt-1">Avg Completion Time</div>
              </div>
            </div>

            <div className="overflow-x-auto mt-6">
              <h3 className="text-xl font-black text-[#12324A] mb-4 uppercase tracking-wider">PHASE 3 LEADERBOARD</h3>
              <div className="border border-[#D5E5EE] rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FBFD] text-[#6E879A] font-bold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-4 border-b border-[#D5E5EE]">Rank</th>
                      <th className="p-4 border-b border-[#D5E5EE]">Name</th>
                      <th className="p-4 border-b border-[#D5E5EE]">Roll Number</th>
                      <th className="p-4 border-b border-[#D5E5EE]">Score</th>
                      <th className="p-4 border-b border-[#D5E5EE]">Percentage</th>
                      <th className="p-4 border-b border-[#D5E5EE]">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((lb, index) => (
                      <tr key={lb.id} className="border-b border-[#D5E5EE] last:border-0 hover:bg-slate-50">
                        <td className="p-4 text-[#12324A] font-black">{index + 1}</td>
                        <td className="p-4 text-[#12324A] font-bold">{lb.students?.name}</td>
                        <td className="p-4 text-[#6E879A] font-mono">{lb.students?.roll_number}</td>
                        <td className="p-4 text-[#0B6FE8] font-black text-lg">{lb.total_points}</td>
                        <td className="p-4 text-[#12324A] font-bold">{lb.percentage}%</td>
                        <td className="p-4 text-[#6E879A]">{Number(lb.completion_time).toFixed(1)}s</td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-400 font-bold">No results found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
