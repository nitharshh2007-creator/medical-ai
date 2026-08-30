-- Fix permissions for authenticated role so instructors can also insert records
-- This prevents "permission denied" errors when an instructor opens a student tab in the same browser

-- 1. Grant table privileges to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threshold_history TO authenticated;

-- 2. Drop old SELECT-only policies
DROP POLICY IF EXISTS "Instructors read all students" ON public.students;
DROP POLICY IF EXISTS "Instructors read all sessions" ON public.sessions;
DROP POLICY IF EXISTS "Instructors read all predictions" ON public.predictions;
DROP POLICY IF EXISTS "Instructors read all results" ON public.results;
DROP POLICY IF EXISTS "Instructors read all model_evaluations" ON public.model_evaluations;
DROP POLICY IF EXISTS "Instructors read all threshold_history" ON public.threshold_history;

-- 3. Create ALL policies for authenticated (Drop first to make it idempotent)
DROP POLICY IF EXISTS "Instructors full access to students" ON public.students;
CREATE POLICY "Instructors full access to students" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to sessions" ON public.sessions;
CREATE POLICY "Instructors full access to sessions" ON public.sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to predictions" ON public.predictions;
CREATE POLICY "Instructors full access to predictions" ON public.predictions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to results" ON public.results;
CREATE POLICY "Instructors full access to results" ON public.results FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to model_evaluations" ON public.model_evaluations;
CREATE POLICY "Instructors full access to model_evaluations" ON public.model_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to threshold_history" ON public.threshold_history;
CREATE POLICY "Instructors full access to threshold_history" ON public.threshold_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
