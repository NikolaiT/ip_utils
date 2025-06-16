const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../log/ip_utils.log');
const apiErrorLogFile = path.join(__dirname, '../log/ip_utils_api_error.log');
const debugLogFile = path.join(__dirname, '../log/ip_utils_debug.log');

function log(msg, level = 'INFO') {
  if (typeof level === 'string') {
    level = level.toUpperCase().trim();
  }
  let ts = (new Date()).toLocaleString();
  const stringified = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
  let logMessage = `[${process.pid}][${ts}] - ${level} - ${stringified}`;
  if (level !== 'DEBUG' && level !== 'VERBOSE') {
    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
  } else if (level === 'API_ERROR') {
    fs.appendFileSync(apiErrorLogFile, logMessage + '\n');
  } else {
    fs.appendFileSync(debugLogFile, logMessage + '\n');
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delta(t0) {
  return round(performance.now() - t0, 2);
}

module.exports = {
  log,
  getRandomInt,
  delta
};