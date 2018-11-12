"use strict";

const ALGORITHM_LINEAR = 0,
    ALGORITHM_BISECTIONAL = 1,

    DISPLAY_AS_RADIO = 0,
    DISPLAY_AS_CHECKBOX = 1,
    DISPLAY_AS_SELECT = 2,
    DISPLAY_AS_TEXT = 3

function Option(name, value, description = '') {
    return {
        name,
        value,
        description
    }
}

const defaultSettings = {
    lookupAlgorithm: [ALGORITHM_BISECTIONAL]
}

const availableSettings = {
    lookupAlgorithm: {
        displayAs: DISPLAY_AS_RADIO,
        options: [
            Option('Przeszukiwanie liniowe', ALGORITHM_LINEAR),
            Option('Przeszukiwanie bisekcyjne', ALGORITHM_BISECTIONAL)
        ]
    }
}


const buildSelectorElement = (setting, settingName, settingValue) => {
    let container = document.createElement('div')
    if (setting.displayAs === DISPLAY_AS_RADIO) {
        setting.options.forEach(option => {
            let radio = document.createElement('input'),
                label = document.createElement('label'),
                radioId = "radio_" + "xxxxxx".split('').map(() => Math.floor(Math.random() * 10)).join('')
            radio.id = radioId
            radio.type = 'radio'
            radio.name = settingName
            radio.value = option.value
            if (option.value == settingValue) {
                radio.checked = true
            }
            label.setAttribute('for', radioId)
            label.appendChild(document.createTextNode(option.name))
            container.appendChild(radio)
            container.appendChild(label)
            container.appendChild(document.createElement('br'))
        })
    }
    return container
}

chrome.storage.sync.get(Object.keys(availableSettings), (data) => {
    data = Object.assign(defaultSettings, data)
    Object.keys(availableSettings).sort().forEach(settingName => {
        let value = data[settingName],
            setting = availableSettings[settingName]
        document.body.appendChild(buildSelectorElement(setting, settingName, value))

    })

    document.querySelectorAll("input").forEach(input => {
        input.addEventListener('change', function () {
            let name = this.name,
                value = this.value,
                type = this.type
            if (type === 'radio') {
                let data = {}
                data[name] = [value]
                chrome.storage.sync.set(data, () => {
                    chrome.runtime.lastError && console.error(chrome.runtime.lastError)
                })
            }
        })
    })

})

