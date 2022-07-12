import { AddonBase, EditorMessage, OutlineType } from "./base";

class AddonViews extends AddonBase {
  progressWindowIcon: object;
  editorIcon: object;
  currentOutline: OutlineType;
  _initIframe: any;
  _texNotes: number[];

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: "chrome://Knowledge4Zotero/skin/favicon.png",
    };
    this.editorIcon = {
      addToKnowledge: `<svg t="1651124422933" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3269" width="24" height="24"><path d="M896.00324 352c70.7 0 128-57.3 128-128 0-70.6-57.4-128-128-128-70.7 0-128 57.3-128 128 0 18.8 4.1 36.7 11.3 52.8 2.7 6 1.4 13.1-3.3 17.8l-24.2 24.2c-5.7 5.7-14.9 6.3-21.2 1.2-38.1-30.1-86.3-48-138.6-48-18.8 0-37.1 2.3-54.6 6.7-6.9 1.7-14.1-1.4-17.7-7.5l-6.6-11.4c-3.4-5.8-2.7-13.1 1.6-18.3 18.6-22.6 29.7-51.6 29.3-83.2C543.10324 89 486.30324 32.6 417.00324 32c-70.6-0.6-128.1 56.1-129 126.3-0.9 69.5 56.5 128.6 126 129.6 9.4 0.1 18.5-0.7 27.4-2.5 6.8-1.4 13.6 1.7 17.1 7.7l2.2 3.8c4 7 2.2 15.9-4.2 20.7-42.4 32.3-73 79.4-84 133.6-1.5 7.4-8.1 12.7-15.7 12.7h-94.1c-6.6 0-12.6-4-14.9-10.2-18.1-48-64.3-82.2-118.5-82.8C58.70324 370.3 0.50324 427.6 0.00324 498.1-0.49676 569.2 57.00324 627 128.00324 627c56.7 0 104.8-36.9 121.6-87.9 2.2-6.6 8.3-11.1 15.2-11.1h92c7.6 0 14.2 5.4 15.7 12.9 9.5 46.7 33.5 88 67 119.2 5.4 5 6.6 13.2 2.9 19.6l-21.7 37.6c-3.7 6.3-11.1 9.4-18.2 7.4-11.1-3.1-22.7-4.7-34.8-4.7-69.7 0.1-127 56.8-127.8 126.6-0.8 71.7 57.4 130 129.1 129.4 69.5-0.6 126.3-57.3 126.9-126.8 0.3-28-8.5-53.9-23.5-75.1-3.6-5.1-3.9-11.8-0.8-17.2l24.9-43.1c3.9-6.7 12-9.7 19.3-7 23.7 8.6 49.3 13.2 76 13.2 34.9 0 67.9-8 97.3-22.2 7.6-3.7 16.7-0.9 20.9 6.4l37 64c-26.3 23.5-43 57.7-43 95.8 0 70.9 58 128.5 128.9 128 69.7-0.5 126.2-56.7 127.1-126.3 0.9-70.1-57-129.3-127.1-129.7-6.2 0-12.3 0.4-18.3 1.2-6.5 0.9-12.8-2.2-16.1-7.8l-39.2-67.9c-3.4-5.9-2.7-13.3 1.7-18.4 34.2-39.3 54.9-90.7 54.9-147 0-38.9-9.9-75.5-27.4-107.4-3.4-6.2-2.2-13.9 2.8-18.9l28.4-28.4c4.9-4.9 12.4-6 18.7-2.9 17.4 8.6 36.9 13.5 57.6 13.5z m0-192c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM128.00324 563c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m240 349c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m464-112c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM416.00324 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m289.1 385.1C674.90324 639.4 634.70324 656 592.00324 656s-82.9-16.6-113.1-46.9C448.60324 578.9 432.00324 538.7 432.00324 496s16.6-82.9 46.9-113.1C509.10324 352.6 549.30324 336 592.00324 336s82.9 16.6 113.1 46.9C735.40324 413.1 752.00324 453.3 752.00324 496s-16.6 82.9-46.9 113.1z" p-id="3270" fill="currentColor"></path></svg>`,
      addCitation: `<svg t="1652702140873" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="24" height="24"><path d="M479.615429 372.021945l0 155.216107c-8.769734 78.782298-47.084365 113.813139-114.89068 124.738979L364.724749 599.455841c21.849634-2.15406 36.108383-18.566868 42.673915-49.239448l0-22.978341-72.204485 0L335.194178 372.021945 479.615429 372.021945zM688.806845 372.021945l0 155.216107c-8.769734 76.628238-47.084365 111.608937-114.891703 124.738979L573.915142 599.455841c8.720615-2.15406 17.49035-8.719592 26.261107-19.695574 8.720615-10.92584 14.207583-20.773116 16.412808-29.543873l0-22.978341-71.120804 0L545.468253 372.021945 688.806845 372.021945z" p-id="2081" fill="currentColor"></path></svg>`,
      notMainKnowledge: `<svg t="1651124314636" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1689" width="24" height="24"><path d="M877.44 383.786667L624.426667 117.333333C594.986667 86.186667 554.88 69.12 512 69.12s-82.986667 17.066667-112.426667 48.213333L146.56 383.786667a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V485.973333c0-38.186667-14.506667-74.453333-40.96-102.186666z m-44.373333 404.266666c0 38.826667-31.573333 70.186667-70.186667 70.186667H261.333333c-38.826667 0-70.186667-31.573333-70.186666-70.186667V485.973333c0-16.213333 6.186667-31.786667 17.28-43.52L461.44 176c13.226667-13.866667 31.146667-21.546667 50.56-21.546667s37.333333 7.68 50.56 21.76l253.013333 266.453334c11.306667 11.733333 17.28 27.306667 17.28 43.52v301.866666z" p-id="1690" fill="currentColor"></path><path d="M608 687.786667h-192c-23.466667 0-42.666667 19.2-42.666667 42.666666s19.2 42.666667 42.666667 42.666667h192c23.466667 0 42.666667-19.2 42.666667-42.666667s-19.2-42.666667-42.666667-42.666666z" p-id="1691" fill="currentColor"></path></svg>`,
      isMainKnowledge: `<svg t="1651124352868" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1850" width="24" height="24"><path d="M877.44 388.053333L624.426667 121.813333C594.986667 90.666667 554.88 73.386667 512 73.386667s-82.986667 17.066667-112.426667 48.213333L146.56 388.053333a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V490.453333c0-38.4-14.506667-74.666667-40.96-102.4zM608 777.386667h-192c-23.466667 0-42.666667-19.2-42.666667-42.666667s19.2-42.666667 42.666667-42.666667h192c23.466667 0 42.666667 19.2 42.666667 42.666667s-19.2 42.666667-42.666667 42.666667z" p-id="1851" fill="currentColor"></path></svg>`,
      openAttachment: `<svg t="1651595553273" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7641" width="24" height="24"><path d="M950.857143 537.892571a293.924571 293.924571 0 0 0-73.142857-59.904V292.571429l-146.285715-146.285715H146.285714v731.428572h331.702857c15.945143 27.538286 36.205714 52.224 59.904 73.142857H146.285714a73.142857 73.142857 0 0 1-73.142857-73.142857V146.285714a73.142857 73.142857 0 0 1 73.142857-73.142857h621.714286l182.857143 182.857143v281.892571z m-93.549714 266.166858l82.505142 82.541714a37.668571 37.668571 0 0 1-53.211428 53.211428l-82.541714-82.505142a188.233143 188.233143 0 1 1 53.248-53.248z m-47.213715-101.449143a109.714286 109.714286 0 1 0-219.428571 0 109.714286 109.714286 0 0 0 219.428571 0zM202.605714 286.354286h49.371429v24.137143h0.731428c6.326857-10.24 14.372571-17.664 24.137143-22.308572s20.48-6.948571 32.182857-6.948571c14.884571 0 27.684571 2.816 38.4 8.411428 10.715429 5.595429 19.638857 13.056 26.697143 22.308572 7.058286 9.252571 12.324571 20.041143 15.725715 32.365714 3.401143 12.324571 5.12 25.161143 5.12 38.582857 0 12.690286-1.718857 24.868571-5.12 36.571429-3.401143 11.702857-8.594286 22.052571-15.542858 31.085714s-15.616 16.201143-25.965714 21.577143c-10.349714 5.376-22.491429 8.045714-36.388571 8.045714-11.702857 0-22.491429-2.377143-32.365715-7.131428a61.257143 61.257143 0 0 1-24.32-21.028572h-0.731428v89.6H202.605714V286.354286z m358.4 164.937143h-0.731428c-6.107429 10.24-14.08 17.627429-23.954286 22.125714s-21.028571 6.765714-33.462857 6.765714a80.822857 80.822857 0 0 1-37.302857-8.228571 74.898286 74.898286 0 0 1-26.514286-22.308572 101.229714 101.229714 0 0 1-15.725714-32.365714 135.862857 135.862857 0 0 1-5.302857-38.034286c0-12.690286 1.755429-24.941714 5.302857-36.754285 3.547429-11.812571 8.777143-22.235429 15.725714-31.268572s15.652571-16.274286 26.148571-21.76c10.496-5.485714 22.674286-8.228571 36.571429-8.228571 11.227429 0 21.869714 2.377143 32 7.131428s18.102857 11.776 23.954286 21.028572h0.731428v-95.085715h51.931429V475.428571h-49.371429v-24.137142z m99.84-130.194286h-31.085714v-34.742857h31.085714v-14.628572c0-16.822857 5.229714-30.610286 15.725715-41.325714 10.496-10.715429 26.331429-16.091429 47.542857-16.091429 4.644571 0 9.252571 0.182857 13.897143 0.548572 4.644571 0.365714 9.142857 0.658286 13.531428 0.914286v38.765714c-6.107429-0.731429-12.434286-1.097143-19.017143-1.097143-7.058286 0-12.141714 1.645714-15.177143 4.937143-3.035429 3.291429-4.571429 8.850286-4.571428 16.64v11.337143h35.84v34.742857h-35.84V475.428571h-51.931429V321.097143z m-362.788571 120.32c8.521143 0 15.652571-1.718857 21.394286-5.12 5.741714-3.401143 10.349714-7.862857 13.897142-13.348572 3.547429-5.485714 6.034286-11.885714 7.497143-19.2 1.462857-7.314286 2.194286-14.738286 2.194286-22.308571 0-7.570286-0.804571-14.994286-2.377143-22.308571a59.392 59.392 0 0 0-7.862857-19.565715 43.812571 43.812571 0 0 0-14.08-13.897143 39.314286 39.314286 0 0 0-21.028571-5.302857c-8.521143 0-15.652571 1.755429-21.394286 5.302857a42.678857 42.678857 0 0 0-13.897143 13.714286c-3.547429 5.595429-6.034286 12.068571-7.497143 19.382857-1.462857 7.314286-2.194286 14.884571-2.194286 22.674286 0 7.570286 0.804571 14.994286 2.377143 22.308571 1.572571 7.314286 4.132571 13.714286 7.68 19.2 3.547429 5.485714 8.228571 9.947429 14.08 13.348572 5.851429 3.401143 12.909714 5.12 21.211429 5.12z m262.217143-61.074286c0-7.789714-0.731429-15.286857-2.194286-22.491428a54.966857 54.966857 0 0 0-7.497143-19.017143 42.203429 42.203429 0 0 0-13.714286-13.348572 40.228571 40.228571 0 0 0-21.211428-5.12c-8.521143 0-15.725714 1.718857-21.577143 5.12-5.851429 3.401143-10.532571 7.936-14.08 13.531429a59.794286 59.794286 0 0 0-7.68 19.2 104.228571 104.228571 0 0 0-2.377143 22.491428c0 7.314286 0.841143 14.628571 2.56 21.942858 1.718857 7.314286 4.461714 13.824 8.228572 19.565714 3.766857 5.741714 8.521143 10.349714 14.262857 13.897143 5.741714 3.547429 12.617143 5.302857 20.662857 5.302857 8.521143 0 15.652571-1.718857 21.394286-5.12 5.741714-3.401143 10.313143-7.972571 13.714285-13.714286a61.44 61.44 0 0 0 7.314286-19.565714c1.462857-7.314286 2.194286-14.884571 2.194286-22.674286z" p-id="7642" fill="currentColor"></path></svg>`,
      addAnnotationNote: `<svg t="1651630304116" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="14011" width="16" height="16"><path d="M791.30324 369.7c-5 5-6.2 12.7-2.8 18.9 17.5 31.9 27.4 68.5 27.4 107.4 0 56.2-20.7 107.6-54.9 147-4.5 5.1-5.1 12.6-1.8 18.4l39.2 67.9c3.3 5.7 9.6 8.7 16.1 7.8 6-0.8 12.1-1.2 18.3-1.2 70.1 0.5 128 59.7 127.1 129.7-0.9 69.7-57.4 125.9-127.1 126.4-70.9 0.5-128.9-57.1-128.9-128 0-38.1 16.7-72.3 43.1-95.8l-37-64c-4.2-7.3-13.3-10-20.9-6.4-29.3 14.2-62.3 22.2-97.2 22.2-26.7 0-52.3-4.7-76-13.2-7.3-2.6-15.4 0.3-19.3 7l-24.9 43.1c-3.1 5.4-2.8 12.1 0.8 17.2 15 21.2 23.7 47.1 23.5 75.1-0.7 69.5-57.5 126.2-127 126.8-71.6 0.6-129.8-57.7-129.1-129.4 0.8-69.7 58-126.5 127.8-126.6 12 0 23.7 1.6 34.8 4.7 7 2 14.5-1.1 18.2-7.4l21.7-37.6c3.7-6.4 2.5-14.6-2.9-19.6-33.6-31.2-57.5-72.6-67-119.2-1.5-7.5-8-12.9-15.7-12.9h-92c-6.9 0-13.1 4.5-15.2 11.1C232.80324 590.2 184.70324 627 128.00324 627 57.00324 627-0.49676 569.2 0.00324 498.1 0.40324 427.5 58.60324 370.3 129.20324 371c54.2 0.5 100.4 34.8 118.5 82.8C250.00324 460 256.00324 464 262.60324 464h94.1c7.6 0 14.2-5.3 15.7-12.7 11-54.2 41.5-101.3 84-133.6 6.4-4.9 8.2-13.8 4.2-20.8l-2.2-3.8c-3.5-6-10.3-9-17.1-7.7-8.8 1.8-18 2.7-27.4 2.5-69.5-1-126.9-60.1-126-129.6 0.9-70.3 58.4-126.9 129-126.3 69.3 0.6 126 57 127 126.2 0.4 31.6-10.6 60.7-29.3 83.2-4.3 5.2-5 12.5-1.6 18.3l6.6 11.4c3.6 6.2 10.8 9.3 17.7 7.5 17.5-4.4 35.8-6.7 54.6-6.7 52.3 0 100.4 17.9 138.6 48 6.4 5 15.5 4.5 21.2-1.2l24.2-24.2c4.7-4.7 6-11.8 3.3-17.8-7.3-16.1-11.3-34-11.3-52.8 0-70.7 57.3-128 128-128 70.6 0 128 57.4 128 128 0 70.7-57.3 128-128 128-20.7 0-40.2-4.9-57.5-13.6-6.2-3.1-13.7-2-18.7 2.9l-28.4 28.5z" p-id="14012" fill="#ffd400"></path></svg>`,
      copyImageAnnotation: `<svg t="1655528926458" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="9586" width="16" height="16"><path d="M808.768 197.312c10.432 0 17.408 6.912 17.408 17.344l0 485.568c0 10.368-6.976 17.344-17.408 17.344l-87.296 0c-19.136 0-34.944 15.552-34.944 34.624 0 19.136 15.808 34.688 34.944 34.688l104.768 0c38.464 0 69.824-31.168 69.824-69.312l0-520.32C896 159.168 864.64 128 826.176 128l-384 0c-38.4 0-69.824 31.232-69.824 69.312l0 34.688c0 19.072 15.68 34.688 34.88 34.688 19.2 0 34.88-15.616 34.88-34.688L442.112 214.656c0-10.432 6.976-17.344 17.408-17.344L808.768 197.312z" p-id="9587" fill="#ffd400"></path><path d="M128 363.968l0 469.376C128 867.84 160.32 896 199.808 896l394.944 0c39.488 0 71.872-28.16 71.872-62.656L666.624 363.968c0-34.432-32.384-62.592-71.872-62.592L199.808 301.376C160.32 301.376 128 329.536 128 363.968z" p-id="9588" fill="#ffd400"></path></svg>`,
      switchTex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.cls-1{fill-opacity: 0;}.cls-2{fill:currentColor;}</style></defs><rect class="cls-1" width="24" height="24"/><path class="cls-2" d="M9,7.1H2.33L2.14,9.56H2.4c.15-1.77.32-2.14,2-2.14a3.39,3.39,0,0,1,.59,0c.23,0,.23.16.23.41v5.77c0,.37,0,.53-1.15.53H3.61v.34c.45,0,1.56,0,2.06,0s1.64,0,2.09,0v-.34H7.32c-1.15,0-1.15-.16-1.15-.53V7.86c0-.22,0-.37.19-.41a3.9,3.9,0,0,1,.63,0c1.65,0,1.81.37,2,2.14h.27L9,7.1Z"/><path class="cls-2" d="M14.91,14.15h-.27c-.28,1.68-.53,2.48-2.41,2.48H10.78c-.52,0-.54-.08-.54-.44V13.27h1c1.06,0,1.19.35,1.19,1.28h.27v-2.9h-.27c0,.94-.13,1.28-1.19,1.28h-1V10.3c0-.36,0-.44.54-.44h1.41c1.68,0,2,.61,2.14,2.13h.27l-.3-2.46H8.14v.33H8.4c.84,0,.86.12.86.52v5.73c0,.4,0,.52-.86.52H8.14V17h6.31Z"/><path class="cls-2" d="M18.22,10.27l1.5-2.2a1.67,1.67,0,0,1,1.58-.71V7H18.69v.33c.44,0,.68.25.68.5a.37.37,0,0,1-.1.26L18,10,16.61,7.85a.46.46,0,0,1-.07-.16c0-.13.24-.32.7-.33V7c-.37,0-1.18,0-1.59,0s-1,0-1.43,0v.33h.21c.6,0,.81.08,1,.38l2,3-1.79,2.64a1.67,1.67,0,0,1-1.58.73v.34H16.7v-.34c-.5,0-.69-.31-.69-.51s0-.14.11-.26l1.55-2.3,1.73,2.62s.06.09.06.12-.24.32-.72.33v.34c.39,0,1.19,0,1.6,0s1,0,1.42,0v-.34h-.2c-.58,0-.81-.06-1-.4l-2.3-3.49Z"/></svg>`,
      switchEditor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.cls-1{fill:currentColor;}.cls-2{filter:invert(100%)}</style></defs><rect class="cls-1" width="24" height="24"/><path class="cls-2" d="M9,7.1H2.33L2.14,9.56H2.4c.15-1.77.32-2.14,2-2.14a3.39,3.39,0,0,1,.59,0c.23,0,.23.16.23.41v5.77c0,.37,0,.53-1.15.53H3.61v.34c.45,0,1.56,0,2.06,0s1.64,0,2.09,0v-.34H7.32c-1.15,0-1.15-.16-1.15-.53V7.86c0-.22,0-.37.19-.41a3.9,3.9,0,0,1,.63,0c1.65,0,1.81.37,2,2.14h.27L9,7.1Z"/><path class="cls-2" d="M14.91,14.15h-.27c-.28,1.68-.53,2.48-2.41,2.48H10.78c-.52,0-.54-.08-.54-.44V13.27h1c1.06,0,1.19.35,1.19,1.28h.27v-2.9h-.27c0,.94-.13,1.28-1.19,1.28h-1V10.3c0-.36,0-.44.54-.44h1.41c1.68,0,2,.61,2.14,2.13h.27l-.3-2.46H8.14v.33H8.4c.84,0,.86.12.86.52v5.73c0,.4,0,.52-.86.52H8.14V17h6.31Z"/><path class="cls-2" d="M18.22,10.27l1.5-2.2a1.67,1.67,0,0,1,1.58-.71V7H18.69v.33c.44,0,.68.25.68.5a.37.37,0,0,1-.1.26L18,10,16.61,7.85a.46.46,0,0,1-.07-.16c0-.13.24-.32.7-.33V7c-.37,0-1.18,0-1.59,0s-1,0-1.43,0v.33h.21c.6,0,.81.08,1,.38l2,3-1.79,2.64a1.67,1.67,0,0,1-1.58.73v.34H16.7v-.34c-.5,0-.69-.31-.69-.51s0-.14.11-.26l1.55-2.3,1.73,2.62s.06.09.06.12-.24.32-.72.33v.34c.39,0,1.19,0,1.6,0s1,0,1.42,0v-.34h-.2c-.58,0-.81-.06-1-.4l-2.3-3.49Z"/></svg>`,
      export: `<svg t="1651322116327" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11894" width="24" height="24"><path d="M849.2 599v217H178.5V599c-0.7-23.7-20.1-42.7-44-42.7s-43.3 19-44 42.7v252.5c0 28.9 23.6 52.5 52.5 52.5h741.7c28.9 0 52.5-23.6 52.5-52.5V599c-0.7-23.7-20.1-42.7-44-42.7s-43.3 19-44 42.7z" fill="currentColor" p-id="11895"></path><path d="M482.7 135.4l-164 164c-17.1 17.1-17.1 45.1 0 62.2s45.1 17.1 62.2 0l85.7-85.7v314.8c0 26 21.3 47.2 47.2 47.2 26 0 47.2-21.3 47.2-47.2V276l85.7 85.7c17.1 17.1 45.1 17.1 62.2 0s17.1-45.1 0-62.2l-164-164c-17.1-17.2-45.1-17.2-62.2-0.1z" fill="currentColor" p-id="11896"></path></svg>`,
      close: `<svg t="1651331457107" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12754" width="24" height="24"><path d="M557.311759 513.248864l265.280473-263.904314c12.54369-12.480043 12.607338-32.704421 0.127295-45.248112-12.512727-12.576374-32.704421-12.607338-45.248112-0.127295L512.127295 467.904421 249.088241 204.063755c-12.447359-12.480043-32.704421-12.54369-45.248112-0.063647-12.512727 12.480043-12.54369 32.735385-0.063647 45.280796l262.975407 263.775299-265.151458 263.744335c-12.54369 12.480043-12.607338 32.704421-0.127295 45.248112 6.239161 6.271845 14.463432 9.440452 22.687703 9.440452 8.160624 0 16.319527-3.103239 22.560409-9.311437l265.216826-263.807983 265.440452 266.240344c6.239161 6.271845 14.432469 9.407768 22.65674 9.407768 8.191587 0 16.352211-3.135923 22.591372-9.34412 12.512727-12.480043 12.54369-32.704421 0.063647-45.248112L557.311759 513.248864z" fill="currentColor" p-id="12755"></path></svg>`,
      openWorkspaceCollectionView: `<svg t="1651317033804" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2432" width="100%" height="100%"><path d="M874.9 459.4c-18.8 0-34 15.2-34 34v355.7c0 18.6-15.5 33.7-34.5 33.7H181.5c-19 0-34.5-15.1-34.5-33.7V232.3c0-18.6 15.5-33.7 34.5-33.7H541c18.8 0 34-15.2 34-34s-15.2-34-34-34H181.5C125 130.6 79 176.2 79 232.3v616.8c0 56 46 101.7 102.5 101.7h624.9c56.5 0 102.5-45.6 102.5-101.7V493.4c0-18.8-15.2-34-34-34z" fill="currentColor" p-id="2433"></path><path d="M885.5 82.7H657.1c-18.8 0-34 15.2-34 34s15.2 34 34 34h169.7L358.5 619.1c-13.3 13.3-13.3 34.8 0 48.1 6.6 6.6 15.3 10 24 10s17.4-3.3 24-10l470-470v169.7c0 18.8 15.2 34 34 34s34-15.2 34-34V141.5c0.1-32.4-26.4-58.8-59-58.8z" fill="currentColor" p-id="2434"></path></svg>`,
      tabIcon: `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="icon icon-bg"><path d="M791.30324 369.7c-5 5-6.2 12.7-2.8 18.9 17.5 31.9 27.4 68.5 27.4 107.4 0 56.2-20.7 107.6-54.9 147-4.5 5.1-5.1 12.6-1.8 18.4l39.2 67.9c3.3 5.7 9.6 8.7 16.1 7.8 6-0.8 12.1-1.2 18.3-1.2 70.1 0.5 128 59.7 127.1 129.7-0.9 69.7-57.4 125.9-127.1 126.4-70.9 0.5-128.9-57.1-128.9-128 0-38.1 16.7-72.3 43.1-95.8l-37-64c-4.2-7.3-13.3-10-20.9-6.4-29.3 14.2-62.3 22.2-97.2 22.2-26.7 0-52.3-4.7-76-13.2-7.3-2.6-15.4 0.3-19.3 7l-24.9 43.1c-3.1 5.4-2.8 12.1 0.8 17.2 15 21.2 23.7 47.1 23.5 75.1-0.7 69.5-57.5 126.2-127 126.8-71.6 0.6-129.8-57.7-129.1-129.4 0.8-69.7 58-126.5 127.8-126.6 12 0 23.7 1.6 34.8 4.7 7 2 14.5-1.1 18.2-7.4l21.7-37.6c3.7-6.4 2.5-14.6-2.9-19.6-33.6-31.2-57.5-72.6-67-119.2-1.5-7.5-8-12.9-15.7-12.9h-92c-6.9 0-13.1 4.5-15.2 11.1C232.80324 590.2 184.70324 627 128.00324 627 57.00324 627-0.49676 569.2 0.00324 498.1 0.40324 427.5 58.60324 370.3 129.20324 371c54.2 0.5 100.4 34.8 118.5 82.8C250.00324 460 256.00324 464 262.60324 464h94.1c7.6 0 14.2-5.3 15.7-12.7 11-54.2 41.5-101.3 84-133.6 6.4-4.9 8.2-13.8 4.2-20.8l-2.2-3.8c-3.5-6-10.3-9-17.1-7.7-8.8 1.8-18 2.7-27.4 2.5-69.5-1-126.9-60.1-126-129.6 0.9-70.3 58.4-126.9 129-126.3 69.3 0.6 126 57 127 126.2 0.4 31.6-10.6 60.7-29.3 83.2-4.3 5.2-5 12.5-1.6 18.3l6.6 11.4c3.6 6.2 10.8 9.3 17.7 7.5 17.5-4.4 35.8-6.7 54.6-6.7 52.3 0 100.4 17.9 138.6 48 6.4 5 15.5 4.5 21.2-1.2l24.2-24.2c4.7-4.7 6-11.8 3.3-17.8-7.3-16.1-11.3-34-11.3-52.8 0-70.7 57.3-128 128-128 70.6 0 128 57.4 128 128 0 70.7-57.3 128-128 128-20.7 0-40.2-4.9-57.5-13.6-6.2-3.1-13.7-2-18.7 2.9l-28.4 28.5z" fill="#f2ac46"/></svg>`,
    };
    this.currentOutline = OutlineType.treeView;
    this._initIframe = Zotero.Promise.defer();
    this._texNotes = [];
  }

  getEditorElement(_document: Document): Element {
    let editor = _document.querySelector(".primary-editor");
    return editor;
  }

  hideMenuBar(_document: Document) {
    _document.getElementById("better-notes-menu").hidden = true;
  }

  switchRealMenuBar(hidden: boolean) {
    // We only handle hide. The show will be handled by the ZoteroStandalone.switchMenuType
    document
      .querySelectorAll(".menu-type-betternotes")
      .forEach((el) => ((el as HTMLElement).hidden = hidden));

    // Disable Zotero pdf export
    (document.getElementById("menu_export_files") as XUL.Element).disabled =
      !hidden;
  }

  switchKey(disabled: boolean) {
    document
      .querySelectorAll(".key-type-betternotes")
      .forEach((el) => (el as XUL.Element).setAttribute("disabled", disabled));
  }

  async addEditorKnowledgeToolBar(editorInstances: EditorInstance) {
    await editorInstances._initPromise;

    await new Promise<void>((resolve, reject) => {
      const _document = editorInstances._iframeWindow.document;
      const knowledgeToolBar = _document.createElement("div");
      knowledgeToolBar.setAttribute("id", "knowledge-tools");
      knowledgeToolBar.setAttribute("class", "toolbar");
      const start = _document.createElement("div");
      start.setAttribute("id", "knowledge-tools-start");
      start.setAttribute("class", "start");
      const middle = _document.createElement("div");
      middle.setAttribute("id", "knowledge-tools-middle");
      middle.setAttribute("class", "middle");
      const end = _document.createElement("div");
      end.setAttribute("id", "knowledge-tools-end");
      end.setAttribute("class", "end");
      knowledgeToolBar.append(start, middle, end);
      _document
        .getElementsByClassName("editor")[0]
        .childNodes[0].before(knowledgeToolBar);
      resolve();
    });
  }

  async addEditorButton(
    editorInstances: EditorInstance,
    id: string,
    icon: string,
    title: string,
    eventType: string,
    position: "start" | "middle" | "end",
    target: "knowledge" | "buitin" = "knowledge"
  ) {
    // Use Zotero.Notes._editorInstances to find current opened note editor
    await editorInstances._initPromise;

    const _document = editorInstances._iframeWindow.document;
    if (_document.getElementById(id)) {
      return;
    }
    let knowledgeToolBar = _document.getElementById("knowledge-tools");
    if (!knowledgeToolBar) {
      await this.addEditorKnowledgeToolBar(editorInstances);
    }
    let toolbar: HTMLElement;
    if (target === "knowledge") {
      toolbar = _document.getElementById(`knowledge-tools-${position}`);
    } else {
      toolbar = Array.prototype.find.call(
        _document.getElementsByClassName(position),
        (e) => e.getAttribute("id") !== `knowledge-tools-${position}`
      );
    }
    const dropdown = _document.createElement("div");
    dropdown.setAttribute("class", "dropdown more-dropdown");
    dropdown.setAttribute("id", id);
    const button = _document.createElement("button");
    button.setAttribute("class", "toolbar-button");
    button.setAttribute("title", title);
    button.setAttribute("eventType", eventType);
    button.innerHTML = this.editorIcon[icon];
    dropdown.append(button);
    toolbar.append(dropdown);
    const message = new EditorMessage("", {
      itemID: editorInstances._item.id,
      editorInstances: editorInstances,
    });
    dropdown.addEventListener("click", (e: XULEvent) => {
      message.type = e.target.getAttribute("eventType");
      message.content.event = e as XULEvent;
      message.content.editorInstance = editorInstances;
      this._Addon.events.onEditorEvent(message);
    });
    return dropdown;
  }

  async addEditorPopup(
    editorInstances: EditorInstance,
    id: string,
    buttons: { id: string; text: string; rank: number; eventType: string }[],
    parentDropDown: Element
  ) {
    // Use Zotero.Notes._editorInstances to find current opened note editor
    await editorInstances._initPromise;

    const _document = editorInstances._iframeWindow.document;
    let knowledgeToolBar = _document.getElementById("knowledge-tools");
    if (!knowledgeToolBar) {
      await this.addEditorKnowledgeToolBar(editorInstances);
    }
    const popup = _document.createElement("div");
    popup.setAttribute("class", "popup");
    popup.setAttribute("id", id);
    for (let buttonParam of buttons) {
      const button = _document.createElement("button");
      button.setAttribute("class", "option");
      button.setAttribute(
        "style",
        `text-indent: ${(buttonParam.rank - 1) * 5}px;`
      );
      button.setAttribute("id", buttonParam.id);
      button.setAttribute("eventType", buttonParam.eventType);
      button.innerHTML =
        buttonParam.text.length > 30
          ? `${buttonParam.text.slice(0, 30)}...`
          : buttonParam.text;
      popup.append(button);
      const message = new EditorMessage("", {
        itemID: editorInstances._item.id,
        editorInstances: editorInstances,
      });
      button.addEventListener("click", (e: XULEvent) => {
        message.type = e.target.getAttribute("eventType");
        message.content.event = e as XULEvent;
        message.content.editorInstance = editorInstances;
        this._Addon.events.onEditorEvent(message);
        e.stopPropagation();
        popup.remove();
      });
    }
    parentDropDown.append(popup);
    Zotero.debug(popup.offsetWidth);
    popup.setAttribute("style", `right: -${popup.offsetWidth / 2 - 15}px;`);
    return popup;
  }

  changeEditorButtonView(
    container: Element,
    icon: string,
    title: string = "",
    eventType: string = ""
  ) {
    const button = container.getElementsByTagName("button")[0];
    button.innerHTML = this.editorIcon[icon];
    if (title) {
      button.setAttribute("title", title);
    }
    if (eventType) {
      button.setAttribute("eventType", eventType);
    }
  }

  changeEditorButtonHidden(button: XUL.Element, hidden: boolean) {
    button.hidden = hidden;
  }

  switchEditorTexView(
    instance: EditorInstance,
    showView: boolean,
    viewNode: HTMLElement = undefined
  ) {
    const editorCore = instance._iframeWindow.document.getElementsByClassName(
      "editor-core"
    )[0] as HTMLElement;
    if (showView) {
      if (!this._texNotes.includes(instance._item.id)) {
        this._texNotes.push(instance._item.id);
      }
      let oldView = instance._iframeWindow.document.getElementById("texView");
      while (oldView) {
        oldView.remove();
        oldView = instance._iframeWindow.document.getElementById("texView");
      }
      viewNode.setAttribute("id", "texView");
      viewNode.style.height = "100%";
      viewNode.style.padding = "10px 30px 20px 30px";
      viewNode.style.overflowY = "auto";
      viewNode.removeAttribute("contentEditable");
      Array.prototype.forEach.call(
        viewNode.getElementsByTagName("a"),
        (e: HTMLElement) => {
          e.addEventListener("click", (ev) => {
            ZoteroPane.loadURI(e.getAttribute("href"));
          });
        }
      );

      editorCore.after(viewNode);
      editorCore.style.visibility = "hidden";
      viewNode.scrollTop = editorCore.scrollTop;
      instance._iframeWindow.postMessage({ type: "renderLaTex" }, "*");
    } else {
      if (this._texNotes.includes(instance._item.id)) {
        this._texNotes.splice(this._texNotes.indexOf(instance._item.id), 1);
      }
      const texView = instance._iframeWindow.document.getElementById("texView");
      if (texView) {
        editorCore.scrollTop = texView.scrollTop;
        texView.remove();
      }
      editorCore.style.visibility = "";
    }
  }

  async scrollToLine(instance: EditorInstance, lineIndex: number) {
    await instance._initPromise;
    let editorElement = this.getEditorElement(instance._iframeWindow.document);
    const eleList = [];
    const diveTagNames = ["OL", "UL", "LI"];

    const nodes = Array.from(editorElement.children);
    for (let i in nodes) {
      const ele = nodes[i];
      if (diveTagNames.includes(ele.tagName)) {
        this._Addon.parse.parseListElements(ele, eleList, diveTagNames);
      } else {
        eleList.push(ele);
      }
    }
    console.log(eleList, lineIndex);
    if (lineIndex >= eleList.length) {
      lineIndex = eleList.length - 1;
    } else if (lineIndex < 0) {
      lineIndex = 0;
    }

    // @ts-ignore
    const scrollNum = eleList[lineIndex].offsetTop;
    (editorElement.parentNode as HTMLElement).scrollTo(0, scrollNum);

    const texView = instance._iframeWindow.document.getElementById("texView");
    if (texView) {
      texView.scrollTo(0, scrollNum);
    }
  }

  scrollToPosition(instance: EditorInstance, offset: number) {
    let editorElement = this.getEditorElement(instance._iframeWindow.document);
    // @ts-ignore
    (editorElement.parentNode as HTMLElement).scrollTo(0, offset);

    const texView = instance._iframeWindow.document.getElementById("texView");
    if (texView) {
      texView.scrollTo(0, offset);
    }
  }

  addNewKnowledgeButton() {
    // Top toolbar button
    let addNoteItem = document
      .getElementById("zotero-tb-note-add")
      .getElementsByTagName("menuitem")[1];
    let button = document.createElement("menuitem");
    button.setAttribute("id", "zotero-tb-knowledge-openwindow");
    button.setAttribute("label", "New Main Note");
    button.addEventListener("click", (e) => {
      this._Addon.events.onEditorEvent(
        new EditorMessage("createWorkspace", {})
      );
    });
    button.setAttribute("class", "menuitem-iconic");
    button.setAttribute(
      "style",
      "list-style-image: url('chrome://Knowledge4Zotero/skin/favicon.png');"
    );
    addNoteItem.after(button);
  }

  addOpenWorkspaceButton() {
    // Left collection tree view button
    const treeRow = document.createElement("html:div");
    treeRow.setAttribute("class", "row");
    treeRow.setAttribute(
      "style",
      "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px;"
    );
    const span1 = document.createElement("span");
    span1.setAttribute("class", "cell label primary");
    const span2 = document.createElement("span");
    span2.setAttribute("class", "icon icon-twisty twisty open");
    span2.innerHTML = this.editorIcon["openWorkspaceCollectionView"];
    const span3 = document.createElement("span");
    span3.setAttribute("class", "icon icon-bg cell-icon");
    span3.setAttribute(
      "style",
      "background-image:url(chrome://Knowledge4Zotero/skin/favicon.png)"
    );
    const span4 = document.createElement("span");
    span4.setAttribute("class", "cell-text");
    span4.setAttribute("style", "margin-left: 6px;");
    span4.innerHTML = Zotero.locale.includes("zh")
      ? "打开工作区"
      : "Open Workspace";
    span1.append(span2, span3, span4);
    treeRow.append(span1);
    treeRow.addEventListener("click", (e) => {
      this._Addon.events.onEditorEvent(
        new EditorMessage("openWorkspace", { event: e })
      );
    });
    treeRow.addEventListener("mouseover", (e: XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px; background-color: grey;"
      );
    });
    treeRow.addEventListener("mouseleave", (e: XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px;"
      );
    });
    treeRow.addEventListener("mousedown", (e: XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px; color: #FFFFFF;"
      );
    });
    treeRow.addEventListener("mouseup", (e: XULEvent) => {
      treeRow.setAttribute(
        "style",
        "height: 22px; margin: 0 0 0 0; padding: 0 6px 0 6px;"
      );
    });
    document
      .getElementById("zotero-collections-tree-container")
      .children[0].before(treeRow);
  }

  async updateEditorPopupButtons(_window: Window, link: string) {
    const note: ZoteroItem = link
      ? (await this._Addon.knowledge.getNoteFromLink(link)).item
      : undefined;
    // If the note is invalid, we remove the buttons
    if (note) {
      let insertButton = _window.document.getElementById("insert-note-link");
      if (insertButton) {
        insertButton.remove();
      }
      insertButton = _window.document.createElement("button");
      insertButton.setAttribute("id", "insert-note-link");
      insertButton.setAttribute(
        "title",
        `Import Linked Note: ${note.getNoteTitle()}`
      );
      insertButton.innerHTML = `<svg t="1652008007954" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10521" width="16" height="16"><path d="M574.3 896H159.7c-17.6 0-31.9-14.3-31.9-32V160c0-17.7 14.3-32 31.9-32h382.7v160c0 35.3 28.6 64 63.8 64h159.5v192c0 17.7 14.3 32 31.9 32 17.6 0 31.9-14.3 31.9-32V270.2c0-8.5-3.3-16.6-9.3-22.6L647.4 73.4c-6-6-14.1-9.4-22.6-9.4h-497C92.6 64 64 92.7 64 128v768c0 35.3 28.6 64 63.8 64h446.5c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32zM638.1 288c-17.6 0-31.9-14.3-31.9-32V128l159.5 160H638.1z" p-id="10522"></path><path d="M418.8 673H225.5c-17.6 0-31.9 14.3-31.9 32s14.3 32 31.9 32h193.3c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32zM608.2 481H225.5c-17.6 0-31.9 14.3-31.9 32s14.3 32 31.9 32h382.7c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32zM225.5 353h191.4c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32H225.5c-17.6 0-31.9 14.3-31.9 32s14.3 32 31.9 32zM862.7 959.4c-23.6 0-47-8.8-64.8-26.6l-24.4-24.4c-12.5-12.5-12.5-32.8 0-45.3s32.7-12.5 45.1 0l24.4 24.4c11.3 11.4 30.7 10.4 43.2-2.1 12.5-12.5 13.4-31.9 2.1-43.3L749.2 702.6c-11.3-11.4-30.7-10.4-43.2 2.1-6.2 6.3-9.8 14.4-10 22.8-0.2 7.9 2.6 15.1 7.9 20.4 12.5 12.5 12.5 32.8 0 45.3s-32.7 12.5-45.1 0c-36.2-36.3-35.2-96.3 2.1-133.8 37.4-37.5 97.2-38.4 133.4-2.1l139.1 139.5c36.2 36.3 35.2 96.3-2.1 133.8-19 19.2-43.9 28.8-68.6 28.8z" p-id="10523"></path><path d="M696.3 883.1c-23.6 0-47-8.8-64.8-26.6l-139-139.6c-17.7-17.8-27.2-41.7-26.6-67.2 0.6-25 10.8-48.6 28.7-66.6 17.9-17.9 41.5-28.2 66.4-28.8 25.5-0.6 49.3 8.9 67 26.6l24.4 24.4c12.5 12.5 12.5 32.8 0 45.3s-32.7 12.5-45.1 0l-24.4-24.4c-5.3-5.3-12.5-8.1-20.4-7.9-8.4 0.2-16.5 3.8-22.8 10-6.2 6.3-9.8 14.4-10 22.8-0.2 7.9 2.6 15.1 7.9 20.4L676.7 811c11.3 11.4 30.7 10.4 43.2-2.1 12.5-12.5 13.4-31.9 2.1-43.3-12.5-12.5-12.5-32.8 0-45.3s32.7-12.5 45.1 0c36.2 36.3 35.3 96.3-2.1 133.8-19.1 19.3-44 29-68.7 29z" p-id="10524"></path></svg>`;
      insertButton.addEventListener("click", async (e) => {
        let newLines = [];
        const convertResult = await this._Addon.knowledge.convertNoteLines(
          note,
          [],
          true
        );
        const subNoteLines = convertResult.lines;
        // Prevent note to be too long
        if (subNoteLines.join("\n").length > 100000) {
          this._Addon.views.showProgressWindow(
            "Better Notes",
            "The linked note is too long. Import ignored."
          );
          return;
        }
        const templateText = await this._Addon.template.renderTemplateAsync(
          "[QuickImport]",
          "subNoteLines, subNoteItem, noteItem",
          [subNoteLines, note, this._Addon.knowledge.getWorkspaceNote()]
        );
        newLines.push(templateText);
        const newLineString = newLines.join("\n");
        const workspaceNote = this._Addon.knowledge.getWorkspaceNote();
        const notifyFlag = Zotero.Promise.defer();
        const notifierName = "insertLinkWait";
        this._Addon.events.addNotifyListener(
          notifierName,
          (
            event: string,
            type: string,
            ids: Array<number>,
            extraData: object
          ) => {
            if (
              event === "modify" &&
              type === "item" &&
              ids.includes(workspaceNote.id)
            ) {
              notifyFlag.resolve();
              this._Addon.events.removeNotifyListener(notifierName);
            }
          }
        );
        await this._Addon.knowledge.modifyLineInNote(
          undefined,
          (oldLine: string) => {
            Zotero.debug(oldLine);
            const params = this._Addon.parse.parseParamsFromLink(link);
            const newLink = !params.ignore
              ? link + (link.includes("?") ? "&ignore=1" : "?ignore=1")
              : link;
            const linkIndex = this._Addon.parse.parseLinkIndexInText(oldLine);
            Zotero.debug(linkIndex);
            return `${oldLine.slice(0, linkIndex[0])}${newLink}${oldLine.slice(
              linkIndex[1]
            )}\n${newLineString}`;
          },
          this._Addon.knowledge.currentLine
        );
        // wait the first modify finish
        await notifyFlag.promise;
        let hasAttachemnts = false;
        for (const _n of [note, ...convertResult.subNotes]) {
          if (Zotero.Items.get(_n.getAttachments()).length) {
            hasAttachemnts = true;
            break;
          }
        }
        if (hasAttachemnts) {
          await Zotero.DB.executeTransaction(async () => {
            await Zotero.Notes.copyEmbeddedImages(note, workspaceNote);
            for (const subNote of convertResult.subNotes) {
              await Zotero.Notes.copyEmbeddedImages(subNote, workspaceNote);
            }
          });
          await this._Addon.knowledge.scrollWithRefresh(
            this._Addon.knowledge.currentLine
          );
        }
      });

      let updateButton = _window.document.getElementById("update-note-link");
      if (updateButton) {
        updateButton.remove();
      }
      updateButton = _window.document.createElement("button");
      updateButton.setAttribute("id", "update-note-link");
      updateButton.setAttribute(
        "title",
        `Update Link Text: ${note.getNoteTitle()}`
      );
      updateButton.innerHTML = `<svg t="1652685521153" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7063" width="16" height="16"><path d="M271.914667 837.418667C182.314667 756.522667 128 637.653333 128 508.714667 128 304.896 263.338667 129.834667 450.986667 85.333333L469.333333 170.026667c-150.016 35.584-258.304 175.658667-258.304 338.688 0 106.069333 45.866667 203.562667 121.258667 268.373333L426.666667 682.666667v256H170.666667l101.248-101.248zM727.082667 168.917333C831.530667 249.045333 896 377.088 896 517.077333c0 202.922667-135.338667 377.258667-322.986667 421.589334L554.666667 854.357333c150.016-35.456 258.304-174.933333 258.304-337.322666 0-117.12-56.405333-223.786667-146.901334-287.146667L554.666667 341.333333V85.333333h256l-83.584 83.584z" p-id="7064"></path></svg>`;
      updateButton.addEventListener("click", async (e) => {
        Zotero.debug("ZBN: Update Link Text");
        const noteLines = this._Addon.knowledge.getLinesInNote();
        let line = noteLines[this._Addon.knowledge.currentLine];
        Zotero.debug(line);

        // // #text
        // const focusNode = _window.document.getSelection().focusNode;
        // const linkElement = focusNode.parentElement as HTMLLinkElement;

        // const currentNote = (await this._Addon.knowledge.getNoteFromLink(link))
        //   .item;

        // if (!currentNote) {
        //   return;
        // }
        // const newNode = _window.document.createElement("p");
        // const newLink = _window.document.createElement("a");
        // newLink.href = linkElement.href;
        // newLink.innerHTML = currentNote.getNoteTitle();
        // newNode.appendChild(newLink);
        // console.log(linkElement, newLink);

        // linkElement.parentElement.replaceChild(newNode, linkElement);

        let linkStart = line.search(/<a /g);
        let linkEnd = line.search(/<\/a>/g) + 4;
        let beforeLink = line.slice(0, linkStart);
        let afterLink = line.slice(linkEnd);
        let linkPart = line.slice(linkStart, linkEnd);
        let link = this._Addon.parse.parseLinkInText(linkPart);
        let currentNote: ZoteroItem;
        if (link) {
          currentNote = (await this._Addon.knowledge.getNoteFromLink(link))
            .item;
        }

        while (
          linkPart &&
          (!link || !currentNote || currentNote.id !== note.id)
        ) {
          line = afterLink;
          beforeLink = beforeLink + linkPart;
          line = afterLink;

          linkStart = line.search(/<a /g);
          linkEnd = line.search(/<\/a>/g) + 4;
          beforeLink = beforeLink + line.slice(0, linkStart);
          afterLink = line.slice(linkEnd);
          linkPart = line.slice(linkStart, linkEnd);
          link = this._Addon.parse.parseLinkInText(linkPart);
          if (link) {
            currentNote = (await this._Addon.knowledge.getNoteFromLink(link))
              .item;
          }
        }
        if (!linkPart) {
          return;
        }
        beforeLink = beforeLink + linkPart.slice(0, linkPart.search(/>/) + 1);
        afterLink = "</a>" + afterLink;
        const newLine = `${beforeLink}${currentNote.getNoteTitle()}${afterLink}`;
        Zotero.debug(newLine);
        noteLines[this._Addon.knowledge.currentLine] = newLine;

        this._Addon.knowledge.setLinesToNote(undefined, noteLines);
        this._Addon.knowledge.scrollWithRefresh(
          this._Addon.knowledge.currentLine
        );
      });
      const linkPopup = _window.document.querySelector(".link-popup");
      if (linkPopup) {
        linkPopup.append(insertButton, updateButton);
      }
    } else {
      const insertLink = _window.document.querySelector("#insert-note-link");
      if (insertLink) {
        insertLink.remove();
      }

      const updateLink = _window.document.querySelector("#update-note-link");
      if (updateLink) {
        updateLink.remove();
      }
    }
  }

  async addReaderAnnotationButton(reader: ReaderObj) {
    if (!reader) {
      return false;
    }
    await reader._initPromise;
    let updateCount = 0;
    const _document = reader._iframeWindow.document;
    for (const moreButton of _document.getElementsByClassName("more")) {
      if (moreButton.getAttribute("knowledgeinit") === "true") {
        updateCount += 1;
        continue;
      }
      moreButton.setAttribute("knowledgeinit", "true");
      const addAnnotationNoteButton = _document.createElement("div");
      addAnnotationNoteButton.setAttribute("style", "margin: 5px;");
      addAnnotationNoteButton.innerHTML = this.editorIcon["addAnnotationNote"];

      let annotationWrapper = moreButton;
      while (!annotationWrapper.getAttribute("data-sidebar-annotation-id")) {
        annotationWrapper = annotationWrapper.parentElement;
      }
      const itemKey = annotationWrapper.getAttribute(
        "data-sidebar-annotation-id"
      );
      const libraryID = Zotero.Items.get(reader.itemID).libraryID;
      const annotationItem = await Zotero.Items.getByLibraryAndKeyAsync(
        libraryID,
        itemKey
      );

      const annotations = [await reader._getAnnotation(annotationItem)].map(
        ({
          id,
          type,
          text,
          color,
          comment,
          image,
          position,
          pageLabel,
          tags,
        }) => {
          if (image) {
            let img = _document.querySelector(
              `[data-sidebar-annotation-id="${id}"] img`
            );
            if (img) {
              function getImageDataURL(img) {
                var canvas = _document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
                return canvas.toDataURL("image/png");
              }
              image = getImageDataURL(img);
            }
          }
          return {
            id,
            type,
            attachmentItemID: reader.itemID,
            text: text ? text.trim() : text,
            color,
            comment: comment ? comment.trim() : comment,
            image,
            position,
            pageLabel,
            tags,
          };
        }
      );
      addAnnotationNoteButton.addEventListener("click", (e) => {
        this._Addon.events.onEditorEvent(
          new EditorMessage("addAnnotationNote", {
            params: {
              annotations: annotations,
              annotationItem: annotationItem,
            },
          })
        );
        e.preventDefault();
      });
      addAnnotationNoteButton.addEventListener("mouseover", (e: XULEvent) => {
        addAnnotationNoteButton.setAttribute(
          "style",
          "background: #F0F0F0; margin: 5px;"
        );
      });
      addAnnotationNoteButton.addEventListener("mouseout", (e: XULEvent) => {
        addAnnotationNoteButton.setAttribute("style", "margin: 5px;");
      });
      moreButton.before(addAnnotationNoteButton);
      if (annotationItem.annotationType === "image") {
        // Customize image copy
        const copyImageButton = _document.createElement("div");
        copyImageButton.setAttribute("style", "margin: 5px;");
        copyImageButton.innerHTML = this.editorIcon["copyImageAnnotation"];
        copyImageButton.addEventListener("click", (e) => {
          this._Addon.events.onEditorEvent(
            new EditorMessage("copyImageAnnotation", {
              params: {
                src: (
                  copyImageButton.parentElement.parentElement
                    .nextSibling as HTMLImageElement
                ).src,
              },
            })
          );
          e.preventDefault();
        });
        copyImageButton.addEventListener("mouseover", (e: XULEvent) => {
          copyImageButton.setAttribute(
            "style",
            "background: #F0F0F0; margin: 5px;"
          );
        });
        copyImageButton.addEventListener("mouseout", (e: XULEvent) => {
          copyImageButton.setAttribute("style", "margin: 5px;");
        });
        moreButton.before(copyImageButton);
      }
      updateCount += 1;
    }
    return reader.annotationItemIDs.length === updateCount;
  }

  initKnowledgeWindow(_window: Window) {
    _window.addEventListener("message", (e) => this.messageHandler(e), false);
    this.currentOutline = OutlineType.treeView;
    _window.document
      .getElementById("outline-switchview")
      .addEventListener("click", async (e) => {
        this.switchView();
      });
    _window.addEventListener("resize", (e) => this.resizeOutline(_window));
    _window.document
      .getElementById("outline-splitter")
      .addEventListener("mouseup", async (e) => {
        this.resizeOutline(_window);
      });
  }

  async messageHandler(e) {
    const _window = this._Addon.knowledge.getWorkspaceWindow();
    Zotero.debug(`Knowledge4Zotero: view message ${e.data.type}`);
    console.log(`Knowledge4Zotero: view message ${e.data.type}`);
    if (e.data.type === "ready") {
      this._initIframe.resolve();
    } else if (e.data.type === "getMindMapData") {
      this.updateOutline();
    } else if (e.data.type === "jumpNode") {
      this._Addon.events.onEditorEvent(
        new EditorMessage("jumpNode", {
          params: e.data,
        })
      );
    } else if (e.data.type === "jumpNote") {
      Zotero.debug(e.data);
      this._Addon.events.onEditorEvent(
        new EditorMessage("onNoteLink", {
          params: await this._Addon.knowledge.getNoteFromLink(e.data.link),
        })
      );
    } else if (e.data.type === "moveNode") {
      this._Addon.events.onEditorEvent(
        new EditorMessage("moveNode", {
          params: e.data,
        })
      );
    }
  }

  switchView(newType: OutlineType = undefined) {
    if (!newType) {
      newType = this.currentOutline + 1;
    }
    if (newType > OutlineType.bubbleMap) {
      newType = OutlineType.treeView;
    }
    const _window = this._Addon.knowledge.getWorkspaceWindow();
    const mindmap = _window.document.getElementById("mindmap-container");

    const oldIframe = _window.document.getElementById("mindmapIframe");
    if (oldIframe) {
      oldIframe.remove();
    }
    this.currentOutline = newType;
    const srcList = [
      "",
      "chrome://Knowledge4Zotero/content/treeView.html",
      "chrome://Knowledge4Zotero/content/mindMap.html",
      "chrome://Knowledge4Zotero/content/bubbleMap.html",
    ];
    const iframe = _window.document.createElement("iframe");
    iframe.setAttribute("id", "mindmapIframe");
    iframe.setAttribute("src", srcList[this.currentOutline]);
    mindmap.append(iframe);
    this.resizeOutline(_window);
    this.updateOutline();
    // Clear stored node id
    this._Addon.knowledge.currentNodeID = -1;
    this.updateEditCommand();
    this.updateViewMenu();
  }

  async updateOutline() {
    Zotero.debug("Knowledge4Zotero: updateMindMap");
    // await this._initIframe.promise;
    const _window = this._Addon.knowledge.getWorkspaceWindow();
    const iframe = _window.document.getElementById(
      "mindmapIframe"
    ) as HTMLIFrameElement;
    iframe.contentWindow.postMessage(
      {
        type: "setMindMapData",
        nodes: this._Addon.knowledge.getNoteTreeAsList(undefined, true, false),
      },
      "*"
    );
  }

  resizeOutline(_window: Window) {
    const iframe = _window.document.getElementById("mindmapIframe");
    const container = _window.document.getElementById(
      "zotero-knowledge-outline"
    );
    if (iframe) {
      iframe.style.height = `${container.clientHeight - 60}px`;
      iframe.style.width = `${container.clientWidth - 10}px`;
    }
  }

  updateEditCommand() {
    const _window = this._Addon.knowledge.workspaceTabId
      ? window
      : this._Addon.knowledge.getWorkspaceWindow();
    Zotero.debug(`updateEditMenu, ${this._Addon.knowledge.currentNodeID}`);
    if (this._Addon.knowledge.currentNodeID < 0) {
      _window.document
        .getElementById("cmd_indent_betternotes")
        .setAttribute("disabled", true);
      _window.document
        .getElementById("cmd_unindent_betternotes")
        .setAttribute("disabled", true);
    } else {
      _window.document
        .getElementById("cmd_indent_betternotes")
        .removeAttribute("disabled");
      _window.document
        .getElementById("cmd_unindent_betternotes")
        .removeAttribute("disabled");
    }
  }

  updateViewMenu() {
    const _window = this._Addon.knowledge.workspaceTabId
      ? window
      : this._Addon.knowledge.getWorkspaceWindow();
    Zotero.debug(`updateViewMenu, ${this.currentOutline}`);
    const treeview = _window.document.getElementById("menu_treeview");
    this.currentOutline === OutlineType.treeView
      ? treeview.setAttribute("checked", true)
      : treeview.removeAttribute("checked");
    const mindmap = _window.document.getElementById("menu_mindmap");
    this.currentOutline === OutlineType.mindMap
      ? mindmap.setAttribute("checked", true)
      : mindmap.removeAttribute("checked");
    const bubblemap = _window.document.getElementById("menu_bubblemap");
    this.currentOutline === OutlineType.bubbleMap
      ? bubblemap.setAttribute("checked", true)
      : bubblemap.removeAttribute("checked");

    const noteFontSize = Zotero.Prefs.get("note.fontSize");
    for (let menuitem of _window.document.querySelectorAll(
      `#note-font-size-menu menuitem`
    )) {
      if (parseInt(menuitem.getAttribute("label")) == noteFontSize) {
        menuitem.setAttribute("checked", true);
      } else {
        menuitem.removeAttribute("checked");
      }
    }
  }

  updateTemplateMenu(type: "Note" | "Item" | "Text") {
    const _window = this._Addon.knowledge.workspaceTabId
      ? window
      : this._Addon.knowledge.getWorkspaceWindow();
    Zotero.debug(`updateTemplateMenu, ${this.currentOutline}`);
    let templates = this._Addon.template
      .getTemplateKeys()
      .filter((e) => e.name.indexOf(type) !== -1);
    const popup = _window.document.getElementById(
      `menu_insert${type}TemplatePopup`
    );
    popup.innerHTML = "";
    if (templates.length === 0) {
      templates = [
        {
          name: "No Template",
          text: "",
          disabled: true,
        },
      ];
    }
    for (const template of templates) {
      const menuitem = _window.document.createElement("menuitem");
      menuitem.setAttribute("id", template.name);
      menuitem.setAttribute("label", template.name);
      menuitem.setAttribute(
        "oncommand",
        `
        Zotero.Knowledge4Zotero.events.onEditorEvent({
          type: "insert${type}UsingTemplate",
          content: {
            params: { templateName: "${template.name}" },
          },
        });`
      );

      if (template.disabled) {
        menuitem.setAttribute("disabled", true);
      }
      popup.append(menuitem);
    }
  }

  updateCitationStyleMenu() {
    const _window = this._Addon.knowledge.workspaceTabId
      ? window
      : this._Addon.knowledge.getWorkspaceWindow();
    Zotero.debug(`updateCitationStyleMenu, ${this.currentOutline}`);

    const popup = _window.document.getElementById("menu_citeSettingPopup");
    popup.innerHTML = "";

    let format = this._Addon.template.getCitationStyle();

    // add styles to list
    const styles = Zotero.Styles.getVisible();
    styles.forEach(function (style) {
      const val = JSON.stringify({
        mode: "bibliography",
        contentType: "html",
        id: style.styleID,
        locale: "",
      });
      const itemNode: XUL.Element = document.createElement("menuitem");
      itemNode.setAttribute("value", val);
      itemNode.setAttribute("label", style.title);
      itemNode.setAttribute("type", "checkbox");
      itemNode.setAttribute(
        "oncommand",
        "Zotero.Prefs.set('Knowledge4Zotero.citeFormat', event.target.value)"
      );
      popup.appendChild(itemNode);

      if (format.id == style.styleID) {
        itemNode.setAttribute("checked", true);
      }
    });
  }

  updateWordCount() {
    const _window = this._Addon.knowledge.workspaceTabId
      ? window
      : this._Addon.knowledge.getWorkspaceWindow();
    Zotero.debug("updateWordCount");

    const menuitem = _window.document.getElementById(
      "menu_wordcount_betternotes"
    );
    menuitem.setAttribute(
      "label",
      `Word Count: ${this._Addon.parse.parseNoteHTML().innerText.length}`
    );
  }

  updateAutoInsertAnnotationsMenu(
    _window: Window = undefined,
    tryStandalone: boolean = true
  ) {
    _window = _window || window;

    Zotero.debug("updateAutoInsertAnnotationsMenu");

    let autoAnnotation = Zotero.Prefs.get("Knowledge4Zotero.autoAnnotation");
    if (typeof autoAnnotation === "undefined") {
      autoAnnotation = false;
      Zotero.Prefs.set("Knowledge4Zotero.autoAnnotation", autoAnnotation);
    }

    const menuitem: XUL.Element = _window.document.getElementById(
      "menu_autoannotation_betternotes"
    );
    if (autoAnnotation) {
      menuitem.setAttribute("checked", true);
    } else {
      menuitem.removeAttribute("checked");
    }
    if (tryStandalone) {
      _window = this._Addon.knowledge.getWorkspaceWindow();
      if (_window) {
        this.updateAutoInsertAnnotationsMenu(_window, false);
      }
    }
  }

  showProgressWindow(
    header: string,
    context: string,
    type: "default" | "success" | "fail" = "default",
    t: number = 5000
  ) {
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
  }
}

export default AddonViews;
