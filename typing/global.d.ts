declare interface ZoteroPromise {
  promise: Promise<void>;
  resolve: () => void;
}
