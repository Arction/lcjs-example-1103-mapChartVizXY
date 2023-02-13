/*
 * LightningChart JS Example on ChartXY with Custom Color Theme.
 */
// Import LightningChartJS
const lcjs = require('@arction/lcjs')

const {
    lightningChart,
    AxisTickStrategies,
    ColorRGBA,
    PointShape,
    PalettedFill,
    LUT,
    UIElementBuilders,
    emptyFill,
    emptyLine,
    UIOrigins,
    MapTypes,
    transparentFill,
    regularColorSteps,
    Themes,
} = lcjs

// Custom methods for date
Date.prototype.formatDate = function () {
    return this.toISOString().split('T')[0]
}

Date.prototype.addDays = function (days) {
    const date = new Date(this.valueOf())
    const newDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).formatDate()
    return newDay
}

const domContainer = document.getElementById('chart-container') || document.body

// Add div for MapChart
const divMap = document.createElement('div')
domContainer.append(divMap)

// Add div for ChartXY
const divOverlay = document.createElement('div')
domContainer.append(divOverlay)

// Adding slider
let animationActive = true

// Add slider div
const yearDiv = document.createElement('div')
const yearSlider = document.createElement('input')
const yearMarker = document.createElement('span')
yearDiv.appendChild(yearMarker)
yearDiv.appendChild(yearSlider)

// Yesterday's day in real time
let yesterday = new Date('January 10, 2022').formatDate()

const mapChart = lightningChart()
    .Map({
        // theme: Themes.darkGold
        type: MapTypes.World,
        container: divMap,
    })
    .setTitle('')
    .setPadding({
        top: 30,
        bottom: 0,
        right: 0,
        left: 0,
    })

// Palette for coloring data by value
const theme = mapChart.getTheme()
const palette = new PalettedFill({
    lut: new LUT({
        steps: regularColorSteps(0, 100, theme.examples.badGoodColorPalette, {
            alpha: 150,
            formatLabels: (value) => `${value.toFixed(0)} %`,
        }),
    }),
})

// Create chart with customized settings
const chart = lightningChart()
    .ChartXY({
        // theme: Themes.darkGold
        container: divOverlay,
    })
    .setMouseInteractions(false)
    .setTitle('Loading example data ...')
    .setBackgroundFillStyle(transparentFill)
    .setSeriesBackgroundFillStyle(transparentFill)
    .setSeriesBackgroundStrokeStyle(emptyLine)
chart.engine.setBackgroundFillStyle(transparentFill)

// Hide axes
chart.getDefaultAxes().forEach((axis) => axis.setTickStrategy(AxisTickStrategies.Empty).setStrokeStyle(emptyLine))

// Synchronize ChartXY with MapChart view.
mapChart.onViewChange((view) => {
    const { latitudeRange, longitudeRange, margin } = view

    chart.getDefaultAxisX().setInterval({ start: longitudeRange.start, end: longitudeRange.end })
    chart.getDefaultAxisY().setInterval({ start: latitudeRange.start, end: latitudeRange.end })

    chart.setPadding(0)
})

// Create TextBox of 'average of vaccinated %'
const textBox = chart
    .addUIElement(UIElementBuilders.TextBox)
    .setOrigin(UIOrigins.LeftTop)
    .setPosition({
        x: 0,
        y: 100,
    })
    .setMargin(10)
    .setText('')
    .setTextFont((fontSettings) => fontSettings.setSize(15))
    .setBackground((background) => background.setFillStyle(emptyFill).setStrokeStyle(emptyLine))

// Add PointSeries
const covidVaccinated = chart
    .addPointSeries({
        pointShape: PointShape.Circle,
    })
    .setMouseInteractions(false)
    .setName('Vaccination coverage')
    .setIndividualPointSizeEnabled(true)
    .setIndividualPointValueEnabled(true)
    .setPointFillStyle(palette)
    .setEffect(false)
    .setCursorResultTableFormatter((builder, series, x, y, dataPoint) =>
        builder
            .addRow('')
            .addRow(dataPoint.country)
            .addRow(`Vaccinated once:`)
            .addRow(`${dataPoint.value.toFixed(2)}% of population`),
    )
    .setEffect(false)

// Fetch the data
fetch(document.head.baseURI + `examples/assets/1103/data.json`)
    .then((r) => r.json())
    .then((data) => {
        // Add data to the Point Series
        data.countries.forEach((el, i) => {
            covidVaccinated.add({
                x: el.pos[1],
                y: el.pos[0],
                value: 0,
                size: 0,
                country: el.name,
            })
        })

        // Set legendBox
        const legend = chart.addLegendBox().add(covidVaccinated)

        // Start TimeInterval
        startBubbling(covidVaccinated, data)

        // If slider was moved then stop animation and set
        yearSlider.oninput = () => {
            stopSlider()
            //start 'Bubbling' to animate poins during slider dragging
            startBubbling(covidVaccinated, data)
        }

        // Start/Stop animation by click on marker
        yearMarker.onclick = () => {
            if (animationActive) {
                stopSlider()
            } else {
                animationActive = true
                yearMarker.textContent = 'Started'
                yearMarker.style.background = markerColorGreen
                if (yearSlider.value == yearSlider.max) yearSlider.value = 0
                startBubbling(covidVaccinated, data)
            }
        }
    })
    .catch((error) => {
        console.log(error)
    })

function startBubbling(bubbles, data) {
    // The current day in the loop
    const date = new Date(2021, 0, yearSlider.value)
    let day = date.formatDate()

    // Clear data of the Series
    bubbles.clear()
    let total = 0
    // Add new data
    const dataAtDate = data.samples.find((item) => item.date === day)
    dataAtDate.values.forEach((vacc100, i) => {
        total = total + vacc100
        const country = data.countries[i]
        changeData(country, bubbles, vacc100)
    })

    // Set title as current day
    chart.setTitle(date.toLocaleDateString('FIN'))

    // Set textBox
    textBox.setText(`Population who received at least one vaccine ${(total / dataAtDate.values.length).toFixed(2)}%`)

    // Loop until reach 'Yesterday'
    if (yesterday > day && animationActive) {
        yearSlider.value++
        setTimeout(() => startBubbling(covidVaccinated, data), 1000 / 24)
    } else {
        stopSlider()
    }
}

// Add new data / change data function
function changeData(country, covidVaccinated, vacc100) {
    covidVaccinated.add({
        x: country.pos[1],
        y: country.pos[0],
        value: vacc100,
        size: Math.max(3, vacc100 / 2),
        country: country.name,
    })
}

function stopSlider() {
    animationActive = false
    yearMarker.textContent = 'Stopped'
    yearMarker.style.background = markerColorRed
}

// Style Map div
divMap.style.width = '100%'
divMap.style.height = '100%'
divMap.style.position = 'absolute'
divMap.style.left = '0px'
divMap.style.top = '0px'
mapChart.engine.layout()

// Style Chart div
divOverlay.style.width = '100%'
divOverlay.style.height = '100%'
divOverlay.style.position = 'absolute'
divOverlay.style.left = '0px'
divOverlay.style.top = '0px'
chart.engine.layout()

// Style Slider div
yearDiv.id = 'block'
yearSlider.type = 'range'
yearSlider.min = 0
yearSlider.max = Math.ceil((new Date('January 11, 2022') - new Date(2021, 0, 1)) / (1000 * 3600 * 24))
yearSlider.value = yearSlider.min
yearSlider.id = 'slider'
yearMarker.id = 'marker'
yearMarker.textContent = 'Started'
const markerColorGreen = 'rgb(0, 0, 200, 0.6)'
const markerColorRed = 'rgb(200, 0, 0)'

chart.engine.container.append(yearDiv)

// Dynamically inject some CSS to example.
function addStyle(styleString) {
    const style = document.createElement('style')
    style.textContent = styleString
    document.head.append(style)
}

addStyle(`

  * {
    box-sizing: border-box;
  }
  
  #block{
    width: 50%;
    height: 60px;
		top: 90%;
    right: 60px;
    position: absolute;
    display: flex;
    justify-content: space-evenly;
    padding: 30px 10px;
    z-index: 1;
    box-sizing: border-box
  }

  #slider{
    -webkit-appearance: none;
    margin: 0;
    padding: 0;
    width: 85%;
    height: 5px;
    position: relative;
    cursor: pointer;
    border-radius: 10px;
    border: solid 1px; 
    background: linear-gradient(to right, #fff 0%, white 100%)
  }
  
  #slider::-webkit-slider-thumb{
    -webkit-appearance: none;
    height: 20px;
    width: 20px;
    padding: 0;
    background-color: lightgray;
    cursor: pointer;
    border-radius: 50%;
    border: solid 1px gray
  }

  #marker {
    background: rgb(0, 0, 200, 0.6);
    color: white;
    height: 30px;
    width: 55px;
    top: -13px;
    position: relative;
    border-radius: 4px;
    text-align:center; 
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  #marker::after {
    content: "";
    text-align: center;
    position: absolute;
    left: 100%;
    border-bottom: 5px solid transparent;
    border-top: 5px solid transparent;
    border-left: 5px solid gray;
  }

  #marker:active {
    transform: scale(0.9);
  }

`)
