"use strict";
(() => {
    let header = document.evaluate("//h2[text()='Oferty']", document, null, XPathResult.ANY_TYPE, null).iterateNext()
    header.scrollIntoView()
})()