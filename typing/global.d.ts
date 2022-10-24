declare interface ZoteroPromise {
  promise: Promise<void>;
  resolve: () => void;
}

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
