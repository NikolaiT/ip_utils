function log(msg, level = 'INFO') {
  const normalizedLevel = typeof level === 'string' ? level.toUpperCase().trim() : String(level);
  const timestamp = new Date().toLocaleString();
  const message =
    typeof msg === 'object' && msg !== null
      ? JSON.stringify(msg, null, 2)
      : String(msg);
  const logMessage = `[${process.pid}][${timestamp}] - ${normalizedLevel} - ${message}`;
  console.log(logMessage);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  log,
  getRandomInt,
};