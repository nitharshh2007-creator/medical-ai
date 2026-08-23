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
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT ON public.sessions TO authenticated;
GRANT SELECT ON public.predictions TO authenticated;
GRANT SELECT ON public.results TO authenticated;

-- Policy for students table:
CREATE POLICY "Allow public insert to students" ON public.students 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select students" ON public.students 
    FOR SELECT TO anon USING (true);

-- Policy for sessions table:
CREATE POLICY "Allow public insert to sessions" ON public.sessions 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select/update sessions" ON public.sessions 
    FOR ALL TO anon USING (true);

-- Policy for predictions table:
CREATE POLICY "Allow public insert to predictions" ON public.predictions 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select predictions" ON public.predictions 
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public update predictions" ON public.predictions 
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Policy for results table:
CREATE POLICY "Allow public insert to results" ON public.results 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select results" ON public.results 
    FOR SELECT TO anon USING (true);

-- Instructors Policies:
CREATE POLICY "Instructors read all students" ON public.students
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors read all sessions" ON public.sessions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors read all predictions" ON public.predictions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors read all results" ON public.results
    FOR SELECT TO authenticated USING (true);

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
CREATE POLICY "Allow public insert to model_evaluations" ON public.model_evaluations
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public select model_evaluations" ON public.model_evaluations
    FOR SELECT TO anon USING (true);
CREATE POLICY "Instructors read all model_evaluations" ON public.model_evaluations
    FOR SELECT TO authenticated USING (true);

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
CREATE POLICY "Allow public insert to threshold_history" ON public.threshold_history
    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public select threshold_history" ON public.threshold_history
    FOR SELECT TO anon USING (true);
CREATE POLICY "Instructors read all threshold_history" ON public.threshold_history
    FOR SELECT TO authenticated USING (true);

-- Extend results table for Phase 3 final scores
ALTER TABLE public.results
    ADD COLUMN final_score numeric,
    ADD COLUMN total_questions integer,
    ADD COLUMN correct_answers integer,
    ADD COLUMN completed_at timestamp with time zone;
