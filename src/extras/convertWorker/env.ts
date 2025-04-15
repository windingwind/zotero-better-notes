import { parseHTML, DOMParser } from "linkedom";

globalThis.document = parseHTML("...").document;
// @ts-ignore
globalThis.DOMParser = DOMParser;
// @ts-ignore
globalThis._fakeDOM = true;
