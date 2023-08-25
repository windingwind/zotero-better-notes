// @ts-ignore
import htmlDocx from "html-docx-js/dist/html-docx";

// this runs in a iframe. accept input message
// and return output message
onmessage = ({ data: { type, jobId, message } }) => {
  if (type === "parseDocx") {
    console.log("DOCX Worker", type, jobId, message);
    const blob = htmlDocx.asBlob(message);
    console.log("DOCX Worker", blob);
    postMessage({ type: "parseDocxReturn", jobId, message: blob }, "*");
  }
};
