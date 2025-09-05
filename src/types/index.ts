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

export interface TextUpdate {
  id: string;
  created_at: string;
  content: string; // Markdown content
  user_id: string | null;
}

// Combined timeline item type for chronological sorting
export type TimelineItem = DesignEntry | TextUpdate;

// Type guard functions
export function isDesignEntry(item: TimelineItem): item is DesignEntry {
  return 'image_url' in item;
}

export function isTextUpdate(item: TimelineItem): item is TextUpdate {
  return 'content' in item && !('image_url' in item);
}