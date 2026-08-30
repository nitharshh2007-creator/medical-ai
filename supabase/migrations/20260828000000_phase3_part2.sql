-- Phase 3 Part 2: Live Q&A Quiz

-- 1. Modify quiz_rooms
ALTER TABLE public.quiz_rooms
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMP WITH TIME ZONE;

-- 2. Create quiz_questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    question_order INTEGER NOT NULL UNIQUE
);

-- Insert 10 sample questions
INSERT INTO public.quiz_questions (question_text, options, correct_answer, question_order) VALUES
('A patient has pneumonia, but the model predicts normal. What is this?', '["True Positive", "False Positive", "True Negative", "False Negative"]', 'False Negative', 1),
('A model predicts every X-ray as normal in a dataset that is 95% normal. What is the main issue?', '["High accuracy, low recall", "Low accuracy, high recall", "High precision, high recall", "Low precision, low accuracy"]', 'High accuracy, low recall', 2),
('Which error is usually more concerning when detecting pneumonia?', '["False Positive", "False Negative", "True Positive", "True Negative"]', 'False Negative', 3),
('A healthy patient is classified as having pneumonia. What is this?', '["True Positive", "False Positive", "True Negative", "False Negative"]', 'False Positive', 4),
('AI probability = 0.62, threshold = 0.50. What is the prediction?', '["Pneumonia", "Normal", "Uncertain", "Unclassified"]', 'Pneumonia', 5),
('AI probability = 0.62, threshold changes from 0.50 to 0.70. What happens?', '["Pneumonia → Normal", "Normal → Pneumonia", "Pneumonia → Pneumonia", "Normal → Normal"]', 'Pneumonia → Normal', 6),
('A model performs well on Hospital A scans but poorly on Hospital B scans. What is the most likely concern?', '["Dataset Bias", "Class Imbalance", "Threshold Error", "Label Accuracy"]', 'Dataset Bias', 7),
('A team lowers the pneumonia threshold. What is the most likely effect?', '["Recall increases, false negatives decrease", "Recall decreases, false negatives increase", "Precision increases, false positives decrease", "Precision decreases, false negatives increase"]', 'Recall increases, false negatives decrease', 8),
('A model identifies 81 of 90 pneumonia cases. What is its recall?', '["81%", "85%", "90%", "95%"]', '90%', 9),
('A model has high recall but many false positives. What is the most appropriate deployment role?', '["Final diagnostic decision", "Independent treatment decision", "Human-review support", "Autonomous patient screening"]', 'Human-review support', 10)
ON CONFLICT (question_order) DO UPDATE SET 
  question_text = EXCLUDED.question_text,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer;

-- 3. Create quiz_answers table
CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_room_id UUID NOT NULL REFERENCES public.quiz_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    answer TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    response_time NUMERIC NOT NULL,
    points NUMERIC NOT NULL DEFAULT 0,
    CONSTRAINT unique_room_student_question UNIQUE (quiz_room_id, student_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_answers_room_id ON public.quiz_answers(quiz_room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_student_id ON public.quiz_answers(student_id);

-- Enable RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.quiz_questions TO anon;
GRANT SELECT ON public.quiz_questions TO authenticated;

GRANT SELECT, INSERT ON public.quiz_answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;

-- Policies for quiz_questions
DROP POLICY IF EXISTS "Allow public select on quiz_questions" ON public.quiz_questions;
CREATE POLICY "Allow public select on quiz_questions" ON public.quiz_questions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Instructors full access to quiz_questions" ON public.quiz_questions;
CREATE POLICY "Instructors full access to quiz_questions" ON public.quiz_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for quiz_answers
DROP POLICY IF EXISTS "Allow public select on quiz_answers" ON public.quiz_answers;
CREATE POLICY "Allow public select on quiz_answers" ON public.quiz_answers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow public insert to quiz_answers" ON public.quiz_answers;
CREATE POLICY "Allow public insert to quiz_answers" ON public.quiz_answers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Instructors full access to quiz_answers" ON public.quiz_answers;
CREATE POLICY "Instructors full access to quiz_answers" ON public.quiz_answers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add to publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_rooms;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_participants;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_answers;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 4. RPCs

-- Advance Quiz State
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
        -- Wait for 10 seconds.
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
            END IF;
        END IF;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION advance_quiz_state(UUID) TO anon, authenticated;

-- Submit Quiz Answer
CREATE OR REPLACE FUNCTION submit_quiz_answer(
    p_room_id UUID, 
    p_student_id UUID, 
    p_question_id UUID, 
    p_answer TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room RECORD;
    v_question RECORD;
    v_now TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
    v_response_time NUMERIC;
    v_is_correct BOOLEAN := FALSE;
    v_points NUMERIC := 0;
BEGIN
    SELECT * INTO v_room FROM public.quiz_rooms WHERE id = p_room_id;
    IF NOT FOUND OR v_room.status != 'active' THEN
        RETURN;
    END IF;

    SELECT * INTO v_question FROM public.quiz_questions WHERE id = p_question_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_response_time := EXTRACT(EPOCH FROM (v_now - v_room.question_started_at));
    
    IF p_answer IS NOT NULL AND p_answer = v_question.correct_answer THEN
        v_is_correct := TRUE;
        -- Cap points between 1 and 1000 if answered in time
        IF v_response_time <= 10.5 THEN -- Small grace period
            v_points := ROUND(1000 * (1 - (v_response_time / 10.0)));
            IF v_points < 1 THEN
                v_points := 1;
            END IF;
            IF v_points > 1000 THEN
                v_points := 1000;
            END IF;
        ELSE
            v_points := 0; 
        END IF;
    END IF;

    INSERT INTO public.quiz_answers (quiz_room_id, student_id, question_id, answer, is_correct, answered_at, response_time, points)
    VALUES (p_room_id, p_student_id, p_question_id, p_answer, v_is_correct, v_now, v_response_time, v_points)
    ON CONFLICT (quiz_room_id, student_id, question_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_quiz_answer(UUID, UUID, UUID, TEXT) TO anon, authenticated;
