-- Create the design-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-images',
  'design-images', 
  true,  -- Make bucket public
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read access for design images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload design images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own design images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own design images" ON storage.objects;

-- Create storage policy to allow anyone to view/download files (needed for OpenAI access)
CREATE POLICY "Public read access for design images" ON storage.objects
  FOR SELECT USING (bucket_id = 'design-images');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload design images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'design-images' AND 
    auth.role() = 'authenticated'
  );

-- Allow users to update their own files (for potential future features)
CREATE POLICY "Users can update their own design images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'design-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files (for potential future features)  
CREATE POLICY "Users can delete their own design images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'design-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );