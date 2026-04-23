// country-flags.js — Map a country record ({ name_th, name_en, id }) to
// an ISO-3166-1 alpha-2 code and produce an <img> tag that loads the
// corresponding SVG flag from /assets/flag-icons-main/flags/4x3/<code>.svg.
//
// Used by report-filter-panel-component.js to put a country flag in front
// of each country option in the FilterSearchDropdown list.
//
// Exposes window.CountryFlags.
//   window.CountryFlags.codeFor(country) → 'th' | 'jp' | ... | null
//   window.CountryFlags.iconFor(country, opts) → '<img>...' | ''

(function () {
  'use strict';

  // Map from lowercase English name → ISO alpha-2.
  // Covers every country code that exists under /assets/flag-icons-main/flags/4x3/.
  // Common aliases and Thai-English spelling variants are included so the
  // backend's `name_en` field matches regardless of casing / whitespace /
  // stray punctuation.
  var EN_MAP = {
    'thailand': 'th',
    'japan': 'jp',
    'south korea': 'kr',
    'south korea republic of korea': 'kr',
    'korea': 'kr',
    'korea, republic of': 'kr',
    'republic of korea': 'kr',
    'rok': 'kr',
    'north korea': 'kp',
    'china': 'cn',
    'people s republic of china': 'cn',
    'peoples republic of china': 'cn',
    'prc': 'cn',
    'mainland china': 'cn',
    'hong kong': 'hk',
    'hong kong sar': 'hk',
    'hong kong s a r': 'hk',
    'taiwan': 'tw',
    'republic of china': 'tw',
    'roc': 'tw',
    'taipei': 'tw',
    'macao': 'mo',
    'macau': 'mo',
    'macao sar': 'mo',
    'macau sar': 'mo',
    'singapore': 'sg',
    'malaysia': 'my',
    'brunei': 'bn',
    'brunei darussalam': 'bn',
    'vietnam': 'vn',
    'viet nam': 'vn',
    'indonesia': 'id',
    'philippines': 'ph',
    'laos': 'la',
    'lao': 'la',
    'cambodia': 'kh',
    'myanmar': 'mm',
    'burma': 'mm',
    'india': 'in',
    'sri lanka': 'lk',
    'nepal': 'np',
    'bhutan': 'bt',
    'bangladesh': 'bd',
    'pakistan': 'pk',
    'afghanistan': 'af',
    'maldives': 'mv',
    'mongolia': 'mn',
    'kazakhstan': 'kz',
    'uzbekistan': 'uz',
    'kyrgyzstan': 'kg',
    'tajikistan': 'tj',
    'turkmenistan': 'tm',
    'georgia': 'ge',
    'armenia': 'am',
    'azerbaijan': 'az',
    'united states': 'us',
    'united states of america': 'us',
    'usa': 'us',
    'america': 'us',
    'canada': 'ca',
    'mexico': 'mx',
    'united kingdom': 'gb',
    'great britain': 'gb',
    'britain': 'gb',
    'england': 'gb',
    'uk': 'gb',
    'ireland': 'ie',
    'france': 'fr',
    'germany': 'de',
    'italy': 'it',
    'spain': 'es',
    'portugal': 'pt',
    'netherlands': 'nl',
    'holland': 'nl',
    'belgium': 'be',
    'luxembourg': 'lu',
    'switzerland': 'ch',
    'austria': 'at',
    'denmark': 'dk',
    'sweden': 'se',
    'norway': 'no',
    'finland': 'fi',
    'iceland': 'is',
    'greece': 'gr',
    'hungary': 'hu',
    'czech republic': 'cz',
    'czechia': 'cz',
    'slovakia': 'sk',
    'poland': 'pl',
    'russia': 'ru',
    'russian federation': 'ru',
    'ukraine': 'ua',
    'belarus': 'by',
    'romania': 'ro',
    'bulgaria': 'bg',
    'croatia': 'hr',
    'slovenia': 'si',
    'serbia': 'rs',
    'bosnia and herzegovina': 'ba',
    'albania': 'al',
    'macedonia': 'mk',
    'north macedonia': 'mk',
    'montenegro': 'me',
    'estonia': 'ee',
    'latvia': 'lv',
    'lithuania': 'lt',
    'moldova': 'md',
    'turkey': 'tr',
    'turkiye': 'tr',
    'israel': 'il',
    'palestine': 'ps',
    'jordan': 'jo',
    'lebanon': 'lb',
    'syria': 'sy',
    'iraq': 'iq',
    'iran': 'ir',
    'saudi arabia': 'sa',
    'united arab emirates': 'ae',
    'uae': 'ae',
    'dubai': 'ae',
    'qatar': 'qa',
    'bahrain': 'bh',
    'kuwait': 'kw',
    'oman': 'om',
    'yemen': 'ye',
    'egypt': 'eg',
    'morocco': 'ma',
    'tunisia': 'tn',
    'algeria': 'dz',
    'libya': 'ly',
    'sudan': 'sd',
    'south africa': 'za',
    'kenya': 'ke',
    'tanzania': 'tz',
    'ethiopia': 'et',
    'nigeria': 'ng',
    'ghana': 'gh',
    'senegal': 'sn',
    'australia': 'au',
    'new zealand': 'nz',
    'fiji': 'fj',
    'brazil': 'br',
    'argentina': 'ar',
    'chile': 'cl',
    'colombia': 'co',
    'peru': 'pe',
    'venezuela': 've',
    'ecuador': 'ec',
    'uruguay': 'uy',
    'paraguay': 'py',
    'bolivia': 'bo',
    'cuba': 'cu',
    'dominican republic': 'do',
    'haiti': 'ht',
    'jamaica': 'jm',
    'puerto rico': 'pr',
    'guatemala': 'gt',
    'honduras': 'hn',
    'el salvador': 'sv',
    'nicaragua': 'ni',
    'costa rica': 'cr',
    'panama': 'pa',
    'andorra': 'ad',
    'monaco': 'mc',
    'liechtenstein': 'li',
    'malta': 'mt',
    'cyprus': 'cy'
  };

  // Thai name → ISO alpha-2 for the most common destinations.
  // Back-end may hand us the Thai name when the English name is missing or
  // irregular, so keep a parallel table keyed on name_th.
  var TH_MAP = {
    'ไทย': 'th',
    'ประเทศไทย': 'th',
    'ญี่ปุ่น': 'jp',
    'เกาหลี': 'kr',
    'เกาหลีใต้': 'kr',
    'เกาหลีเหนือ': 'kp',
    'จีน': 'cn',
    'ฮ่องกง': 'hk',
    'ฮ่องกง จีน': 'hk',
    'ไต้หวัน': 'tw',
    'ไทเป': 'tw',
    'มาเก๊า': 'mo',
    'มาคาว': 'mo',
    'สิงคโปร์': 'sg',
    'มาเลเซีย': 'my',
    'บรูไน': 'bn',
    'บรูไนดารุสซาลาม': 'bn',
    'เวียดนาม': 'vn',
    'อินโดนีเซีย': 'id',
    'ฟิลิปปินส์': 'ph',
    'ลาว': 'la',
    'กัมพูชา': 'kh',
    'พม่า': 'mm',
    'เมียนมา': 'mm',
    'เมียนมาร์': 'mm',
    'อินเดีย': 'in',
    'ศรีลังกา': 'lk',
    'เนปาล': 'np',
    'ภูฏาน': 'bt',
    'บังกลาเทศ': 'bd',
    'ปากีสถาน': 'pk',
    'อัฟกานิสถาน': 'af',
    'มัลดีฟส์': 'mv',
    'มองโกเลีย': 'mn',
    'สหรัฐอเมริกา': 'us',
    'อเมริกา': 'us',
    'สหรัฐฯ': 'us',
    'แคนาดา': 'ca',
    'เม็กซิโก': 'mx',
    'อังกฤษ': 'gb',
    'สหราชอาณาจักร': 'gb',
    'ไอร์แลนด์': 'ie',
    'ฝรั่งเศส': 'fr',
    'เยอรมนี': 'de',
    'เยอรมัน': 'de',
    'อิตาลี': 'it',
    'สเปน': 'es',
    'โปรตุเกส': 'pt',
    'เนเธอร์แลนด์': 'nl',
    'ฮอลแลนด์': 'nl',
    'เบลเยียม': 'be',
    'ลักเซมเบิร์ก': 'lu',
    'สวิตเซอร์แลนด์': 'ch',
    'ออสเตรีย': 'at',
    'เดนมาร์ก': 'dk',
    'สวีเดน': 'se',
    'นอร์เวย์': 'no',
    'ฟินแลนด์': 'fi',
    'ไอซ์แลนด์': 'is',
    'กรีซ': 'gr',
    'ฮังการี': 'hu',
    'เช็ก': 'cz',
    'สาธารณรัฐเช็ก': 'cz',
    'สโลวาเกีย': 'sk',
    'โปแลนด์': 'pl',
    'รัสเซีย': 'ru',
    'ยูเครน': 'ua',
    'เบลารุส': 'by',
    'โรมาเนีย': 'ro',
    'บัลแกเรีย': 'bg',
    'โครเอเชีย': 'hr',
    'สโลวีเนีย': 'si',
    'เซอร์เบีย': 'rs',
    'ตุรกี': 'tr',
    'อิสราเอล': 'il',
    'จอร์แดน': 'jo',
    'จอร์เจีย': 'ge',
    'อาร์เมเนีย': 'am',
    'อาเซอร์ไบจาน': 'az',
    'เลบานอน': 'lb',
    'อิรัก': 'iq',
    'อิหร่าน': 'ir',
    'ซาอุดีอาระเบีย': 'sa',
    'ซาอุฯ': 'sa',
    'สหรัฐอาหรับเอมิเรตส์': 'ae',
    'ยูเออี': 'ae',
    'ดูไบ': 'ae',
    'กาตาร์': 'qa',
    'บาห์เรน': 'bh',
    'คูเวต': 'kw',
    'โอมาน': 'om',
    'เยเมน': 'ye',
    'อียิปต์': 'eg',
    'โมร็อกโก': 'ma',
    'ตูนิเซีย': 'tn',
    'แอลจีเรีย': 'dz',
    'ลิเบีย': 'ly',
    'ซูดาน': 'sd',
    'แอฟริกาใต้': 'za',
    'เคนยา': 'ke',
    'แทนซาเนีย': 'tz',
    'เอธิโอเปีย': 'et',
    'ไนจีเรีย': 'ng',
    'กานา': 'gh',
    'ออสเตรเลีย': 'au',
    'นิวซีแลนด์': 'nz',
    'ฟิจิ': 'fj',
    'บราซิล': 'br',
    'อาร์เจนตินา': 'ar',
    'ชิลี': 'cl',
    'โคลอมเบีย': 'co',
    'เปรู': 'pe',
    'เวเนซุเอลา': 've',
    'เอกวาดอร์': 'ec',
    'อุรุกวัย': 'uy',
    'ปารากวัย': 'py',
    'โบลิเวีย': 'bo',
    'คิวบา': 'cu',
    'โดมินิกัน': 'do',
    'เฮติ': 'ht',
    'จาไมกา': 'jm',
    'ปานามา': 'pa',
    'อันดอร์รา': 'ad',
    'โมนาโก': 'mc',
    'ลิกเตนสไตน์': 'li',
    'มอลตา': 'mt',
    'ไซปรัส': 'cy'
  };

  function normalise(s) {
    if (s == null) return '';
    return String(s)
      .trim()
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[.&]/g, ' ')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  function uniquePush(list, value) {
    if (value && list.indexOf(value) === -1) list.push(value);
  }

  function candidateKeys(value, isThai) {
    var raw = String(value || '').trim();
    if (!raw) return [];

    var candidates = [];
    var variants = [
      raw,
      raw.replace(/\s*\([^)]*\)\s*/g, ' '),
      raw.replace(/\s*\[[^\]]*\]\s*/g, ' '),
      raw.replace(/\s*\/.*$/, ' '),
      raw.replace(/\s*,.*$/, ' ')
    ];

    variants.forEach(function (variant) {
      var normalised = normalise(variant);
      uniquePush(candidates, normalised);
      uniquePush(candidates, normalise(variant.replace(/^the\s+/i, '')));
      if (isThai) uniquePush(candidates, normalise(variant.replace(/^ประเทศ\s*/, '')));
      uniquePush(candidates, normalise(variant.replace(/^country of\s+/i, '')));
      uniquePush(candidates, normalise(variant.replace(/^republic of\s+/i, '')));
      uniquePush(candidates, normalise(variant.replace(/^สาธารณรัฐ\s*/, '')));
    });

    return candidates;
  }

  function directCodeFor(country) {
    var direct = country.iso_code || country.iso || country.code || country.country_code || country.alpha2 || country.alpha_2;
    if (typeof direct !== 'string') return null;
    var cleaned = direct.trim();
    if (!/^[A-Za-z]{2,3}$/.test(cleaned)) return null;
    return cleaned.slice(0, 2).toLowerCase();
  }

  function codeFor(country) {
    if (!country) return null;

    // 1. If the backend already hands us a code, trust it.
    var direct = directCodeFor(country);
    if (direct) return direct;

    // 2. Try the English name.
    var enFields = [
      country.name_en,
      country.country_name_en,
      country.country_name,
      country.name
    ];
    for (var i = 0; i < enFields.length; i += 1) {
      var enCandidates = candidateKeys(enFields[i], false);
      for (var j = 0; j < enCandidates.length; j += 1) {
        if (EN_MAP[enCandidates[j]]) return EN_MAP[enCandidates[j]];
      }
    }

    // 3. Try the Thai name (exact first, then without the "ประเทศ" prefix).
    var thFields = [
      country.name_th,
      country.country_name_th,
      country.country_th
    ];
    for (var k = 0; k < thFields.length; k += 1) {
      var thCandidates = candidateKeys(thFields[k], true);
      for (var m = 0; m < thCandidates.length; m += 1) {
        if (TH_MAP[thCandidates[m]]) return TH_MAP[thCandidates[m]];
      }
    }

    return null;
  }

  function iconFor(country, opts) {
    var code = codeFor(country);
    if (!code) return '';
    opts = opts || {};
    var size = opts.size || 18;
    var altText = (country && (country.name_en || country.name_th)) || code;
    return '<img class="country-flag" src="/assets/flag-icons-main/flags/4x3/' +
      code + '.svg" alt="' + escapeHtml(altText) + '" width="' + size +
      '" height="' + Math.round(size * 0.75) + '" loading="lazy" />';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.CountryFlags = {
    codeFor: codeFor,
    iconFor: iconFor
  };

})();
