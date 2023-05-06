declare interface NoteNodeData {
  id: number;
  level: number;
  name: string;
  lineIndex: number;
  endIndex: number;
  link: string;
}

declare interface NoteStatus {
  meta: string;
  content: string;
  tail: string;
  lastmodify: Date;
}

declare interface SyncStatus {
  path: string;
  filename: string;
  md5: string;
  noteMd5: string;
  lastsync: number;
  itemID: number;
}

declare interface MDStatus {
  meta: {
    version: number;
  } | null;
  content: string;
  filedir: string;
  filename: string;
  lastmodify: Date;
}
