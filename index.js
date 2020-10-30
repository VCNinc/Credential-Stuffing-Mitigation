const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = parseInt(process.argv[3]) || 4000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/leak', (req, res) => {
  return res.status(200).send({users: users});
});

console.log('Starting server...');
app.listen(port, () => {
  console.log('Server running on port ' + port + '.');
});