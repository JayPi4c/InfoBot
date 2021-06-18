#include <ArduinoMqttClient.h>

#if defined(ARDUINO_SAMD_MKRWIFI1010) || defined(ARDUINO_SAMD_NANO_33_IOT) || defined(ARDUINO_AVR_UNO_WIFI_REV2)
#include <WiFiNINA.h>
#elif defined(ARDUINO_SAMD_MKR1000)
#include <WiFi101.h>
#elif defined(ARDUINO_ESP8266_ESP12)
#include <ESP8266WiFi.h>
#endif

#include "arduino_secrets.h"


// Sensor Imports
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
#include <Wire.h>

#include <LiquidCrystal_I2C.h>

#include <ArduinoJson.h>


// Message Interval
#define interval 60000
unsigned long lastMessageSent = 0;

///////please enter your sensitive data in the Secret tab/arduino_secrets.h
char ssid[] = SECRET_SSID;  // your network SSID (name)
char pass[] = SECRET_PASS;  // your network password (use for WPA, or use as key for WEP)

// To connect with SSL/TLS:
// 1) Change WiFiClient to WiFiSSLClient.
// 2) Change port value from 1883 to 8883.
// 3) Change broker value to a server with a known SSL/TLS root certificate
//    flashed in the WiFi module.


// MQTT Settings
WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

const char broker[] = "192.168.0.6";
const int port = 1883;

const char TOPIC[] = "bedroom";

// Sensor Settings
#define DHTPIN 2
#define DHTTYPE DHT11
DHT_Unified dht(DHTPIN, DHTTYPE);

//LCD
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
  //Initialize serial and wait for port to open:
  Serial.begin(115200);
  while (!Serial) {
    ;  // wait for serial port to connect. Needed for native USB port only
  }

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



  // attempt to connect to Wifi network:
  Serial.print("Attempting to connect to WPA SSID: ");
  Serial.println(ssid);

  lcd.print("connecting to ");
  lcd.setCursor(0, 2);
  lcd.print(ssid);

  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    // failed, retry
    lcd.print(".");
    delay(500);
    lcd.print(".");
    delay(500);
    lcd.print(".");
    delay(500);
    clearLCD();
  }

  Serial.println("You're connected to the network");
  Serial.println();

  // You can provide a unique client ID, if not set the library uses Arduino-millis()
  // Each client must have a unique client ID
  // mqttClient.setId("clientId");

  // You can provide a username and password for authentication
  // mqttClient.setUsernamePassword("username", "password");

  Serial.print("Attempting to connect to the MQTT broker: ");
  Serial.println(broker);

  if (!mqttClient.connect(broker, port)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());

    lcd.print("MQTT connection failed! Error code = ");
    lcd.print(mqttClient.connectError());

    while (1)
      ;
  }

  clearLCD();
  lcd.print("connected to Broker");

  Serial.println("You're connected to the MQTT broker!");
  Serial.println();
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
  if (interrupt_time - last_interrupt_time > INTERRUPT_TIMEOUT) {
    backlightState = !backlightState;
  }
  last_interrupt_time = interrupt_time;
}



void loop() {
  if (!mqttClient.connected()) {
    clearLCD();
    lcd.print("Lost connection!");
    testWifiConnection();

    if (!mqttClient.connect(broker, port)) {
      Serial.print("MQTT connection failed! Error code = ");
      Serial.println(mqttClient.connectError());

      lcd.setCursor(0, 2);
      lcd.print("MQTT ECode = ");
      lcd.print(mqttClient.connectError());

      while (1)
        ;
    }
  }

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
  Serial.println("send data");

  sensors_event_t tempEvent;
  dht.temperature().getEvent(&tempEvent);

  sensors_event_t humidEvent;
  dht.humidity().getEvent(&humidEvent);

  send(TOPIC, getJson(tempEvent.temperature, humidEvent.relative_humidity));
  digitalWrite(LED_BUILTIN, LOW);
}

void send(char topic[], String payload) {
  clearLCD();
  Serial.print("Sending to ");
  Serial.println(topic);
  mqttClient.beginMessage(topic);
  mqttClient.print(payload);
  mqttClient.endMessage();
  lcd.print("published");
}

String getJson(float temp, float humid) {
  const int capacity = JSON_OBJECT_SIZE(3);
  StaticJsonDocument<capacity> doc;
  doc["timestamp"] = millis();
  doc["temperature"] = temp;
  doc["humidity"] = humid;
  String output = "";
  serializeJsonPretty(doc, output);
  return output;
}

void testWifiConnection() {
  int statusWifi = WiFi.status();
  if (statusWifi == WL_CONNECTION_LOST || statusWifi == WL_DISCONNECTED || statusWifi == WL_SCAN_COMPLETED) {
    WiFiConnect();
  }
}

void WiFiConnect() {
  int status = WL_IDLE_STATUS;
  while (status != WL_CONNECTED) {
    status = WiFi.begin(ssid, pass);
  }
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