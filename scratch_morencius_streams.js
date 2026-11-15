async function checkLinks() {
  const code = 'hkfu8o6gimjm';
  const url = `https://morencius.com/embed/${code}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Referer': 'https://morencius.com/'
    }
  });
  const html = await res.text();
  console.log('Status:', res.status, 'HTML len:', html.length);

  // Unpack Dean Edwards
  const packedRegex =
    /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)\)\)/i;
  const match = html.match(packedRegex);
  if (!match) {
    console.log('No packed match');
    return;
  }

  let payload = match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  const radix = parseInt(match[2], 10);
  let count = parseInt(match[3], 10);
  const symtab = match[4].split('|');

  const encodeBase = (num, base) => {
    if (base <= 36) return num.toString(base);
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let out = '';
    let n = num;
    do {
      out = chars[n % base] + out;
      n = Math.floor(n / base);
    } while (n > 0);
    return out;
  };

  while (count--) {
    if (symtab[count]) {
      const token = encodeBase(count, radix);
      payload = payload.replace(new RegExp(`\\b${token}\\b`, 'g'), symtab[count]);
    }
  }

  // Find var links=...
  const linksMatch = payload.match(/var\s+links\s*=\s*(\{[\s\S]*?\});/);
  console.log('var links:', linksMatch ? linksMatch[1] : 'not found');

  if (linksMatch) {
    try {
      const links = JSON.parse(linksMatch[1]);
      console.log('Parsed links object:', links);

      for (const [key, val] of Object.entries(links)) {
        let streamUrl = val.startsWith('http') ? val : `https://morencius.com${val}`;
        console.log(`\nTesting stream ${key}: ${streamUrl}`);

        // Try HEAD/GET with Referer
        try {
          const sRes = await fetch(streamUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Referer': url
            }
          });
          console.log(`[Referer morencius] Status: ${sRes.status}, Content-Type: ${sRes.headers.get('content-type')}`);
        } catch (e) {
          console.log(`[Referer morencius] Error: ${e.message}`);
        }

        // Try without Referer
        try {
          const sRes2 = await fetch(streamUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            }
          });
          console.log(`[No Referer] Status: ${sRes2.status}, Content-Type: ${sRes2.headers.get('content-type')}`);
        } catch (e) {
          console.log(`[No Referer] Error: ${e.message}`);
        }
      }
    } catch (e) {
      console.log('JSON parse error:', e.message);
    }
  }
}

checkLinks();
