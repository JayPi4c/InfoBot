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

#include <LiquidCrystal_I2C.h>


struct Row {
  String val;
  String constVal;
  byte index;
  bool printed;
};


// Message Interval
#define interval 60000
unsigned long lastMessageSent = 0;

///////please enter your sensitive data in the Secret tab/arduino_secrets.h
/////// Wifi Settings ///////
const char ssid[] = SECRET_SSID;
const char pass[] = SECRET_PASS;

IPAddress server(192, 168, 0, 6);
const int port = 31415;

WiFiClient wifi;
HttpClient client = HttpClient(wifi, server, port);
int status = WL_IDLE_STATUS;


/////// Sensor Settings ///////

// temp & humid sensor
#define DHTPIN 2
#define DHTTYPE    DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

// LCD
LiquidCrystal_I2C lcd(0x27, 20, 4);
Row rows[4];

// toggle button
#define TOGGLEPIN 4
volatile byte backlightState = 1;

// rotary encoder
const byte CLK = 7;
const byte DT = 8;
const byte SW = 12;
volatile int count = 0;
volatile int lastCLK = 0;

volatile byte infoMode = 4;
#define WIFIMODE  0
#define TEMPMODE  1
#define HUMIDMODE  2
#define MESSAGEMODE 3
#define IDLEMODE 4


void setup() {
  Serial.begin(115200);

  lcd.init();
  lcd.backlight();
  clearLCD();

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

  pinMode(TOGGLEPIN, INPUT_PULLUP);
  attachInterrupt(TOGGLEPIN, toggle, FALLING);

  pinMode(SW, INPUT_PULLUP);
  attachInterrupt(SW, encoderButton, CHANGE);
  pinMode(CLK, INPUT_PULLUP);
  pinMode(DT, INPUT);
  attachInterrupt(CLK, clockChanged, CHANGE);


  //-------End Sensor init-------//

  //-------Begin WiFi init-------//

  lcd.print("connecting to ");
  lcd.setCursor(0, 2);
  lcd.print(ssid);
  Serial.print("Attempting to connect to Network named: ");
  Serial.println(ssid);                   // print the network name (SSID);

  while ( status != WL_CONNECTED) {
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
  clearLCD();
  // little hack to show wifi data
  encoderButton();
  //-------End WiFi init-------//
}


void clockChanged() {
  int clkValue = digitalRead(CLK);
  int dtValue = digitalRead(DT);
  if (lastCLK != clkValue) {
    lastCLK = clkValue;
    count += (clkValue != dtValue ? 1 : -1);
  }
}

void encoderButton() {
  // Serial.print("Encoder value: ");
  // Serial.println(count);

  const byte INTERRUPT_TIMEOUT = 150;
  static unsigned long last_encoder_time = 0;
  unsigned long interrupt_time = millis();
  if (interrupt_time - last_encoder_time > INTERRUPT_TIMEOUT) {
    ++infoMode %= 5;
    last_encoder_time = interrupt_time;

    switch (infoMode) {
      case TEMPMODE:
        sensor_t sensor;
        dht.temperature().getSensor(&sensor);
        setRowValue(0, "Info-Bot ", "Temperature");
        setRowValue(1, "Max:", String(sensor.max_value) + (char)223 + 'C');
        setRowValue(2, "Min:", String(sensor.min_value) + (char)223 + 'C');
        setRowValue(3, "Res:", String(sensor.resolution) + (char)223 + 'C');
        break;
      case HUMIDMODE:
        dht.humidity().getSensor(&sensor);
        setRowValue(0, "Info-Bot ", "Humidity");
        setRowValue(1, "Max:", String(sensor.max_value) + "%");
        setRowValue(2, "Min:", String(sensor.min_value) + "%");
        setRowValue(3, "Res:", String(sensor.resolution) + "%");
        break;
      case WIFIMODE:
        setRowValue(0, "Info-Bot ", "WiFi");
        setRowValue(1, "SSID:", WiFi.SSID());
        setRowValue(2, "IP:", IpAddress2String(WiFi.localIP()));
        setRowValue(3, "SubNetMask:", IpAddress2String(WiFi.subnetMask()));
        break;
      default:;
    }
  }
}


// https://forum.arduino.cc/index.php?topic=45000.0
void toggle() {
  const byte INTERRUPT_TIMEOUT = 150;
  static unsigned long last_toggle_time = 0;
  unsigned long interrupt_time = millis();
  if (interrupt_time - last_toggle_time > INTERRUPT_TIMEOUT)
    backlightState = !backlightState;
  last_toggle_time = interrupt_time;
}

void loop() {
  // allow to turn of lcd
  if (backlightState)
    lcd.backlight();
  else
    lcd.noBacklight();

  if (infoMode != IDLEMODE && infoMode != MESSAGEMODE)
    autoscrollPrint();

  // send data every minute
  if (millis() - lastMessageSent >= interval) {
    lastMessageSent = millis();
    infoMode = MESSAGEMODE;
    sendData();
  }
}

void sendData() {
  digitalWrite(LED_BUILTIN, HIGH);
  clearLCD();
  lcd.print("Gathering data!");
  Serial.println("making POST request");
  String contentType = "application/x-www-form-urlencoded";
  String postData = getData();
  lcd.setCursor(0, 3);
  lcd.print("Making post request!");

  client.post("/", contentType, postData);

  // read the status code and body of the response
  int statusCode = client.responseStatusCode();
  Serial.print("Status code: ");
  Serial.println(statusCode);
  clearLCD();
  lcd.print("Status code: ");
  lcd.print(statusCode);
  String response = client.responseBody();
  Serial.print("Response: ");
  Serial.println(response);
  lcd.setCursor(0, 2);
  lcd.print("Response: ");
  lcd.setCursor(0, 3);
  lcd.print(response);
  digitalWrite(LED_BUILTIN, LOW);

  if (statusCode == -2) {
    testWifiConnection();
  }
}
//https://forum.arduino.cc/index.php?topic=599837.0
void testWifiConnection() {
  int statusWifi = WiFi.status();
  if (statusWifi == WL_CONNECTION_LOST || statusWifi == WL_DISCONNECTED || statusWifi == WL_SCAN_COMPLETED) {
    WiFiConnect();
  }
}

void WiFiConnect() {
  status = WL_IDLE_STATUS;
  while (status != WL_CONNECTED) {
    status = WiFi.begin(ssid, pass);
  }
}

String getData() {
  // Get temperature event and print its value.
  sensors_event_t tempEvent;
  dht.temperature().getEvent(&tempEvent);
#ifdef DEBUG
  if (isnan(tempEvent.temperature)) {
    Serial.println(F("Error reading temperature!"));
  } else {
    Serial.print(F("Temperature: "));
    Serial.print(tempEvent.temperature);
    Serial.println(F("°C"));
  }
#endif
  // Get humidity event and print its value.
  sensors_event_t humidEvent;
  dht.humidity().getEvent(&humidEvent);
#ifdef DEBUG
  if (isnan(humidEvent.relative_humidity)) {
    Serial.println(F("Error reading humidity!"));
  } else {
    Serial.print(F("Humidity: "));
    Serial.print(humidEvent.relative_humidity);
    Serial.println(F("%"));
  }
#endif
  String result = "";
  result.concat(F("{\"data\":[["));
  result.concat(0);
  result.concat(F(","));
  result.concat(tempEvent.temperature);
  result.concat(F(","));
  result.concat(humidEvent.relative_humidity);
  result.concat(F("]]}"));
  return result;
}

void clearLCD() {
  lcd.home();
  lcd.print(" JayPi4c's Info-Bot ");
  lcd.setCursor(0, 1);
  lcd.print("                    ");
  lcd.setCursor(0, 2);
  lcd.print("                    ");
  lcd.setCursor(0, 3);
  lcd.print("                    ");
  lcd.setCursor(0, 1);
}


// autoscroll helper

void setRowValue(byte row, String constVal, String val) {
  rows[row] = {val, constVal, 0};
}

void autoscrollPrint() {
  const int scrollDelay = 500;
  static unsigned long last_time = 0;

  if (millis() - last_time > scrollDelay) {

    for (int i = 0; i < 4; i++) {
      int cvl = rows[i].constVal.length();
      int vl = rows[i].val.length();

      if (cvl + vl <= 20 && rows[i].printed)
        continue;
      lcd.clear(i, cvl, 20 - cvl);
      lcd.setCursor(0, i);
      lcd.print(rows[i].constVal);
      int j = 20 - cvl + rows[i].index;
      lcd.print(rows[i].val.substring(rows[i].index, j));
      if (j <= vl && rows[i].printed) {
        ++rows[i].index %= (vl + cvl - 19);
        if (rows[i].index == 0)
          rows[i].printed = false;
        else
          rows[i].printed = true;
      } else {
        rows[i].index = 0;
        rows[i].printed = true;
      }
    }
    last_time = millis();
  }
}


String IpAddress2String(const IPAddress& ipAddress) {
  return String(ipAddress[0]) + String(".") + \
         String(ipAddress[1]) + String(".") + \
         String(ipAddress[2]) + String(".") + \
         String(ipAddress[3])  ;
}
