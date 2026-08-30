-- Migration to add batch tracking for Phase 3 isolation

-- 1. Add batch column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS batch TEXT;

-- Index for filtering students by batch (useful for instructor dashboard)
CREATE INDEX IF NOT EXISTS idx_students_batch ON public.students(batch);

-- 2. Add batch column to quiz_rooms table
ALTER TABLE public.quiz_rooms 
ADD COLUMN IF NOT EXISTS batch TEXT;

-- Index for finding active rooms by batch
CREATE INDEX IF NOT EXISTS idx_quiz_rooms_batch ON public.quiz_rooms(batch);
