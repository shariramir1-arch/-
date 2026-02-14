-- Run this migration in the Supabase Dashboard SQL editor
-- (storage.buckets requires service_role access)

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-videos', 'session-videos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for session-videos bucket
CREATE POLICY "Users can upload session videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'session-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their session videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'session-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for reports bucket
CREATE POLICY "Users can upload reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
