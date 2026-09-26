/**
 * Private, shared (CGNAT), loopback, link-local, documentation, benchmarking,
 * multicast and other special-purpose space (the IANA special-purpose address
 * registries): nothing located there is on the internet.
 */
const { networkToStartAndEndInt, RESERVED_IPV4_RANGES } = require('./ip_tools.js');

const SPECIAL_PURPOSE_IPV6 = [
  '::/128', '::1/128', '64:ff9b::/96', '64:ff9b:1::/48', '100::/64', '2001::/32', '2001:20::/28',
  '2001:db8::/32', '2002::/16', '3fff::/20', 'fc00::/7', 'fe80::/10', 'ff00::/8',
];

const bounds = (network) => {
  const r = networkToStartAndEndInt(network);
  // IPv6 bounds are big-integer objects whose valueOf() is a lossy float
  return r && { version: r.ipVersion, start: BigInt(String(r.startIp)), end: BigInt(String(r.endIp)) };
};
const IPV4 = RESERVED_IPV4_RANGES.map(([start, end]) => [BigInt(start), BigInt(end)]);
const IPV6 = SPECIAL_PURPOSE_IPV6.map(bounds).map(({ start, end }) => [start, end]);
const overlaps = (ranges, start, end) => ranges.some(([s, e]) => start <= e && end >= s);
// ::ffff:0:0/96 carries an IPv4 address (location databases mirror IPv4 there)
const { start: MAPPED, end: MAPPED_END } = bounds('::ffff:0:0/96');

/** Whether a network ("a - b", CIDR or single address) overlaps special-purpose space. */
const overlapsSpecialPurpose = (network) => {
  const r = bounds(network);
  if (!r) return false;
  if (r.version === 4) return overlaps(IPV4, r.start, r.end);
  if (r.start >= MAPPED && r.end <= MAPPED_END) return overlaps(IPV4, r.start - MAPPED, r.end - MAPPED);
  return overlaps(IPV6, r.start, r.end);
};

module.exports = { overlapsSpecialPurpose };
