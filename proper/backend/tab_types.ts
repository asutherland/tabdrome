export type TabTag = string;

export interface TabDataBundle {
  tags: Array<TabTag>;
  antiTags: Array<TabTag>;
  simpleVars: Record<string, any>;
  schemaPayloads: Record<string, any>;
}

export type BrowserWindowID = number;
export type BrowserTabID = number | null;
export type BrowserExtensionID = string;
export type BrowserCookieStoreID = string;
export type BrowserSessionID = string;
export type SUID = string;
export type Timestamp = number;
export type WindowID = number;

export type StringObjDict = Record<string, string>;
export type AnyObjDict = Record<string, any>;

export interface ParsedURL {
  href: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
  origin: string;
  searchParams: StringObjDict;
}

export interface NormTab {
  id: BrowserTabID;
  suid: SUID;
  serial: number;
  createdTS: Timestamp;
  windowId: WindowID;
  index: number;
  openerTabId: BrowserTabID;
  active: boolean;
  lastActivatedSerial: number;
  pinned: boolean;
  parsedUrl: ParsedURL;
  title: string;
  favIconUrl: string;
  status: string;
  incognito: boolean;
  audible: boolean;
  muted: boolean;
  mutedReason: string;
  mutedExtensionId: BrowserExtensionID;
  cookieStoreId: BrowserCookieStoreID;
  sessionId: BrowserSessionID;
  width: number;
  height: number;
  fromContent: AnyObjDict;
}


export interface AnnoTab {
  normTab: NormTab;
  tabMeta: TabDataBundle;
  siteMeta: TabDataBundle;
  dug: TabDataBundle;
  searched: TabDataBundle;
  analyzed: TabDataBundle;
  aggr: TabDataBundle;
}

export interface GlomShadowData {
  tabMetaLookedUp: boolean;
  digger: any;
}

export type Bucket = any;

export interface GlomTab {
  suid: SUID;
  annoTab: AnnoTab;
  shadow: GlomShadowData;
  topLevelBuckets: Set<Bucket>;
}