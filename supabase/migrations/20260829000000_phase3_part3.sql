-- Phase 3 Part 3: Live Q&A Quiz Completion & Leaderboard

-- 1. Create quiz_results table
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    total_points NUMERIC NOT NULL DEFAULT 0,
    percentage NUMERIC NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 5,
    completion_time NUMERIC NOT NULL DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_quiz_result_student UNIQUE (quiz_room_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_results_room_id ON public.quiz_results(quiz_room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON public.quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_points_time ON public.quiz_results(total_points DESC, completion_time ASC);

-- Enable RLS
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.quiz_results TO anon;
GRANT SELECT, INSERT ON public.quiz_results TO authenticated;
GRANT SELECT, INSERT ON public.quiz_results TO anon;

-- Policies for quiz_results
CREATE POLICY "Allow public select on quiz_results" ON public.quiz_results FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert to quiz_results" ON public.quiz_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Instructors full access to quiz_results" ON public.quiz_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add to publication for realtime leaderboard updates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_results;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 2. Modify advance_quiz_state RPC to calculate results automatically
CREATE OR REPLACE FUNCTION advance_quiz_state(p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room RECORD;
    v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
BEGIN
    SELECT * INTO v_room FROM public.quiz_rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF v_room.status = 'countdown' THEN
        IF EXTRACT(EPOCH FROM (v_now - v_room.started_at)) >= 3 THEN
            UPDATE public.quiz_rooms 
            SET status = 'active', 
                current_question_index = 1,
                question_started_at = v_now
            WHERE id = p_room_id;
        END IF;
    ELSIF v_room.status = 'active' THEN
        IF EXTRACT(EPOCH FROM (v_now - v_room.question_started_at)) >= 10 THEN
            IF v_room.current_question_index < 5 THEN
                UPDATE public.quiz_rooms
                SET current_question_index = v_room.current_question_index + 1,
                    question_started_at = v_now
                WHERE id = p_room_id;
            ELSE
                UPDATE public.quiz_rooms
                SET status = 'completed',
                    completed_at = v_now
                WHERE id = p_room_id;
                
                -- Auto-calculate final results for all participants
                INSERT INTO public.quiz_results (
                    quiz_room_id, 
                    student_id, 
                    total_points, 
                    correct_answers, 
                    total_questions, 
                    completion_time, 
                    percentage
                )
                SELECT 
                    qp.quiz_room_id,
                    qp.student_id,
                    COALESCE(SUM(qa.points), 0) AS total_points,
                    COALESCE(SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END), 0) AS correct_answers,
                    5 AS total_questions,
                    COALESCE(SUM(qa.response_time), 0) + (5 - COUNT(qa.id)) * 10 AS completion_time,
                    ROUND((COALESCE(SUM(qa.points), 0) / 5000.0) * 100) AS percentage
                FROM public.quiz_participants qp
                LEFT JOIN public.quiz_answers qa 
                    ON qa.quiz_room_id = qp.quiz_room_id AND qa.student_id = qp.student_id
                WHERE qp.quiz_room_id = p_room_id
                GROUP BY qp.quiz_room_id, qp.student_id
                ON CONFLICT (quiz_room_id, student_id) DO NOTHING;

            END IF;
        END IF;
    END IF;
END;
$$;
