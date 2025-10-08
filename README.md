# ip_address_tools

Utilities for working with IPv4 and IPv6 addresses, networks, and inetnum ranges.

The library powers multiple internal IP intelligence pipelines and exposes a curated set of helpers for validation, conversion, enumeration, random sampling, and range arithmetic.

## Highlights

- Parse and normalise IP literals, CIDRs, and inetnum ranges across IPv4 and IPv6.
- Convert between textual and numeric forms, including custom collapse/expand helpers for IPv6.
- Inspect membership, subset, and host counts for any supported network format.
- Generate realistic random IP samples with optional bogon filtering and RIR scoping.

## Installation

```bash
npm install ip_address_tools
```

For local development you can link the package directly:

```bash
npm install --save-dev /Users/nikolaitschacher/projects/ip_address_tools
```

## Quick Start

```javascript
const {
  isCidr,
  cidrToInetnum,
  getFirstAndLastIpOfNetwork,
  numHostsInNet,
} = require('ip_address_tools');

const cidr = '2001:db8::/126';

if (isCidr(cidr)) {
  const inetnum = cidrToInetnum(cidr);
  const [first, last] = getFirstAndLastIpOfNetwork(inetnum);
  console.log({ inetnum, first, last, hostCount: numHostsInNet(cidr).toString() });
}
```

Looking for a specific helper? Skim the [API reference](docs/api-reference.md) for a categorised overview of every export.

## Scripts

- `npm test` – run the unit test suite.

## Contributing

The codebase is intentionally dependency-light. Keep new helpers pure and side-effect free where possible, add JSDoc annotations, and cover new behaviour with tests under `src/test_ip_tools.js`.
