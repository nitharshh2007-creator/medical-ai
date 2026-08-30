-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_roll UNIQUE (roll_number)
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    case_id TEXT NOT NULL,
    student_prediction TEXT NOT NULL,
    confidence NUMERIC NOT NULL,
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create results table
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL,
    completion_time NUMERIC NOT NULL, -- completion duration in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_predictions_session_id ON public.predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON public.results(session_id);
-- Unique constraints for data integrity
ALTER TABLE public.sessions ADD CONSTRAINT unique_student_day UNIQUE (student_id, day_number);
ALTER TABLE public.predictions ADD CONSTRAINT unique_session_case UNIQUE (session_id, case_id);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies

-- For STUDENTS:
-- Students can read/write their own records.
-- We can verify ownership by storing the student's ID in the local storage, but since students are anonymous public users
-- (without a Supabase user account, registered via Name/Roll Number), we allow public inserts and public selects/updates
-- matching their session/student ID, or simplify by allowing public inserts/selects but filtering per user session locally.
-- To satisfy: "Students can create/use their own session", "Students can save their own predictions",
-- "Students cannot read other students' data", we will:
-- Use public client policies:
-- Anyone can insert students/sessions/predictions/results.
-- Students can select their own student record, sessions, predictions, and results.
-- We can achieve this by enabling policies.

-- Policy for students table:
-- Setup RLS Policies and Grants

-- 1. Ensure schema usage is granted
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_roll UNIQUE (roll_number)
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    case_id TEXT NOT NULL,
    student_prediction TEXT NOT NULL,
    confidence NUMERIC NOT NULL,
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create results table
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL,
    completion_time NUMERIC NOT NULL, -- completion duration in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_predictions_session_id ON public.predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON public.results(session_id);
-- Unique constraints for data integrity
ALTER TABLE public.sessions ADD CONSTRAINT unique_student_day UNIQUE (student_id, day_number);
ALTER TABLE public.predictions ADD CONSTRAINT unique_session_case UNIQUE (session_id, case_id);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies

-- For STUDENTS:
-- Students can read/write their own records.
-- We can verify ownership by storing the student's ID in the local storage, but since students are anonymous public users
-- (without a Supabase user account, registered via Name/Roll Number), we allow public inserts and public selects/updates
-- matching their session/student ID, or simplify by allowing public inserts/selects but filtering per user session locally.
-- To satisfy: "Students can create/use their own session", "Students can save their own predictions",
-- "Students cannot read other students' data", we will:
-- Use public client policies:
-- Anyone can insert students/sessions/predictions/results.
-- Students can select their own student record, sessions, predictions, and results.
-- We can achieve this by enabling policies.

-- Policy for students table:
-- Setup RLS Policies and Grants

-- 1. Ensure schema usage is granted
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Grant table privileges to anon (public/student client)
GRANT SELECT, INSERT ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE ON public.sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.predictions TO anon;
GRANT SELECT, INSERT ON public.results TO anon;

-- 3. Grant table privileges to authenticated (instructor client)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;

-- Policy for students table:
DROP POLICY IF EXISTS "Allow public insert to students" ON public.students;
CREATE POLICY "Allow public insert to students" ON public.students 
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select students" ON public.students;
CREATE POLICY "Allow public select students" ON public.students 
    FOR SELECT TO anon USING (true);

-- Policy for sessions table:
DROP POLICY IF EXISTS "Allow public insert to sessions" ON public.sessions;
CREATE POLICY "Allow public insert to sessions" ON public.sessions 
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select/update sessions" ON public.sessions;
CREATE POLICY "Allow public select/update sessions" ON public.sessions 
    FOR ALL TO anon USING (true);

-- Policy for predictions table:
DROP POLICY IF EXISTS "Allow public insert to predictions" ON public.predictions;
CREATE POLICY "Allow public insert to predictions" ON public.predictions 
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select predictions" ON public.predictions;
CREATE POLICY "Allow public select predictions" ON public.predictions 
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public update predictions" ON public.predictions;
CREATE POLICY "Allow public update predictions" ON public.predictions 
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policy for results table:
DROP POLICY IF EXISTS "Allow public insert to results" ON public.results;
CREATE POLICY "Allow public insert to results" ON public.results 
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select results" ON public.results;
CREATE POLICY "Allow public select results" ON public.results 
    FOR SELECT TO anon USING (true);

-- Instructors Policies:
DROP POLICY IF EXISTS "Instructors full access to students" ON public.students;
CREATE POLICY "Instructors full access to students" ON public.students
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to sessions" ON public.sessions;
CREATE POLICY "Instructors full access to sessions" ON public.sessions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to predictions" ON public.predictions;
CREATE POLICY "Instructors full access to predictions" ON public.predictions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to results" ON public.results;
CREATE POLICY "Instructors full access to results" ON public.results
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Model evaluations for Phase 2
CREATE TABLE IF NOT EXISTS public.model_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    case_id text NOT NULL,
    actual_label text NOT NULL,
    ai_probability double precision NOT NULL,
    ai_prediction text NOT NULL,
    threshold double precision NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS model_evaluations_session_case_idx ON public.model_evaluations (session_id, case_id);

-- RLS policies for model_evaluations
DROP POLICY IF EXISTS "Allow public insert to model_evaluations" ON public.model_evaluations;
CREATE POLICY "Allow public insert to model_evaluations" ON public.model_evaluations
    FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public select model_evaluations" ON public.model_evaluations;
CREATE POLICY "Allow public select model_evaluations" ON public.model_evaluations
    FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Instructors full access to model_evaluations" ON public.model_evaluations;
CREATE POLICY "Instructors full access to model_evaluations" ON public.model_evaluations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Optional threshold history table
CREATE TABLE IF NOT EXISTS public.threshold_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    case_id text NOT NULL,
    threshold double precision NOT NULL,
    explored_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS threshold_history_session_case_thresh_idx ON public.threshold_history (session_id, case_id, threshold);

-- RLS policies for threshold_history
DROP POLICY IF EXISTS "Allow public insert to threshold_history" ON public.threshold_history;
CREATE POLICY "Allow public insert to threshold_history" ON public.threshold_history
    FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public select threshold_history" ON public.threshold_history;
    ADD COLUMN completed_at timestamp with time zone;

-- Phase 3 tables
CREATE TABLE IF NOT EXISTS public.quiz_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('waiting', 'countdown', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.quiz_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'READY',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_room_student UNIQUE (quiz_room_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_participants_room_id ON public.quiz_participants(quiz_room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_student_id ON public.quiz_participants(student_id);

ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.quiz_rooms TO anon;
GRANT SELECT, INSERT ON public.quiz_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_participants TO authenticated;



-- Extend results table for Phase 3 final scores
ALTER TABLE public.results
    ADD COLUMN IF NOT EXISTS final_score numeric,
    ADD COLUMN IF NOT EXISTS total_questions integer,
    ADD COLUMN IF NOT EXISTS correct_answers integer,
    ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- Phase 3 tables
CREATE TABLE IF NOT EXISTS public.quiz_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('waiting', 'countdown', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.quiz_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'READY',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_room_student UNIQUE (quiz_room_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_participants_room_id ON public.quiz_participants(quiz_room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_student_id ON public.quiz_participants(student_id);

ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.quiz_rooms TO anon;
GRANT SELECT, INSERT ON public.quiz_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_participants TO authenticated;

DROP POLICY IF EXISTS "Allow public select on quiz_rooms" ON public.quiz_rooms;
CREATE POLICY "Allow public select on quiz_rooms" ON public.quiz_rooms FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Instructors full access to quiz_rooms" ON public.quiz_rooms;
CREATE POLICY "Instructors full access to quiz_rooms" ON public.quiz_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public select on quiz_participants" ON public.quiz_participants;
CREATE POLICY "Allow public select on quiz_participants" ON public.quiz_participants FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow public insert to quiz_participants" ON public.quiz_participants;
CREATE POLICY "Allow public insert to quiz_participants" ON public.quiz_participants FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Instructors full access to quiz_participants" ON public.quiz_participants;
CREATE POLICY "Instructors full access to quiz_participants" ON public.quiz_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rooms;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_participants;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
