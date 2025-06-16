const { networkToStartAndEndStr,
  parseIPv6Cidr, isIPv6Inetnum, isIPv4Inetnum,
  isIPv4Cidr, isIPv6Cidr, abbreviateIPv6 } = require('./ip_tools');

if (process.argv[2] === 'inetnumToFilename') {
  console.log('2610:1d8::', inetnumToFilename('2610:1d8::'));
  console.log('2610:1d8::', inetnumToFilename('2610:1d8::'));
} else if (process.argv[2] === 'int') {
  console.log(IPv6ToInt('2605:9CC0::'));
} else if (process.argv[2] === 'numHosts') {
  console.log(numHostsInetnum('2602:fc05:: - 26ab:fc05::'));
  console.log(numHostsInetnum('::ffff:186:7b00 - ::ffff:186:7bff'));
  console.log(numHostsInetnum('2605:9CC0:: - 2605:9CC0:FFFF:FFFF:FFFF:FFFF:FFFF:FFFF'));
} else if (process.argv[2] === 'netSize') {
  console.log(numHostsInNet('2602:fc05:: - 26ab:fc05::'));
  console.log(numHostsInNet('47.91.103.0 - 47.91.103.112'));
  console.log(numHostsInNet('47.91.103.0/22'));
  console.log(numHostsInNet('2800::/12'));
  console.log(numHostsInNet('2800::'));
  console.log(numHostsInNet('2001'));
} else if (process.argv[2] === 'cidr') {
  const { Validator } = require('ip-num/Validator');
  const net = '2001:0806:e000::/30';
  console.log(isIPv4Cidr(net), isIPv4Inetnum(net), isIPv6Cidr(net), isIPv6Inetnum(net))
  console.log(Validator.isValidIPv6CidrRange(net))
  console.log(parseIPv6Cidr(net))
} if (process.argv[2] === 'bignum') {
  let a = bigInt(50534850613279233658783600555197464576n);
  let b = bigInt(50534850613279233677230344628907016191n);
  console.log(a.value > b.value, b.value > a.value);
} else if (process.argv[2] === '6') {
  const ips = [
    "2a02:2450:0000:0000:0000:0000:0000:0000",
    "2a02:2457:ffff:ffff:ffff:ffff:ffff:ffff",
    "2a02:2450:0000:0000:aaaa:0000:0000:0000",
  ];

  for (let ip of ips) {
    console.log(isIPv6(ip))
    console.log(expandIPv6Number(ip))
    console.log(abbreviateIPv6(ip))
  }
} else if (process.argv[2] === 'testIntToIPv6') {
  let bInt = bigInt("281470712745216");
  let ipv6 = IPv6.fromBigInt(bInt.value);
  console.log(ipv6);

  console.log(IntToIPv6("281470712745216"));
  console.log(IntToIPv6("281470712749311"));

  console.log(IntToIPv6("281470713662464"));
  console.log(IntToIPv6("281470713665791"));
} else if (process.argv[2] === 'parseIPv6Inetnum') {
  const samples = [
    '0000:0000:0000:0000:0000:ffff:01f4:0c00-0000:0000:0000:0000:0000:ffff:01f4:1bff',
    '0000:0000:0000:0000:0000:ffff:01fb:0e00-0000:0000:0000:0000:0000:ffff:01fb:12ff',
    '0000:0000:0000:0000:0000:ffff:01fd:0700-0000:0000:0000:0000:0000:ffff:01fd:17ff',
    '0000:0000:0000:0000:0000:ffff:01e6:0e00-0000:0000:0000:0000:0000:ffff:01e6:1bff'
  ];
  for (const sample of samples) {
    console.log(parseIPv6Inetnum(sample));
  }
} else if (process.argv[2] === 'isInNetwork') {
  console.log(isInNetwork('2a02:2450:0000:abcd::', "2a02:2450::/32"));
  console.log(isInNetwork('47.91.103.0', '47.91.103.0 - 47.91.103.112'));
  console.log(isInNetwork('47.91.103.112', '47.91.103.0 - 47.91.103.112'));
} else if (process.argv[2] === 'networkToStartAndEndStr') {
  console.log(networkToStartAndEndStr("2a02:2450::/32"));
  console.log(networkToStartAndEndStr('47.91.103.0 - 47.91.103.112'));
  console.log(networkToStartAndEndStr('2a02:2450:0000:0000:0000:0000:0000:0000 - 2a02:2450:0000:0000:0000:0000:0000:00ff'));
} else if (process.argv[2] === 'isBogon') {
  console.log(isBogon("0.0.0.0"));
  console.log(isBogon('0.255.255.255'));
  console.log(isBogon('240.0.0.0'));
  console.log(isBogon('255.255.255.254'));
  console.log(isBogon('255.255.255.255'));
  console.log(isBogon('198.19.255.255'));
} else if (process.argv[2] === 'getRandomIPs') {
  const ips = getRandomIPs(1000, true);
  fs.writeFileSync(path.join(__dirname, './../activeLookup/dns/ips.json'), JSON.stringify(ips, null, 2));
} else if (process.argv[2] === 'IPv6ToBigint') {
  console.log(IPv6ToBigint("2a02:26f7:f6e9:a762::"));
} else if (process.argv[2] === 'getCidrFromInet6num') {
  console.log(getCidrFromInet6num('2a02:26f7:c904:d782:0000:0000:0000:0000', '2a02:26f7:c904:d782:ffff:ffff:ffff:ffff'));
  console.log(getCidrFromInet6num(55838750778037008809668689094300925952n, 55838750778037008828115433168010477567n, true));
  console.log(getCidrFromInet6num('2804:4310:0:0:0:0:0:0', '2804:4310:ffff:ffff:ffff:ffff:ffff:ffff'));
  console.log(getCidrFromInet6num('2a02:26f7:c904:d782:0000:0000:0000:0000', '2a02:26f7:c904:d782:ffff:ffff:ffff:abcd'));
} else if (process.argv[2] === 'getCidrFromInetnum') {
  console.log(getCidrFromInetnum('192.168.0.0 - 192.168.0.255'));
  console.log(getCidrFromInetnum('10.0.0.0 - 10.0.0.255'));
  console.log(getCidrFromInetnum('172.16.0.0 - 172.16.0.255'));
  console.log(getCidrFromInetnum('192.0.2.0 - 192.0.2.255'));
  console.log(getCidrFromInetnum('198.51.100.0 - 198.51.100.255'));
  console.log(getCidrFromInetnum('203.0.113.0 - 203.0.113.255'));
} else if (process.argv[2] === 'numCanParseToCidrInLocation') {
  (async () => {
    const { loadCsv } = require('./utils');
    const stats = {
      canConvertToCidr: 0,
      cannotConvertToCidr: 0,
      storageUsedWithInet6num: 0,
      storageUsedWithCidr: 0,
    };

    const transformedCsv = path.join(__dirname, './../ipapi_database/geolocation_data/final6.csv');

    await loadCsv(transformedCsv, (row) => {
      if (row[0] === 'ip_version' || row[0] === 'ipVersion') {
        return;
      }
      const cidr = getCidrFromInet6num(row[1], row[2]);
      if (cidr) {
        stats.canConvertToCidr++;
        stats.storageUsedWithCidr += cidr.length;
        // convert to bigInt format
        const startIp = IPv6.fromString(row[1]);
        const startBigInt = startIp.getValue().toString();
        const endIp = IPv6.fromString(row[2]);
        const endBigInt = endIp.getValue().toString();
        stats.storageUsedWithInet6num += startBigInt.length + endBigInt.length;
      } else {
        stats.cannotConvertToCidr++;
      }
    });

    // convert stats values to MB
    stats.storageUsedWithInet6numMB = stats.storageUsedWithInet6num / 1024 / 1024;
    stats.storageUsedWithCidrMB = stats.storageUsedWithCidr / 1024 / 1024;
    console.log(stats);
  })();
} else if (process.argv[2] === "bigIntToIPv6") {
  const input = "42540619366051897000219704565637840896";
  const val = IPv6.fromBigInt(bigInt(input)).toString();
  const collapsed = abbreviateIPv6(val);
  console.log(collapsed, collapsed.length);
  console.log(input, input.length);
} else if (process.argv[2] === "moreEfficientLine6") {
  const fileName = path.join(__dirname, './../ipapi_database_ram/TransformedLut/line6.json');
  const content = fs.readFileSync(fileName, 'utf8');
  const sizeBefore = content.length;
  const data = JSON.parse(content);
  const newData = [];
  for (const item of data) {
    const val = IPv6.fromBigInt(bigInt(item[1])).toString();
    const newFormat = collapseIPv6OwnFormat(val);
    // console.log(collapsed, newFormat);
    newData.push([item[0], newFormat, item[2], item[3]]);
  }
  const contentAfter = JSON.stringify(newData);
  const sizeAfter = contentAfter.length;
  // display in MB
  console.log(sizeBefore / 1024 / 1024, sizeAfter / 1024 / 1024);
} else if (process.argv[2] === 'isValidNetwork') {
  const nets = [
    "1.2.3.4 - 0.0.0.0",
    "192.168.1.0/255.255.255.0",
    "10.0.0.1/33",
    "192.168.1.1, 192.168.1.3, 192.168.1.5",
    "192.168.1.0 - ::1",
    "192.168.1.0/24 - 255.255.255.0",
  ];
  for (const net of nets) {
    console.log(net, isValidNetwork(net));
  }
} else if (process.argv[2] === 'isLastResortOrg') {
  console.log(isLastResortOrg("Internet Assigned Numbers Authority"));
} else if (process.argv[2] === 'collapseIPv6OwnFormat') {
  // 42540488161975842760550356425300246527
  const ip = "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff";
  // convert to bigInt
  const bigIntIp = IPv6.fromString(ip).value;
  console.log(bigIntIp);

  const collapsed = collapseIPv6OwnFormat(340282366920938463463374607431768211455n);
  console.log(collapsed);

  const uncollapsed = uncollapseIPv6OwnFormat(collapsed);
  console.log(uncollapsed);
} else if (process.argv[2] === 'testIPv6CollapseUncollapse') {
  testIPv6CollapseUncollapse();
} else if (process.argv[2] === 'testIsIPv6Strict') {
  testIsIPv6Strict();
} else if (process.argv[2] === 'testAbbreviateIPv6') {
  testAbbreviateIPv6();
} else if (process.argv[2] === 'getAllIPsFromNetwork') {
  console.log(getAllIPsFromNetwork('192.168.1.0 - 192.168.1.255'));
  console.log(getAllIPsFromNetwork('2a02:2450:0000:0000:0000:0000:0000:0000 - 2a02:2450:0000:0000:0000:0000:0000:00ff'));
} else if (process.argv[2] === 'getInetnumAndCidrFromNetwork') {
  console.log(getInetnumAndCidrFromNetwork('192.168.1.0 - 192.168.1.255'));
  console.log(getInetnumAndCidrFromNetwork('2a02:2450:0000:0000:0000:0000:0000:0000 - 2a02:2450:0000:0000:0000:0000:0000:00ff'));
  console.log(getInetnumAndCidrFromNetwork('192.168.1.0/22'));
  console.log(getInetnumAndCidrFromNetwork('2a02:2450::/32'));
}