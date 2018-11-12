"use strict";
(() => {
    let header = document.evaluate("//h2[contains(., 'Lista ofert')]", document, null, XPathResult.ANY_TYPE, null).iterateNext()
    header.scrollIntoView()
})()