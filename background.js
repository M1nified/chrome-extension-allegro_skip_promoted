"use strict"

const ALGORITHM_LINEAR = 0,
    ALGORITHM_BISECTIONAL = 1

let activeLookups = {}
let settings = {
    lookupAlgorithm: [ALGORITHM_BISECTIONAL]
}

chrome.storage.sync.get(Object.keys(settings), (data) => {
    settings = Object.assign(settings, data)
})

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
        Object.keys(changes).forEach(settingName => {
            settings[settingName] = changes[settingName].newValue
        })
    }
})

chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: {
                            urlContains: 'allegro.pl',
                            queryContains: 'order'
                        },
                    })
                ],
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ])
    })
})

chrome.pageAction.onClicked.addListener(tab => {
    if (activeLookups[tab.id])
        return
    activeLookups[tab.id] = true
    let animation = ProgressAnimation(tab.id)
    animation.start()
    let executeScroll = () => {
        chrome.tabs.executeScript(tab.id, {
            file: "scrollToListaOfert.js",
            runAt: "document_end"
        })
    }
    // lookForOffersLinear(tab.url)
    let lookupFunction;
    if (settings.lookupAlgorithm.reduce(value => value) == ALGORITHM_LINEAR) {
        lookupFunction = lookForOffersLinear
    } else {
        lookupFunction = lookForOffersBisectional
    }
    lookupFunction(tab.url)
        .then(url => {
            if (url != tab.url) {
                chrome.tabs.update(tab.id, {
                    url
                })
                let onUpdate = (tabId, changeInfo) => {
                    if (tabId == tab.id) {
                        if (changeInfo.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(onUpdate)
                            executeScroll()
                        }
                    }
                }
                chrome.tabs.onUpdated.addListener(onUpdate)
            } else {
                executeScroll()
            }
        })
        .catch((reason) => {
            console.error(reason)
        })
        .finally(() => {
            chrome.pageAction.show(tab.id)
            delete activeLookups[tab.id]
            animation.stop(() => {
                chrome.pageAction.setIcon({
                    tabId: tab.id,
                    path: "icons/icon_38.png"
                })
            })
        })
})

let lookForOffersLinear = (url) => {
    return new Promise((resolve, reject) => {
        if (extractCurrentPageNumber(url) > 100)
            reject()
        getPageContent(url)
            .then((serverResponse) => {
                let header = findHeader(serverResponse.response)
                if (header === null) {
                    resolve(lookForOffersLinear(incrementAllegroUrlPage(url)))
                } else {
                    resolve(url)
                }
            })
            .catch((reason) => console.error(reason))
    })
}

let lookForOffersBisectional = (url) => {
    let minPage = 1,
        maxPage = 100
    let bisect = (url) =>
        new Promise((resolve, reject) => {
            getPageContent(url)
                .then((serverResponse) => {
                    let header = findHeader(serverResponse.response)
                    if (header === null) {
                        minPage = extractCurrentPageNumber(serverResponse.responseURL)
                    } else {
                        maxPage = extractCurrentPageNumber(serverResponse.responseURL)
                    }
                    if (minPage === maxPage) {
                        resolve(url)
                    } else {
                        if (maxPage - minPage === 1 && header === null) {
                            minPage += 1
                        }
                        resolve(bisect(setAllegroUrlPage(url, Math.floor((minPage + maxPage) / 2))))
                    }
                })
                .catch((reason) => {
                    console.error(reason)
                    reject()
                })
        })
    return new Promise((resolve, reject) => {
        getPageContent(setAllegroUrlPage(url, maxPage))
            .then((serverResponse) => {
                let currentPage = extractCurrentPageNumber(serverResponse.responseURL)
                maxPage = currentPage
                let header = findHeader(serverResponse.response)
                if (header === null) {
                    reject("unable to find")
                } else {
                    resolve(bisect(setAllegroUrlPage(url, Math.floor((minPage + maxPage) / 2))))
                }
            })
            .catch((reason) => {
                console.error(reason)
                reject()
            })
    })
}

let findHeader = (documentXML) => {
    let header = document.evaluate("//h2[contains(., 'Lista ofert')]", documentXML, null, XPathResult.ANY_TYPE, null).iterateNext()
    return header
}

const pRegExp = /p=(\d+)/
let extractCurrentPageNumber = (url) => {
    let currPage = pRegExp.exec(url)
    if (currPage === null) {
        return 1
    } else {
        return parseInt(currPage[1])
    }
}

let setAllegroUrlPage = (url, pageNumber) => {
    let currPage = extractCurrentPageNumber(url)
    if (currPage === 1 && !pRegExp.test(url)) {
        return url + "&p=" + pageNumber
    } else {
        return url.replace(pRegExp, "p=" + pageNumber)
    }
}

let incrementAllegroUrlPage = (url) => {
    let currPage = extractCurrentPageNumber(url)
    return setAllegroUrlPage(url, currPage + 1)
}


let getPageContent = (url) => {
    return new Promise((resolve, reject) => {
        if (!window.XMLHttpRequest)
            reject()
        let xhr = new XMLHttpRequest()
        xhr.onload = function () {
            if (xhr.status === 200) {
                resolve.call(this, {
                    response: xhr.response,
                    responseURL: xhr.responseURL,
                    status: xhr.status,
                    statusText: xhr.statusText,
                })
            } else {
                reject.call(this)
            }
        }
        xhr.onerror = function (error) {
            console.error('xhr error', error)
            reject.call(this, error)
        }
        xhr.open('GET', url)
        xhr.responseType = 'document'
        xhr.send()
    })
}

function ProgressAnimation(tabId) {
    return {
        tabId,
        start: function () {
            this.running = true
            let animationStart = null,
                animationStep = () => {
                    if (!this.running) {
                        if (typeof this.stopCallback === 'function')
                            this.stopCallback()
                        return
                    }
                    let timestamp = new Date().getTime()
                    if (!animationStart)
                        animationStart = timestamp
                    let progess = timestamp - animationStart,
                        step = Math.round(progess / 60 % 23)
                    chrome.pageAction.setIcon({
                        tabId: this.tabId,
                        path: "icons_progress/icon_progress_" + step + ".png"
                    }, () => setTimeout(animationStep, 10))
                }
            animationStep()
            return this
        },
        stop(callback) {
            this.stopCallback = callback
            this.running = false
            return this
        }
    }
}
