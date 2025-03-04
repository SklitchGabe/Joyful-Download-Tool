export interface Document {
  id: string;
  display_title?: string;
  title?: string;
  docdt?: string;
  count?: string;
  abstracts?: {
    'cdata!'?: string;
  };
  project_id?: string;
} 