-- Message attachments: private bucket + conversation-scoped Storage policies
-- Object path: `conversations/{conversation_id}/{message_id}/{uuid}_{filename}`

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('message-attachments', 'message-attachments', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Policies: allow participants of the conversation to insert/select/delete objects
DROP POLICY IF EXISTS "ma_participants_insert" ON storage.objects;
DROP POLICY IF EXISTS "ma_participants_select" ON storage.objects;
DROP POLICY IF EXISTS "ma_participants_delete" ON storage.objects;

CREATE POLICY "ma_participants_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = 'conversations'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND auth.uid() IN (c.participant_1_id, c.participant_2_id)
  )
);

CREATE POLICY "ma_participants_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = 'conversations'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND auth.uid() IN (c.participant_1_id, c.participant_2_id)
  )
);

CREATE POLICY "ma_participants_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = 'conversations'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND auth.uid() IN (c.participant_1_id, c.participant_2_id)
  )
);

