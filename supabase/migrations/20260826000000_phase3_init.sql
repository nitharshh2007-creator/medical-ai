-- Phase 3 Initialization Migration

-- Create quiz_rooms table
CREATE TABLE IF NOT EXISTS public.quiz_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('waiting', 'countdown', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create quiz_participants table
CREATE TABLE IF NOT EXISTS public.quiz_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'READY',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_room_student UNIQUE (quiz_room_id, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_participants_room_id ON public.quiz_participants(quiz_room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_student_id ON public.quiz_participants(student_id);

-- Enable RLS
ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.quiz_rooms TO anon;
GRANT SELECT, INSERT ON public.quiz_participants TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_participants TO authenticated;

-- Policies for quiz_rooms
CREATE POLICY "Allow public select on quiz_rooms" ON public.quiz_rooms
    FOR SELECT TO anon USING (true);

CREATE POLICY "Instructors full access to quiz_rooms" ON public.quiz_rooms
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for quiz_participants
CREATE POLICY "Allow public select on quiz_participants" ON public.quiz_participants
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public insert to quiz_participants" ON public.quiz_participants
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Instructors full access to quiz_participants" ON public.quiz_participants
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for these tables
-- Assuming the publication 'supabase_realtime' exists (it usually does by default on Supabase projects)
-- To be safe, we'll alter the publication if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_participants;
  END IF;
END $$;
