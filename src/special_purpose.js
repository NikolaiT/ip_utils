/**
 * Private, shared (CGNAT), loopback, link-local, documentation, benchmarking,
 * multicast and other special-purpose space (the IANA special-purpose address
 * registries): nothing located there is on the internet.
 */
const { networkToStartAndEndInt, RESERVED_IPV4_RANGES } = require('./ip_tools.js');

const bounds = (network) => {
  const r = networkToStartAndEndInt(network);
  // IPv6 bounds are big-integer objects whose valueOf() is a lossy float
  return r && { version: r.ipVersion, start: BigInt(String(r.startIp)), end: BigInt(String(r.endIp)) };
};
const IPV4 = RESERVED_IPV4_RANGES.map(([start, end]) => [BigInt(start), BigInt(end)]);
// Only 2000::/3 is global unicast; these are the special blocks inside it
const GLOBAL_UNICAST = bounds('2000::/3');
const IPV6 = ['2001::/32', '2001:20::/28', '2001:db8::/32', '2002::/16', '3fff::/20']
  .map(bounds).map(({ start, end }) => [start, end]);
const overlaps = (ranges, start, end) => ranges.some(([s, e]) => start <= e && end >= s);
// ::ffff:0:0/96 carries an IPv4 address (location databases mirror IPv4 there)
const { start: MAPPED, end: MAPPED_END } = bounds('::ffff:0:0/96');

/** Whether an IPv4 (4) or IPv6 (6) range given as numbers or bigints overlaps special-purpose space. */
const rangeOverlapsSpecialPurpose = (version, first, last) => {
  const start = BigInt(String(first));
  const end = BigInt(String(last));
  if (version === 4) return overlaps(IPV4, start, end);
  if (start >= MAPPED && end <= MAPPED_END) return overlaps(IPV4, start - MAPPED, end - MAPPED);
  if (start < GLOBAL_UNICAST.start || end > GLOBAL_UNICAST.end) return true;
  return overlaps(IPV6, start, end);
};

/** Whether a network ("a - b", CIDR or single address) overlaps special-purpose space. */
const overlapsSpecialPurpose = (network) => {
  const r = bounds(network);
  return Boolean(r) && rangeOverlapsSpecialPurpose(r.version, r.start, r.end);
};

module.exports = { overlapsSpecialPurpose, rangeOverlapsSpecialPurpose };
