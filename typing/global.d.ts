declare interface XULElementOptions {
  tag: string;
  id?: string;
  styles?: Array<[string, string]>;
  directAttributes?: Array<[string, string | boolean | number]>;
  attributes?: Array<[string, string | boolean | number]>;
  listeners?: Array<
    [
      string,
      EventListenerOrEventListenerObject,
      boolean | AddEventListenerOptions
    ]
  >;
  checkExistanceParent?: HTMLElement;
  ignoreIfExists?: boolean;
  removeIfExists?: boolean;
  customCheck?: () => boolean;
  subElementOptions?: Array<XULElementOptions>;
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

declare interface NoteStatus {
  meta: string;
  content: string;
  tail: string;
  lastmodify: Date;
}

declare interface AnnotationJson {
  authorName: string;
  color: string;
  comment: string;
  dateModified: string;
  image: string;
  imageAttachmentKey: string;
  isAuthorNameAuthoritative: boolean;
  isExternal: boolean;
  id: string;
  key: string;
  lastModifiedByUser: string;
  pageLabel: string;
  position: {
    rects: number[];
  };
  readOnly: boolean;
  sortIndex: any;
  tags: { name: string }[];
  text: string;
  type: string;
  attachmentItemID: number;
}
