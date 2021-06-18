// set timeinput to current date
// TODO


function submit() {
    console.log("submitting Data");
    let beginDate = new Date(document.getElementById("start").value);
    let startTS = ~~(beginDate.getTime() / 1000);
    let endDate = new Date(new Date(document.getElementById("end").value));
    let endTS = ~~(endDate.getTime() / 1000);
    if (startTS > endTS) {
        let tmp = startTS;
        startTS = endTS;
        endTS = tmp;
    }

    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            let db_data = JSON.parse(this.responseText);
            createChart(db_data, beginDate, endDate);
        }
    };
    xmlhttp.open("GET", "getData.php?sts=" + startTS + "&ets=" + endTS, true);
    xmlhttp.send();



}

function createChart(db_data, beginDate, endDate) {

    let config = {};
    config.type = 'line';
    config.data = {
        labels: ['humidity', 'temperature'],
        datasets: []
    };

    config.options = {
        scales: {
            xAxes: [{
                type: 'time',
                ticks: {
                    unit: 'day',
                    min: beginDate,
                    max: endDate
                }
            }],
            yAxes: []
        },
        elements: {
            point: {
                radius: 0
            }
        }
    };



    let humidData = db_data.map(elt => {
        return {
            t: new Date(elt.timestamp * 1000),
            y: elt.humidity
        };
    });
    humidData = formatDataset(humidData);


    config.data.datasets.push({
        yAxisID: 'humid',
        label: 'Luftfeuchtigkeit',
        /*backgroundColor: 'rgba(0, 0, 200, 0.5)',*/
        borderColor: 'rgb(0, 0, 200)',
        data: humidData
    });
    config.options.scales.yAxes.push({
        id: 'humid',
        type: 'linear',
        position: 'right',
        ticks: {
            suggestedMin: parseInt(humidData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, humidData[0].y)) - 1,
            suggestedMax: parseInt(humidData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, humidData[0].y)) + 1
        }
    });

    let tempData = db_data.map(elt => {
        return {
            t: new Date(elt.timestamp * 1000),
            y: elt.temperature
        };
    });
    tempData = formatDataset(tempData);

    config.data.datasets.push({
        yAxisID: 'temp',
        label: 'Temperatur',
        backgroundColor: 'rgba(200, 0,0,0.5)',
        borderColor: 'rgb(200, 0 ,0)',
        data: tempData
    });
    config.options.scales.yAxes.push({
        id: 'temp',
        type: 'linear',
        position: 'left',
        ticks: {
            suggestedMin: (tempData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, tempData[0].y) - 1),
            suggestedMax: (tempData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, tempData[0].y) + 1)
        }
    });

    let myChart = new Chart(document.getElementById('myChart').getContext('2d'), config);
console.log(myChart);
}

function formatDataset(sortedArray) {
    for (let i = sortedArray.length - 1; i > 0; i--) {
        let tStampPrev = sortedArray[i - 1].t.getTime();
        let tStamp = sortedArray[i].t.getTime();
        if ((tStamp - tStampPrev) > 2 * 60 * 1000) {
            sortedArray.splice(i, 0, {
                t: new Date(tStampPrev + 1),
                y: null
            });
        }
    }
    return sortedArray;
}