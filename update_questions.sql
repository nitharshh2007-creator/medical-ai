-- Run this in your Supabase SQL Editor to update your existing database with the 10 new questions.

-- Clear existing questions if needed (optional, the ON CONFLICT handles it)
-- DELETE FROM public.quiz_questions;

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
