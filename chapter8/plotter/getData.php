<?php
$db = new SQLite3('/home/pi/db/database.db');

$sts = $_REQUEST["sts"];
$ets = $_REQUEST["ets"];

$results = $db->query("SELECT * FROM sensorData WHERE timestamp > " . $sts . " AND timestamp < " . $ets . " ORDER BY timestamp DESC");
//$results = $db->query('SELECT * FROM sensorData ORDER BY timestamp DESC LIMIT 5');

$output = array();
while ($row = $results->fetchArray()) {
 $entry->timestamp = $row[0];
 $entry->temperature = $row[1];
 $entry->humidity= $row[2];
 array_push($output, $entry);
}
echo json_encode($output);
?>