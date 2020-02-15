/*
   https://forum.arduino.cc/index.php?topic=620997.0
   https://github.com/arduino-libraries/ArduinoHttpClient


   created by JayPi4c
*/
//#define DEBUG

// wifi imports
#include <ArduinoHttpClient.h>
#include <WiFiNINA.h>
#include "arduino_secrets.h"

// Sensor Imports
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
#include <Wire.h>
#include <DS3231.h>


///////please enter your sensitive data in the Secret tab/arduino_secrets.h
/////// Wifi Settings ///////
char ssid[] = SECRET_SSID;
char pass[] = SECRET_PASS;

IPAddress server(192, 168, 178, 24);
int port = 31415;

WiFiClient wifi;
HttpClient client = HttpClient(wifi, server, port);
int status = WL_IDLE_STATUS;


/////// Sensor Settings ///////

// temp & humid sensor
#define DHTPIN 2
#define DHTTYPE    DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

//RTC
DS3231 clock;
const long TIME_OFFSET = 24L*60L*60L;


void setup() {
  Serial.begin(115200);

  //-------Begin Sensor init-------//

  dht.begin();
  // Print temperature sensor details.
  sensor_t sensor;
  dht.temperature().getSensor(&sensor);
  Serial.println(F("------------------------------------"));
  Serial.println(F("Temperature Sensor"));
  Serial.print  (F("Sensor Type: ")); Serial.println(sensor.name);
  Serial.print  (F("Driver Ver:  ")); Serial.println(sensor.version);
  Serial.print  (F("Unique ID:   ")); Serial.println(sensor.sensor_id);
  Serial.print  (F("Max Value:   ")); Serial.print(sensor.max_value); Serial.println(F("°C"));
  Serial.print  (F("Min Value:   ")); Serial.print(sensor.min_value); Serial.println(F("°C"));
  Serial.print  (F("Resolution:  ")); Serial.print(sensor.resolution); Serial.println(F("°C"));
  Serial.println(F("------------------------------------"));
  // Print humidity sensor details.
  dht.humidity().getSensor(&sensor);
  Serial.println(F("Humidity Sensor"));
  Serial.print  (F("Sensor Type: ")); Serial.println(sensor.name);
  Serial.print  (F("Driver Ver:  ")); Serial.println(sensor.version);
  Serial.print  (F("Unique ID:   ")); Serial.println(sensor.sensor_id);
  Serial.print  (F("Max Value:   ")); Serial.print(sensor.max_value); Serial.println(F("%"));
  Serial.print  (F("Min Value:   ")); Serial.print(sensor.min_value); Serial.println(F("%"));
  Serial.print  (F("Resolution:  ")); Serial.print(sensor.resolution); Serial.println(F("%"));
  Serial.println(F("------------------------------------"));

  clock.begin();
  //clock.setDateTime(__DATE__, __TIME__);
  //-------End Sensor init-------//

  //-------Begin WiFi init-------//

  while ( status != WL_CONNECTED) {
    Serial.print("Attempting to connect to Network named: ");
    Serial.println(ssid);                   // print the network name (SSID);

    // Connect to WPA/WPA2 network:
    status = WiFi.begin(ssid, pass);
  }

  // print the SSID of the network you're attached to:
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print your WiFi shield's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);


  //-------End WiFi init-------//
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("making POST request");
  String contentType = "application/x-www-form-urlencoded";
#ifdef DEBUG
  String postData = getDataDebug();
#else
  String postData = getData();
#endif

  client.post("/", contentType, postData);

  // read the status code and body of the response
  int statusCode = client.responseStatusCode();
  Serial.print("Status code: ");
  Serial.println(statusCode);
  String response = client.responseBody();
  Serial.print("Response: ");
  Serial.println(response);
  digitalWrite(LED_BUILTIN, LOW);

  Serial.println("Wait 60 seconds");
  delay(60000);
}

String getDataDebug() {
  // Get temperature event and print its value.
  sensors_event_t tempEvent;
  dht.temperature().getEvent(&tempEvent);
  if (isnan(tempEvent.temperature)) {
    Serial.println(F("Error reading temperature!"));
  }else {
    Serial.print(F("Temperature: "));
    Serial.print(tempEvent.temperature);
    Serial.println(F("°C"));
  }
  // Get humidity event and print its value.
  sensors_event_t humidEvent;
  dht.humidity().getEvent(&humidEvent);
  if (isnan(humidEvent.relative_humidity)) {
    Serial.println(F("Error reading humidity!"));
  }else {
    Serial.print(F("Humidity: "));
    Serial.print(humidEvent.relative_humidity);
    Serial.println(F("%"));
  }

  RTCDateTime dt;
  dt = clock.getDateTime();
  Serial.print("unixtime: ");
  Serial.println(dt.unixtime-TIME_OFFSET);


  String result = "";
  result.concat(F("{data:[["));
  result.concat(dt.unixtime-TIME_OFFSET);
  result.concat(F(","));
  result.concat(tempEvent.temperature);
  result.concat(F(","));
  result.concat(humidEvent.relative_humidity);
  result.concat(F("]]}"));
  return result;
}

String getData() {
  sensors_event_t tempEvent;
  sensors_event_t humidEvent;
  dht.temperature().getEvent(&tempEvent);
  dht.humidity().getEvent(&humidEvent);
  RTCDateTime dt;
  dt = clock.getDateTime();
  String result = "";
  result.concat(F("{\"data\":[["));
  result.concat(dt.unixtime-TIME_OFFSET);
  result.concat(F(","));
  result.concat(tempEvent.temperature);
  result.concat(F(","));
  result.concat(humidEvent.relative_humidity);
  result.concat(F("]]}"));
  return result;
}
