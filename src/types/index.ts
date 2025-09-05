export interface DesignEntry {
  id: string;
  created_at: string;
  name: string | null;
  image_url: string | null;
  image_path: string | null;
  context: string | null;
  inquiries: string | null;
  advice: string; // Contains GPT-5 advice from senior critique prompt
  user_id?: string | null;
  design_versions?: DesignVersion[];
}

export interface DesignVersion {
  id: string;
  created_at: string;
  version_number: number;
  image_url: string | null;
  image_path: string | null;
  advice: string; // Contains GPT-5 advice from senior critique prompt
  entry_id: string;
  notes: string | null;
}