const sqlite3 = require('sqlite3').verbose();
const fs = require("fs");

const {
  CanvasRenderService
} = require('chartjs-node-canvas');



let db = new sqlite3.Database('../chapter7/database.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the database.');
});

let min = Math.floor(1607719644) - (7 * 24 * 60 * 60);
let now = Math.floor(new Date().getTime() / 1000);
sql = `SELECT * FROM sensorData WHERE timestamp > ${min}`;
db.all(sql, [], (err, data) => {
  if (err) console.err(err);
  else {




        let humidData = data.map(elt => {
          return {
            t: new Date(elt.timestamp * 1000),
            y: elt.humidity
          };
        });

        humidData = formatDataset(humidData);
  /*
    let humidData = data.map(elt => {
      return {
        t: elt.timestamp,
        y: elt.humidity
      };
    });

    let hData = [];
    const start = humidData[0];
    const end = humidData[humidData.length - 1];
    hData.push(start);
    rdp(0, humidData.length - 1, humidData, hData, 0.01);
    hData.push(end);
    humidData = hData;

    humidData = humidData.map(elt => {
      return {
        t: new Date(elt.t * 1000),
        y: elt.y
      };
    });

    humidData = formatDataset(humidData);

*/

/*
    let tempData = data.map(elt => {
      return {
        t: new Date(elt.timestamp * 1000),
        y: elt.temperature
      };
    });

    tempData = formatDataset(tempData);*/

    let tempData = data.map(elt => {
      return {
        t: elt.timestamp,
        y: elt.temperature
      };
    });

    let tData = [];
    const start = tempData[0];
    const end = tempData[tempData.length - 1];
    tData.push(start);
    rdp(0, tempData.length - 1, tempData, tData, 0.1);
    tData.push(end);
    tempData = tData;

    tempData = tempData.map(elt => {
      return {
        t: new Date(elt.t * 1000),
        y: elt.y
      };
    });

    tempData = formatDataset(tempData);


    let config = {
      // The type of chart we want to create
      type: 'line',

      // The data for our dataset
      data: {
        labels: [],
        datasets: [{
          yAxisID: 'temp',
          label: 'Temperatur',
          backgroundColor: 'rgba(200, 0,0,0.5)',
          borderColor: 'rgb(200, 0 ,0)',
          data: tempData
        }, {
          yAxisID: 'humid',
          label: 'Luftfeuchtigkeit',
          /*backgroundColor: 'rgba(0, 0, 200, 0.5)',*/
          borderColor: 'rgb(0, 0, 200)',
          data: humidData
        }]
      },

      // Configuration options go here
      options: {
        scales: {
          xAxes: [{
            type: 'time',
            ticks: {
              unit: 'day',
              min: new Date(data.reduce((min, p) => p[0] < min ? p[0] : min, data[0][0])),
              max: new Date(data.reduce((min, p) => p[0] < min ? p[0] : min, data[0][0]) + 1000 * 1000 * 60 * 60 * 24)
            }
          }],
          yAxes: [{
            id: 'humid',
            type: 'linear',
            position: 'right',
            ticks: {
              suggestedMin: parseInt(humidData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, humidData[0].y)) - 1,
              suggestedMax: parseInt(humidData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, humidData[0].y)) + 1
            }
          }, {
            id: 'temp',
            type: 'linear',
            position: 'left',
            ticks: {
              suggestedMin: (tempData.reduce((min, elt) => elt.y == null ? min : elt.y < min ? elt.y : min, tempData[0].y) - 1),
              suggestedMax: (tempData.reduce((max, elt) => elt.y == null ? max : elt.y > max ? elt.y : max, tempData[0].y) + 1)
            }
          }]
        },
        elements: {
          point: {
            radius: 0
          }
        }
      }
    };


    const mkChart = async (params) => {
      const canvasRenderService = new CanvasRenderService(800, 600);
      return await canvasRenderService.renderToBuffer(config);
    }


    const saveChart = async () => {
      let image = await mkChart();

      fs.writeFile('./out.png', image, (err) => console.log(err ? err : 'File successfully saved!'));

    };

    saveChart();


    //fs.writeFile('./out.png',await mkChart(), (err)=> console.log(err));

    /*  data.forEach((row) => {
        console.log(row);
      });*/
  }
});



db.close();



function rdp(startIndex, endIndex, allPoints, rdpPoints, epsilon) {
  const nextIndex = findFurthest(allPoints, startIndex, endIndex, epsilon);
  if (nextIndex > 0) {
    if (startIndex != nextIndex) {
      rdp(startIndex, nextIndex, allPoints, rdpPoints, epsilon);
    }
    rdpPoints.push(allPoints[nextIndex]);
    if (endIndex != nextIndex) {
      rdp(nextIndex, endIndex, allPoints, rdpPoints, epsilon);
    }
  }

}

function findFurthest(points, a, b, epsilon) {
  let recordDistance = -1;
  const start = points[a];
  const end = points[b];
  let furthestIndex = -1;
  for (let i = a + 1; i < b; i++) {
    const currentPoint = points[i];
    const d = perpendicularDistance(currentPoint, start, end);
    if (d > recordDistance) {
      recordDistance = d;
      furthestIndex = i;
    }
  }
  if (recordDistance > epsilon) {
    return furthestIndex;
  } else {
    return -1;
  }
}


function perpendicularDistance(point, a, b) {
  let numerator = Math.abs((a.y - b.y) * point.t + (b.t - a.t) * point.y + a.t * b.y - b.t * a.y);
  let denominator = Math.sqrt((b.t - a.t) * (b.t - a.t) + (b.y - a.y) * (b.y - a.y));
  return numerator / denominator;
}


function formatDataset(sortedArray) {

  for (let i = sortedArray.length - 1; i > 0; i--) {
    let tStampPrev = sortedArray[i - 1].t.getTime();
    let tStamp = sortedArray[i].t.getTime();
    if ((tStamp - tStampPrev) > 20 * 60 * 1000) {
      sortedArray.splice(i, 0, {
        t: new Date(tStampPrev + 1),
        y: null
      });
    }
  }
  return sortedArray;
}
