export type DeviceClass = 'desktop' | 'mobile' | 'tablet';

export type EventType = 
  | 'page_view'
  | 'click'
  | 'scroll'
  | 'custom'
  | 'identify'
  | 'session_start'
  | 'session_end';

export interface BaseEvent {
  id: string;
  ts: number;
  type: EventType;
  session_id: string;
  anonymous_id: string;
  user_id?: string | null;
  url: string;
  path: string;
  title?: string;
  referrer?: string;
  utm?: Record<string, string>;
  device?: {
    ua?: string;
    mobile?: boolean;
    class?: DeviceClass;
  };
  viewport?: {
    w: number;
    h: number;
  };
}

export interface ClickEvent extends BaseEvent {
  type: 'click';
  x: number;
  y: number;
  selector_hash?: number;
  selector?: string;
  button?: number;
  element_text?: string;
}

export interface ScrollEvent extends BaseEvent {
  type: 'scroll';
  max_depth_pct: number;
  milestones?: number[];
}

export interface PageViewEvent extends BaseEvent {
  type: 'page_view';
  duration?: number;
  prev_path?: string;
}

export interface CustomEvent extends BaseEvent {
  type: 'custom';
  name: string;
  properties?: Record<string, any>;
}

export interface IdentifyEvent extends BaseEvent {
  type: 'identify';
  traits?: Record<string, any>;
}

export type TapistryEvent = 
  | PageViewEvent
  | ClickEvent
  | ScrollEvent
  | CustomEvent
  | IdentifyEvent;

export interface EventBatch {
  sdk: {
    name: string;
    version: string;
  };
  client: {
    tz?: string;
    lang?: string;
    screen?: {
      w: number;
      h: number;
    };
  };
  events: TapistryEvent[];
}