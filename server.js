import express from 'express';
import bodyParser from 'body-parser';
import pty from 'node-pty-prebuilt-multiarch';
import mqtt from 'mqtt'

const BROKER_PORT = 8883
const VSS_TOPIC = "joyja/car/a8b3f7d2/vss/data"
const BROKER_URL = `mqtts://29286cbd1b03464594ed587a7f335e9b.s1.eu.hivemq.cloud:${BROKER_PORT}`;
const CLIENT_ID = 'VSS_Continuous_Panel';
const USERNAME = 'vehicleEX01';
const PASSWORD = 'Mobility.Aes1';

const mqtt_client = mqtt.connect(BROKER_URL, {
    clientId: CLIENT_ID,
    username: USERNAME,
    password: PASSWORD,
    protocolVersion: 5, // MQTT 5.0
    rejectUnauthorized: false, // only if self-signed cert
});

mqtt_client.on('close', () => console.log('Closed!'));
mqtt_client.on('offline', () => console.log('Offline!'));
mqtt_client.on('error', (err) => console.error('Connection error:', err.message));
mqtt_client.on('connect', () => {
    console.log('Connected!');
    
    mqtt_client.subscribe(VSS_TOPIC);
});
mqtt_client.on('message', (topic, message) => {
    console.log(topic, message.toString());
    const msgObj = JSON.parse(message.toString());
    const text = `${msgObj.path}: ${msgObj.value}`;
    
    ////parseAndValidate(text);

    dockerSubscribe.write(`actuate ${msgObj.path} ${msgObj.value}\n`);
});

const app = express();
const BROKER = "kuksa"; //vdis-demo_kuksa
const SERVER = "Server"; //192.168.1.231 192.168.1.160
const HOST = "0.0.0.0"; //SERVER
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('.', { index: 'index.html' }));

// Variables for storing current state of all subscribed paths
let currentState = {
  "Vehicle.Cabin.Seat.Row1.DriverSide.Occupant.Identifier.Issuer": false,
  "Vehicle.Cabin.Seat.Row1.PassengerSide.Occupant.Identifier.Issuer": false,
  "Vehicle.Cabin.Seat.Row2.DriverSide.Occupant.Identifier.Issuer": false,
  "Vehicle.Cabin.Seat.Row2.Middle.Occupant.Identifier.Issuer": false,
  "Vehicle.Cabin.Seat.Row2.PassengerSide.Occupant.Identifier.Issuer": false,
  "Vehicle.Cabin.ChildPresenceDetection.UWBBreathing": 0,
  "Vehicle.Cabin.HVAC.AmbientAirTemperature": 22,
  "Vehicle.Cabin.ChildPresenceDetection.NotificationTime": 0,
  "Vehicle.Cabin.ChildPresenceDetection.SystemStatus": "Child Confirmed",
  "Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive": true,
  "Vehicle.Cabin.ChildPresenceDetection.DelayNotification": 0,
  "Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive": false
};

// Clients connected to SSE stream
const clients = new Set();

// ======= ENDPOINT: /events (SSE stream) =======
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.add(res);
  console.log('Client connected to SSE stream');

  req.on('close', () => {
    clients.delete(res);
    console.log('Client SSE disconnected');
  });
});

// Function to broadcast state updates to all connected SSE clients
function broadcastStateUpdate() {
  const data = JSON.stringify(currentState);
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}


// ============================================================================
// PUBLISH - Send values to KUKSA Databroker
// ============================================================================
app.post('/publish', (req, res) => {
  const { path, value } = req.body;

  if (!path || value === undefined) {
    return res.status(400).send("Chybí 'path' nebo 'value'!");
  }

  const valueStr = String(value);
  dockerSubscribe.write(`actuate ${path} ${valueStr}\n`);
  dockerSubscribe.write(`publish ${path} ${valueStr}\n`);

  res.send(`publish ${path} ${valueStr}`);
  ////mqtt_client.publish(VSS_TOPIC, JSON.stringify({path: path, value: valueStr}));
});

// ======= ENDPOINT: /state =======
app.get('/state', (req, res) => {
  res.json(currentState);
});

// ============================================================================
// SUBSCRIBE - Listen for updates from KUKSA Databroker and update currentState + SSE stream
// ============================================================================
const dockerSubscribe = pty.spawn('docker', [
  'run', '-it', '--rm', '--network', `${BROKER}`,
  'ghcr.io/eclipse-kuksa/kuksa-databroker-cli:main',
  '--server', `${SERVER}:55555`
], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env
}); 

dockerSubscribe.onData((data) => {
  if (data.includes('Successfully connected'))
  {
    dockerSubscribe.write('subscribe Vehicle.Cabin.Seat.Row1.DriverSide.Occupant.Identifier.Issuer\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.Seat.Row1.PassengerSide.Occupant.Identifier.Issuer\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.Seat.Row2.DriverSide.Occupant.Identifier.Issuer\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.Seat.Row2.Middle.Occupant.Identifier.Issuer\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.Seat.Row2.PassengerSide.Occupant.Identifier.Issuer\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.ChildPresenceDetection.UWBBreathing\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.HVAC.AmbientAirTemperature\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.ChildPresenceDetection.NotificationTime\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.ChildPresenceDetection.SystemStatus\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.ChildPresenceDetection.DelayNotification\n\n');
    dockerSubscribe.write('subscribe Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive\n\n');

    return;
  }

  console.log(data);

  const text = data.toString();
  parseAndValidate(text);

});

// Parsing function with validation and change detection
function parseAndValidate(text) {
  let changed = false;

  const parseBool = (path) => {
    const match = text.match(new RegExp(`${path}:\\s*['"]?(true|false)['"]?`, 'i'));
    if (match) {
      const val = match[1].toLowerCase() === 'true';
      if (val !== currentState[path]) {
        currentState[path] = val;
        changed = true;
        console.log(`${path} (BOOL): ${val}`);
        mqtt_client.publish(VSS_TOPIC, JSON.stringify({ path, value: val, timestamp: Date.now() / 1000 }));
      }
    }
  };

  const parseIntVal = (path, min = -Infinity, max = Infinity) => {
    const match = text.match(new RegExp(`${path}:\\s*([+-]?\\d+)`, 'i'));
    if (match) {
      let val = parseInt(match[1], 10);
      val = Math.max(min, Math.min(max, val));
      if (val !== currentState[path]) {
        currentState[path] = val;
        changed = true;
        console.log(`${path} (INT): ${val}`);
        mqtt_client.publish(VSS_TOPIC, JSON.stringify({ path, value: val }));
      }
    }
  };

  const parseStr = (path, toUpper = false) => {
    const match = text.match(new RegExp(`${path}:\\s*['"]?(.*?)['"]?(\\s|$)`, 'i'));
    if (match) {
      let val = match[1];
      if (toUpper) val = val.toUpperCase();
      if (val !== currentState[path]) {
        currentState[path] = val;
        changed = true;
        console.log(`${path} (STR): ${val}`);
        mqtt_client.publish(VSS_TOPIC, JSON.stringify({ path, value: val }));
      }
    }
  };

  // Strings
  parseStr("Vehicle.Cabin.ChildPresenceDetection.SystemStatus");

  // Booleans
  parseBool("Vehicle.Cabin.Seat.Row1.DriverSide.Occupant.Identifier.Issuer");
  parseBool("Vehicle.Cabin.Seat.Row1.PassengerSide.Occupant.Identifier.Issuer");
  parseBool("Vehicle.Cabin.Seat.Row2.DriverSide.Occupant.Identifier.Issuer");
  parseBool("Vehicle.Cabin.Seat.Row2.Middle.Occupant.Identifier.Issuer");
  parseBool("Vehicle.Cabin.Seat.Row2.PassengerSide.Occupant.Identifier.Issuer");
  parseBool("Vehicle.Cabin.ChildPresenceDetection.IsCPDSystemActive");
  parseBool("Vehicle.Cabin.ChildPresenceDetection.IsDeveloperOptionActive");

  // Integers
  parseIntVal("Vehicle.Cabin.ChildPresenceDetection.UWBBreathing");
  parseIntVal("Vehicle.Cabin.HVAC.AmbientAirTemperature");
  parseIntVal("Vehicle.Cabin.ChildPresenceDetection.NotificationTime");
  parseIntVal("Vehicle.Cabin.ChildPresenceDetection.DelayNotification");

  if (changed) broadcastStateUpdate();
}

// ============================================================================
// SERVER START
// ============================================================================
app.listen(PORT, HOST, () => {
  console.log(`Server běží na http://${HOST}:${PORT}`);
});