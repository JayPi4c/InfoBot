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
#define DHTTYPE DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

// LCD
LiquidCrystal_I2C lcd(0x27, 20, 4);

// toggle button
#define TOGGLEPIN 4
volatile byte backlightState = 1;

// rotary encoder
const byte CLK = 7;
const byte DT = 8;
const byte SW = 12;
volatile int count = 0;
volatile int lastCLK = 0;

void setup() {
  Serial.begin(115200);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print(" JayPi4c's Info-Bot");
  lcd.setCursor(0, 1);
  //-------Begin Sensor init-------//

  dht.begin();
  // Print temperature sensor details.
  sensor_t sensor;
  dht.temperature().getSensor(&sensor);
  Serial.println(F("------------------------------------"));
  Serial.println(F("Temperature Sensor"));
  Serial.print(F("Sensor Type: "));
  Serial.println(sensor.name);
  Serial.print(F("Driver Ver:  "));
  Serial.println(sensor.version);
  Serial.print(F("Unique ID:   "));
  Serial.println(sensor.sensor_id);
  Serial.print(F("Max Value:   "));
  Serial.print(sensor.max_value);
  Serial.println(F("°C"));
  Serial.print(F("Min Value:   "));
  Serial.print(sensor.min_value);
  Serial.println(F("°C"));
  Serial.print(F("Resolution:  "));
  Serial.print(sensor.resolution);
  Serial.println(F("°C"));
  Serial.println(F("------------------------------------"));
  // Print humidity sensor details.
  dht.humidity().getSensor(&sensor);
  Serial.println(F("Humidity Sensor"));
  Serial.print(F("Sensor Type: "));
  Serial.println(sensor.name);
  Serial.print(F("Driver Ver:  "));
  Serial.println(sensor.version);
  Serial.print(F("Unique ID:   "));
  Serial.println(sensor.sensor_id);
  Serial.print(F("Max Value:   "));
  Serial.print(sensor.max_value);
  Serial.println(F("%"));
  Serial.print(F("Min Value:   "));
  Serial.print(sensor.min_value);
  Serial.println(F("%"));
  Serial.print(F("Resolution:  "));
  Serial.print(sensor.resolution);
  Serial.println(F("%"));
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
  lcd.print();


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
  lcd.print("connected");
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
  Serial.print("Encoder value: ");
  Serial.println(count);
}

// https://forum.arduino.cc/index.php?topic=45000.0
void toggle() {
  const byte INTERRUPT_TIMEOUT = 150;
  static unsigned long last_interrupt_time = 0;
  unsigned long interrupt_time = millis();
  if (interrupt_time - last_interrupt_time > INTERRUPT_TIMEOUT)
    backlightState = !backlightState;
  last_interrupt_time = interrupt_time;
}

void loop() {
  // allow to turn of lcd
  if (backlightState)
    lcd.backlight();
  else
    lcd.noBacklight();

  // send data every minute
  if (millis() - lastMessageSent >= interval) {
    lastMessageSent = millis();
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
  lcd.setCursor(0, 1);
  lcd.print("                    ");
  lcd.setCursor(0, 2);
  lcd.print("                    ");
  lcd.setCursor(0, 3);
  lcd.print("                    ");
  lcd.setCursor(0, 1);
}
