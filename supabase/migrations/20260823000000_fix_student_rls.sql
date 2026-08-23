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

-- 4. Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public insert to students" ON public.students;
DROP POLICY IF EXISTS "Allow public select students" ON public.students;
DROP POLICY IF EXISTS "Allow public insert to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public select/update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow public insert to predictions" ON public.predictions;
DROP POLICY IF EXISTS "Allow public select predictions" ON public.predictions;
DROP POLICY IF EXISTS "Allow public insert to results" ON public.results;
DROP POLICY IF EXISTS "Allow public select results" ON public.results;
DROP POLICY IF EXISTS "Allow public update predictions" ON public.predictions;
DROP POLICY IF EXISTS "Instructors read all students" ON public.students;
DROP POLICY IF EXISTS "Instructors read all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Instructors read all predictions" ON public.predictions;
DROP POLICY IF EXISTS "Instructors read all results" ON public.results;

-- 6. Create policies for students table
CREATE POLICY "Allow public insert to students" ON public.students 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select students" ON public.students 
    FOR SELECT TO anon USING (true);

-- 7. Create policies for sessions table
CREATE POLICY "Allow public insert to sessions" ON public.sessions 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select/update sessions" ON public.sessions 
    FOR ALL TO anon USING (true);

-- 8. Create policies for predictions table
CREATE POLICY "Allow public insert to predictions" ON public.predictions 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select predictions" ON public.predictions 
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public update predictions" ON public.predictions 
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 9. Create policies for results table
CREATE POLICY "Allow public insert to results" ON public.results 
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public select results" ON public.results 
    FOR SELECT TO anon USING (true);

-- 10. Create policies for authenticated instructors (full select access)
CREATE POLICY "Instructors read all students" ON public.students
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors read all sessions" ON public.sessions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors read all predictions" ON public.predictions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors read all results" ON public.results
    FOR SELECT TO authenticated USING (true);
