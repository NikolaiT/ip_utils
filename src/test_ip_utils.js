const { IPv6 } = require('ip-num');
const { IPv6CidrToInt, IPv4CidrToInt, isASN, getNetworkType, networkToStartAndEndStr, parseIPv4Cidr,
  parseIPv6Cidr, isIPv4Network, isIPv6Inetnum, isIPv4Inetnum,
  isIPv4Cidr, isIPv6Cidr, isInetnum, isInInetnum, abbreviateIPv6,
  IPv6IsLargerThan, isIPv6Strict, collapseIPv6OwnFormat, uncollapseIPv6OwnFormat } = require('./ip_utils');

const testIpUtils = () => {
  // test IPv6CidrToInt
  const ipv6CidrToIntTests = [
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/127', expected: [8193, 3512, 34211, 0, 0, 35374, 880, 29492] },
    { input: 'abcd:0db8:85a3:0000:0000:8a2e:0370:7334/66', expected: [43981, 3512, 34211, 0, 0, 35374, 880, 29492] },
  ];

  ipv6CidrToIntTests.forEach(({ input, expected }) => {
    const result = IPv6CidrToInt(input);
    if (Array.isArray(result) && result.length === expected.length && result.every((val, index) => val === expected[index])) {
      console.log(`PASS: IPv6CidrToInt("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: IPv6CidrToInt("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test IPv4CidrToInt
  const ipv4CidrToIntTests = [
    { input: '192.168.1.0/24', expected: 3232235776 },
    { input: '222.111.1.0/31', expected: 3731816704 },
    { input: '10.0.0.0/8', expected: 167772160 },
  ];

  ipv4CidrToIntTests.forEach(({ input, expected }) => {
    const result = IPv4CidrToInt(input);
    if (result === expected) {
      console.log(`PASS: IPv4CidrToInt("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: IPv4CidrToInt("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test isASN
  const isASNTests = [
    { input: 'AS12345', expected: true },
    { input: 'AS1234567890', expected: true },
    { input: 'AS1234567890', expected: true },
    { input: 'AS1234567890', expected: true },
    { input: 'AS1', expected: true },
    { input: 'AS', expected: false },
    { input: '', expected: false },
  ];

  isASNTests.forEach(({ input, expected }) => {
    const result = isASN(input);
    if (result === expected) {
      console.log(`PASS: isASN("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: isASN("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test getNetworkType
  const getNetworkTypeTests = [
    { input: '192.168.1.0 - 192.168.1.255', expected: 4 },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334 - 2001:0db8:85a3:0000:0000:8a2e:0370:7334', expected: 6 },
    { input: '2a02:2450:0000:0000:0000:0000:0000:0000 - 2a02:2450:0000:0000:0000:0000:0000:00ff', expected: 6 },
    { input: '192.168.1.0/24', expected: 4 },
    { input: '222.111.1.0/31', expected: 4 },
    { input: '10.0.0.0/8', expected: 4 },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/120', expected: 6 },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/22', expected: 6 },
    { input: '2803:9810:30ff:ab10:25a7:da1d:ed5f:3038/88', expected: 6 },
    // more ipv4 nets
    { input: '192.168.1.0/24', expected: 4 },
    { input: '192.168.1.0/33', expected: 4 },
    { input: '10.0.0.0/8', expected: 4 },
    { input: '192.168.1.0/1', expected: 4 },
    { input: '192.168.1.0/32', expected: 4 }
  ];

  getNetworkTypeTests.forEach(({ input, expected }) => {
    const result = getNetworkType(input);
    if (result === expected) {
      console.log(`PASS: getNetworkType("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: getNetworkType("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test networkToStartAndEndStr function
  const networkToStartAndEndStrTests = [
    { input: '192.168.1.0 - 192.168.1.255', expected: { ipVersion: 4, startIp: '192.168.1.0', endIp: '192.168.1.255' } },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334 - 2001:0db8:85a3:0000:0000:8a2e:0370:7334', expected: { ipVersion: 6, startIp: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', endIp: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' } },
    { input: '2a02:2450:0000:0000:0000:0000:0000:0000 - 2a02:2450:0000:0000:0000:0000:0000:00ff', expected: { ipVersion: 6, startIp: '2a02:2450:0000:0000:0000:0000:0000:0000', endIp: '2a02:2450:0000:0000:0000:0000:0000:00ff' } },
    // now some ipv4 cidr
    { input: '192.168.1.0/24', expected: { ipVersion: 4, startIp: '192.168.1.0', endIp: '192.168.1.255' } },
    { input: '222.111.1.0/31', expected: { ipVersion: 4, startIp: '222.111.1.0', endIp: '222.111.1.1' } },
    { input: '10.0.0.0/8', expected: { ipVersion: 4, startIp: '10.0.0.0', endIp: '10.255.255.255' } },
    // now some ipv6 cidr
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/120', expected: { ipVersion: 6, startIp: '2001:db8:85a3::8a2e:370:7300', endIp: '2001:db8:85a3::8a2e:370:73ff' } },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/22', expected: { ipVersion: 6, startIp: '2001:c00::', endIp: '2001:fff:ffff:ffff:ffff:ffff:ffff:ffff' } },
  ];

  networkToStartAndEndStrTests.forEach(({ input, expected }) => {
    const result = networkToStartAndEndStr(input);
    let resultStartIp = result.startIp.trim().toLowerCase();
    let resultEndIp = result.endIp.trim().toLowerCase();
    let expectedStartIp = expected.startIp.trim().toLowerCase();
    let expectedEndIp = expected.endIp.trim().toLowerCase();

    if (result.ipVersion === 6) {
      resultStartIp = abbreviateIPv6(resultStartIp);
      resultEndIp = abbreviateIPv6(resultEndIp);
      expectedStartIp = abbreviateIPv6(expectedStartIp);
      expectedEndIp = abbreviateIPv6(expectedEndIp);
    }

    if (
      result.ipVersion === expected.ipVersion &&
      resultStartIp === expectedStartIp &&
      resultEndIp === expectedEndIp
    ) {
      console.log(`PASS: networkToStartAndEndStr("${input}") returned ${JSON.stringify(result)} as expected.`);
    } else {
      console.error(`FAIL: networkToStartAndEndStr("${input}") returned ${JSON.stringify(result)}; expected ${JSON.stringify(expected)}.`);
    }
  });

  // test parseIPv4Cidr function
  const ipv4CidrParseTests = [
    { input: '192.168.1.0/24', expected: [3232235776, 3232236031] },
    { input: '222.111.1.0/31', expected: [3731816704, 3731816705] },
    { input: '10.0.0.0/8', expected: [167772160, 184549375] },
  ];

  ipv4CidrParseTests.forEach(({ input, expected }) => {
    const result = parseIPv4Cidr(input);
    if (result[0] === expected[0] && result[1] === expected[1]) {
      console.log(`PASS: parseIPv4Cidr("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: parseIPv4Cidr("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test parseIPv6Cidr function
  const ipv6CidrParseTests = [
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/127', expected: [42540766452641154071740215577757643572n, 42540766452641154071740215577757643573n] },
    { input: 'abcd:0db8:85a3:0000:0000:8a2e:0370:7334/66', expected: [228362686425885565241589466277655609344n, 228362686425885565246201152296082997247n] },
    { input: '2803:9810:30ff:ab10:25a7:da1d:ed5f:3038/88', expected: [53187780931046959059127862000172924928n, 53187780931046959059127863099684552703n] }
  ];

  ipv6CidrParseTests.forEach(({ input, expected }) => {
    const result = parseIPv6Cidr(input);
    if (result[0].equals(expected[0]) && result[1].equals(expected[1])) {
      console.log(`PASS: parseIPv6Cidr("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: parseIPv6Cidr("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test isIPv4Network function
  const ipv4NetworkTests = [
    { input: '192.168.1.0 - 192.168.1.255', expected: true },
    { input: '192.168.1.0/24', expected: true },
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff', expected: false },
    { input: '2601:a95:7800::/64', expected: false },
  ];

  ipv4NetworkTests.forEach(({ input, expected }) => {
    const result = isIPv4Network(input);
    if (result === expected) {
      console.log(`PASS: isIPv4Network("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: isIPv4Network("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test isIPv6Inetnum function
  const ipv6InetnumTests = [
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff', expected: true },
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff', expected: true },
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff', expected: true },
    // some invalid ones, ipv4 inetnum and ipv4 cidr
    { input: '192.168.1.0 - 192.168.1.255', expected: false },
    { input: '192.168.1.0/24', expected: false },
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff:ffff', expected: false },
    { input: '2601:a95:7800::/64', expected: false },
  ];

  ipv6InetnumTests.forEach(({ input, expected }) => {
    const result = isIPv6Inetnum(input);
    if (result === expected) {
      console.log(`PASS: isIPv6Inetnum("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: isIPv6Inetnum("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test isIPv4Inetnum function
  const ipv4InetnumTests = [
    { input: '192.168.1.0 - 192.168.1.255', expected: true },
    { input: '192.168.1.0 - 192.168.2.0', expected: true },
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff', expected: false },
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff', expected: false },
    { input: '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff', expected: false },
  ];

  ipv4InetnumTests.forEach(({ input, expected }) => {
    const result = isIPv4Inetnum(input);
    if (result === expected) {
      console.log(`PASS: isIPv4Inetnum("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: isIPv4Inetnum("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test isIPv4Cidr
  const ipv4CidrTests = [
    { input: '192.168.1.0/24', expected: true },
    { input: '192.168.1.0/33', expected: false },
    { input: '10.0.0.0/8', expected: true },
    { input: '192.168.1.0/0', expected: false },
    { input: '192.168.1.0/32', expected: true }
  ];

  ipv4CidrTests.forEach(({ input, expected }) => {
    const result = isIPv4Cidr(input);
    if (result === expected) {
      console.log(`PASS: isIPv4Cidr("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: isIPv4Cidr("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  // test isIPv6Cidr
  const ipv6CidrTests = [
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/128', expected: true },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/129', expected: false },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/127', expected: true },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/0', expected: false },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/126', expected: true },
    { input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334/125', expected: true },
  ];

  ipv6CidrTests.forEach(({ input, expected }) => {
    const result = isIPv6Cidr(input);
    if (result === expected) {
      console.log(`PASS: isIPv6Cidr("${input}") returned ${result} as expected.`);
    } else {
      console.error(`FAIL: isIPv6Cidr("${input}") returned ${result}; expected ${expected}.`);
    }
  });

  const inetnum = '200.242.237.0 - 200.242.237.255';
  const inet6num = '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff';

  let ret = isInetnum(inetnum);
  if (ret === 4) {
    console.log(`PASS: isInetnum("${inetnum}") returned 4 as expected.`);
  } else {
    console.error(`FAIL: isInetnum("${inetnum}") returned ${ret}; expected 4.`);
  }

  let ret2 = isInetnum(inet6num);
  if (ret2 === 6) {
    console.log(`PASS: isInetnum("${inet6num}") returned 6 as expected.`);
  } else {
    console.error(`FAIL: isInetnum("${inet6num}") returned ${ret2}; expected 6.`);
  }

  let ret21 = isInetnum('abcd:aa:cc00:: - abcd:bb:cc::');
  if (ret21 === 6) {
    console.log(`PASS: isInetnum("abcd:aa:cc00:: - abcd:bb:cc::") returned 6 as expected.`);
  } else {
    console.error(`FAIL: isInetnum("abcd:aa:cc00:: - abcd:bb:cc::") returned ${ret21}; expected 6.`);
  }

  let ret3 = isInInetnum('2601:a95:78ab::', '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff');
  if (ret3 === true) {
    console.log(`PASS: isInInetnum("2601:a95:78ab::", "2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff") returned true as expected.`);
  } else {
    console.error(`FAIL: isInInetnum("2601:a95:78ab::", "2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff") returned ${ret3}; expected true.`);
  }

  let ret4 = isInInetnum('2601:a95:76ab::', '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff');
  if (ret4 === false) {
    console.log(`PASS: isInInetnum("2601:a95:76ab::", "2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff") returned false as expected.`);
  } else {
    console.error(`FAIL: isInInetnum("2601:a95:76ab::", "2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff") returned ${ret4}; expected false.`);
  }

  let ret5 = isInInetnum('2601:a95:ffff::', '2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff');
  if (ret5 === false) {
    console.log(`PASS: isInInetnum("2601:a95:ffff::", "2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff") returned false as expected.`);
  } else {
    console.error(`FAIL: isInInetnum("2601:a95:ffff::", "2601:a95:7800:: - 2601:a95:7fff:ffff:ffff:ffff:ffff:ffff") returned ${ret5}; expected false.`);
  }

  let ret6 = isInInetnum('2601:a95:abcd::', '2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff');
  if (ret6 === true) {
    console.log(`PASS: isInInetnum("2601:a95:abcd::", "2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff") returned true as expected.`);
  } else {
    console.error(`FAIL: isInInetnum("2601:a95:abcd::", "2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff") returned ${ret6}; expected true.`);
  }

  let ret7 = isInInetnum('2601:a95:abcd:0000:0000:0000:0000:0001', '2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff');
  if (ret7 === true) {
    console.log(`PASS: isInInetnum("2601:a95:abcd:0000:0000:0000:0000:0001", "2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff") returned true as expected.`);
  } else {
    console.error(`FAIL: isInInetnum("2601:a95:abcd:0000:0000:0000:0000:0001", "2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff") returned ${ret7}; expected true.`);
  }

  let ret8 = isInInetnum('2601:a95:abce:0000:0000:0000:0000:0000', '2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff');
  if (ret8 === false) {
    console.log(`PASS: isInInetnum("2601:a95:abce:0000:0000:0000:0000:0000", "2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff") returned false as expected.`);
  } else {
    console.error(`FAIL: isInInetnum("2601:a95:abce:0000:0000:0000:0000:0000", "2601:a95:abcd:: - 2601:a95:abcd:ffff:ffff:ffff:ffff:ffff") returned ${ret8}; expected false.`);
  }

  let ret9 = isInInetnum('ffaa:5d00:ff00:0000:0000:0000:0000:0000', 'ffaa:5d00:ab00:: - ffaa:5d00:ff00::');
  if (ret9 === true) {
    console.log(`PASS: isInInetnum("ffaa:5d00:ff00:0000:0000:0000:0000:0000", "ffaa:5d00:ab00:: - ffaa:5d00:ff00::") returned true as expected.`);
  } else {
    console.error(`FAIL: isInInetnum("ffaa:5d00:ff00:0000:0000:0000:0000:0000", "ffaa:5d00:ab00:: - ffaa:5d00:ff00::") returned ${ret9}; expected true.`);
  }

  let ret10 = IPv6IsLargerThan('ffaa:5d00:ff00:0000:0000:0000:0000:0000', 'ffff::');
  if (ret10 === -1) {
    console.log(`PASS: IPv6IsLargerThan("ffaa:5d00:ff00:0000:0000:0000:0000:0000", "ffff::") returned -1 as expected.`);
  } else {
    console.error(`FAIL: IPv6IsLargerThan("ffaa:5d00:ff00:0000:0000:0000:0000:0000", "ffff::") returned ${ret10}; expected -1.`);
  }

  let ret11 = IPv6IsLargerThan('ffaa:5d00:ff00:0000:0000:0000:0000:0000', 'ffaa:5d00:ff00::');
  if (ret11 === 0) {
    console.log(`PASS: IPv6IsLargerThan("ffaa:5d00:ff00:0000:0000:0000:0000:0000", "ffaa:5d00:ff00::") returned 0 as expected.`);
  } else {
    console.error(`FAIL: IPv6IsLargerThan("ffaa:5d00:ff00:0000:0000:0000:0000:0000", "ffaa:5d00:ff00::") returned ${ret11}; expected 0.`);
  }

  let ret12 = IPv6IsLargerThan('ffaa:5d00:ff00:0000:0000:0000:0000:0001', 'ffaa:5d00:ff00::');
  if (ret12 === 1) {
    console.log(`PASS: IPv6IsLargerThan("ffaa:5d00:ff00:0000:0000:0000:0000:0001", "ffaa:5d00:ff00::") returned 1 as expected.`);
  } else {
    console.error(`FAIL: IPv6IsLargerThan("ffaa:5d00:ff00:0000:0000:0000:0000:0001", "ffaa:5d00:ff00::") returned ${ret12}; expected 1.`);
  }
};

const testAbbreviateIPv6 = () => {
  const inputs = [
    {
      input: '2001:550:0:1000:0:0:9a1a:2187',
      expected: '2001:550:0:1000::9a1a:2187'
    },
    {
      input: '2001:4457:0:371a:0:0:0:0',
      expected: '2001:4457:0:371a::'
    },
    {
      input: '2001:550:0:1000:0:0:9a18:3c58',
      expected: '2001:550:0:1000::9a18:3c58'
    },
    {
      input: '0000:0000:0000:0000:0000:0000:0000:0000',
      expected: '::'
    },
    {
      input: '1::',
      expected: '1::'
    },
    {
      input: '2607:fb90:d73c:c01e:79cc:e174:8766:d5d7',
      expected: '2607:fb90:d73c:c01e:79cc:e174:8766:d5d7'
    },
    {
      input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      expected: '2001:db8:85a3::8a2e:370:7334'
    },
    {
      input: '2001:0db8:85a3:0000:0000:8a2e:0370:ffff',
      expected: '2001:db8:85a3::8a2e:370:ffff'
    },
    {
      input: '2001:0db8:85a3:0000:0000:8a2e:ffff:ffff',
      expected: '2001:db8:85a3::8a2e:ffff:ffff'
    },
    {
      input: '2001:0db8:85a3:0000:0000:ffff:ffff:ffff',
      expected: '2001:db8:85a3::ffff:ffff:ffff'
    },
    {
      input: '2001:0db8:85a3:0000:ffff:ffff:ffff:ffff',
      expected: '2001:db8:85a3:0:ffff:ffff:ffff:ffff'
    },
    {
      input: '2001:0db8:85a3:ffff:ffff:ffff:ffff:ffff',
      expected: '2001:db8:85a3:ffff:ffff:ffff:ffff:ffff'
    },
    {
      input: '2001:0db8:ffff:ffff:ffff:ffff:ffff:ffff',
      expected: '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'
    },
    {
      input: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
      expected: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'
    },
    {
      input: '2001:0db8::',
      expected: '2001:db8::'
    },
    {
      input: '2001:0db8:85a3::8a2e:0370:7334',
      expected: '2001:db8:85a3::8a2e:370:7334'
    },
    {
      input: '2001:550:0:1000::9a36:1de0',
      expected: '2001:550:0:1000::9a36:1de0'
    },
    {
      input: '2001:550:0:1000::9a18:2030',
      expected: '2001:550:0:1000::9a18:2030'
    },
    {
      input: 'ab:000d::',
      expected: 'ab:d::'
    },
    {
      input: '2001:0db8:3c4d:0015:0000:0000:1a2f:1a2b',
      expected: '2001:db8:3c4d:15::1a2f:1a2b'
    },
    {
      input: '2001:0db8:3c4d:0015:0000:d234:3eee:0000',
      expected: '2001:db8:3c4d:15:0:d234:3eee:0'
    },
    {
      input: 'ff06:0:0:0:0:0:0:c3',
      expected: 'ff06::c3'
    },
    {
      input: '2001:4860:4860:0:0:0:0:8888',
      expected: '2001:4860:4860::8888'
    },
    {
      input: '::1',
      expected: '::1'
    },
    {
      input: '::712',
      expected: '::712'
    },
    {
      input: '::fff:712',
      expected: '::fff:712'
    },
  ];

  for (const input of inputs) {
    const collapsed = abbreviateIPv6(input.input);
    const failed = collapsed !== input.expected;
    if (failed) {
      console.log(`[FAILED] Input: ${input.input} Collapsed: ${collapsed} != Expected: ${input.expected}`);
      break;
    } else {
      console.log(`[PASSED] Collapsed: ${collapsed} == Expected: ${input.expected}`);
    }
  }
};

function testIsIPv6Strict() {
  const testCases = [
    { input: "2001:0db8:85a3:0000:0000:8a2e:0370:7334", expected: true },
    { input: "2001:0db8:85a3:0000:0000:8a2e:0370:7334:1234", expected: false },
    { input: "2001:0db8:85a3::8a2e:0370:7334", expected: true },
    { input: "2001:0db8:85a3:0000:0000:8a2e:0370:zzzz", expected: false },
    { input: "2001:0db8:85a3:0000:0000:8a2e:0370:7334/64", expected: false },
    { input: "2001:db8::ff00:42:8329", expected: true },
    { input: "2001:db8::ff00:42:8329::", expected: false },
    { input: "2001:db8::ff00:42:8329:1234", expected: true },
    { input: "2001:db8::ff00:42:8329:12345", expected: false },
    { input: "2001:db8::ff00:42:8329:abcd", expected: true },
    { input: "2a10:6e40::1::2", expected: false },
    { input: "2a04:40::e::6", expected: false },
    { input: "2a01:4f8::f0b0::1a03", expected: false },
    { input: "f::", expected: true },
    { input: "::", expected: true },
    { input: "::1", expected: true },
    { input: "::1/128", expected: false },
    { input: "2001:0db8:85a3::8a2e:0370:7334", expected: true },
    { input: "2001:550:0:1000::9A36:1DE0", expected: true },
    { input: "2001:4457:0:371a::", expected: true },
    { input: "2001:550:0:1000::9A1A:2187", expected: true },
    { input: "2001:550:0:1000::9A18:3C58", expected: true },
  ];

  for (const { input, expected } of testCases) {
    const result = isIPv6Strict(input);
    if (result === expected) {
      console.log(`Test passed for input: ${input}`);
    } else {
      console.log(`Test failed for input: ${input}`);
    }
  }
}

const testIPv6CollapseUncollapse = () => {
  const testAddresses = [
    "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    "2001:0db8:85a3:0000:0000:8a2e:0370:ffff",
    "2001:0db8:85a3:0000:0000:8a2e:ffff:ffff",
    "2001:0db8:85a3:0000:0000:ffff:ffff:ffff",
    "2001:0db8:85a3:0000:ffff:ffff:ffff:ffff",
    "2001:0db8:85a3:ffff:ffff:ffff:ffff:ffff",
    "2001:0db8:ffff:ffff:ffff:ffff:ffff:ffff",
    "2001:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "2001:0db8::",
    "2001:0db8:85a3::8a2e:0370:7334",
    "2001:550:0:1000::9A36:1DE0",
    "2001:4457:0:371a::",
    "2001:550:0:1000::9A1A:2187",
    "2001:550:0:1000::9A18:3C58"
  ];

  for (const address of testAddresses) {
    const bigIntValue = IPv6.fromString(address).getValue();
    const collapsed = collapseIPv6OwnFormat(bigIntValue);
    const uncollapsed = uncollapseIPv6OwnFormat(collapsed);
    console.log(`Original: ${address}`);
    console.log(`Collapsed: ${collapsed}`);
    console.log(`Uncollapsed: ${uncollapsed.toString()}`);
    console.log(`Verification: ${uncollapsed.equals(bigIntValue)}`);
    console.log('-----------------------------------');
  }
};

if (require.main === module) {
  testIpUtils();
  testAbbreviateIPv6();
  testIsIPv6Strict();
  testIPv6CollapseUncollapse();
}