import { asBlob } from "html-docx-js-typescript";

// this runs in a webworker. accept input message
// and return output message
onmessage = ({ data: { type, jobId, message } }) => {
  if (type === "parseDocx") {
    console.log("DOCX Worker", type, jobId, message);
    asBlob(message)
      .then((blob) => {
        postMessage({ type: "parseDocxReturn", jobId, message: blob }, "*");
      })
      .catch((err) => {
        console.log(err);
      });
  }
};
