/*
 * CityPulse Pune — curated starter dataset.
 *
 * IMPORTANT: Place coordinates are approximate and the quality scores (rating, safety,
 * cleanliness, affordability, accessibility), hazard zones and seed reports are ILLUSTRATIVE
 * sample values for the prototype. They are not official statistics. To go live, replace them
 * with verified sources (police/RTO accident data, PMC cleanliness surveys, Google/OSM ratings,
 * citizen-report APIs). Historical blurbs are short summaries of widely documented facts.
 *
 * Score scale: rating 0-5; safety/cleanliness/affordability/accessibility 0-10 (higher = better).
 * priceTier: 1 = budget, 2 = mid-range, 3 = premium.
 */
window.CITYPULSE_DATA = {
  city: { name: 'Pune', state: 'Maharashtra', center: [18.5204, 73.8567], zoom: 12 },

  categories: {
    attraction: { label: 'Attractions', icon: '🎡', color: '#2a9d8f' },
    heritage: { label: 'Heritage', icon: '🏛️', color: '#b5651d' },
    food: { label: 'Food', icon: '🍛', color: '#e76f51' },
    hotel: { label: 'Stays', icon: '🛏️', color: '#5a67d8' }
  },

  places: [
    // ---------- Heritage & culture ----------
    {
      id: 'shaniwar-wada', name: 'Shaniwar Wada', category: 'heritage', area: 'Kasba Peth', lat: 18.5195, lng: 73.8553,
      priceTier: 1, tags: ['outdoor', 'fort', 'history', 'evening'], bestTime: 'Evening, when the grounds are lit',
      blurb: 'Grand fortified palace-complex of the Peshwas, with massive gates and sprawling ruins.',
      history: 'Built in the early 1730s as the seat of the Peshwas, the prime ministers of the Maratha Empire, and associated with Peshwa Bajirao I. Most of the wooden palace was destroyed by a fire in 1828; the stone walls, gates and fountain bases remain.',
      scores: { rating: 4.3, safety: 7.5, cleanliness: 6.5, affordability: 9, accessibility: 7.5 }
    },
    {
      id: 'aga-khan-palace', name: 'Aga Khan Palace', category: 'heritage', area: 'Yerawada', lat: 18.5524, lng: 73.9014,
      priceTier: 1, tags: ['outdoor', 'museum', 'history', 'gardens'], bestTime: 'Morning',
      blurb: 'Elegant Italianate palace turned Gandhi memorial, set in quiet green grounds.',
      history: 'Built in 1892 by Sultan Muhammad Shah Aga Khan III. Mahatma Gandhi, Kasturba Gandhi and Mahadev Desai were held here after the 1942 Quit India movement; Kasturba Gandhi and Mahadev Desai died during the detention, and memorials stand on the grounds.',
      scores: { rating: 4.5, safety: 8.5, cleanliness: 8.5, affordability: 9, accessibility: 7 }
    },
    {
      id: 'pataleshwar', name: 'Pataleshwar Cave Temple', category: 'heritage', area: 'Shivajinagar', lat: 18.5280, lng: 73.8478,
      priceTier: 1, tags: ['indoor', 'temple', 'history', 'rock-cut'], bestTime: 'Morning',
      blurb: 'Serene monolithic rock-cut Shiva temple tucked into the middle of a busy road.',
      history: 'A rock-cut cave temple carved from a single basalt mass, dated to roughly the 8th century. It sits below street level on Jangali Maharaj Road and is still a place of worship.',
      scores: { rating: 4.2, safety: 8, cleanliness: 7.5, affordability: 10, accessibility: 8 }
    },
    {
      id: 'sinhagad', name: 'Sinhagad Fort', category: 'heritage', area: 'Sinhagad Road (outskirts)', lat: 18.3663, lng: 73.7557,
      priceTier: 1, tags: ['outdoor', 'hill', 'fort', 'trek', 'sunrise'], bestTime: 'Sunrise, weekdays',
      blurb: 'Hill fort with sweeping Sahyadri views, popular for dawn treks and kanda bhaji.',
      history: 'Earlier known as Kondhana, the fort is remembered for the 1670 battle in which Tanaji Malusare, a general of Chhatrapati Shivaji Maharaj, died while recapturing it. It stands about 1,300 m above sea level.',
      scores: { rating: 4.4, safety: 6.5, cleanliness: 5.5, affordability: 9, accessibility: 4.5 }
    },
    {
      id: 'lal-mahal', name: 'Lal Mahal', category: 'heritage', area: 'Kasba Peth', lat: 18.5190, lng: 73.8550,
      priceTier: 1, tags: ['indoor', 'museum', 'history'], bestTime: 'Daytime',
      blurb: 'Reconstructed palace linked to the childhood of Shivaji Maharaj, beside Shaniwar Wada.',
      history: 'The original Lal Mahal was built around 1630 by Shahaji Bhosale for his young son Shivaji and Jijabai. It is also tied to the 1663 night attack on Shaista Khan. The present building is a later reconstruction.',
      scores: { rating: 4.0, safety: 7.5, cleanliness: 7, affordability: 10, accessibility: 8 }
    },
    {
      id: 'vishrambaug-wada', name: 'Vishrambaug Wada', category: 'heritage', area: 'Sadashiv Peth', lat: 18.5148, lng: 73.8556,
      priceTier: 1, tags: ['outdoor', 'architecture', 'history', 'photography'], bestTime: 'Morning light',
      blurb: 'Carved teak facade of a Peshwa-era mansion, a showcase of Maratha wada architecture.',
      history: 'An early 19th-century Peshwa-era mansion associated with Peshwa Bajirao II, noted for its intricate wooden carvings and arches. It is a good example of the traditional Pune wada.',
      scores: { rating: 4.0, safety: 7.5, cleanliness: 6.5, affordability: 10, accessibility: 7.5 }
    },
    {
      id: 'kelkar-museum', name: 'Raja Dinkar Kelkar Museum', category: 'heritage', area: 'Shukrawar Peth', lat: 18.5106, lng: 73.8545,
      priceTier: 1, tags: ['indoor', 'museum', 'culture', 'rain-friendly'], bestTime: 'Any time — ideal on rainy days',
      blurb: 'Quirky museum of everyday Indian objects: lamps, musical instruments, textiles and carved doors.',
      history: 'Built around the private collection of Dr. Dinkar Gangadhar Kelkar, who named it in memory of his son Raja, and later handed it over for public display. Its galleries preserve folk art and daily-life artefacts from across India.',
      scores: { rating: 4.5, safety: 8, cleanliness: 8.5, affordability: 8.5, accessibility: 7.5 }
    },
    {
      id: 'dagdusheth', name: 'Dagdusheth Halwai Ganpati Temple', category: 'heritage', area: 'Budhwar Peth', lat: 18.5163, lng: 73.8561,
      priceTier: 1, tags: ['indoor', 'temple', 'tradition', 'festival'], bestTime: 'Early morning; Ganeshotsav is very crowded',
      blurb: 'Pune’s most iconic Ganesh temple and the heart of its famous Ganeshotsav celebrations.',
      history: 'Associated with a sweet-maker family and with the public Ganeshotsav tradition that took shape in Pune in the late 19th century. The temple is a focal point of the city’s ten-day festival processions.',
      scores: { rating: 4.7, safety: 7, cleanliness: 7.5, affordability: 10, accessibility: 7 }
    },
    {
      id: 'parvati-hill', name: 'Parvati Hill Temples', category: 'heritage', area: 'Parvati', lat: 18.4880, lng: 73.8420,
      priceTier: 1, tags: ['outdoor', 'hill', 'temple', 'sunrise', 'views'], bestTime: 'Sunrise or sunset',
      blurb: 'Peshwa-era temple complex on a hill, a climb of steps rewarded with a city panorama.',
      history: 'A group of temples on Parvati hill dating to the Peshwa period, with a small museum of Peshwa-era artefacts. The steep stair-climb is a morning fitness ritual for many locals.',
      scores: { rating: 4.3, safety: 7, cleanliness: 6.5, affordability: 10, accessibility: 5 }
    },

    // ---------- Attractions ----------
    {
      id: 'sarasbaug', name: 'Saras Baug', category: 'attraction', area: 'Sadashiv Peth', lat: 18.5008, lng: 73.8532,
      priceTier: 1, tags: ['outdoor', 'park', 'family', 'temple'], bestTime: 'Evening',
      blurb: 'Lake-garden with a small Ganesh temple on an island, great for evening walks.',
      history: 'A Peshwa-era lake garden developed in the 18th century, now one of the city’s best-loved urban parks.',
      scores: { rating: 4.4, safety: 7.5, cleanliness: 7, affordability: 10, accessibility: 8 }
    },
    {
      id: 'empress-garden', name: 'Empress Garden', category: 'attraction', area: 'Camp', lat: 18.5033, lng: 73.8827,
      priceTier: 1, tags: ['outdoor', 'park', 'family', 'gardens'], bestTime: 'Morning',
      blurb: 'Large botanical garden with old trees, lawns and seasonal flower shows.',
      history: 'A colonial-era botanical garden in Pune Camp, laid out in the 19th century.',
      scores: { rating: 4.2, safety: 8, cleanliness: 7.5, affordability: 9, accessibility: 7 }
    },
    {
      id: 'bund-garden', name: 'Bund Garden (Mula–Mutha riverfront)', category: 'attraction', area: 'Bund Garden', lat: 18.5330, lng: 73.8812,
      priceTier: 1, tags: ['outdoor', 'river', 'jogging', 'sunset'], bestTime: 'Sunset (avoid after dark)',
      blurb: 'Riverside promenade by the Mula–Mutha, popular for jogging and boating.',
      history: 'Named for the old weir (bund) built across the river in the 19th century to supply water to the cantonment.',
      scores: { rating: 4.0, safety: 6.5, cleanliness: 6, affordability: 9.5, accessibility: 8.5 }
    },
    {
      id: 'okayama-garden', name: 'Pu La Deshpande Udyan (Okayama Garden)', category: 'attraction', area: 'Sinhagad Road', lat: 18.4790, lng: 73.8300,
      priceTier: 1, tags: ['outdoor', 'park', 'japanese-garden', 'family'], bestTime: 'Evening',
      blurb: 'Japanese-style garden with ponds, bridges and walking paths — a Pune–Okayama friendship project.',
      history: 'A Japanese-style garden created through the sister-city relationship between Pune and Okayama, named after the Marathi writer P. L. Deshpande.',
      scores: { rating: 4.3, safety: 8, cleanliness: 8, affordability: 8.5, accessibility: 7 }
    },
    {
      id: 'tulsi-baug', name: 'Tulshibaug Market', category: 'attraction', area: 'Budhwar Peth', lat: 18.5130, lng: 73.8553,
      priceTier: 1, tags: ['outdoor', 'shopping', 'market', 'culture'], bestTime: 'Late afternoon',
      blurb: 'Bustling traditional market for brass, kitchenware, bangles and festival goods.',
      history: 'A long-standing old-city bazaar next to the Ram temple, known for household goods and festival shopping.',
      scores: { rating: 4.1, safety: 6, cleanliness: 5, affordability: 9, accessibility: 5.5 }
    },
    {
      id: 'spp-university', name: 'Savitribai Phule Pune University (Main Building)', category: 'attraction', area: 'Ganeshkhind', lat: 18.5524, lng: 73.8260,
      priceTier: 1, tags: ['outdoor', 'architecture', 'campus', 'photography'], bestTime: 'Morning',
      blurb: 'Stately colonial-era main building and leafy campus, a favourite for photography and walks.',
      history: 'The main building began life as a 19th-century Governor’s residence and is now the centrepiece of the university campus.',
      scores: { rating: 4.4, safety: 8.5, cleanliness: 8.5, affordability: 10, accessibility: 6.5 }
    },

    // ---------- Food ----------
    {
      id: 'vaishali', name: 'Vaishali (FC Road)', category: 'food', area: 'Deccan / FC Road', lat: 18.5233, lng: 73.8412,
      priceTier: 1, tags: ['indoor', 'south-indian', 'vegetarian', 'iconic'], bestTime: 'Breakfast; expect a queue at weekends',
      blurb: 'Legendary FC Road eatery for dosas, misal and filter coffee, loved by students.',
      history: 'A Pune institution since the 1950s, central to the FC Road student hangout culture.',
      scores: { rating: 4.3, safety: 8.5, cleanliness: 8, affordability: 8.5, accessibility: 8.5 }
    },
    {
      id: 'cafe-goodluck', name: 'Café Goodluck', category: 'food', area: 'Deccan Gymkhana', lat: 18.5170, lng: 73.8420,
      priceTier: 1, tags: ['indoor', 'irani-cafe', 'iconic', 'breakfast'], bestTime: 'Morning for bun maska and chai',
      blurb: 'Classic Irani café famed for bun maska, keema pav and cutting chai.',
      history: 'One of Pune’s old Irani cafés, dating back to the 1930s, a reminder of the city’s Irani and Parsi food heritage.',
      scores: { rating: 4.2, safety: 8.5, cleanliness: 7.5, affordability: 8.5, accessibility: 8.5 }
    },
    {
      id: 'kayani-bakery', name: 'Kayani Bakery', category: 'food', area: 'Camp', lat: 18.5155, lng: 73.8776,
      priceTier: 1, tags: ['indoor', 'bakery', 'parsi', 'iconic'], bestTime: 'Morning, before items sell out',
      blurb: 'Parsi bakery known for Shrewsbury biscuits and mawa cakes; closes for a mid-day break.',
      history: 'A Parsi bakery in the Camp area, long associated with Pune’s Irani–Parsi food culture.',
      scores: { rating: 4.4, safety: 8, cleanliness: 7.5, affordability: 8, accessibility: 7.5 }
    },
    {
      id: 'bedekar-misal', name: 'Bedekar Misal', category: 'food', area: 'Narayan Peth', lat: 18.5156, lng: 73.8506,
      priceTier: 1, tags: ['indoor', 'misal', 'vegetarian', 'local'], bestTime: 'Breakfast',
      blurb: 'Old-city favourite for spicy Puneri misal-pav.',
      history: 'Misal is a Maharashtrian sprouted-bean curry; the Puneri style is known for its heat and its crunchy farsan topping.',
      scores: { rating: 4.2, safety: 7.5, cleanliness: 7, affordability: 9, accessibility: 7 }
    },
    {
      id: 'chitale-bandhu', name: 'Chitale Bandhu Mithaiwale', category: 'food', area: 'Bajirao Road', lat: 18.5160, lng: 73.8530,
      priceTier: 2, tags: ['indoor', 'sweets', 'snacks', 'gifting'], bestTime: 'Any time',
      blurb: 'The go-to sweet shop for bakarwadi, shrikhand and Maharashtrian snacks to take home.',
      history: 'A well-known Pune sweets-and-snacks brand famed for bakarwadi, now a staple gift from the city.',
      scores: { rating: 4.5, safety: 8.5, cleanliness: 8.5, affordability: 7, accessibility: 8 }
    },
    {
      id: 'sujata-mastani', name: 'Sujata Mastani', category: 'food', area: 'Sadashiv Peth', lat: 18.5114, lng: 73.8500,
      priceTier: 1, tags: ['indoor', 'dessert', 'iconic'], bestTime: 'Afternoon or after dinner',
      blurb: 'Home of the thick mango-and-ice-cream "mastani" — Pune’s signature dessert drink.',
      history: 'Mastani is a Pune original: a thick milkshake-style dessert topped with ice cream and dry fruits.',
      scores: { rating: 4.3, safety: 8, cleanliness: 7.5, affordability: 8, accessibility: 7.5 }
    },

    // ---------- Stays (area clusters; replace with named listings from a booking API) ----------
    {
      id: 'stay-station', name: 'Budget lodges near Pune Station', category: 'hotel', area: 'Pune Railway Station', lat: 18.5290, lng: 73.8742,
      priceTier: 1, tags: ['budget', 'transport-hub', 'late-arrival'], bestTime: 'Great for early trains; choose well-reviewed lodges',
      blurb: 'Cluster of budget lodges and dormitories with rail, bus and metro access. Check reviews and lighting before booking.',
      history: '', scores: { rating: 3.6, safety: 5.5, cleanliness: 5.5, affordability: 9.5, accessibility: 9.5 }
    },
    {
      id: 'stay-deccan', name: 'Mid-range stays around Deccan & FC Road', category: 'hotel', area: 'Deccan', lat: 18.5167, lng: 73.8409,
      priceTier: 2, tags: ['mid-range', 'food-nearby', 'central'], bestTime: 'Walkable to cafés, museums and the old city',
      blurb: 'Central, walkable cluster with food, bookshops and quick access to the old city.',
      history: '', scores: { rating: 4.1, safety: 8, cleanliness: 7.5, affordability: 7, accessibility: 8.5 }
    },
    {
      id: 'stay-koregaon', name: 'Boutique hotels & hostels in Koregaon Park', category: 'hotel', area: 'Koregaon Park', lat: 18.5362, lng: 73.8940,
      priceTier: 3, tags: ['boutique', 'nightlife', 'cafes', 'premium'], bestTime: 'Good base for cafés and nightlife',
      blurb: 'Leafy, upmarket area with boutique stays, cafés and nightlife; pricier but pleasant to walk.',
      history: '', scores: { rating: 4.4, safety: 8.5, cleanliness: 8.5, affordability: 4.5, accessibility: 8 }
    },
    {
      id: 'stay-camp', name: 'Heritage-style hotels in Camp', category: 'hotel', area: 'Camp', lat: 18.5140, lng: 73.8790,
      priceTier: 2, tags: ['heritage', 'colonial', 'shopping'], bestTime: 'Pair with Camp bakeries and MG Road shopping',
      blurb: 'Colonial-era Camp district with older hotels, bakeries and shopping streets.',
      history: '', scores: { rating: 4.0, safety: 7.5, cleanliness: 7.5, affordability: 6.5, accessibility: 8 }
    },
    {
      id: 'stay-hinjewadi', name: 'Business hotels in Hinjewadi', category: 'hotel', area: 'Hinjewadi', lat: 18.5912, lng: 73.7389,
      priceTier: 2, tags: ['business', 'it-park', 'far-from-centre'], bestTime: 'Convenient for IT-park visits; far from sights',
      blurb: 'Modern business hotels near the IT park. Convenient for work, but a long, congested ride to the old city.',
      history: '', scores: { rating: 4.0, safety: 7.5, cleanliness: 8, affordability: 6, accessibility: 5 }
    }
  ],

  /*
   * Hazard zones (illustrative). type: accident | traffic | unsafe | flood.
   * severity 1-5. radius in metres. nightOnly zones are weighted up after dark.
   */
  hazards: [
    { id: 'hz-navale', name: 'Navale Bridge – Katraj bypass stretch', type: 'accident', lat: 18.4605, lng: 73.8120, radius: 900, severity: 5,
      note: 'Long downhill highway stretch with heavy trucks; high-speed collisions reported. Slow down and keep a safe gap.' },
    { id: 'hz-chandni', name: 'Chandni Chowk junction', type: 'traffic', lat: 18.5085, lng: 73.7860, radius: 650, severity: 3,
      note: 'Major bottleneck on the Mumbai–Bengaluru highway at peak hours.' },
    { id: 'hz-swargate', name: 'Swargate junction', type: 'traffic', lat: 18.5018, lng: 73.8636, radius: 550, severity: 3,
      note: 'Busy bus/metro interchange with heavy mixed traffic and pedestrian crossings.' },
    { id: 'hz-katraj', name: 'Katraj chowk', type: 'accident', lat: 18.4530, lng: 73.8670, radius: 550, severity: 3,
      note: 'Steep, congested junction; take care with two-wheelers.' },
    { id: 'hz-hinjewadi', name: 'Hinjewadi Phase 1 entry', type: 'traffic', lat: 18.5912, lng: 73.7389, radius: 700, severity: 3,
      note: 'Severe office-hour queues; avoid 8:30–10:30 am and 5:30–8:30 pm.' },
    { id: 'hz-hadapsar', name: 'Solapur Road – Hadapsar', type: 'traffic', lat: 18.5089, lng: 73.9259, radius: 650, severity: 3,
      note: 'Heavy truck and commuter mix on the Solapur highway.' },
    { id: 'hz-station-night', name: 'Pune Station surroundings (night)', type: 'unsafe', lat: 18.5290, lng: 73.8742, radius: 500, severity: 3, nightOnly: true,
      note: 'Pickpocketing and touts reported late at night; stay in lit, busy areas and use prepaid transport.' },
    { id: 'hz-riverbank-night', name: 'Isolated riverside stretches (night)', type: 'unsafe', lat: 18.5240, lng: 73.8620, radius: 450, severity: 3, nightOnly: true,
      note: 'Poorly lit, quiet river paths after dark; prefer main roads.' },
    { id: 'hz-karve-underpass', name: 'Karve Road underpass (monsoon)', type: 'flood', lat: 18.5075, lng: 73.8290, radius: 400, severity: 3,
      note: 'Prone to waterlogging in heavy rain; avoid during downpours.' }
  ],

  // Sample citizen reports shown on first load (marked as sample in the UI).
  // ts offsets are minutes before "now" so the demo always looks fresh.
  seedReports: [
    { id: 'seed-1', text: 'Slow traffic and signal not working at Swargate, long jam towards Katraj.', lat: 18.5025, lng: 73.8640, minutesAgo: 35, confirms: 3, disputes: 0, hasPhoto: false, hasVoice: false, gps: true, sample: true },
    { id: 'seed-2', text: 'Big pothole near Sarasbaug gate, two-wheelers skidding. Please be careful.', lat: 18.5012, lng: 73.8540, minutesAgo: 190, confirms: 2, disputes: 0, hasPhoto: true, hasVoice: false, gps: true, sample: true },
    { id: 'seed-3', text: 'Garbage dump overflowing near Tulshibaug, bad smell all around.', lat: 18.5128, lng: 73.8560, minutesAgo: 420, confirms: 1, disputes: 0, hasPhoto: true, hasVoice: false, gps: true, sample: true },
    { id: 'seed-4', text: 'Streetlights not working along the riverside path, very dark and unsafe at night.', lat: 18.5238, lng: 73.8615, minutesAgo: 900, confirms: 4, disputes: 0, hasPhoto: false, hasVoice: false, gps: true, sample: true },
    { id: 'seed-5', text: 'Beautiful, well maintained garden and very friendly staff at Okayama garden.', lat: 18.4792, lng: 73.8302, minutesAgo: 120, confirms: 1, disputes: 0, hasPhoto: true, hasVoice: false, gps: true, sample: true }
  ]
};
