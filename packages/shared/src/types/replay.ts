export type ReplayEventType = 
  | 'snapshot'
  | 'mutation'
  | 'input'
  | 'scroll'
  | 'viewport'
  | 'meta';

export interface ReplayEvent {
  t: ReplayEventType;
  ts: number;
  data: any;
}

export interface ReplayChunk {
  session_id: string;
  chunk_index: number;
  from_ms: number;
  to_ms: number;
  size: number;
  events: ReplayEvent[];
}

export interface ReplayManifest {
  version: string;
  project_id: string;
  session_id: string;
  started_at: number;
  duration_ms: number;
  device: {
    class: string;
    vw: number;
    vh: number;
    ua: string;
  };
  paths: string[];
  segments: Array<{
    n: number;
    from: number;
    to: number;
    size: number;
    key: string;
  }>;
  stats: {
    events: number;
    masked_nodes: number;
  };
}