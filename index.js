const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
const port = parseInt(process.argv[3]) || 4444;

/*
  <!--
    MODE SELECTION
    proactive:  prevent cross-site credential reuse
    reactive:   detect & mitigate credential stuffing attacks
    both:       use both proactive & reactive strategies
    none:       use neither strategy, accept all requests
    rate:       use blind rate limiting strategy
*/
    const MODE = 'rate';
    const threshold = 1.5;
    const trainSeconds = 60;
/*
  -->
*/

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var users = {};
var services = [];
var train = true;
var trainBase = [];
var attackBase = [];
var blocked = new Set();

app.get('/reset', (req, res) => {
  users = {};
  services = [];
  train = true;
  trainBase = [];
  attackBase = [];
  blocked = new Set();

  setTimeout(() => {
    train = false;
  }, trainSeconds * 1000);

  console.log("Service reset! (" + port + ")");
  return res.status(200).send();
});

app.get('/kill', (req, res) => {
  console.log("Process exiting! (" + port + ")");
  process.exit();
  return res.status(200).send();
});

app.post('/register', (req, res) => {
  if (MODE === 'proactive' || MODE === 'both') {
    if (!users[req.body.hash]) {
      users[req.body.hash] = [req.body.service];
      if (!services[req.body.service]) services[req.body.service] = [];
      services[req.body.service].push(req.body.hash);
      res.status(200).send({valid: true});
    } else {
      res.status(200).send({valid: false});
    }
  } else {
    if (!users[req.body.hash]) users[req.body.hash] = [];
    users[req.body.hash].push(req.body.service);
    if (!services[req.body.service]) services[req.body.service] = [];
    services[req.body.service].push(req.body.hash);
    res.status(200).send({valid: true});
  }
});

app.post('/login', (req, res) => {
  let base = attackBase;
  if (train) base = trainBase;

  if (MODE === 'proactive' || MODE === 'none') {
    res.status(200).send({valid: true});
  } else if (MODE === 'rate') {
    if (train) {
      if (!trainBase[req.body.service]) trainBase[req.body.service] = 0;
      trainBase[req.body.service]++;
      res.status(200).send({valid: true});
    } else {
      if (!attackBase[req.body.service]) attackBase[req.body.service] = 0;
      attackBase[req.body.service]++;
      if (attackBase[req.body.service] > 1.5 * trainBase[req.body.service]) {
        res.status(200).send({valid: false});
      } else {
        res.status(200).send({valid: true});
      }
    }
  } else {
    if (blocked.has(req.body.hash)) {
      res.status(200).send({valid: false});
    } else {
      if (users[req.body.hash]) {
        if (!base[req.body.service]) base[req.body.service] = [];

        users[req.body.hash].forEach((service) => {
          if (!base[req.body.service][service]) base[req.body.service][service] = 0;
          base[req.body.service][service]++;

          if (!train) {
            if (attackBase[req.body.service] && attackBase[req.body.service][service] && trainBase[req.body.service] && trainBase[req.body.service][service]) {
              if (attackBase[req.body.service][service] > 1.5 * trainBase[req.body.service][service]) {
                services[service].forEach((item) => {
                  blocked.add(item);
                  users[item] = undefined;
                });
              }
            }
          }
        });
      }

      res.status(200).send({valid: true});
    }
  }
});

console.log('Starting server...');
app.listen(port, () => {
  console.log('Server running on port ' + port + '.');
});