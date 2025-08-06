-- Create storage bucket for design images
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-images', 'design-images', true);

-- Create policies for the design-images bucket
CREATE POLICY "Give users access to own folder in design-images bucket" ON storage.objects
FOR ALL USING (
  bucket_id = 'design-images' AND 
  (auth.uid() IS NULL OR auth.uid()::text = (storage.foldername(name))[1])
);

-- Allow anonymous uploads (for non-authenticated users)
CREATE POLICY "Allow anonymous uploads to design-images bucket" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'design-images'
);

-- Allow public access to view images
CREATE POLICY "Give public access to design-images bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'design-images');