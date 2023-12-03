import { config } from "../../package.json";

// @ts-ignore defined by html-docx-js
import htmlDocx from "html-docx-js/dist/html-docx";

const XSL_PATH = `chrome://${config.addonRef}/content/lib/js/mml2omml.sef.json`;

// this runs in a iframe. accept input message
// and return output message
onmessage = async ({ data: { type, jobID, message } }) => {
  if (type === "parseDocx") {
    console.log("DOCX Worker", type, jobID, message);
    const blob = htmlDocx.asBlob(message);
    postMessage({ type: "parseDocxReturn", jobID, message: blob }, "*");
  } else if (type === "parseMML") {
    console.log("MML Worker", type, jobID, message);
    // @ts-ignore defined by SaxonJS
    const result = await SaxonJS.transform(
      {
        stylesheetLocation: XSL_PATH,
        sourceType: "xml",
        sourceText: message,
        destination: "serialized",
      },
      "async",
    );
    postMessage(
      { type: "parseMMLReturn", jobID, message: result.principalResult },
      "*",
    );
  }
};
