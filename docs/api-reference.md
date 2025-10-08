# API Reference

The library exports a broad set of helpers from `src/ip_tools.js`. They fall into the following categories.

## Validation

- `isIPv4(ip)`, `isIPv6(ip)`, `isIP(input)` – check whether a literal is a valid IP and return its version.
- `isCidr(cidr)`, `isIPv4Cidr(cidr)`, `isIPv6Cidr(cidr)` – validate CIDR strings with family-specific semantics.
- `isInetnum(range)`, `isIPv4Inetnum(range)`, `isIPv6Inetnum(range)` – recognise inetnum ranges and their IP version.
- `isNetwork(input)`, `isNetworkOrIp(input)` – accept any recognised network format.
- `isValidNetwork(network)` – ensure inetnum boundaries are well ordered.
- `isASN(asn)` – validate canonical autonomous system number strings.
- `isBogon(ip)` – flag IPs that fall into reserved or bogon ranges.
- `isSubset(netA, netB)` – confirm that one network is fully contained within another.

## Conversion & Normalisation

- `cidrToInetnum(cidr)`, `IPv6CidrToInetnum(cidr)` – convert CIDR blocks into inetnum ranges.
- `getCidrFromInetnum(inetnum)`, `getCidrFromInet6num(start, end)` – attempt to express inetnums as single CIDRs.
- `getInetnumAndCidrFromNetwork(network)` – return both formats along with family metadata.
- `getFirstAndLastIpOfNetwork(network)`, `firstIpOfNet(network)`, `getNextIpOfNet(network)` – inspect network boundaries.
- `getNextIp(ip)`, `getPreviousIp(ip)` – walk to neighbouring addresses.
- `IPv4ToInt(ip)`, `IntToIPv4(int)`, `IpToInt(ip)` – convert between IPv4 textual and numeric forms.
- `IPv6ToInt(ip)`, `IPv6ToBigint(ip)`, `IntToIPv6(int, mode)` – convert between IPv6 textual and numeric forms.
- `abbreviateIPv6(ip)`, `collapseIPv6OwnFormat(ip)`, `uncollapseIPv6OwnFormat(compact)` – normalise and compress IPv6.
- `inetnumToFilename(range)`, `filenameToInetnum(encoded)` – create deterministic filenames for inetnum ranges.
- `networkToStartAndEndInt(network)`, `networkToStartAndEndStr(network)` – normalise networks to numeric or textual bounds.
- `startEndIpToNetwork(version, start, end)` – build inetnum strings from numeric bounds.
- `networkToStr(net, version, human)` – format numeric bounds for readability.
- `expand_48bits(key)`, `first_48bits_from_IPv6(parts)` – work with custom IPv6 lookup keys.

## Range Analysis

- `parseInetnum(range)`, `parseIPv4Inetnum(range)`, `parseIPv6Inetnum(range)` – obtain structured bounds for inetnums.
- `parseIPv4Cidr(cidr)`, `parseIPv6Cidr(cidr)` – derive numeric start/end values for CIDR blocks.
- `numHostsInetnum(range)`, `numHostsInCidrIPv4(cidr)`, `numHostsInCidrIPv6(cidr)`, `numHostsInNet(network)` – count the number of addresses represented by a network.
- `isInInetnum(ip, range)`, `isInNetwork(ip, network)` – check membership of IPs within ranges.
- `getAllIPsFromNetwork(range)` – enumerate every IP in a (small) inetnum range.

## Random Sampling & Metadata

- `getRandomIPv4(excludeBogon)`, `getRandomIPv6()` – generate random addresses.
- `getRandomIPv4ByRIR(rir, count, excludeBogon)` – sample IPv4 addresses allocated to a specific RIR.
- `getRandomIPs(count, excludeBogon, mixInIPv6)` – produce mixed samples.
- `getRandomIPv6Addresses(count)` – convenience wrapper for IPv6 batches.
- `getNetworkType(value)`, `getNetworkTypeOld(value)` – detect network family quickly.
- `isIPv4Network(network)`, `isIPv6Network(network)` – explicitly assert network families.
- `getInetnumStartIP(range)` – return the first IP in an inetnum.
- `isSameArrNet(a, b)` – compare numeric network tuples.
- `isLastResortOrg(name)` – classify registry names reserved as fallback matches.

### Usage Notes

- All helpers are synchronous and side-effect free, except for `getRandomIPv4ByRIR` which reads a local JSON lookup once per invocation.
- IPv6 numeric helpers rely on [`ip-num`](https://www.npmjs.com/package/ip-num) and the `big-integer` package for precise arithmetic.
- Functions returning `bigInt.BigInteger` instances (from the `big-integer` module) can be converted to native `BigInt` via `.value` when needed.

Refer to the inline JSDoc comments in `src/ip_tools.js` for full signatures and additional behavioural details.
