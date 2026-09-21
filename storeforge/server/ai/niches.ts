import type { Theme } from '#shared/types'

/**
 * Niche kits for the offline planner.
 *
 * These are not a substitute for the model — they exist so that a fresh clone
 * with no API key still produces a real, differentiated store instead of an
 * empty shell or a wall of lorem ipsum.
 */

export interface NicheKit {
  id: string
  keywords: string[]
  nameParts: [string, string]
  tagline: string
  announcement: string
  about: string
  theme: Pick<Theme, 'palette' | 'fonts' | 'radius' | 'density' | 'buttonStyle'>
  valueProps: Array<{ icon: string, title: string, body: string }>
  testimonials: Array<{ quote: string, author: string, role: string }>
  faq: Array<{ question: string, answer: string }>
  products: Array<{
    title: string
    description: string
    price: number
    compareAt?: number
    collection?: string
    variants?: string[]
  }>
}

const KITS: NicheKit[] = [
  {
    id: 'coffee',
    keywords: ['coffee', 'espresso', 'roaster', 'roastery', 'cold brew', 'cafe', 'bean'],
    nameParts: ['Northbound', 'Coffee Roasters'],
    tagline: 'Small-lot beans, roasted the morning they ship.',
    announcement: 'Free shipping on orders over $75 · Roasted Mondays & Thursdays',
    about: 'We started in a converted garage with a 3kg drum roaster and a stubborn belief that most coffee is roasted too dark and shipped too late. Today we work directly with eleven producers across Ethiopia, Colombia and Guatemala, paying well above commodity price and publishing every contract. Everything is roasted to order and leaves the building within 24 hours.',
    theme: {
      palette: {
        primary: '#3f2d20', onPrimary: '#faf6f0', background: '#faf6f0', surface: '#f2e9dd',
        text: '#2a1f17', muted: '#7a6a5c', border: '#e0d3c2', accent: '#b5651d',
      },
      fonts: { heading: '"Iowan Old Style", Georgia, serif', body: 'system-ui, -apple-system, sans-serif' },
      radius: 'sm', density: 'comfortable', buttonStyle: 'solid',
    },
    valueProps: [
      { icon: '🔥', title: 'Roasted to order', body: 'Your bag is roasted the morning it ships. Nothing sits in a warehouse losing its aromatics.' },
      { icon: '🤝', title: 'Direct trade, published', body: 'Every contract price is on our producer page. We pay an average of 2.4x the C-market rate.' },
      { icon: '📦', title: 'Compostable packaging', body: 'Kraft-lined bags with a one-way valve that break down in a home compost bin in 90 days.' },
    ],
    testimonials: [
      { quote: 'I switched from a subscription that shipped monthly and the difference in the first cup was embarrassing. Freshness really is the whole thing.', author: 'Dana R.', role: 'Subscriber since 2021' },
      { quote: 'The Guatemalan washed lot is the only coffee my wife and I agree on, which after eleven years is a genuine achievement.', author: 'Marcus T.', role: 'Portland, OR' },
      { quote: 'Ordered Thursday, roasted Friday, on my counter Saturday. I have never had coffee this fresh that I did not roast myself.', author: 'Priya N.', role: 'Home barista' },
    ],
    faq: [
      { question: 'When do you roast?', answer: 'Mondays and Thursdays. Orders placed before 9am on a roast day go out that afternoon; anything later catches the next roast.' },
      { question: 'Whole bean or ground?', answer: 'Whole bean by default. Choose a grind at checkout and we will dial it for your brew method.' },
      { question: 'How long will it stay fresh?', answer: 'Peak flavour is days 4 through 21 after roast. The roast date is stamped on every bag, not a best-before guess.' },
    ],
    products: [
      { title: 'Yirgacheffe Washed', description: 'A bright, tea-like Ethiopian lot from the Idido washing station at 1,950m. Bergamot and white peach up front, with a clean jasmine finish that lingers. Our most-ordered bag three years running.', price: 21, collection: 'Single Origin', variants: ['Whole bean', 'Filter grind', 'Espresso grind'] },
      { title: 'Huila Sugarcane Decaf', description: 'Decaffeinated with sugarcane-derived ethyl acetate rather than solvents, which leaves the body intact. Milk chocolate, baked apple, and enough sweetness that nobody at the table guesses it is decaf.', price: 19, collection: 'Single Origin', variants: ['Whole bean', 'Filter grind'] },
      { title: 'Foundry Espresso Blend', description: 'Our house blend: 70% Brazilian natural for body, 30% Colombian washed for lift. Pulls forgiving shots at 1:2 in 28 seconds and holds up against oat milk without turning to cardboard.', price: 18, collection: 'Blends', variants: ['Whole bean', 'Espresso grind'] },
      { title: 'Antigua Reserve', description: 'A volcanic-soil lot from a single family farm outside Antigua, grown in the shade of avocado trees. Dense and cocoa-forward with a dried cherry acidity that shows up as it cools.', price: 24, compareAt: 28, collection: 'Single Origin' },
      { title: 'Cold Brew Coarse Grind', description: 'A Brazil-Sumatra blend ground specifically for immersion. Steep 1:8 for 16 hours and you get a concentrate that is smooth at room temperature and does not need sugar to be drinkable.', price: 17, collection: 'Blends' },
      { title: 'Three-Month Rotating Subscription', description: 'A different single origin every two weeks, chosen from whatever is peaking on the cupping table. Pause or skip any shipment from your account. Works out roughly 15% below single-bag pricing.', price: 96, collection: 'Subscriptions' },
      { title: 'Stainless Pour-Over Dripper', description: 'A laser-cut cone that needs no paper filter, so the coffee oils stay in the cup for a heavier body. Fits any mug or carafe between 70 and 95mm, and it survives the dishwasher.', price: 42, collection: 'Equipment' },
      { title: 'Roast Date Travel Tin', description: 'A 250g airtight tin with a CO2 valve and a dial on the lid to mark the roast date. Keeps a opened bag drinkable for about twice as long as the bag alone.', price: 26, collection: 'Equipment' },
    ],
  },
  {
    id: 'skincare',
    keywords: ['skincare', 'skin care', 'beauty', 'serum', 'cosmetic', 'moisturizer', 'facial', 'cream'],
    nameParts: ['Meridian', 'Skin'],
    tagline: 'Short ingredient lists. Published concentrations. No mystery.',
    announcement: 'Free samples with every order · 60-day money back guarantee',
    about: 'Meridian exists because reading a skincare label should not require a chemistry degree. We publish the exact concentration of every active in every formula, cap our ingredient lists at twelve items, and refuse to sell anything we would not put on our own faces. Formulated and filled in small batches in Portland.',
    theme: {
      palette: {
        primary: '#2f3e36', onPrimary: '#f4f7f2', background: '#fbfaf7', surface: '#eef2ec',
        text: '#22281f', muted: '#76806f', border: '#dde3d8', accent: '#8a9a7b',
      },
      fonts: { heading: '"Optima", "Gill Sans", system-ui, sans-serif', body: 'system-ui, -apple-system, sans-serif' },
      radius: 'lg', density: 'airy', buttonStyle: 'pill',
    },
    valueProps: [
      { icon: '🧪', title: 'Concentrations on the label', body: 'Not "contains niacinamide" — 4% niacinamide, printed on the carton and the bottle.' },
      { icon: '🌿', title: 'Twelve ingredients or fewer', body: 'Every formula is capped. If something is not doing work, it does not make the list.' },
      { icon: '↩️', title: '60 days to change your mind', body: 'Skin takes a full cycle to respond. Return an opened bottle for a full refund inside 60 days.' },
    ],
    testimonials: [
      { quote: 'The only brand that told me what percentage of anything was in the bottle. That alone got my money, and then the barrier serum actually worked.', author: 'Alex W.', role: 'Combination skin' },
      { quote: 'My dermatologist read the ingredient list, shrugged, and said "this is fine, keep using it". Highest praise available.', author: 'Nour H.', role: 'Rosacea-prone' },
      { quote: 'Four products replaced eleven. My shelf is cleaner and so is my face.', author: 'Jordan K.', role: 'Customer since 2022' },
    ],
    faq: [
      { question: 'Can I use the retinal and the acid together?', answer: 'Not on the same night. Alternate them — acid on Monday and Thursday, retinal on Tuesday and Friday, barrier cream every night regardless.' },
      { question: 'Are these formulas fragrance-free?', answer: 'Every product is free of added fragrance and essential oils. A few have a faint natural scent from the actives themselves.' },
      { question: 'Do you test on animals?', answer: 'No, and we do not sell into markets that require animal testing as a condition of import.' },
    ],
    products: [
      { title: 'Barrier Repair Cream', description: 'A ceramide-and-cholesterol cream at the 3:1:1 ratio dermatology literature keeps landing on. Thick enough to work as an overnight mask, light enough to wear under sunscreen. Fragrance-free and non-comedogenic.', price: 38, collection: 'Moisturize', variants: ['50ml', '100ml'] },
      { title: '4% Niacinamide Serum', description: 'Four percent, not ten — the concentration where sebum regulation happens without the flushing that higher doses cause in sensitive skin. Pairs with zinc PCA to keep congestion down.', price: 29, collection: 'Treat' },
      { title: '0.1% Retinaldehyde Night Oil', description: 'Retinal converts to retinoic acid in one step instead of two, so it works faster than retinol at lower irritation. Suspended in squalane to buffer the first two weeks. Start twice a week.', price: 52, collection: 'Treat', variants: ['30ml'] },
      { title: 'Mineral SPF 40', description: 'Non-nano zinc oxide in a silicone-free base that genuinely does not leave a grey cast on medium and deep skin tones. Reapplication over makeup is survivable, which is rare for a mineral filter.', price: 34, collection: 'Protect' },
      { title: 'Gentle Amino Cleanser', description: 'A low-foam gel at pH 5.5 that removes sunscreen without stripping. No sulfates, no drying alcohols, and no squeaky-clean feeling — that feeling is your barrier complaining.', price: 24, collection: 'Cleanse', variants: ['150ml', '300ml'] },
      { title: '8% Mandelic Acid Toner', description: 'A larger-molecule AHA that penetrates more slowly than glycolic, which makes it the right first acid for reactive skin. Two nights a week is plenty for most people.', price: 27, collection: 'Treat' },
      { title: 'The Starter Four', description: 'Cleanser, niacinamide, barrier cream and SPF in full sizes, at roughly 20% below buying them separately. This is the whole routine we actually recommend to people starting over.', price: 108, compareAt: 125, collection: 'Sets' },
      { title: 'Squalane Cleansing Balm', description: 'Sugarcane-derived squalane that melts sunscreen and long-wear makeup, then emulsifies cleanly under water. No mineral oil, no residue, no stinging if it reaches your eyes.', price: 31, collection: 'Cleanse' },
    ],
  },
  {
    id: 'plants',
    keywords: ['plant', 'plants', 'garden', 'nursery', 'botanic', 'succulent', 'houseplant', 'seed'],
    nameParts: ['Fernlight', 'Botanical'],
    tagline: 'Plants chosen for the light you actually have.',
    announcement: 'Live arrival guaranteed · Ships Monday–Wednesday only',
    about: 'Most houseplants die because they were sold to the wrong window, not because their owner has a black thumb. We sort our whole catalogue by real light conditions — north-facing, filtered, bright indirect — and we will talk you out of a fiddle-leaf fig if your apartment cannot support one. Grown in our own greenhouses in Sonoma County.',
    theme: {
      palette: {
        primary: '#2d4739', onPrimary: '#f2f7f1', background: '#f7faf5', surface: '#e8f0e3',
        text: '#1f2e26', muted: '#6f8074', border: '#d4e0cd', accent: '#7fa650',
      },
      fonts: { heading: '"Palatino Linotype", Palatino, Georgia, serif', body: 'system-ui, -apple-system, sans-serif' },
      radius: 'lg', density: 'comfortable', buttonStyle: 'pill',
    },
    valueProps: [
      { icon: '🪟', title: 'Sorted by your window', body: 'Filter the catalogue by the light you have, not the light a plant would prefer in an ideal world.' },
      { icon: '📦', title: 'Live arrival guaranteed', body: 'Heat packs in winter, insulated liners in summer. If it arrives unhappy, we replace it free.' },
      { icon: '💬', title: 'A human answers', body: 'Send a photo of a struggling plant and a grower — not a chatbot — will tell you what is wrong.' },
    ],
    testimonials: [
      { quote: 'They talked me out of the plant I wanted and into one that would survive my north-facing kitchen. Two years later it is enormous.', author: 'Sam O.', role: 'Chicago, IL' },
      { quote: 'Arrived in February, in a blizzard, with a heat pack, completely fine. I do not know how.', author: 'Lena F.', role: 'Minneapolis, MN' },
      { quote: 'I sent a photo of some yellowing leaves and got a real diagnosis within a day. It was overwatering. It is always overwatering.', author: 'Chris D.', role: 'Repeat customer' },
    ],
    faq: [
      { question: 'What if my plant arrives damaged?', answer: 'Send a photo within 48 hours of delivery and we ship a replacement at no cost. No return needed — nurse the original back if you can.' },
      { question: 'Do you ship in winter?', answer: 'Yes, with a 72-hour heat pack included automatically whenever the forecast low along the route drops below 4°C.' },
      { question: 'Are these pet safe?', answer: 'Every listing carries a pet-safety flag. You can filter the whole catalogue to cat- and dog-safe species.' },
    ],
    products: [
      { title: 'Heartleaf Philodendron', description: 'The plant we recommend when someone says they have killed everything. Tolerates low light, forgives a missed watering, and trails to two metres within a couple of years. Pet-safe.', price: 28, collection: 'Low Light', variants: ['4" pot', '6" pot', '8" hanging basket'] },
      { title: 'Bird\'s Nest Fern', description: 'A fern that does not demand a terrarium. Those rippled fronds unfurl from a central rosette and handle ordinary household humidity, which almost no other fern will do.', price: 34, collection: 'Low Light', variants: ['4" pot', '6" pot'] },
      { title: 'Variegated Monstera Albo', description: 'A rooted cutting with two established nodes and stable white variegation on at least one leaf. Grown from our own mother plant, not imported. Bright indirect light, and expect slow growth.', price: 185, compareAt: 240, collection: 'Rare' },
      { title: 'Snake Plant, Laurentii', description: 'Survives a north-facing hallway, a three-week holiday, and a radiator underneath it. The yellow-margined variety, in a nursery pot that fits most 15cm cachepots.', price: 24, collection: 'Low Light', variants: ['4" pot', '6" pot'] },
      { title: 'String of Hearts', description: 'A trailing succulent with silver-marbled heart-shaped leaves on wiry purple stems. Wants a bright windowsill and almost no water in winter. Grows a metre a season once settled.', price: 22, collection: 'Bright Light' },
      { title: 'Chunky Aroid Soil Mix, 8L', description: 'Orchid bark, perlite, horticultural charcoal and a little coir. The drainage that stops root rot in philodendrons and monsteras, mixed to the ratio our greenhouse actually uses.', price: 19, collection: 'Supplies' },
      { title: 'Moisture Meter', description: 'A probe that tells you what is happening 10cm down, where the roots are, rather than at the surface where your finger reaches. The single cheapest fix for overwatering.', price: 14, collection: 'Supplies' },
      { title: 'Beginner Trio', description: 'Snake plant, heartleaf philodendron and a ZZ plant in 4-inch pots, plus a bag of soil mix and the moisture meter. Three plants that are genuinely hard to kill, in one box.', price: 74, compareAt: 89, collection: 'Sets' },
    ],
  },
  {
    id: 'apparel',
    keywords: ['clothing', 'apparel', 'fashion', 'shirt', 'tee', 'streetwear', 'hoodie', 'denim', 'menswear', 'womenswear', 'jeans', 'knitwear'],
    nameParts: ['Kestrel', 'Supply Co.'],
    tagline: 'Fewer pieces, made properly, worn for years.',
    announcement: 'Free returns and exchanges · Repairs free for life',
    about: 'We make a small number of garments and remake them season after season rather than chasing a new drop every six weeks. Everything is cut and sewn in a factory in Porto that we visit twice a year and name on every product page. If a seam fails, send it back and we fix it — for as long as you own it.',
    theme: {
      palette: {
        primary: '#1c1c1c', onPrimary: '#f5f5f3', background: '#f5f5f3', surface: '#e9e9e5',
        text: '#171717', muted: '#6e6e69', border: '#dcdcd6', accent: '#9a3b2f',
      },
      fonts: { heading: '"Helvetica Neue", Inter, system-ui, sans-serif', body: 'system-ui, -apple-system, sans-serif' },
      radius: 'none', density: 'airy', buttonStyle: 'solid',
    },
    valueProps: [
      { icon: '🧵', title: 'Free repairs, forever', body: 'Blown seam, failed zip, worn cuff — send it in and we fix it. You pay shipping one way.' },
      { icon: '🏭', title: 'One factory, named', body: 'Everything comes from the same family-run facility outside Porto. It is on every product page.' },
      { icon: '📏', title: 'Real measurements', body: 'Every listing has a garment measurement chart in centimetres, not a vague S/M/L guess.' },
    ],
    testimonials: [
      { quote: 'Four years on the same overshirt, one free repair to a cuff, and it still looks better than things I bought last spring.', author: 'Tom B.', role: 'Customer since 2020' },
      { quote: 'The measurement charts mean I actually order the right size the first time. I have not returned anything in two years.', author: 'Iris M.', role: 'London, UK' },
      { quote: 'I emailed asking whether the trousers would suit a 32" inseam and got a reply from someone who had clearly held the garment.', author: 'Felix A.', role: 'Berlin, DE' },
    ],
    faq: [
      { question: 'How do I find my size?', answer: 'Measure a garment you already like flat, and match it against the centimetre chart on the product page. It beats guessing from a size label every time.' },
      { question: 'What does the repair guarantee cover?', answer: 'Anything that fails through normal wear: seams, zips, buttons, cuffs, small tears. It does not cover damage from accidents, but tell us anyway and we will quote a fair price.' },
      { question: 'Where do you ship?', answer: 'Worldwide. EU and UK orders ship duty-paid; everywhere else, duties are collected by the carrier on delivery.' },
    ],
    products: [
      { title: 'Heavyweight Pocket Tee', description: 'A 240gsm organic cotton jersey that holds its shape through a hundred washes instead of going limp after ten. Boxy through the body, slightly dropped shoulder, hemmed pocket.', price: 48, collection: 'Everyday', variants: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { title: 'Cotton Twill Overshirt', description: 'A 9oz Japanese twill that starts stiff and breaks in over a season into something closer to a jacket than a shirt. Corozo buttons, double-needle felled seams, two chest pockets.', price: 165, collection: 'Outerwear', variants: ['S', 'M', 'L', 'XL'] },
      { title: 'Relaxed Selvedge Jean', description: '14.5oz selvedge denim from Kaihara, cut with room through the thigh and a straight leg. Unwashed, so expect about 3cm of shrink in the first hot wash and real fades by month six.', price: 195, collection: 'Everyday', variants: ['28', '30', '32', '34', '36', '38'] },
      { title: 'Merino Crew Knit', description: 'Fully-fashioned 19.5 micron merino, knitted to shape rather than cut from a panel, so there is no bulk at the shoulder seam. Warm without being hot, and it does not itch.', price: 145, collection: 'Knitwear', variants: ['S', 'M', 'L', 'XL'] },
      { title: 'Wide Pleated Trouser', description: 'A single forward pleat and a wide straight leg in a mid-weight wool blend that holds a crease. Sits at the natural waist with side adjusters, so belt loops are optional.', price: 175, collection: 'Everyday', variants: ['28', '30', '32', '34', '36'] },
      { title: 'Waxed Canvas Tote', description: 'A 18oz waxed cotton canvas with leather handles and a flat base that lets it stand up on its own. Takes a laptop, a week of groceries, or both, and darkens handsomely with use.', price: 120, collection: 'Accessories' },
      { title: 'Ribbed Wool Sock, Three Pack', description: 'A merino-nylon blend with a reinforced heel and toe, ribbed high enough to stay up without a tight cuff. The nylon is what makes them last; pure wool socks wear through in a season.', price: 42, collection: 'Accessories', variants: ['S (36-39)', 'M (40-43)', 'L (44-47)'] },
      { title: 'Repair Kit', description: 'Matched thread for every garment we make, three needles, spare corozo buttons and a patch of the twill. For the repairs you would rather do yourself than post to Portugal.', price: 18, collection: 'Accessories' },
    ],
  },
  {
    id: 'home',
    keywords: ['homeware', 'home decor', 'furniture', 'ceramic', 'ceramics', 'kitchen', 'candle', 'decor', 'interior', 'pottery', 'tableware', 'stoneware'],
    nameParts: ['Alder &', 'Stone'],
    tagline: 'Objects for the parts of the day you repeat.',
    announcement: 'Complimentary gift wrapping · Ships in 2–4 business days',
    about: 'We commission from about twenty independent makers — potters, woodturners, a glassblower in Vermont — and sell what they make in runs of a few hundred rather than a few hundred thousand. Everything here is something we use at home. When a maker retires a piece, it goes out of stock for good, and we think that is the right way round.',
    theme: {
      palette: {
        primary: '#4a3f35', onPrimary: '#faf7f2', background: '#faf7f2', surface: '#efe8dd',
        text: '#2e2822', muted: '#7d7267', border: '#e2d8ca', accent: '#a87c4f',
      },
      fonts: { heading: '"Baskerville", Georgia, serif', body: 'system-ui, -apple-system, sans-serif' },
      radius: 'md', density: 'airy', buttonStyle: 'outline',
    },
    valueProps: [
      { icon: '🪵', title: 'Twenty makers, named', body: 'Every piece lists who made it and where. Most are within a day\'s drive of our warehouse.' },
      { icon: '🎁', title: 'Wrapped properly', body: 'Tissue, a kraft box and a hand-written card if you want one. No extra charge, no plastic.' },
      { icon: '🔁', title: 'Replaced if it breaks in transit', body: 'Ceramics and glass travel badly. If yours arrives in pieces, we send another the same day.' },
    ],
    testimonials: [
      { quote: 'I bought two mugs, then four more, and now the whole cupboard matches. They are the only ones anyone in the house reaches for.', author: 'Helen S.', role: 'Asheville, NC' },
      { quote: 'The card said which potter threw it and how long the glaze took to settle. That is a nice thing to know about a bowl.', author: 'Owen P.', role: 'Gift buyer' },
      { quote: 'One arrived cracked, I sent a photo at 9am, a replacement shipped by lunchtime. No argument.', author: 'Rae L.', role: 'Customer since 2023' },
    ],
    faq: [
      { question: 'Are these dishwasher safe?', answer: 'The stoneware and porcelain are. The wood and the two hand-glazed lines are not — each product page says so plainly near the top.' },
      { question: 'Will I get exactly the piece in the photo?', answer: 'No, and that is the point. These are thrown and glazed by hand, so colour and form vary a little between pieces.' },
      { question: 'Do you restock sold-out items?', answer: 'Sometimes. Add your email on the product page and you will hear the moment a maker sends us another run.' },
    ],
    products: [
      { title: 'Speckled Stoneware Mug', description: 'Thrown by Ana Reyes in Hudson, NY, in a buff clay that shows iron speckles through a matte glaze. Holds 350ml, sits comfortably in one hand, and the handle is big enough for three fingers.', price: 42, collection: 'Tableware', variants: ['Oatmeal', 'Slate', 'Clay'] },
      { title: 'Ash Serving Board', description: 'Turned from a single piece of storm-felled American ash and finished with food-safe hardwax oil. The grain runs end to end, so it will not split along a glue line because there is not one.', price: 88, collection: 'Kitchen' },
      { title: 'Hand-Blown Water Carafe', description: 'Blown in Vermont from recycled soda-lime glass, with a slight waviness and the odd bubble that machine glass never has. One litre, and the neck is wide enough to actually clean.', price: 96, collection: 'Tableware' },
      { title: 'Linen Apron', description: 'Heavy 240gsm European linen, cross-back so the weight sits on your shoulders rather than your neck, with a deep front pocket. Softens substantially after the first three washes.', price: 68, collection: 'Kitchen', variants: ['Natural', 'Charcoal'] },
      { title: 'Beeswax Taper Pair', description: 'Hand-dipped from Pennsylvania beeswax, which burns slower and drips less than paraffin and smells faintly of honey. Nine hours a taper, in a standard 22mm holder.', price: 26, collection: 'Light' },
      { title: 'Stoneware Serving Bowl', description: 'A wide, shallow 28cm bowl for pasta, salad or the middle of a table. Glazed inside and raw on the foot ring, which is how you tell it was finished by a person.', price: 115, compareAt: 140, collection: 'Tableware' },
      { title: 'Brass Candle Snuffer', description: 'Solid brass on a walnut handle, unlacquered so it develops a patina rather than flaking. Puts a candle out without the smoke or the wax spray of blowing on it.', price: 34, collection: 'Light' },
      { title: 'Everyday Table Set', description: 'Four mugs, four bowls and the ash board — the pieces we actually use daily — at about 15% below buying them individually. Colours are mixed unless you ask otherwise.', price: 295, compareAt: 348, collection: 'Sets' },
    ],
  },
  {
    id: 'fitness',
    keywords: ['fitness', 'gym', 'home gym', 'workout', 'athletic', 'barbell', 'dumbbell', 'kettlebell', 'weights', 'squat rack', 'training', 'yoga', 'sport', 'running', 'lifting'],
    nameParts: ['Basework', 'Athletics'],
    tagline: 'Equipment for people who train at home and mean it.',
    announcement: 'Free shipping over $100 · Lifetime warranty on all steel',
    about: 'Basework started when a coach we know got tired of recommending equipment that fell apart in nine months. Everything we sell has been used in a real gym for at least a season before it goes in the catalogue, and the steel carries a lifetime warranty because we have never had a piece come back.',
    theme: {
      palette: {
        primary: '#111418', onPrimary: '#f4f6f8', background: '#0f1215', surface: '#1a1f25',
        text: '#eef2f6', muted: '#9aa5b1', border: '#2a313a', accent: '#e8552f',
      },
      fonts: { heading: '"Oswald", "Arial Narrow", system-ui, sans-serif', body: 'system-ui, -apple-system, sans-serif' },
      radius: 'sm', density: 'compact', buttonStyle: 'solid',
    },
    valueProps: [
      { icon: '🛡️', title: 'Lifetime steel warranty', body: 'Bend a bar or crack a plate under normal training and we replace it. It has not happened yet.' },
      { icon: '🏋️', title: 'Season-tested first', body: 'Nothing enters the catalogue until it has survived a full season in a working gym.' },
      { icon: '🚚', title: 'Freight included over $100', body: 'Heavy things ship heavy. We eat the freight rather than surprise you at checkout.' },
    ],
    testimonials: [
      { quote: 'Three years of daily use in a garage that swings from 2°C to 38°C and the knurling is still sharp. No rust.', author: 'Devin C.', role: 'Garage gym, year 3' },
      { quote: 'I called with a question about spacing and the person who answered had built the rack they were describing.', author: 'Marta J.', role: 'Powerlifter' },
      { quote: 'Bought the bar expecting to replace it in two years like the last one. Still here, still true.', author: 'Nate Q.', role: 'Customer since 2021' },
    ],
    faq: [
      { question: 'Will the rack fit an eight-foot ceiling?', answer: 'The short upright option is 213cm and clears an eight-foot ceiling with room to pull. Measure before you order — the product page has the full footprint.' },
      { question: 'What does the lifetime warranty actually cover?', answer: 'Any structural failure of the steel under normal training loads, for as long as you own it. Cosmetic rust from an unheated garage is not covered, though a wire brush usually sorts it.' },
      { question: 'Do you ship internationally?', answer: 'Steel ships to the US and Canada only — freight elsewhere costs more than the product. Accessories and apparel ship worldwide.' },
    ],
    products: [
      { title: 'Power Bar, 20kg', description: 'A 28.5mm shaft with aggressive knurling, 190k PSI tensile steel and bronze bushings that spin smoothly under a heavy pull. Rated to 680kg and warrantied for life against bending.', price: 349, collection: 'Bars' },
      { title: 'Bumper Plate Pair', description: 'Virgin rubber, not crumb, so they bounce predictably and do not smell like a tyre shop in July. Collar insert is stainless steel and will not spin loose. Sold in pairs.', price: 145, collection: 'Plates', variants: ['10kg pair', '15kg pair', '20kg pair', '25kg pair'] },
      { title: 'Squat Rack, Short Upright', description: '3x3 eleven-gauge steel on 5cm hole spacing through the working range, at 213cm so it clears an eight-foot ceiling. Bolt-together, and the hardware is included and correct.', price: 695, collection: 'Racks', variants: ['Black', 'Charcoal'] },
      { title: 'Adjustable Kettlebell, 8–32kg', description: 'One bell that replaces seven, with a locking mechanism that has survived being dropped from waist height about two hundred times in testing. The handle stays a consistent 35mm at every weight.', price: 289, compareAt: 340, collection: 'Free Weights' },
      { title: 'Competition Jump Rope', description: 'A 2.5mm coated cable on sealed bearings that spin freely enough for double-unders without the whip stalling. Cut to your height with the included tool in about a minute.', price: 42, collection: 'Conditioning' },
      { title: 'Rubber Gym Flooring, 1m²', description: '15mm recycled rubber tiles that interlock without adhesive and absorb a dropped 60kg without transmitting it into the slab. Low-odour cure, so the garage is usable the same day.', price: 38, collection: 'Flooring' },
      { title: 'Lifting Belt, 10mm', description: 'A single-ply 10mm vegetable-tanned leather belt with a single-prong roller buckle, the same width the whole way round. Stiff for about three weeks, then it is yours for a decade.', price: 129, collection: 'Accessories', variants: ['S', 'M', 'L', 'XL'] },
      { title: 'Garage Starter Package', description: 'The short-upright rack, the 20kg bar, 100kg of bumpers and four flooring tiles — the whole setup, freight included. About 12% below buying the pieces on their own.', price: 1595, compareAt: 1810, collection: 'Packages' },
    ],
  },
]

const GENERIC: NicheKit = {
  id: 'generic',
  keywords: [],
  nameParts: ['Fieldnote', 'Goods'],
  tagline: 'A small catalogue, chosen carefully.',
  announcement: 'Free shipping on orders over $75',
  about: 'We keep the catalogue small on purpose. Every product here earned its place by being the one we reach for, and we would rather sell forty things we can talk about in detail than four thousand we cannot.',
  theme: {
    palette: {
      primary: '#24303c', onPrimary: '#f6f8fa', background: '#fcfcfd', surface: '#f1f4f7',
      text: '#1d2732', muted: '#6b7885', border: '#dfe5eb', accent: '#2f6f8f',
    },
    fonts: { heading: '"Charter", Georgia, serif', body: 'system-ui, -apple-system, sans-serif' },
    radius: 'md', density: 'comfortable', buttonStyle: 'solid',
  },
  valueProps: [
    { icon: '✳️', title: 'A short catalogue', body: 'Forty products we can describe in detail, rather than four thousand we cannot.' },
    { icon: '🚚', title: 'Ships in two days', body: 'Everything is in our own warehouse. Nothing is drop-shipped from somewhere else.' },
    { icon: '↩️', title: 'Thirty-day returns', body: 'Unused and in its packaging, send it back for a full refund. Return shipping is on us.' },
  ],
  testimonials: [
    { quote: 'Ordered on a Tuesday, arrived Thursday, exactly as described. That is the whole review.', author: 'Jamie L.', role: 'Verified buyer' },
    { quote: 'Asked a question by email and got a specific, useful answer from someone who knew the product.', author: 'Robin V.', role: 'Customer since 2023' },
    { quote: 'A short catalogue where everything is good beats an endless one where most of it is not.', author: 'Casey M.', role: 'Repeat customer' },
  ],
  faq: [
    { question: 'How fast do orders ship?', answer: 'Within two business days from our own warehouse. You will get tracking as soon as the label is printed.' },
    { question: 'What is the return policy?', answer: 'Thirty days, unused and in its original packaging, with return shipping covered by us.' },
    { question: 'Do you ship internationally?', answer: 'Yes. International orders usually clear customs within a week, and duties are collected on delivery.' },
  ],
  products: [
    { title: 'The Everyday Carry Pouch', description: 'A waxed canvas zip pouch sized for a charger, a cable and a notebook. Flat-bottomed so it stands up in a bag instead of collapsing into the bottom.', price: 38, collection: 'Bags' },
    { title: 'Hardback Notebook', description: 'Ninety gsm paper that takes a fountain pen without ghosting, sewn in signatures so it opens flat at any page. Dot grid, 192 pages, with a ribbon.', price: 24, collection: 'Desk', variants: ['Dot grid', 'Ruled', 'Blank'] },
    { title: 'Machined Brass Pen', description: 'Turned from a single piece of brass, weighted toward the nib, and it takes a standard refill you can buy anywhere. Develops a patina within a month of daily use.', price: 62, collection: 'Desk' },
    { title: 'Insulated Bottle, 600ml', description: 'Double-walled stainless with a lid that seals properly rather than mostly. Cold for about 24 hours, hot for twelve, and the mouth is wide enough for ice cubes.', price: 34, collection: 'Everyday', variants: ['Steel', 'Matte black', 'Sand'] },
    { title: 'Merino Beanie', description: 'A fine-gauge merino rib that is warm without being bulky under a hood, and does not itch across the forehead the way lambswool does. One size, and it genuinely fits.', price: 42, collection: 'Wear' },
    { title: 'Cable Organiser Set', description: 'Six leather cable ties with brass snaps, in three sizes. Enough for a laptop bag and a desk drawer, and they will outlast every cable they hold.', price: 28, collection: 'Desk' },
    { title: 'Weekender Duffel', description: 'A 40-litre waxed canvas duffel with leather handles, a full-length zip and one internal pocket. Fits three days of clothes and clears most airline cabin limits.', price: 185, compareAt: 220, collection: 'Bags' },
    { title: 'The Starter Bundle', description: 'The pouch, the notebook, the pen and the bottle together at about 18% off buying them separately. The four things we end up recommending most often anyway.', price: 132, compareAt: 158, collection: 'Sets' },
  ],
}

/**
 * Picks the kit whose keywords best match the prompt.
 *
 * Matches on word boundaries and scores multi-word keywords above single words,
 * so "home gym" reaches the fitness kit rather than the homeware one.
 */
export function matchNiche(prompt: string): NicheKit {
  const text = prompt.toLowerCase()
  let best: { kit: NicheKit, score: number } = { kit: GENERIC, score: 0 }

  for (const kit of KITS) {
    let score = 0
    for (const keyword of kit.keywords) {
      const pattern = new RegExp(`(^|[^a-z])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`)
      if (pattern.test(text)) {
        // A two-word phrase is a much stronger signal than a single common noun.
        score += keyword.includes(' ') ? 100 : keyword.length
      }
    }
    if (score > best.score) best = { kit, score }
  }
  return best.kit
}

export { GENERIC, KITS }
