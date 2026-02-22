export interface Document {
  id: string;
  display_title?: string;
  title?: string;
  docdt?: string;
  count?: string;
  docty?: string;
  abstracts?: {
    'cdata!'?: string;
  };
  project_id?: string;
} 