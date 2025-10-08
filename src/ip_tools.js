const fs = require('fs');
const path = require('path');
const { log, getRandomInt } = require('./utils');
const bigInt = require('big-integer');
const { expandIPv6Number } = require('ip-num');
const { IPv6 } = require('ip-num');
const { IPv6CidrRange } = require('ip-num');
const { IPv4CidrRange } = require('ip-num');
const { Validator } = require('ip-num');

/**
 * Validates whether the provided network string represents a sane IPv4 or IPv6 range.
 * Accepts either CIDR or inetnum style strings and verifies ordering of bounds.
 *
 * @param {string} net - Network description in CIDR or inetnum form.
 * @returns {boolean} True when the network boundaries are well formed.
 */
const isValidNetwork = (net) => {
  if (isCidr(net)) {
    net = cidrToInetnum(net);
  }
  if (!isInetnum(net)) {
    return false;
  }
  let [start, end] = net.split('-');
  start = start.trim();
  end = end.trim();

  const bothIPv4 = isIPv4(start) && isIPv4(end);
  const bothIPv6 = isIPv6(start) && isIPv6(end);

  if (bothIPv4) {
    const startInt = IPv4ToInt(start);
    const endInt = IPv4ToInt(end);
    if (endInt < startInt) {
      return false;
    }
  } else if (bothIPv6) {
    const startIPv6 = new IPv6(start);
    const endIPv6 = new IPv6(end);
    if (endIPv6.value < startIPv6.value) {
      return false;
    }
  } else {
    // invalid network :)
    return false;
  }

  return true;
};

/**
 * Converts a CIDR/inetnum range into a deterministic filename-friendly token.
 * Embeds the IP version (4/6) and numeric start/end boundaries for easy sorting.
 *
 * @param {string} inetnum - Network range expressed as inetnum or CIDR string.
 * @returns {string|false} Encoded filename chunk or false when the input is invalid.
 */
const inetnumToFilename = (inetnum) => {
  if (isCidr(inetnum)) {
    inetnum = cidrToInetnum(inetnum);
  }
  if (!isInetnum(inetnum)) {
    log(`Invalid inetnum: ${inetnum}`, 'ERROR');
    return false;
  }
  let [start, end] = inetnum.split('-');
  start = start.trim();
  end = end.trim();
  if (isIPv4(start) && isIPv4(end)) {
    return `4-${IPv4ToInt(start)}-${IPv4ToInt(end)}`;
  }
  if (isIPv6(start) && isIPv6(end)) {
    let startIPv6 = new IPv6(start);
    let endIPv6 = new IPv6(end);
    return `6-${startIPv6.value.toString()}-${endIPv6.value.toString()}`;
  }
};

/**
 * Returns the lowest IP address contained in a CIDR or inetnum string.
 *
 * @param {string} net - Network in CIDR or inetnum notation.
 * @returns {string|false} First IP as string, or false on malformed input.
 */
const firstIpOfNet = (net) => {
  if (typeof net !== 'string') {
    log(`Invalid net passed to firstIpOfNet(): ${net}`, 'ERROR');
    return false;
  }
  if (net.indexOf('/') !== -1) { // cidr
    net = cidrToInetnum(net);
  }
  if (net.indexOf('-') === -1) { // not a valid inetnum
    log(`Invalid inetnum passed to firstIpOfNet(): ${net}`, 'ERROR');
    return false;
  }
  let [start, end] = net.split('-');
  start = start.trim();
  return start;
};

/**
 * Extracts both endpoints of a network, converting CIDR input to inetnum form when required.
 *
 * @param {string} net - Network in CIDR or inetnum notation.
 * @returns {string[]|false} Tuple [startIp, endIp] or false when validation fails.
 */
const getFirstAndLastIpOfNetwork = (net) => {
  if (isCidr(net)) {
    net = cidrToInetnum(net);
  }
  if (!isInetnum(net)) {
    log(`[-] Invalid inetnum for network: ${net}`, 'ERROR');
    return false;
  }
  let [start, end] = net.split('-');
  start = start.trim();
  return [start, end];
};

/**
 * Calculates the next sequential IPv4/IPv6 address.
 *
 * @param {string} ip - Source IP.
 * @returns {string|false} Incremented IP, or false when the input is not an IP.
 */
const getNextIp = (ip) => {
  ip = ip.trim();
  if (isIPv4(ip)) {
    const ipInt = IPv4ToInt(ip);
    return IntToIPv4(ipInt + 1);
  } else if (isIPv6(ip)) {
    const ipInt = IPv6ToBigint(ip);
    return IntToIPv6(ipInt + 1n);
  } else {
    log(`getNextIp, Invalid IP: ${ip}`, 'ERROR');
    return false;
  }
}

/**
 * Returns the first IP address that follows the provided network range.
 *
 * @param {string} net - Network in CIDR or inetnum notation.
 * @returns {string|false} Next IP after the range or false if the network is invalid.
 */
const getNextIpOfNet = (net) => {
  if (isCidr(net)) {
    net = cidrToInetnum(net);
  }
  if (!isInetnum(net)) {
    log(`Invalid inetnum: ${net}`, 'ERROR');
    return false;
  }
  const [start, end] = net.split('-');
  return getNextIp(end.trim());
}

/**
 * Calculates the previous sequential IPv4/IPv6 address.
 *
 * @param {string} ip - Source IP.
 * @returns {string|false} Decremented IP, or false when input is invalid.
 */
const getPreviousIp = (ip) => {
  ip = ip.trim();
  if (isIPv4(ip)) {
    const ipInt = IPv4ToInt(ip);
    return IntToIPv4(ipInt - 1);
  } else if (isIPv6(ip)) {
    const ipInt = IPv6ToBigint(ip);
    return IntToIPv6(ipInt - 1n);
  } else {
    log(`getNextIp, Invalid IP: ${ip}`, 'ERROR');
    return false;
  }
}

/**
 * 6-53200351810744245460824670217068085248-53200351889972407975089007810612035583
 * 4-755243008-755244031
 * 
 * @param {*} filename 
 * @returns 
 */
const filenameToInetnum = (filename) => {
  let [v, start, end] = filename.split('-');
  if (v === '4') {
    return `${IntToIPv4(parseInt(start))} - ${IntToIPv4(parseInt(end))}`;
  } else if (v === '6') {
    let startIPv6 = IPv6.fromBigInt(bigInt(start)).toString();
    let endIPv6 = IPv6.fromBigInt(bigInt(end)).toString();
    return `${startIPv6} - ${endIPv6}`;
  }
};

const cidrToInetnumSpecial = (cidrNetwork) => {
  if (cidrNetwork.indexOf('.') !== -1) { // every IPv4 network has a dot
    const ipv4Range = IPv4CidrRange.fromCidr(cidrNetwork);
    return [4, `${ipv4Range.getFirst().toString()} - ${ipv4Range.getLast().toString()}`];
  } else { // every IPv6 network has a colon
    const ipv6Range = IPv6CidrRange.fromCidr(cidrNetwork);
    return [6, `${ipv6Range.getFirst().toString()} - ${ipv6Range.getLast().toString()}`];
  }
};

/**
 * Converts IPv4 or IPv6 CIDR strings into inetnum style inclusive ranges.
 *
 * @param {string} cidr - CIDR formatted network.
 * @returns {string|null} Inetnum string or null when conversion fails.
 */
const cidrToInetnum = (cidr) => {
  try {
    if (cidr.indexOf('.') !== -1) {
      const ipv4Range = IPv4CidrRange.fromCidr(cidr);
      return `${ipv4Range.getFirst().toString()} - ${ipv4Range.getLast().toString()}`;
    } else if (cidr.indexOf(':') !== -1) {
      const ipv6Range = IPv6CidrRange.fromCidr(cidr);
      return `${ipv6Range.getFirst().toString()} - ${ipv6Range.getLast().toString()}`;
    }
    return cidr;
  } catch (err) {
    console.error(`Error converting CIDR "${cidr}" to inetnum: ${err.message}`);
    return null;
  }
};

/**
 * Determines if the given string is a valid IPv4 literal.
 *
 * @param {string} s - Candidate IPv4 string.
 * @returns {boolean} True when the string parses as IPv4.
 */
function isIPv4(s) {
  try {
    return Validator.isValidIPv4String(s)[0];
  } catch (err) {
    return false;
  }
}

/**
 * Determines if the given string is a valid IPv6 literal.
 *
 * @param {string} s - Candidate IPv6 string.
 * @returns {boolean} True when the string parses as IPv6.
 */
function isIPv6(s) {
  try {
    return Validator.isValidIPv6String(s)[0];
  } catch (err) {
    return false;
  }
}

let extractPrefix = (ipv6String) => {
  return ipv6String.includes("/") ? `/${ipv6String.split("/")[1]}` : ""
}

/**
 * Collapses an expanded IPv6 address to its canonical shortest representation, preserving prefix suffix.
 *
 * @param {string} ipv6String - IPv6 string, optionally with netmask.
 * @returns {string} Normalised compressed IPv6 string.
 */
function abbreviateIPv6(ipv6String) {
  const prefix = extractPrefix(ipv6String);
  if (ipv6String.includes("/")) {
    ipv6String = ipv6String.split("/")[0]
  }

  let isValid = Validator.IPV6_PATTERN.test(ipv6String);

  if (!isValid) {
    throw Error(Validator.invalidIPv6PatternMessage)
  }

  let hexadecimals = ipv6String.split(":");

  // if there is already an :: in the string, we simply replace "::" with the number of zeros
  if (hexadecimals.includes('')) {
    const emptyIndex = hexadecimals.indexOf('');
    const missingCount = 8 - hexadecimals.length + 1;
    const zeros = Array(missingCount).fill('0');
    hexadecimals.splice(emptyIndex, 1, ...zeros);
  }

  let hexadecimalsWithoutLeadingZeros = hexadecimals.map((hexidecimal) => {
    let withoutLeadingZero = hexidecimal.replace(/^0+/, '');
    if (withoutLeadingZero !== '') {
      return withoutLeadingZero;
    } else {
      return "0";
    }
  });

  // Find the longest sequence of '0's and replace with 'x'
  let longestZeroSequence = 0;
  let currentZeroSequence = 0;
  let longestZeroStart = -1;
  const size = hexadecimalsWithoutLeadingZeros.length;

  for (let i = 0; i < size; i++) {
    if (hexadecimalsWithoutLeadingZeros[i] === '0') {
      currentZeroSequence++;
      if (currentZeroSequence > longestZeroSequence) {
        longestZeroSequence = currentZeroSequence;
        longestZeroStart = i - currentZeroSequence + 1;
      }
    } else {
      currentZeroSequence = 0;
    }
  }

  if (longestZeroSequence > 1) {
    hexadecimalsWithoutLeadingZeros.splice(longestZeroStart, longestZeroSequence, 'x');
  }

  let contracted = hexadecimalsWithoutLeadingZeros.join(":");

  if (contracted === 'x') {
    contracted = '::';
  } else if (contracted.endsWith("x") || contracted.startsWith("x")) {
    contracted = contracted.replace("x", ":");
  } else if (contracted.includes("x")) {
    contracted = contracted.replace("x", "");
  }

  return `${contracted}${prefix}`;
}

/**
 * Validates IPv6 input by round-tripping through big-int conversion and canonical formatting.
 *
 * @param {string|bigint} input - IPv6 string or big-int representation.
 * @param {boolean} [inputIsBigInt=false] - When true, treat input as already BigInt.
 * @returns {boolean} True when the address is valid in strict form.
 */
function isIPv6Strict(input, inputIsBigInt = false) {
  try {
    let asBigInt = null;
    if (inputIsBigInt) {
      asBigInt = input;
    } else {
      let ipv6Parsed = IPv6.fromString(input);
      asBigInt = ipv6Parsed.value;
    }
    const ip = IPv6.fromBigInt(asBigInt).toString();
    const collapsed = abbreviateIPv6(ip);
    const expanded = expandIPv6Number(collapsed);
    return isIPv6(expanded);
  } catch (err) {
    return false;
  }
}

/**
 * Returns 
 *    0 if ip1 == ip2
 *    1 if ip1 > ip2
 *   -1 if ip1 < ip2 
 * 
 * @param {*} ip1 
 * @param {*} ip2 
 * @returns 
 */
/**
 * Compares two IPv6 addresses represented as strings or integer arrays.
 *
 * @param {string|number[]} ip1 - First IPv6 candidate.
 * @param {string|number[]} ip2 - Second IPv6 candidate.
 * @param {boolean} [alreadyInt=false] - When true, treat both inputs as pre-parsed arrays.
 * @returns {number} 0 when equal, 1 when ip1 > ip2, -1 when ip1 < ip2.
 */
function IPv6IsLargerThan(ip1, ip2, alreadyInt = false) {
  let int_ip1 = null;
  let int_ip2 = null;
  if (alreadyInt === true) {
    int_ip1 = ip1;
    int_ip2 = ip2;
  } else {
    int_ip1 = IPv6ToInt(ip1);
    int_ip2 = IPv6ToInt(ip2);
  }

  for (let i = 0; i <= int_ip1.length; i++) {
    if (int_ip1[i] < int_ip2[i]) {
      return -1;
    } else if (int_ip1[i] > int_ip2[i]) {
      return 1;
    }
  }
  return 0;
}

/**
 * Detects the IP version for a given literal.
 *
 * @param {string} s - Candidate IP string.
 * @returns {0|4|6} 4 or 6 when valid, 0 otherwise.
 */
function isIP(s) {
  if (isIPv4(s)) return 4;
  if (isIPv6(s)) return 6;
  return 0;
}

/**
 * Validates whether a string is a syntactically correct IPv4 or IPv6 CIDR.
 *
 * @param {string} s - Candidate CIDR.
 * @returns {boolean} True when address and mask are valid for the detected family.
 */
function isCidr(s) {
  if (typeof s !== 'string' || s.length === 0) return false;

  // Use indexOf to avoid unnecessary array creation from split
  const slashIndex = s.indexOf('/');
  if (slashIndex < 0 || slashIndex !== s.lastIndexOf('/')) return false;

  const address = s.slice(0, slashIndex);
  const maskStr = s.slice(slashIndex + 1);

  const v = getNetworkType(address);
  if (!v) return false;

  const netmask = parseInt(maskStr, 10);
  if (isNaN(netmask)) return false;

  if (v === 4) {
    return netmask >= 0 && netmask <= 32;
  } else if (v === 6) {
    return netmask >= 0 && netmask <= 128;
  }
  return false;
}

/**
 * Checks if the provided string is either a CIDR or inetnum representation.
 *
 * @param {string} network - Network descriptor.
 * @returns {boolean} True when the string represents a parsable network.
 */
function isNetwork(network) {
  return isCidr(network) || isInetnum(network);
}

/**
 * Determines if a string is an IP, CIDR, or inetnum description.
 *
 * @param {string} input - Value to validate.
 * @returns {boolean} True when the input matches any supported format.
 */
function isNetworkOrIp(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }
  return isCidr(input) || isInetnum(input) || isIP(input);
}

/**
 * Validates inetnum formatted ranges and returns their IP version.
 *
 * @param {string} inetnum - Inetnum string in the form "start - end".
 * @returns {4|6|null} IP version or null when validation fails.
 */
function isInetnum(inetnum) {
  if (typeof inetnum !== 'string') {
    return false;
  }

  // Quickly locate the first '-'
  const dashIndex = inetnum.indexOf('-');
  // If dash is not found or ends up at an invalid position, return false early
  if (dashIndex <= 0 || dashIndex >= inetnum.length - 1) {
    return false;
  }

  // Ensure there's only one dash for a valid inetnum format
  if (inetnum.indexOf('-', dashIndex + 1) !== -1) {
    return false;
  }

  // Extract and trim start and end IP segments
  const startIp = inetnum.substring(0, dashIndex).trim();
  const endIp = inetnum.substring(dashIndex + 1).trim();

  // Validate both IP segments
  if (isIPv4(startIp) && isIPv4(endIp)) {
    return 4;
  } else if (isIPv6(startIp) && isIPv6(endIp)) {
    return 6;
  }
  return null;
}

/**
 * Extracts the first IP from an inetnum range when valid.
 *
 * @param {string} inetnum - Inetnum string.
 * @returns {string|undefined} Start address or undefined when invalid.
 */
function getInetnumStartIP(inetnum) {
  if (isInetnum(inetnum)) {
    let parts = inetnum.split('-');
    let startIp = parts[0].trim();
    return startIp;
  }
}

/**
 * Checks if an inetnum range is IPv4-based.
 *
 * @param {string} inetnum - Inetnum string.
 * @returns {boolean} True when the inetnum is IPv4.
 */
function isIPv4Inetnum(inetnum) {
  return isInetnum(inetnum) === 4;
}

/**
 * Checks if an inetnum range is IPv6-based.
 *
 * @param {string} inetnum - Inetnum string.
 * @returns {boolean} True when the inetnum is IPv6.
 */
function isIPv6Inetnum(inetnum) {
  return isInetnum(inetnum) === 6;
}

/**
 * Parses an inetnum, returning structured metadata or an error sentinel.
 *
 * @param {string} inetnum - Range string in inetnum format.
 * @returns {object|'invalidInetnum'|undefined} Parsed representation with ranges and version.
 */
function parseInetnum(inetnum) {
  let inv = isInetnum(inetnum);
  if (inv) {
    let startIp = null;
    let endIp = null;
    let start_address = null;
    let end_address = null;
    let parts = inetnum.split('-').map((part) => part.trim());
    if (parts.length !== 2) {
      return 'invalidInetnum';
    }

    start_address = parts[0];
    end_address = parts[1];

    if (inv === 4) {
      startIp = IPv4ToInt(parts[0]);
      endIp = IPv4ToInt(parts[1]);
      if (startIp > endIp) {
        return 'invalidInetnum';
      }
    } else if (inv === 6) {
      startIp = IPv6ToInt(expandIPv6Number(parts[0]));
      endIp = IPv6ToInt(expandIPv6Number(parts[1]));
      if (IPv6IsLargerThan(startIp, endIp, true) === 1) {
        return 'invalidInetnum';
      }
    }
    return {
      ip_version: inv,
      start_range: startIp,
      end_range: endIp,
      start_address: start_address,
      end_address: end_address,
    }
  }
}

/**
 * Parses an IPv4 inetnum into integer start/end bounds.
 *
 * @param {string} inetnum - IPv4 inetnum string.
 * @returns {number[]|'invalidInetnum'} Pair of integers or sentinel when invalid.
 */
function parseIPv4Inetnum(inetnum) {
  const hyphenIndex = inetnum.indexOf('-');
  if (hyphenIndex === -1) return 'invalidInetnum';

  const startStr = inetnum.slice(0, hyphenIndex).trim();
  const endStr = inetnum.slice(hyphenIndex + 1).trim();

  const startIp = IPv4ToInt(startStr);
  const endIp = IPv4ToInt(endStr);

  return startIp > endIp ? 'invalidInetnum' : [startIp, endIp];
}

/**
 * Converts an IPv4 CIDR into integer start/end bounds.
 *
 * @param {string} cidr - IPv4 CIDR string.
 * @returns {number[]} [startInt, endInt] inclusive.
 */
function parseIPv4Cidr(cidr) {
  // Use indexOf and slice to avoid creating an intermediate array
  const slashIndex = cidr.indexOf('/');
  const ipStr = cidr.slice(0, slashIndex);
  // Use bitwise OR to convert the mask substring to an integer quickly
  const mask = cidr.slice(slashIndex + 1) | 0;
  const startIp = IPv4ToInt(ipStr);
  let numHosts;
  // For /0, bit shifting does not work correctly due to JavaScript's 32-bit shift limit
  if (mask === 0) {
    numHosts = 4294967296 - 1; // 2^32 - 1
  } else if (mask < 32) {
    numHosts = (1 << (32 - mask)) - 1;
  } else {
    // For /32 (or higher, which is invalid) there's no host range
    numHosts = 0;
  }
  return [startIp, startIp + numHosts];
}

/**
 * Converts an IPv6 CIDR into bigint start/end bounds.
 *
 * @param {string} cidr - IPv6 CIDR string.
 * @returns {bigInt.BigInteger[]} Inclusive bounds as big integers.
 */
function parseIPv6Cidr(cidr) {
  let ipv6Range = IPv6CidrRange.fromCidr(cidr);
  return [
    bigInt(ipv6Range.getFirst().value),
    bigInt(ipv6Range.getLast().value)
  ];
}

/**
 * Parses an IPv6 inetnum into bigint start/end bounds.
 *
 * @param {string} inetnum - IPv6 inetnum string.
 * @returns {bigInt.BigInteger[]|'invalidInetnum'} Range representation or sentinel.
 */
function parseIPv6Inetnum(inetnum) {
  const dashIndex = inetnum.indexOf('-');
  if (dashIndex === -1) return 'invalidInetnum';
  const startStr = inetnum.slice(0, dashIndex).trim();
  const endStr = inetnum.slice(dashIndex + 1).trim();
  const startIp = IPv6.fromString(startStr);
  const endIp = IPv6.fromString(endStr);
  if (startIp.value > endIp.value) {
    return 'invalidInetnum';
  }
  return [bigInt(startIp.value), bigInt(endIp.value)];
}

/**
 * Validates IPv4 CIDR strings.
 *
 * @param {string} cidr - Value to test.
 * @returns {boolean} True when the CIDR is syntactically valid.
 */
function isIPv4Cidr(cidr) {
  if (typeof cidr !== 'string') return false;

  const slashIndex = cidr.indexOf('/');
  if (slashIndex === -1) return false;

  // Extract IP and mask parts without creating an array
  const ipPart = cidr.slice(0, slashIndex);
  const maskPart = cidr.slice(slashIndex + 1);

  // Check for extra '/' in maskPart to ensure only one separator exists
  if (maskPart.indexOf('/') !== -1) return false;

  const mask = +maskPart;  // Quick numeric conversion using unary plus
  if (mask <= 0 || mask > 32 || !Number.isInteger(mask)) return false;

  return isIPv4(ipPart);
}

/**
 * Validates IPv6 CIDR strings.
 *
 * @param {string} cidr - Value to test.
 * @returns {boolean} True when the CIDR is syntactically valid.
 */
const isIPv6Cidr = (cidr) => {
  const slashIndex = cidr.indexOf('/');
  if (slashIndex === -1 || cidr.indexOf('/', slashIndex + 1) !== -1) {
    return false;
  }
  const mask = parseInt(cidr.slice(slashIndex + 1), 10);
  if (mask <= 0 || mask > 128) {
    return false;
  }
  return isIPv6(cidr.slice(0, slashIndex));
};

/**
 * Converts the address component of a CIDR to its IPv4 integer.
 *
 * @param {string} cidr - IPv4 CIDR string.
 * @returns {number} Integer form of the base address.
 */
const IPv4CidrToInt = (cidr) => {
  const slashIndex = cidr.indexOf('/');
  if (slashIndex === -1) {
    throw Error('CIDR must contain /');
  }
  return IPv4ToInt(cidr.slice(0, slashIndex));
};

/**
 * Converts the address component of a CIDR to its IPv6 integer array representation.
 *
 * @param {string} cidr - IPv6 CIDR string.
 * @returns {number[]} Expanded IPv6 represented as eight integers.
 */
const IPv6CidrToInt = (cidr) => {
  const slashIndex = cidr.indexOf('/');
  if (slashIndex === -1) {
    throw Error('CIDR must contain /');
  }
  return IPv6ToInt(cidr.slice(0, slashIndex));
};

/**
 * Converts an IPv6 CIDR into an inetnum string.
 *
 * @param {string} cidr - IPv6 CIDR string.
 * @returns {string} Inetnum representation.
 */
const IPv6CidrToInetnum = (cidr) => {
  if (cidr.indexOf('/') === -1) {
    throw Error('cidr must contain /');
  }
  let items = cidr.split('/');
  let ipv6Range = IPv6CidrRange.fromCidr(cidr);
  let start = items[0];
  let stop = ipv6Range.getLast().toString();
  return `${start} - ${stop}`;
};

/**
 * Converts an IPv4 dotted quad to its unsigned integer representation.
 *
 * @param {string} ip_str - IPv4 address.
 * @returns {number} Unsigned 32-bit integer.
 */
function IPv4ToInt(ip_str) {
  var parts = ip_str.split('.');
  var sum = 0;
  for (var i = 0; i < 4; i++) {
    var partVal = Number(parts[i]);
    sum = ((sum << 8) + partVal) >>> 0;
  }
  return sum;
}

/**
 * Normalises a network string to numeric start/end bounds with IP version metadata.
 *
 * @param {string} network - IP, CIDR, or inetnum.
 * @param {boolean} [verbose=false] - Emit console diagnostics.
 * @returns {{ipVersion:number,startIp:number|bigInt.BigInteger,endIp:number|bigInt.BigInteger}|undefined} Structured bounds or undefined on failure.
 */
function networkToStartAndEndInt(network, verbose = false) {
  if (isIP(network)) {
    let ipVersion = isIPv4(network) ? 4 : 6;
    let startIp = IpToInt(network);
    let endIp = IpToInt(network);
    return { ipVersion, startIp, endIp };
  } else {
    let parsedNet = null;

    if (isIPv4Cidr(network)) {
      parsedNet = parseIPv4Cidr(network);
      ipVersion = 4;
    } else if (isIPv4Inetnum(network)) {
      parsedNet = parseIPv4Inetnum(network);
      ipVersion = 4;
    } else if (isIPv6Cidr(network)) {
      parsedNet = parseIPv6Cidr(network);
      ipVersion = 6;
    } else if (isIPv6Inetnum(network)) {
      parsedNet = parseIPv6Inetnum(network);
      ipVersion = 6;
    }

    if (parsedNet && parsedNet !== 'invalidInetnum') {
      return {
        ipVersion: ipVersion,
        startIp: parsedNet[0],
        endIp: parsedNet[1],
      };
    } else if (verbose) {
      console.log(`networkToStartAndEndInt() - Error parsing network: ${network}`);
    }
  }
}

/**
 * Normalises a network string to textual start/end IP bounds.
 *
 * @param {string} network - IP, CIDR, or inetnum.
 * @param {boolean} [verbose=false] - Emit console diagnostics.
 * @returns {{ipVersion:number,startIp:string,endIp:string}|undefined} Structured bounds or undefined when invalid.
 */
function networkToStartAndEndStr(network, verbose = false) {
  const ipVersion = isIP(network);
  if (ipVersion) {
    return {
      ipVersion: ipVersion,
      startIp: network,
      endIp: network,
    };
  } else {
    let parsedNet = null;
    let startIp = null;
    let endIp = null;
    let netAsInetnum = null;
    let ipVersion = null;

    // if it is a CIDR, convert it to inetnum
    if (network.indexOf('/') !== -1) {
      const retval = cidrToInetnumSpecial(network);

      if (!retval) {
        console.error(`networkToStartAndEndInt() - Error parsing CIDR network: ${network}`);
        return;
      }

      ipVersion = retval[0];
      netAsInetnum = retval[1];
    } else {
      ipVersion = network.indexOf(':') !== -1 ? 6 : 4;
      netAsInetnum = network;
    }

    if (ipVersion === 4) {
      parsedNet = parseIPv4Inetnum(netAsInetnum);
      ipVersion = 4;
      startIp = IntToIPv4(parsedNet[0]);
      endIp = IntToIPv4(parsedNet[1]);
    } else if (ipVersion === 6) {
      parsedNet = parseIPv6Inetnum(netAsInetnum);
      ipVersion = 6;
      startIp = IntToIPv6(parsedNet[0]);
      endIp = IntToIPv6(parsedNet[1]);
    }

    if (parsedNet && parsedNet !== 'invalidInetnum') {
      return {
        ipVersion: ipVersion,
        startIp: startIp,
        endIp: endIp,
      };
    } else if (verbose) {
      console.error(`networkToStartAndEndInt() - Error parsing network: ${network}`);
    }
  }
}

/**
 * Builds an inetnum string from numeric or bigint bounds.
 *
 * @param {number} ipVersion - Either 4 or 6.
 * @param {number|bigInt.BigInteger} startIp - Inclusive start.
 * @param {number|bigInt.BigInteger} endIp - Inclusive end.
 * @returns {string|undefined} Inetnum string or undefined for unsupported versions.
 */
function startEndIpToNetwork(ipVersion, startIp, endIp) {
  ipVersion = parseInt(ipVersion);
  if (ipVersion === 4) {
    return `${IntToIPv4(parseInt(startIp))}-${IntToIPv4(parseInt(endIp))}`;
  } else if (ipVersion === 6) {
    return `${IntToIPv6(startIp)}-${IntToIPv6(endIp)}`;
  }
}

/**
 * Converts an IP literal to its numeric representation (IPv4 -> number, IPv6 -> BigInt).
 *
 * @param {string} ip_str - IP literal.
 * @returns {number|bigInt.BigInteger|undefined} Numeric representation or undefined when invalid.
 */
function IpToInt(ip_str) {
  if (isIPv4(ip_str)) {
    return IPv4ToInt(ip_str);
  } else if (isIPv6(ip_str)) {
    return IPv6ToBigint(ip_str);
  }
}

/**
 * Converts an IPv6 literal to a BigInt value.
 *
 * @param {string} ip_str - IPv6 address.
 * @returns {bigInt.BigInteger|undefined} BigInt representation or undefined on error.
 */
function IPv6ToBigint(ip_str) {
  try {
    let ipv6Parsed = IPv6.fromString(ip_str);
    return ipv6Parsed.value;
  } catch (err) {
    console.error(err.toString(), ip_str);
  }
}

/**
 * Expands an IPv6 literal into an array of eight 16-bit integers.
 *
 * @param {string} ipStr - IPv6 address.
 * @returns {number[]} Array with eight integer segments.
 */
const IPv6ToInt = (ipStr) => {
  try {
    ipStr = expandIPv6Number(ipStr);
  } catch (err) {
    throw Error(`Cannot expandIPv6Number ${ipStr}`);
  }
  let as_array = [];
  let parts = ipStr.split(':');
  for (let word of parts) {
    as_array.push(parseInt(word, 16));
  }
  return as_array;
};

/**
 * Converts an unsigned 32-bit integer to an IPv4 dotted quad.
 *
 * @param {number} ipInt - Unsigned 32-bit integer.
 * @returns {string} IPv4 address.
 */
function IntToIPv4(ipInt) {
  return ((ipInt >>> 24) + '.' + (ipInt >> 16 & 255) + '.' + (ipInt >> 8 & 255) + '.' + (ipInt & 255));
}

/**
 * Converts an IPv6 BigInt-compatible value to a string representation.
 *
 * @param {string|bigInt.BigInteger} ipv6IntString - IPv6 integer value.
 * @param {boolean|string} [doExpand=true] - Controls expansion/collapse of the output.
 * @returns {string} IPv6 string in the requested form.
 */
function IntToIPv6(ipv6IntString, doExpand = true) {
  const bInt = bigInt(ipv6IntString);
  if (doExpand === true) {
    return expandIPv6Number(IPv6.fromBigInt(bInt.value).toString());
  } else {
    if (doExpand === 'collapse') {
      return abbreviateIPv6(IPv6.fromBigInt(bInt.value).toString());
    } else {
      return IPv6.fromBigInt(bInt.value).toString();
    }
  }
}

/**
 * Calculates the host count of an inetnum range, supporting both IPv4 and IPv6.
 *
 * @param {string} inetnum - Inetnum string.
 * @returns {number|bigInt.BigInteger|undefined} Number of addresses or undefined when invalid.
 */
function numHostsInetnum(inetnum) {
  let ipv = isInetnum(inetnum);
  if (ipv) {
    let parts = inetnum.split('-');
    let [startRange, endRange] = parts.map((part) => part.trim());
    if (ipv === 4) {
      let startAddressInt = IPv4ToInt(startRange);
      let endAddressInt = IPv4ToInt(endRange);
      return (endAddressInt - startAddressInt) + 1;
    } else if (ipv === 6) {
      let startAddressInt = IPv6.fromString(startRange);
      let endAddressInt = IPv6.fromString(endRange);
      let start = bigInt(startAddressInt.value);
      let end = bigInt(endAddressInt.value);
      return end.minus(start).plus(1);
    }
  }
}

/**
 * Checks whether a given IP literal resides inside an inetnum range.
 *
 * @param {string} ip - IPv4 or IPv6 address.
 * @param {string} inetnum - Inetnum range string.
 * @returns {boolean|undefined} True when contained; undefined on invalid arguments.
 */
function isInInetnum(ip, inetnum) {
  if (isIPv4(ip) && isIPv4Inetnum(inetnum)) {
    let ip_int = IPv4ToInt(ip);
    let parsed = parseInetnum(inetnum);
    return ip_int >= parsed.start_range && ip_int <= parsed.end_range;
  } else if (isIPv6(ip) && isIPv6Inetnum(inetnum)) {
    // Here we deal with an array of 8 words
    let [start_ip, end_ip] = inetnum.split('-');
    start_ip = start_ip.trim();
    end_ip = end_ip.trim();
    let c1 = IPv6IsLargerThan(ip, start_ip);
    let c2 = IPv6IsLargerThan(ip, end_ip);
    return (c1 === 0 || c1 === 1) && (c2 === 0 || c2 === -1);
  }
}

/**
 * Computes the number of hosts represented by an IPv4 CIDR block.
 *
 * @param {string} cidr - IPv4 CIDR string.
 * @returns {number} Total host count.
 */
const numHostsInCidrIPv4 = (cidr) => {
  let parts = cidr.split('/');
  let mask = parseInt(parts[1]);
  if (mask > 32 || mask < 1) {
    throw Error(`Invalid IPv4 CIDR: ${cidr}`);
  }
  return 2 ** (32 - mask);
};

/**
 * Computes the host count for a given IP, CIDR, or inetnum.
 *
 * @param {string} net - Network descriptor or IP.
 * @returns {number|bigInt.BigInteger|'invalidNetwork'} Host count or sentinel for invalid inputs.
 */
const numHostsInNet = (net) => {
  try {
    if (isIP(net)) {
      return 1;
    }
    if (isInetnum(net)) {
      return numHostsInetnum(net);
    }
    if (isIPv4Cidr(net)) {
      return numHostsInCidrIPv4(net);
    }
    if (isIPv6Cidr(net)) {
      return numHostsInCidrIPv6(net);
    }
  } catch (err) {
    console.error('numHostsInNet', net, err);
    return 'invalidNetwork';
  }
  return 'invalidNetwork';
};

/**
 * Tests if an IP literal resides inside a CIDR or inetnum network.
 *
 * @param {string} ip - IPv4 or IPv6 address.
 * @param {string} net - Network descriptor (CIDR or inetnum).
 * @returns {boolean} True when the IP is inside the network.
 */
const isInNetwork = (ip, net) => {
  if (isIPv4Cidr(net)) {
    const ipInt = IPv4ToInt(ip);
    const [startIp, endIp] = parseIPv4Cidr(net);
    return ipInt >= startIp && ipInt <= endIp;
  }
  if (isIPv6Cidr(net)) {
    const ipInt = IPv6ToBigint(ip);
    const [startIp, endIp] = parseIPv6Cidr(net);
    return ipInt >= startIp && ipInt <= endIp;
  }
  if (isInetnum(net)) {
    return isInInetnum(ip, net);
  }
  return false;
};

/**
 * Verifies whether one network is wholly contained inside another.
 *
 * @param {string} net1 - Candidate subset network.
 * @param {string} net2 - Candidate superset network.
 * @returns {boolean} True when net1 is fully inside net2.
 */
const isSubset = (net1, net2) => {
  if (isIPv4Cidr(net1) && isIPv4Cidr(net2)) {
    const [startIp1, endIp1] = parseIPv4Cidr(net1);
    const [startIp2, endIp2] = parseIPv4Cidr(net2);
    return startIp1 >= startIp2 && endIp1 <= endIp2;
  }
  if (isIPv6Cidr(net1) && isIPv6Cidr(net2)) {
    const [startIp1, endIp1] = parseIPv6Cidr(net1);
    const [startIp2, endIp2] = parseIPv6Cidr(net2);
    return startIp1 >= startIp2 && endIp1 <= endIp2;
  }
  if (isInetnum(net1) && isInetnum(net2)) {
    const [startIp1, endIp1] = net1.split('-').map(ip => ip.trim());
    const [startIp2, endIp2] = net2.split('-').map(ip => ip.trim());
    return (isIPv4(startIp1) && isIPv4(startIp2) && IPv4ToInt(startIp1) >= IPv4ToInt(startIp2) && IPv4ToInt(endIp1) <= IPv4ToInt(endIp2)) ||
      (isIPv6(startIp1) && isIPv6(startIp2) && IPv6ToBigint(startIp1) >= IPv6ToBigint(startIp2) && IPv6ToBigint(endIp1) <= IPv6ToBigint(endIp2));
  }
  return false;
};

/**
 * Legacy helper that infers network family by probing multiple format checks.
 *
 * @param {string} network - Network descriptor.
 * @returns {4|6|null} IP version or null when unknown.
 */
function getNetworkTypeOld(network) {
  if (isIPv4(network)) {
    return 4;
  }
  if (isIPv6(network)) {
    return 6;
  }
  if (isIPv4Cidr(network)) {
    return 4;
  }
  if (isIPv6Cidr(network)) {
    return 6;
  }
  if (isIPv4Inetnum(network)) {
    return 4;
  }
  if (isIPv6Inetnum(network)) {
    return 6;
  }

  return null;
}

/**
 * Quickly guesses IP version based on the presence of '.' or ':'.
 *
 * @param {string} network - IP or network descriptor.
 * @returns {4|6} Detected IP version.
 */
const getNetworkType = (network) => {
  return network.indexOf('.') !== -1 ? 4 : 6;
};

/**
 * Determines if a network descriptor refers to an IPv4 range.
 *
 * @param {string} net - Network descriptor.
 * @returns {boolean} True when CIDR/inetnum is IPv4.
 */
const isIPv4Network = (net) => {
  return isIPv4Cidr(net) || isIPv4Inetnum(net);
}

/**
 * Determines if a network descriptor refers to an IPv6 range.
 *
 * @param {string} net - Network descriptor.
 * @returns {boolean} True when CIDR/inetnum is IPv6.
 */
const isIPv6Network = (net) => {
  return isIPv6Cidr(net) || isIPv6Inetnum(net);
}

/**
 * Computes the number of IPv6 addresses contained in a CIDR block.
 *
 * @param {string} cidr - IPv6 CIDR string.
 * @returns {bigInt.BigInteger} Host count as BigInt.
 */
function numHostsInCidrIPv6(cidr) {
  let parts = cidr.split('/');
  let mask = parseInt(parts[1]);
  if (mask > 128 || mask < 0) {
    throw Error(`Invalid IPv6 CIDR: ${cidr}`);
  }
  return bigInt(2).pow(128 - mask);
}

/**
 * Extracts the first 48 bits from an expanded IPv6 array representation.
 *
 * @param {number[]} ipv6_array - Eight-element array of 16-bit IPv6 parts.
 * @returns {number} Combined 48-bit prefix as number.
 */
function first_48bits_from_IPv6(ipv6_array) {
  let result = 0;

  result += parseInt(ipv6_array[0].toString(16) + '0000' + '0000', 16);
  result += parseInt(ipv6_array[1].toString(16) + '0000', 16);
  result += parseInt(ipv6_array[2].toString(16), 16);

  return result;
}

/**
 * Expands a 48-bit lookup key back to the decimal value of an IPv6 cutoff address.
 *
 * @param {number} num_48_bits - 48-bit prefix as number.
 * @returns {number} Expanded decimal representation.
 */
function expand_48bits(num_48_bits) {
  return parseInt(num_48_bits.toString(16) + '0000' + '0000' + '0000' + '0000' + '0000', 16);
}

/**
 * Checks whether a string matches the canonical ASN format (AS1234).
 *
 * @param {string} asn - Candidate ASN.
 * @returns {boolean} True when the identifier is valid.
 */
const isASN = (asn) => {
  if (typeof asn !== 'string' || asn.length < 3 || asn[0].toLowerCase() !== 'a' || asn[1].toLowerCase() !== 's') {
    return false;
  }
  const asnNumeric = asn.slice(2).trim();
  return /^[1-9]\d*$/.test(asnNumeric);
};

/**
 * https://en.wikipedia.org/wiki/Reserved_IP_addresses
 * 
 * @returns all reserved IP ranges
 */
/**
 * Returns a map of well-known IPv4 reserved or special-purpose ranges.
 *
 * @returns {Record<string,string>} Map of description to inetnum/CIDR.
 */
const getReservedIpRanges4 = () => {
  return {
    'Current (local, "this") network': '0.0.0.0 - 0.255.255.255',
    'Used for local communications within a private network': '10.0.0.0 - 10.255.255.255',
    'Shared address space for communications between a service provider and its subscribers when using a carrier-grade NAT': '100.64.0.0 - 100.127.255.255',
    'Used for loopback addresses to the local host': '127.0.0.0 - 127.255.255.255',
    'Used for link-local addresses': '169.254.0.0 - 169.254.255.255',
    'Used for local communications within a private network': '172.16.0.0 - 172.31.255.255',
    'IETF Protocol Assignments': '192.0.0.0 - 192.0.0.255',
    'Assigned as TEST-NET-1': '192.0.2.0 - 192.0.2.255',
    'Reserved': '192.88.99.0 - 192.88.99.255',
    'Used for local communications within a private network': '192.168.0.0 - 192.168.255.255',
    'Used for benchmark testing of inter-network communications between two separate subnets': '198.18.0.0 - 198.19.255.255',
    'Assigned as TEST-NET-2': '198.51.100.0 - 198.51.100.255',
    'Assigned as TEST-NET-3': '203.0.113.0 - 203.0.113.255',
    'In use for IP multicast': '224.0.0.0 - 239.255.255.255',
    'Assigned as MCAST-TEST-NET': '233.252.0.0 - 233.252.0.255',
    'Reserved for future use': '240.0.0.0 - 255.255.255.254',
    'Reserved for the "limited broadcast" destination address': '255.255.255.255/32',
  };
};

/**
 * Returns a map of well-known IPv6 reserved or special-purpose ranges.
 *
 * @returns {Record<string,string>} Map of description to CIDR.
 */
const getReservedIpRanges6 = () => {
  return {
    'Unspecified address': '::/128',
    'Loopback address': '::1/128',
    'IPv4-mapped addresses': '::ffff:0:0/96',
    'IPv4 translated addresses': '::ffff:0:0:0/96',
    'IPv4/IPv6 translation': '64:ff9b::/96',
    'IPv4/IPv6 translation': '64:ff9b:1::/48',
    'Discard prefix': '100::/64',
    'Teredo tunneling': '2001:0000::/32',
    'ORCHIDv2': '2001:20::/28',
    'Addresses used in documentation and example source code': '2001:db8::/32',
    'The 6to4 addressing scheme': '2002::/16',
    'Unique local address': 'fc00::/7',
    'Link-local address': 'fe80::/10',
    'Multicast address': 'ff00::/8',
  };
};

/**
 * Determines whether an IP address belongs to a reserved/bogon range.
 *
 * @param {string} ip - IPv4 or IPv6 address.
 * @returns {boolean} True when the IP is considered bogon.
 */
const isBogon = (ip) => {
  if (isIPv4(ip)) {
    for (const net of Object.values(getReservedIpRanges4())) {
      if (isInNetwork(ip, net)) {
        return true;
      }
    }
  } else if (isIPv6(ip)) {
    for (const net of Object.values(getReservedIpRanges6())) {
      if (isInNetwork(ip, net)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Generates a random IPv4 address, optionally avoiding bogon ranges.
 *
 * @param {boolean} [excludeBogon=true] - When true, skip reserved ranges.
 * @returns {string} Random IPv4 address.
 */
function getRandomIPv4(excludeBogon = true) {
  while (true) {
    let randomIPv4 = `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    if (excludeBogon) {
      if (!isBogon(randomIPv4)) {
        return randomIPv4;
      }
    } else {
      return randomIPv4;
    }
  }
}

/**
 * Samples random IPv4 addresses that belong to allocations of a specific RIR.
 *
 * @param {string} rir - Target RIR label.
 * @param {number} [num=100] - Number of addresses to return.
 * @param {boolean} [excludeBogon=true] - Skip bogon ranges when true.
 * @returns {string[]} Array of IPv4 addresses.
 */
function getRandomIPv4ByRIR(rir, num = 100, excludeBogon = true) {
  let prefixesForRir = [];
  const ipSpace = JSON.parse(fs.readFileSync(path.join(__dirname, './../../ip_api_data/ipapi_database/info_data/ipv4-address-space.json'), 'utf-8'));
  for (const prefix in ipSpace) {
    const org = ipSpace[prefix];
    if (org === rir) {
      prefixesForRir.push(parseInt(prefix));
    }
  }
  let ips = [];
  while (ips.length < num) {
    const randomIndex = getRandomInt(0, prefixesForRir.length - 1);
    const randomPrefix = prefixesForRir[randomIndex];
    const ip = randomPrefix + '.' + getRandomInt(0, 255) + '.' + getRandomInt(0, 255) + '.' + getRandomInt(0, 255);
    if (excludeBogon) {
      if (!isBogon(ip)) {
        ips.push(ip);
      }
    } else {
      ips.push(ip);
    }
  }
  return ips;
}

/**
 * Generates a random IPv6 address.
 *
 * @returns {string} Random IPv6 literal.
 */
function getRandomIPv6() {
  // Generate eight groups of four hexadecimal digits each
  const groups = Array.from({ length: 8 }, () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0'));
  // Join the groups with colons
  const ipv6Address = groups.join(':');
  return ipv6Address;
}

/**
 * Generates a list of random IP addresses with configurable family mix.
 *
 * @param {number} [num=100] - Amount of addresses to return.
 * @param {boolean} [excludeBogon=true] - Avoid reserved IPv4 spaces.
 * @param {boolean} [mixInIPv6=false] - Include IPv6 candidates when true.
 * @returns {string[]} Array of IP addresses.
 */
function getRandomIPs(num = 100, excludeBogon = true, mixInIPv6 = false) {
  let ips = [];
  for (let i = 0; i < num; i++) {
    if (mixInIPv6) {
      ips.push(Math.random() > 0.5 ? getRandomIPv4(excludeBogon) : getRandomIPv6());
    } else {
      ips.push(getRandomIPv4(excludeBogon));
    }
  }
  return ips;
}

/**
 * Generates a list of random IPv6 addresses.
 *
 * @param {number} [num=100] - Amount of addresses to return.
 * @returns {string[]} Array of IPv6 literals.
 */
function getRandomIPv6Addresses(num = 100) {
  let ips = [];
  for (let i = 0; i < num; i++) {
    ips.push(getRandomIPv6());
  }
  return ips;
}

// only pick this as an organization if no other organization matches
const lastResortOrgsExact = [
  "Internet Assigned Numbers Authority",
  'IANA',
  "RIPE",
  'RIPE NCC',
  "ARIN",
  "LACNIC",
  "AFRINIC",
  'APNIC',
  'RIPE NCC (AFRINIC)',
  "Internet Assigned Numbers Authority (IANA)",
  "American Registry for Internet Numbers",
  "This inetnum has been transfered as part of the ERX.",
  'African Network Information Center',
  'Taiwan Network Information Center',
  'China Network Information Center',
  'China Internet Network Information Center',
  'Vietnam Internet Network Information Center',
  'Indonesia Network Information Center',
  'Japan Network Information Center',
  'Korean Network Information Center',
  'Korea Network Information Center',
  'Taiwan Network Information Center',
  'Reseaux IP Europeens Network Coordination Centre (RIPE NCC)',
  'APNIC AP',
  'ERX NETBLOCK',
  'Latin American and Caribbean IP address Regional Registry',
  'Latin American and Caribbean IP address Regional Registry (LACNIC)',
  'Internet Assigned Numbers Authority',
  'Asia Pacific Network Information Centre',
  'Asia Pacific Network Information Center, Pty. Ltd.',
  'JPNIC NET JP ERX',
  'JPNIC NET JP',
  'ABUSE APNICAP',
  'DNIC',
  'APNIC Hostmaster',
  'APNIC AP ERX',
  'AFRINIC CIDR BLOCK',
  'IP ASSIGNED TO ADSL COSTOMERS WITH STATIC IP',
  'Failover Ips',
  'Static IP',
  'Customers',
  'Residential DHCP',
  'APNIC ASN block',
  'Asia Pacific Network Information Centre (APNIC)',
  'African Network Information Center (AFRINIC)',
  'RIPE Network Coordination Centre',
];

const lastResortOrgLut = {};
for (const key of lastResortOrgsExact) {
  const normKey = key.toLowerCase().trim();
  lastResortOrgLut[normKey] = 1;
}

// if an org includes one of those strings, pick it as a last resort
const lastResortIncludes = [
  ' Network Coordination Center',
  ' Network Coordination Centre',
  ' Allocation Block',
  ' Assigned Numbers Authority',
].map((element) => element.toLowerCase().trim());

// if an org starts with one of those strings, pick it as a last resort
const lastResortStartsWith = [
  'dynamic cust',
];

/**
 * Flags organisations that should only be used as a fallback match.
 *
 * @param {string} orgName - Organisation name from WHOIS/IP geodata.
 * @returns {boolean} True when the organisation should be considered last resort.
 */
const isLastResortOrg = (orgName) => {
  const normOrg = orgName.toLowerCase().trim();

  if (normOrg in lastResortOrgLut) {
    return true;
  }

  for (const needle of lastResortIncludes) {
    if (normOrg.includes(needle)) {
      return true;
    }
  }

  for (const needle of lastResortStartsWith) {
    if (orgName.startsWith(needle)) {
      return true;
    }
  }

  return false;
};

/**
 * Computes integer log2 using bit shifts for BigInt values.
 *
 * @param {bigint} value - Positive BigInt value.
 * @returns {bigint} floor(log2(value)).
 */
function ilog2_bs(value) {
  let result = 0n, i, v;
  for (i = 1n; value >> (1n << i); i <<= 1n);
  while (value > 1n) {
    v = 1n << --i;
    if (value >> v) {
      result += v;
      value >>= v;
    }
  }
  return result;
}

/**
 * Checks whether a BigInt value is a power of two.
 *
 * @param {bigint} n - Value to test.
 * @returns {boolean} True when n is a power of two.
 */
function isPowerOf2BigInt(n) {
  return n > 0n && (n & (n - 1n)) === 0n;
}

/**
 * Converts an IPv6 inetnum range back to CIDR when the span is a power of two.
 *
 * @param {string|bigint} start - Starting IPv6 (string or BigInt).
 * @param {string|bigint} end - Ending IPv6 (string or BigInt).
 * @param {boolean} [isBigInt=false] - Treat inputs as BigInt when true.
 * @returns {string|null} Equivalent CIDR or null when no single CIDR fits.
 */
function getCidrFromInet6num(start, end, isBigInt = false) {
  let startBigInt = null;
  let endBigInt = null;
  let startIp = null;

  if (isBigInt) {
    startBigInt = start;
    endBigInt = end;
    startIp = IPv6.fromBigInt(start);
  } else {
    startIp = IPv6.fromString(start);
    const endIp = IPv6.fromString(end);
    startBigInt = startIp.getValue();
    endBigInt = endIp.getValue();
  }

  const delta = endBigInt - startBigInt + BigInt(1);
  const isPowerOfTwo = isPowerOf2BigInt(delta);

  if (isPowerOfTwo) {
    const log2 = ilog2_bs(delta);
    const netmask = 128n - log2;
    const ipStr = abbreviateIPv6(startIp.toString());
    return `${ipStr}/${netmask}`;
  }

  return null;
}

/**
 * Converts an IPv4 inetnum back to CIDR when the range length is a power of two.
 *
 * @param {string} inetnum - IPv4 inetnum string.
 * @returns {string|null} Equivalent CIDR or null when not representable.
 */
function getCidrFromInetnum(inetnum) {
  const [start, end] = inetnum.split('-').map(ip => ip.trim());

  if (isIPv4(start) && isIPv4(end)) {
    const startInt = IPv4ToInt(start);
    const endInt = IPv4ToInt(end);
    const delta = endInt - startInt + 1;

    if (delta > 0 && (delta & (delta - 1)) === 0) { // Check if delta is a power of 2
      const log2 = Math.log2(delta);
      const netmask = 32 - log2;
      return `${start}/${netmask}`;
    }
  }

  return null;
}

/**
 * Returns both inetnum and CIDR variants for a given network descriptor.
 *
 * @param {string} network - Network in CIDR or inetnum format.
 * @returns {{type:number,inetnum:string|null,cidr:string|null}} Summary with detected family.
 */
const getInetnumAndCidrFromNetwork = (network) => {
  const type = getNetworkType(network);
  let inetnum = null;
  let cidr = null;

  if (type === 4) {
    if (isIPv4Cidr(network)) {
      const [startIp, endIp] = parseIPv4Cidr(network);
      inetnum = `${startIp} - ${endIp}`;
      cidr = network;
    } else {
      inetnum = network;
      cidr = getCidrFromInetnum(network);
    }
  } else if (type === 6) {
    if (isIPv6Cidr(network)) {
      const [startIp, endIp] = parseIPv6Cidr(network);
      inetnum = `${startIp} - ${endIp}`;
      cidr = network;
    } else {
      inetnum = network;
      const [start, end] = inetnum.split('-').map(ip => ip.trim());
      cidr = getCidrFromInet6num(start, end, false);
    }
  }

  return { type, inetnum, cidr };
};

/**
 * Formats a network represented by numeric bounds into human or machine readable string.
 *
 * @param {Array} net - Two-element array with start/end bounds.
 * @param {4|6} type - IP version.
 * @param {boolean} [human=true] - Emit human-readable addresses when true.
 * @returns {string} Formatted network string.
 */
const networkToStr = (net, type, human = true) => {
  if (type === 4) {
    if (human) {
      return `${IntToIPv4(net[0])} - ${IntToIPv4(net[1])}`;
    } else {
      return `${net[0]} - ${net[1]}`;
    }
  } else if (type === 6) {
    if (human) {
      return `${abbreviateIPv6(IPv6.fromBigInt(net[0]).toString())} - ${abbreviateIPv6(IPv6.fromBigInt(net[1]).toString())}`;
    } else {
      return `${net[0]} - ${net[1]}`;
    }
  }
};

/**
 * Compares two numeric network tuples for equality.
 *
 * @param {Array} net1 - First [start,end] pair.
 * @param {Array} net2 - Second [start,end] pair.
 * @returns {boolean} True when both bounds match.
 */
const isSameArrNet = (net1, net2) => {
  return net1[0] === net2[0] && net1[1] === net2[1];
};

/**
 * Collapses an IPv6 BigInt into a custom shorthand format for compact storage.
 *
 * @param {bigInt.BigInteger} ipBigInt - IPv6 value.
 * @returns {string} Collapsed representation.
 */
const collapseIPv6OwnFormat = (ipBigInt) => {
  const ip = IPv6.fromBigInt(ipBigInt).toString();
  const collapsed = abbreviateIPv6(ip);

  // compress an IPv6 such as "2001:56e:a05b:ffff:ffff:ffff:ffff" into "2001:56e:a05b-4f"
  // while "-4f" indicates that ":ffff:ffff:ffff:ffff"

  const suffixes = [
    { suffix: "::", replacement: "_" },
    { suffix: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", replacement: "-8" },
    { suffix: ":ffff:ffff:ffff:ffff:ffff:ffff:ffff", replacement: "-7" },
    { suffix: ":ffff:ffff:ffff:ffff:ffff:ffff", replacement: "-6" },
    { suffix: ":ffff:ffff:ffff:ffff:ffff", replacement: "-5" },
    { suffix: ":ffff:ffff:ffff:ffff", replacement: "-4" },
    { suffix: ":ffff:ffff:ffff", replacement: "-3" },
    { suffix: ":ffff:ffff", replacement: "-2" },
    { suffix: ":ffff", replacement: "-1" },
  ];

  let newFormat = collapsed;

  for (const { suffix, replacement } of suffixes) {
    if (newFormat.endsWith(suffix)) {
      newFormat = newFormat.replaceAll(suffix, replacement);
      break;
    }
  }

  return newFormat;
};

/**
 * Expands a custom collapsed IPv6 string back into its BigInt representation.
 *
 * @param {string} ip - Collapsed IPv6 string.
 * @returns {bigInt.BigInteger|undefined} BigInt value or undefined on parse error.
 */
const uncollapseIPv6OwnFormat = (ip) => {
  const suffixes = [
    { suffix: "_", replacement: "::" },
    { suffix: "-8", replacement: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff" },
    { suffix: "-7", replacement: ":ffff:ffff:ffff:ffff:ffff:ffff:ffff" },
    { suffix: "-6", replacement: ":ffff:ffff:ffff:ffff:ffff:ffff" },
    { suffix: "-5", replacement: ":ffff:ffff:ffff:ffff:ffff" },
    { suffix: "-4", replacement: ":ffff:ffff:ffff:ffff" },
    { suffix: "-3", replacement: ":ffff:ffff:ffff" },
    { suffix: "-2", replacement: ":ffff:ffff" },
    { suffix: "-1", replacement: ":ffff" },
  ];

  let newFormat = ip;

  for (const { suffix, replacement } of suffixes) {
    if (newFormat.endsWith(suffix)) {
      newFormat = newFormat.replaceAll(suffix, replacement);
      break;
    }
  }

  try {
    // return the bigInt value
    return bigInt(IPv6.fromString(newFormat).value);
  } catch (error) {
    console.log('uncollapseIPv6OwnFormat', error);
    console.log(newFormat);
  }
};

/**
 * Enumerates every IP contained in an inetnum range.
 *
 * @param {string} network - Inetnum string.
 * @returns {string[]} Array of IP addresses.
 */
const getAllIPsFromNetwork = (network) => {
  const ips = [];
  const [start, end] = network.split(' - ');

  if (isIPv4(start) && isIPv4(end)) {
    let currentIP = IPv4ToInt(start);
    const endIP = IPv4ToInt(end);

    while (currentIP <= endIP) {
      ips.push(IntToIPv4(currentIP));
      currentIP += 1;
    }
  } else if (isIPv6(start) && isIPv6(end)) {
    let currentIP = bigInt(IPv6.fromString(start).value);
    const endIP = bigInt(IPv6.fromString(end).value);
    while (currentIP.lesserOrEquals(endIP)) {
      ips.push(IPv6.fromBigInt(currentIP).toString());
      currentIP = currentIP.add(1);
    }
  } else {
    throw new Error('Invalid IP range');
  }

  return ips;
};

module.exports = {
  abbreviateIPv6,
  collapseIPv6OwnFormat,
  expand_48bits,
  filenameToInetnum,
  first_48bits_from_IPv6,
  firstIpOfNet,
  getAllIPsFromNetwork,
  getCidrFromInet6num,
  getFirstAndLastIpOfNetwork,
  getInetnumStartIP,
  getNetworkType,
  getNetworkTypeOld,
  getNextIp,
  getPreviousIp,
  getRandomIPs,
  getRandomIPv4,
  getRandomIPv4ByRIR,
  getRandomIPv6,
  getRandomIPv6Addresses,
  getCidrFromInetnum,
  getInetnumAndCidrFromNetwork,
  IntToIPv4,
  IntToIPv6,
  inetnumToFilename,
  IPv4CidrToInt,
  IPv4ToInt,
  IPv6CidrToInetnum,
  IPv6CidrToInt,
  IPv6IsLargerThan,
  IPv6ToBigint,
  IPv6ToInt,
  IpToInt,
  isASN,
  isBogon,
  isCidr,
  isIP,
  isInInetnum,
  isInNetwork,
  isInetnum,
  isIPv4,
  isIPv4Cidr,
  isIPv4Inetnum,
  isIPv6,
  isIPv6Cidr,
  isIPv6Inetnum,
  isIPv6Strict,
  isLastResortOrg,
  isNetwork,
  isNetworkOrIp,
  isSameArrNet,
  isValidNetwork,
  networkToStartAndEndInt,
  networkToStartAndEndStr,
  networkToStr,
  numHostsInCidrIPv4,
  numHostsInCidrIPv6,
  numHostsInetnum,
  numHostsInNet,
  parseInetnum,
  parseIPv4Cidr,
  parseIPv4Inetnum,
  parseIPv6Cidr,
  parseIPv6Inetnum,
  startEndIpToNetwork,
  uncollapseIPv6OwnFormat,
  cidrToInetnum,
  isSubset,
  getNextIpOfNet,
  isIPv4Network,
  isIPv6Network,
};
