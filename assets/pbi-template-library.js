(() => {
  const premiumTemplates = [
  {
    "id": "cafe",
    "pack": "premium-cafe",
    "label": "Café",
    "category": "food",
    "route": "/examples/cafe/",
    "business": "Harbour Table",
    "title": "Seasonal brunch, good coffee and a table worth slowing down for.",
    "subtitle": "A warm café website built around menus, bookings, opening hours and the tiny details customers check before visiting.",
    "accent": "#b85f32",
    "bg": "#fff4eb",
    "deep": "#2d160d",
    "image": "/assets/demo-media/cafe-hero.jpg",
    "gallery": [
      "/assets/demo-media/cafe-1.jpg",
      "/assets/demo-media/cafe-2.jpg",
      "/assets/demo-media/cafe-3.jpg"
    ],
    "services": [
      "Breakfast & brunch",
      "House-baked cakes",
      "Takeaway coffee"
    ],
    "proof": [
      "4.8★ local favourite",
      "Seasonal menus",
      "Dog-friendly tables"
    ],
    "cta": "Book a table",
    "copy": "Designed for cafés that need food-led imagery, opening times, menus, booking routes and a friendly first impression."
  },
  {
    "id": "trades",
    "pack": "trades-pro",
    "label": "Tradesperson",
    "category": "trades",
    "route": "/examples/trades/",
    "business": "South Coast Plumbing & Heating",
    "title": "Reliable local plumbing and heating with fast quote requests.",
    "subtitle": "A trust-first service website with emergency callouts, service areas, proof points and clear enquiry routes.",
    "accent": "#256b5b",
    "bg": "#f3f7f4",
    "deep": "#173f35",
    "image": "/assets/demo-media/trades-hero.jpg",
    "gallery": [
      "/assets/demo-media/trades-1.jpg",
      "/assets/demo-media/trades-2.jpg",
      "/assets/demo-media/trades-3.jpg"
    ],
    "services": [
      "Boiler installs",
      "Bathroom fitting",
      "Emergency repairs"
    ],
    "proof": [
      "Fully insured",
      "Local callouts",
      "Clear pricing route"
    ],
    "cta": "Request a quote",
    "copy": "Built for trades that need phone calls, job photos, services, locations and credibility above everything else."
  },
  {
    "id": "salon",
    "pack": "salon-luxe",
    "label": "Salon",
    "category": "beauty",
    "route": "/examples/salon/",
    "business": "Luna Hair & Beauty Studio",
    "title": "A calm salon website that turns browsers into booked appointments.",
    "subtitle": "Elegant treatment pages, price guidance, gallery sections and booking prompts for hair, beauty and wellness businesses.",
    "accent": "#b85f70",
    "bg": "#fff0ed",
    "deep": "#402027",
    "image": "/assets/demo-media/salon-hero.jpg",
    "gallery": [
      "/assets/demo-media/salon-1.jpg",
      "/assets/demo-media/salon-2.jpg",
      "/assets/demo-media/salon-3.jpg"
    ],
    "services": [
      "Colour & cut",
      "Beauty treatments",
      "Bridal styling"
    ],
    "proof": [
      "Calm studio feel",
      "Treatment menu ready",
      "Booking-focused"
    ],
    "cta": "Book appointment",
    "copy": "A polished beauty layout with soft visuals, service clarity and enough trust to make booking feel easy."
  },
  {
    "id": "consultant",
    "pack": "consultant-authority",
    "label": "Consultant",
    "category": "professional",
    "route": "/examples/consultant/",
    "business": "Northpoint Consulting",
    "title": "Make your expertise obvious before the first call.",
    "subtitle": "A professional services template for consultants, trainers and advisors who need authority, case studies and discovery calls.",
    "accent": "#24556c",
    "bg": "#fff8f1",
    "deep": "#1e3d4d",
    "image": "/assets/demo-media/consultant-hero.jpg",
    "gallery": [
      "/assets/demo-media/consultant-1.jpg",
      "/assets/demo-media/consultant-2.jpg",
      "/assets/demo-media/consultant-3.jpg"
    ],
    "services": [
      "Discovery workshops",
      "Operational strategy",
      "Team training"
    ],
    "proof": [
      "Outcome-led copy",
      "Case study rhythm",
      "Call-booking ready"
    ],
    "cta": "Book discovery call",
    "copy": "A clean authority site for service businesses that sell thinking, trust and a clear path to contact."
  },
  {
    "id": "holiday-let",
    "pack": "holiday-stay",
    "label": "Holiday let",
    "category": "hospitality",
    "route": "/examples/holiday-let/",
    "business": "Cliffside Retreat",
    "title": "Sell the stay with atmosphere, amenities and easy enquiries.",
    "subtitle": "A visual accommodation template for holiday lets, glamping sites, guesthouses and retreats.",
    "accent": "#238081",
    "bg": "#edf6f5",
    "deep": "#173f45",
    "image": "/assets/demo-media/holiday-let-hero.jpg",
    "gallery": [
      "/assets/demo-media/holiday-let-1.jpg",
      "/assets/demo-media/holiday-let-2.jpg",
      "/assets/demo-media/holiday-let-3.jpg"
    ],
    "services": [
      "Sleeps 6 guests",
      "Sea-view stay",
      "Local guide"
    ],
    "proof": [
      "Guest-friendly layout",
      "Image-led pages",
      "Availability CTA"
    ],
    "cta": "Check availability",
    "copy": "Designed to show the property, the local area, guest proof and an obvious booking enquiry route."
  },
  {
    "id": "shop",
    "pack": "retail-launch",
    "label": "Shop",
    "category": "retail",
    "route": "/examples/shop/",
    "business": "Willow & Pine Home",
    "title": "A boutique shopfront that makes products easy to browse.",
    "subtitle": "A retail-first template with featured collections, product cards, promotions and payment-ready CTAs.",
    "accent": "#111111",
    "bg": "#fff8cf",
    "deep": "#261c05",
    "image": "/assets/demo-media/shop-hero.jpg",
    "gallery": [
      "/assets/demo-media/shop-1.jpg",
      "/assets/demo-media/shop-2.jpg",
      "/assets/demo-media/shop-3.jpg"
    ],
    "services": [
      "Gift bundles",
      "Homeware picks",
      "Seasonal launches"
    ],
    "proof": [
      "Product-led design",
      "Stripe-ready path",
      "Offer banners"
    ],
    "cta": "Browse collection",
    "copy": "For independent shops, makers and small retailers who need a premium product flow without complexity."
  },
  {
    "id": "mobile-mechanic",
    "pack": "mobile-mechanic",
    "label": "Mobile mechanic",
    "category": "trades",
    "route": "/examples/mobile-mechanic/",
    "business": "Roadside Ready Mechanics",
    "title": "Mobile repairs, servicing and diagnostics brought to the customer.",
    "subtitle": "A practical local-service template for mechanics who need urgent calls, trust proof and location coverage.",
    "accent": "#365168",
    "bg": "#f1f5f7",
    "deep": "#182b38",
    "image": "/assets/demo-media/trades-hero.jpg",
    "gallery": [
      "/assets/demo-media/trades-1.jpg",
      "/assets/demo-media/trades-2.jpg",
      "/assets/demo-media/trades-3.jpg"
    ],
    "services": [
      "Mobile servicing",
      "Diagnostics",
      "Emergency callouts"
    ],
    "proof": [
      "Comes to you",
      "Transparent quotes",
      "Local coverage"
    ],
    "cta": "Book mobile visit",
    "copy": "A fast, confidence-led template for mobile mechanics, roadside repair teams and independent garages."
  },
  {
    "id": "dog-groomer",
    "pack": "dog-groomer",
    "label": "Dog groomer",
    "category": "pets",
    "route": "/examples/dog-groomer/",
    "business": "Wag & Wash Grooming",
    "title": "Friendly dog grooming with clear treatments and simple booking.",
    "subtitle": "A warm pet-service template with packages, before-and-after sections, trust notes and appointment CTAs.",
    "accent": "#8a6a3f",
    "bg": "#fff7e8",
    "deep": "#3f2d18",
    "image": "/assets/demo-media/salon-hero.jpg",
    "gallery": [
      "/assets/demo-media/salon-1.jpg",
      "/assets/demo-media/salon-2.jpg",
      "/assets/demo-media/salon-3.jpg"
    ],
    "services": [
      "Full groom",
      "Puppy intro",
      "Nail trim"
    ],
    "proof": [
      "Calm handling",
      "Breed-friendly packages",
      "Easy bookings"
    ],
    "cta": "Book a groom",
    "copy": "Built for groomers who need to show care, pricing, services and a low-friction route to appointment requests."
  },
  {
    "id": "cleaner",
    "pack": "cleaning-pro",
    "label": "Cleaner",
    "category": "home-services",
    "route": "/examples/cleaner/",
    "business": "Brightside Cleaning Co.",
    "title": "Reliable home and business cleaning with simple quote requests.",
    "subtitle": "A clean service template for domestic cleaners, commercial teams and end-of-tenancy specialists.",
    "accent": "#2d7d7a",
    "bg": "#effafa",
    "deep": "#173f3d",
    "image": "/assets/demo-media/professional-hero.svg",
    "gallery": [
      "/assets/demo-media/professional-1.svg",
      "/assets/demo-media/professional-2.svg",
      "/assets/demo-media/professional-3.svg"
    ],
    "services": [
      "Regular cleans",
      "Deep cleans",
      "End-of-tenancy"
    ],
    "proof": [
      "DBS-friendly wording",
      "Checklist-led service",
      "Quote-focused"
    ],
    "cta": "Get cleaning quote",
    "copy": "A confidence-building template with service cards, process, FAQs and clear enquiry prompts."
  },
  {
    "id": "personal-trainer",
    "pack": "personal-trainer",
    "label": "Personal trainer",
    "category": "fitness",
    "route": "/examples/personal-trainer/",
    "business": "Forge Fitness Coaching",
    "title": "Personal training that feels clear, focused and achievable.",
    "subtitle": "A coaching template for trainers who need programmes, transformation stories, FAQs and booking routes.",
    "accent": "#d36b32",
    "bg": "#fff3ec",
    "deep": "#2b1a12",
    "image": "/assets/demo-media/fitness-hero.svg",
    "gallery": [
      "/assets/demo-media/fitness-1.svg",
      "/assets/demo-media/fitness-2.svg",
      "/assets/demo-media/fitness-3.svg"
    ],
    "services": [
      "1:1 coaching",
      "Small group PT",
      "Nutrition support"
    ],
    "proof": [
      "Goal-led programmes",
      "Progress tracking",
      "First-session CTA"
    ],
    "cta": "Book consultation",
    "copy": "For PTs, coaches and small studios that need to turn interest into trial sessions and consultations."
  },
  {
    "id": "restaurant",
    "pack": "restaurant",
    "label": "Local restaurant",
    "category": "food",
    "route": "/examples/restaurant/",
    "business": "The Lantern Room",
    "title": "A restaurant website built for menus, atmosphere and reservations.",
    "subtitle": "An image-led hospitality template with featured dishes, opening hours, private dining and booking routes.",
    "accent": "#7c3f2b",
    "bg": "#fff3ea",
    "deep": "#29150f",
    "image": "/assets/demo-media/cafe-hero.jpg",
    "gallery": [
      "/assets/demo-media/cafe-1.jpg",
      "/assets/demo-media/cafe-2.jpg",
      "/assets/demo-media/cafe-3.jpg"
    ],
    "services": [
      "Seasonal menu",
      "Private dining",
      "Sunday lunch"
    ],
    "proof": [
      "Menu-first layout",
      "Booking CTA",
      "Food-led storytelling"
    ],
    "cta": "Reserve a table",
    "copy": "A stronger restaurant variant for businesses that need bookings, menus, photos and a proper sense of place."
  }
];
  const premiumPresets = {
  "cafe": {
    "id": "cafe",
    "label": "Café",
    "template": "hospitality",
    "category": "food",
    "route": "/examples/cafe/",
    "projectName": "Harbour Table Website",
    "businessName": "Harbour Table",
    "pageMainHeading": "Seasonal brunch, good coffee and a table worth slowing down for.",
    "subHeading": "A warm café website built around menus, bookings, opening hours and the tiny details customers check before visiting.",
    "accent": "#b85f32",
    "background": "#fff4eb",
    "text": "#2d160d",
    "nav": "#2d160d",
    "button": "#b85f32",
    "buttonText": "#ffffff",
    "ctaButtonText": "Book a table",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Breakfast & brunch • House-baked cakes • Takeaway coffee",
    "servicesList": [
      "Breakfast & brunch",
      "House-baked cakes",
      "Takeaway coffee"
    ],
    "featureBullets": [
      "4.8★ local favourite",
      "Seasonal menus",
      "Dog-friendly tables"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Seasonal brunch, good coffee and a table worth slowing down for.",
        "body": "A warm café website built around menus, bookings, opening hours and the tiny details customers check before visiting."
      },
      "about": {
        "label": "About",
        "title": "Why choose Harbour Table",
        "body": "Use this page to explain the people, approach, standards and local story behind Harbour Table."
      },
      "services": {
        "label": "Services",
        "title": "Café services made easy to choose",
        "body": "Breakfast & brunch | House-baked cakes | Takeaway coffee"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Harbour Table feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Book a table",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/cafe-1.jpg",
      "/assets/demo-media/cafe-2.jpg",
      "/assets/demo-media/cafe-3.jpg"
    ],
    "heroImage": "/assets/demo-media/cafe-hero.jpg",
    "heroAlt": "Café website template preview",
    "cardDescription": "Designed for cafés that need food-led imagery, opening times, menus, booking routes and a friendly first impression.",
    "cardBullets": [
      "Breakfast & brunch",
      "House-baked cakes",
      "Takeaway coffee"
    ],
    "galleryCaptions": [
      "4.8★ local favourite",
      "Seasonal menus",
      "Dog-friendly tables"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "cafe"
  },
  "trades": {
    "id": "trades",
    "label": "Tradesperson",
    "template": "service",
    "category": "trades",
    "route": "/examples/trades/",
    "projectName": "South Coast Plumbing & Heating Website",
    "businessName": "South Coast Plumbing & Heating",
    "pageMainHeading": "Reliable local plumbing and heating with fast quote requests.",
    "subHeading": "A trust-first service website with emergency callouts, service areas, proof points and clear enquiry routes.",
    "accent": "#256b5b",
    "background": "#f3f7f4",
    "text": "#173f35",
    "nav": "#173f35",
    "button": "#256b5b",
    "buttonText": "#ffffff",
    "ctaButtonText": "Request a quote",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Boiler installs • Bathroom fitting • Emergency repairs",
    "servicesList": [
      "Boiler installs",
      "Bathroom fitting",
      "Emergency repairs"
    ],
    "featureBullets": [
      "Fully insured",
      "Local callouts",
      "Clear pricing route"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Reliable local plumbing and heating with fast quote requests.",
        "body": "A trust-first service website with emergency callouts, service areas, proof points and clear enquiry routes."
      },
      "about": {
        "label": "About",
        "title": "Why choose South Coast Plumbing & Heating",
        "body": "Use this page to explain the people, approach, standards and local story behind South Coast Plumbing & Heating."
      },
      "services": {
        "label": "Services",
        "title": "Tradesperson services made easy to choose",
        "body": "Boiler installs | Bathroom fitting | Emergency repairs"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the South Coast Plumbing & Heating feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Request a quote",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/trades-1.jpg",
      "/assets/demo-media/trades-2.jpg",
      "/assets/demo-media/trades-3.jpg"
    ],
    "heroImage": "/assets/demo-media/trades-hero.jpg",
    "heroAlt": "Tradesperson website template preview",
    "cardDescription": "Built for trades that need phone calls, job photos, services, locations and credibility above everything else.",
    "cardBullets": [
      "Boiler installs",
      "Bathroom fitting",
      "Emergency repairs"
    ],
    "galleryCaptions": [
      "Fully insured",
      "Local callouts",
      "Clear pricing route"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "trades"
  },
  "salon": {
    "id": "salon",
    "label": "Salon",
    "template": "studio",
    "category": "beauty",
    "route": "/examples/salon/",
    "projectName": "Luna Hair & Beauty Studio Website",
    "businessName": "Luna Hair & Beauty Studio",
    "pageMainHeading": "A calm salon website that turns browsers into booked appointments.",
    "subHeading": "Elegant treatment pages, price guidance, gallery sections and booking prompts for hair, beauty and wellness businesses.",
    "accent": "#b85f70",
    "background": "#fff0ed",
    "text": "#402027",
    "nav": "#402027",
    "button": "#b85f70",
    "buttonText": "#ffffff",
    "ctaButtonText": "Book appointment",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Colour & cut • Beauty treatments • Bridal styling",
    "servicesList": [
      "Colour & cut",
      "Beauty treatments",
      "Bridal styling"
    ],
    "featureBullets": [
      "Calm studio feel",
      "Treatment menu ready",
      "Booking-focused"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "A calm salon website that turns browsers into booked appointments.",
        "body": "Elegant treatment pages, price guidance, gallery sections and booking prompts for hair, beauty and wellness businesses."
      },
      "about": {
        "label": "About",
        "title": "Why choose Luna Hair & Beauty Studio",
        "body": "Use this page to explain the people, approach, standards and local story behind Luna Hair & Beauty Studio."
      },
      "services": {
        "label": "Services",
        "title": "Salon services made easy to choose",
        "body": "Colour & cut | Beauty treatments | Bridal styling"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Luna Hair & Beauty Studio feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Book appointment",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/salon-1.jpg",
      "/assets/demo-media/salon-2.jpg",
      "/assets/demo-media/salon-3.jpg"
    ],
    "heroImage": "/assets/demo-media/salon-hero.jpg",
    "heroAlt": "Salon website template preview",
    "cardDescription": "A polished beauty layout with soft visuals, service clarity and enough trust to make booking feel easy.",
    "cardBullets": [
      "Colour & cut",
      "Beauty treatments",
      "Bridal styling"
    ],
    "galleryCaptions": [
      "Calm studio feel",
      "Treatment menu ready",
      "Booking-focused"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "salon"
  },
  "consultant": {
    "id": "consultant",
    "label": "Consultant",
    "template": "service",
    "category": "professional",
    "route": "/examples/consultant/",
    "projectName": "Northpoint Consulting Website",
    "businessName": "Northpoint Consulting",
    "pageMainHeading": "Make your expertise obvious before the first call.",
    "subHeading": "A professional services template for consultants, trainers and advisors who need authority, case studies and discovery calls.",
    "accent": "#24556c",
    "background": "#fff8f1",
    "text": "#1e3d4d",
    "nav": "#1e3d4d",
    "button": "#24556c",
    "buttonText": "#ffffff",
    "ctaButtonText": "Book discovery call",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Discovery workshops • Operational strategy • Team training",
    "servicesList": [
      "Discovery workshops",
      "Operational strategy",
      "Team training"
    ],
    "featureBullets": [
      "Outcome-led copy",
      "Case study rhythm",
      "Call-booking ready"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Make your expertise obvious before the first call.",
        "body": "A professional services template for consultants, trainers and advisors who need authority, case studies and discovery calls."
      },
      "about": {
        "label": "About",
        "title": "Why choose Northpoint Consulting",
        "body": "Use this page to explain the people, approach, standards and local story behind Northpoint Consulting."
      },
      "services": {
        "label": "Services",
        "title": "Consultant services made easy to choose",
        "body": "Discovery workshops | Operational strategy | Team training"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Northpoint Consulting feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Book discovery call",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/consultant-1.jpg",
      "/assets/demo-media/consultant-2.jpg",
      "/assets/demo-media/consultant-3.jpg"
    ],
    "heroImage": "/assets/demo-media/consultant-hero.jpg",
    "heroAlt": "Consultant website template preview",
    "cardDescription": "A clean authority site for service businesses that sell thinking, trust and a clear path to contact.",
    "cardBullets": [
      "Discovery workshops",
      "Operational strategy",
      "Team training"
    ],
    "galleryCaptions": [
      "Outcome-led copy",
      "Case study rhythm",
      "Call-booking ready"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "consultant"
  },
  "holiday-let": {
    "id": "holiday-let",
    "label": "Holiday let",
    "template": "hospitality",
    "category": "hospitality",
    "route": "/examples/holiday-let/",
    "projectName": "Cliffside Retreat Website",
    "businessName": "Cliffside Retreat",
    "pageMainHeading": "Sell the stay with atmosphere, amenities and easy enquiries.",
    "subHeading": "A visual accommodation template for holiday lets, glamping sites, guesthouses and retreats.",
    "accent": "#238081",
    "background": "#edf6f5",
    "text": "#173f45",
    "nav": "#173f45",
    "button": "#238081",
    "buttonText": "#ffffff",
    "ctaButtonText": "Check availability",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Sleeps 6 guests • Sea-view stay • Local guide",
    "servicesList": [
      "Sleeps 6 guests",
      "Sea-view stay",
      "Local guide"
    ],
    "featureBullets": [
      "Guest-friendly layout",
      "Image-led pages",
      "Availability CTA"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Sell the stay with atmosphere, amenities and easy enquiries.",
        "body": "A visual accommodation template for holiday lets, glamping sites, guesthouses and retreats."
      },
      "about": {
        "label": "About",
        "title": "Why choose Cliffside Retreat",
        "body": "Use this page to explain the people, approach, standards and local story behind Cliffside Retreat."
      },
      "services": {
        "label": "Services",
        "title": "Holiday let services made easy to choose",
        "body": "Sleeps 6 guests | Sea-view stay | Local guide"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Cliffside Retreat feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Check availability",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/holiday-let-1.jpg",
      "/assets/demo-media/holiday-let-2.jpg",
      "/assets/demo-media/holiday-let-3.jpg"
    ],
    "heroImage": "/assets/demo-media/holiday-let-hero.jpg",
    "heroAlt": "Holiday let website template preview",
    "cardDescription": "Designed to show the property, the local area, guest proof and an obvious booking enquiry route.",
    "cardBullets": [
      "Sleeps 6 guests",
      "Sea-view stay",
      "Local guide"
    ],
    "galleryCaptions": [
      "Guest-friendly layout",
      "Image-led pages",
      "Availability CTA"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "holiday-let"
  },
  "shop": {
    "id": "shop",
    "label": "Shop",
    "template": "retail",
    "category": "retail",
    "route": "/examples/shop/",
    "projectName": "Willow & Pine Home Website",
    "businessName": "Willow & Pine Home",
    "pageMainHeading": "A boutique shopfront that makes products easy to browse.",
    "subHeading": "A retail-first template with featured collections, product cards, promotions and payment-ready CTAs.",
    "accent": "#111111",
    "background": "#fff8cf",
    "text": "#261c05",
    "nav": "#261c05",
    "button": "#111111",
    "buttonText": "#ffffff",
    "ctaButtonText": "Browse collection",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "shop",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Gift bundles • Homeware picks • Seasonal launches",
    "servicesList": [
      "Gift bundles",
      "Homeware picks",
      "Seasonal launches"
    ],
    "featureBullets": [
      "Product-led design",
      "Stripe-ready path",
      "Offer banners"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "A boutique shopfront that makes products easy to browse.",
        "body": "A retail-first template with featured collections, product cards, promotions and payment-ready CTAs."
      },
      "about": {
        "label": "About",
        "title": "Why choose Willow & Pine Home",
        "body": "Use this page to explain the people, approach, standards and local story behind Willow & Pine Home."
      },
      "services": {
        "label": "Services",
        "title": "Shop services made easy to choose",
        "body": "Gift bundles | Homeware picks | Seasonal launches"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Willow & Pine Home feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Browse collection",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/shop-1.jpg",
      "/assets/demo-media/shop-2.jpg",
      "/assets/demo-media/shop-3.jpg"
    ],
    "heroImage": "/assets/demo-media/shop-hero.jpg",
    "heroAlt": "Shop website template preview",
    "cardDescription": "For independent shops, makers and small retailers who need a premium product flow without complexity.",
    "cardBullets": [
      "Gift bundles",
      "Homeware picks",
      "Seasonal launches"
    ],
    "galleryCaptions": [
      "Product-led design",
      "Stripe-ready path",
      "Offer banners"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "shop",
    "retailEnabled": true,
    "retailCurrency": "gbp",
    "retailProducts": [
      {
        "id": "product_1",
        "name": "Coastal Gift Bundle",
        "description": "A curated bundle for gifting.",
        "price": "24.00",
        "stock": "10",
        "sku": "PBI-GIFT",
        "image": "/assets/demo-media/shop-1.jpg",
        "active": true,
        "track_stock": true
      },
      {
        "id": "product_2",
        "name": "Seasonal Favourite",
        "description": "A hero product for the month.",
        "price": "18.00",
        "stock": "14",
        "sku": "PBI-SEASON",
        "image": "/assets/demo-media/shop-2.jpg",
        "active": true,
        "track_stock": true
      },
      {
        "id": "product_3",
        "name": "Local Collection",
        "description": "A product card that looks ready to sell.",
        "price": "32.00",
        "stock": "6",
        "sku": "PBI-LOCAL",
        "image": "/assets/demo-media/shop-3.jpg",
        "active": true,
        "track_stock": true
      }
    ]
  },
  "mobile-mechanic": {
    "id": "mobile-mechanic",
    "label": "Mobile mechanic",
    "template": "service",
    "category": "trades",
    "route": "/examples/mobile-mechanic/",
    "projectName": "Roadside Ready Mechanics Website",
    "businessName": "Roadside Ready Mechanics",
    "pageMainHeading": "Mobile repairs, servicing and diagnostics brought to the customer.",
    "subHeading": "A practical local-service template for mechanics who need urgent calls, trust proof and location coverage.",
    "accent": "#365168",
    "background": "#f1f5f7",
    "text": "#182b38",
    "nav": "#182b38",
    "button": "#365168",
    "buttonText": "#ffffff",
    "ctaButtonText": "Book mobile visit",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Mobile servicing • Diagnostics • Emergency callouts",
    "servicesList": [
      "Mobile servicing",
      "Diagnostics",
      "Emergency callouts"
    ],
    "featureBullets": [
      "Comes to you",
      "Transparent quotes",
      "Local coverage"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Mobile repairs, servicing and diagnostics brought to the customer.",
        "body": "A practical local-service template for mechanics who need urgent calls, trust proof and location coverage."
      },
      "about": {
        "label": "About",
        "title": "Why choose Roadside Ready Mechanics",
        "body": "Use this page to explain the people, approach, standards and local story behind Roadside Ready Mechanics."
      },
      "services": {
        "label": "Services",
        "title": "Mobile mechanic services made easy to choose",
        "body": "Mobile servicing | Diagnostics | Emergency callouts"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Roadside Ready Mechanics feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Book mobile visit",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/trades-1.jpg",
      "/assets/demo-media/trades-2.jpg",
      "/assets/demo-media/trades-3.jpg"
    ],
    "heroImage": "/assets/demo-media/trades-hero.jpg",
    "heroAlt": "Mobile mechanic website template preview",
    "cardDescription": "A fast, confidence-led template for mobile mechanics, roadside repair teams and independent garages.",
    "cardBullets": [
      "Mobile servicing",
      "Diagnostics",
      "Emergency callouts"
    ],
    "galleryCaptions": [
      "Comes to you",
      "Transparent quotes",
      "Local coverage"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "mobile-mechanic"
  },
  "dog-groomer": {
    "id": "dog-groomer",
    "label": "Dog groomer",
    "template": "studio",
    "category": "pets",
    "route": "/examples/dog-groomer/",
    "projectName": "Wag & Wash Grooming Website",
    "businessName": "Wag & Wash Grooming",
    "pageMainHeading": "Friendly dog grooming with clear treatments and simple booking.",
    "subHeading": "A warm pet-service template with packages, before-and-after sections, trust notes and appointment CTAs.",
    "accent": "#8a6a3f",
    "background": "#fff7e8",
    "text": "#3f2d18",
    "nav": "#3f2d18",
    "button": "#8a6a3f",
    "buttonText": "#ffffff",
    "ctaButtonText": "Book a groom",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Full groom • Puppy intro • Nail trim",
    "servicesList": [
      "Full groom",
      "Puppy intro",
      "Nail trim"
    ],
    "featureBullets": [
      "Calm handling",
      "Breed-friendly packages",
      "Easy bookings"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Friendly dog grooming with clear treatments and simple booking.",
        "body": "A warm pet-service template with packages, before-and-after sections, trust notes and appointment CTAs."
      },
      "about": {
        "label": "About",
        "title": "Why choose Wag & Wash Grooming",
        "body": "Use this page to explain the people, approach, standards and local story behind Wag & Wash Grooming."
      },
      "services": {
        "label": "Services",
        "title": "Dog groomer services made easy to choose",
        "body": "Full groom | Puppy intro | Nail trim"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Wag & Wash Grooming feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Book a groom",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/salon-1.jpg",
      "/assets/demo-media/salon-2.jpg",
      "/assets/demo-media/salon-3.jpg"
    ],
    "heroImage": "/assets/demo-media/salon-hero.jpg",
    "heroAlt": "Dog groomer website template preview",
    "cardDescription": "Built for groomers who need to show care, pricing, services and a low-friction route to appointment requests.",
    "cardBullets": [
      "Full groom",
      "Puppy intro",
      "Nail trim"
    ],
    "galleryCaptions": [
      "Calm handling",
      "Breed-friendly packages",
      "Easy bookings"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "dog-groomer"
  },
  "cleaner": {
    "id": "cleaner",
    "label": "Cleaner",
    "template": "service",
    "category": "home-services",
    "route": "/examples/cleaner/",
    "projectName": "Brightside Cleaning Co. Website",
    "businessName": "Brightside Cleaning Co.",
    "pageMainHeading": "Reliable home and business cleaning with simple quote requests.",
    "subHeading": "A clean service template for domestic cleaners, commercial teams and end-of-tenancy specialists.",
    "accent": "#2d7d7a",
    "background": "#effafa",
    "text": "#173f3d",
    "nav": "#173f3d",
    "button": "#2d7d7a",
    "buttonText": "#ffffff",
    "ctaButtonText": "Get cleaning quote",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Regular cleans • Deep cleans • End-of-tenancy",
    "servicesList": [
      "Regular cleans",
      "Deep cleans",
      "End-of-tenancy"
    ],
    "featureBullets": [
      "DBS-friendly wording",
      "Checklist-led service",
      "Quote-focused"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Reliable home and business cleaning with simple quote requests.",
        "body": "A clean service template for domestic cleaners, commercial teams and end-of-tenancy specialists."
      },
      "about": {
        "label": "About",
        "title": "Why choose Brightside Cleaning Co.",
        "body": "Use this page to explain the people, approach, standards and local story behind Brightside Cleaning Co.."
      },
      "services": {
        "label": "Services",
        "title": "Cleaner services made easy to choose",
        "body": "Regular cleans | Deep cleans | End-of-tenancy"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Brightside Cleaning Co. feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Get cleaning quote",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/professional-1.svg",
      "/assets/demo-media/professional-2.svg",
      "/assets/demo-media/professional-3.svg"
    ],
    "heroImage": "/assets/demo-media/professional-hero.svg",
    "heroAlt": "Cleaner website template preview",
    "cardDescription": "A confidence-building template with service cards, process, FAQs and clear enquiry prompts.",
    "cardBullets": [
      "Regular cleans",
      "Deep cleans",
      "End-of-tenancy"
    ],
    "galleryCaptions": [
      "DBS-friendly wording",
      "Checklist-led service",
      "Quote-focused"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "cleaner"
  },
  "personal-trainer": {
    "id": "personal-trainer",
    "label": "Personal trainer",
    "template": "studio",
    "category": "fitness",
    "route": "/examples/personal-trainer/",
    "projectName": "Forge Fitness Coaching Website",
    "businessName": "Forge Fitness Coaching",
    "pageMainHeading": "Personal training that feels clear, focused and achievable.",
    "subHeading": "A coaching template for trainers who need programmes, transformation stories, FAQs and booking routes.",
    "accent": "#d36b32",
    "background": "#fff3ec",
    "text": "#2b1a12",
    "nav": "#2b1a12",
    "button": "#d36b32",
    "buttonText": "#ffffff",
    "ctaButtonText": "Book consultation",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "1:1 coaching • Small group PT • Nutrition support",
    "servicesList": [
      "1:1 coaching",
      "Small group PT",
      "Nutrition support"
    ],
    "featureBullets": [
      "Goal-led programmes",
      "Progress tracking",
      "First-session CTA"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "Personal training that feels clear, focused and achievable.",
        "body": "A coaching template for trainers who need programmes, transformation stories, FAQs and booking routes."
      },
      "about": {
        "label": "About",
        "title": "Why choose Forge Fitness Coaching",
        "body": "Use this page to explain the people, approach, standards and local story behind Forge Fitness Coaching."
      },
      "services": {
        "label": "Services",
        "title": "Personal trainer services made easy to choose",
        "body": "1:1 coaching | Small group PT | Nutrition support"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the Forge Fitness Coaching feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Book consultation",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/fitness-1.svg",
      "/assets/demo-media/fitness-2.svg",
      "/assets/demo-media/fitness-3.svg"
    ],
    "heroImage": "/assets/demo-media/fitness-hero.svg",
    "heroAlt": "Personal trainer website template preview",
    "cardDescription": "For PTs, coaches and small studios that need to turn interest into trial sessions and consultations.",
    "cardBullets": [
      "1:1 coaching",
      "Small group PT",
      "Nutrition support"
    ],
    "galleryCaptions": [
      "Goal-led programmes",
      "Progress tracking",
      "First-session CTA"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "personal-trainer"
  },
  "restaurant": {
    "id": "restaurant",
    "label": "Local restaurant",
    "template": "hospitality",
    "category": "food",
    "route": "/examples/restaurant/",
    "projectName": "The Lantern Room Website",
    "businessName": "The Lantern Room",
    "pageMainHeading": "A restaurant website built for menus, atmosphere and reservations.",
    "subHeading": "An image-led hospitality template with featured dishes, opening hours, private dining and booking routes.",
    "accent": "#7c3f2b",
    "background": "#fff3ea",
    "text": "#29150f",
    "nav": "#29150f",
    "button": "#7c3f2b",
    "buttonText": "#ffffff",
    "ctaButtonText": "Reserve a table",
    "ctaButtonAction": "page",
    "ctaButtonPage": "contact",
    "ctaButtonDestination": "",
    "selectedPages": [
      "home",
      "about",
      "services",
      "gallery",
      "contact"
    ],
    "activePage": "home",
    "tagline": "Seasonal menu • Private dining • Sunday lunch",
    "servicesList": [
      "Seasonal menu",
      "Private dining",
      "Sunday lunch"
    ],
    "featureBullets": [
      "Menu-first layout",
      "Booking CTA",
      "Food-led storytelling"
    ],
    "pages": {
      "home": {
        "label": "Home",
        "title": "A restaurant website built for menus, atmosphere and reservations.",
        "body": "An image-led hospitality template with featured dishes, opening hours, private dining and booking routes."
      },
      "about": {
        "label": "About",
        "title": "Why choose The Lantern Room",
        "body": "Use this page to explain the people, approach, standards and local story behind The Lantern Room."
      },
      "services": {
        "label": "Services",
        "title": "Local restaurant services made easy to choose",
        "body": "Seasonal menu | Private dining | Sunday lunch"
      },
      "gallery": {
        "label": "Gallery",
        "title": "See the The Lantern Room feel",
        "body": "Use this page for real photos, examples, before-and-after proof and customer confidence."
      },
      "contact": {
        "label": "Contact",
        "title": "Reserve a table",
        "body": "Make it easy for customers to ask a question, book a slot or request a quote."
      }
    },
    "galleryImages": [
      "/assets/demo-media/cafe-1.jpg",
      "/assets/demo-media/cafe-2.jpg",
      "/assets/demo-media/cafe-3.jpg"
    ],
    "heroImage": "/assets/demo-media/cafe-hero.jpg",
    "heroAlt": "Local restaurant website template preview",
    "cardDescription": "A stronger restaurant variant for businesses that need bookings, menus, photos and a proper sense of place.",
    "cardBullets": [
      "Seasonal menu",
      "Private dining",
      "Sunday lunch"
    ],
    "galleryCaptions": [
      "Menu-first layout",
      "Booking CTA",
      "Food-led storytelling"
    ],
    "contactAction": "Build this website",
    "subdomainSlug": "restaurant"
  }
};

  function esc(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function extendPresetApi() {
    const api = window.PBITemplatePresets;
    if (!api || !api.presets) return;
    Object.assign(api.presets, premiumPresets);
  }

  function card(template) {
    const bullets = (template.services || []).slice(0,3).map((item) => `<li>${esc(item)}</li>`).join('');
    const proof = (template.proof || []).slice(0,3).map((item) => `<span>${esc(item)}</span>`).join('');
    return `<article class="pbi-premium-template-card" data-template-category="${esc(template.category)}" data-template="${esc(template.id)}">
      <a class="pbi-premium-template-image" href="${esc(template.route)}"><img src="${esc(template.image)}" alt="${esc(template.label)} website template preview"></a>
      <div class="pbi-premium-template-copy">
        <p class="eyebrow">${esc(template.label)}</p>
        <h2>${esc(template.business)}</h2>
        <p>${esc(template.copy)}</p>
        <ul>${bullets}</ul>
        <div class="pbi-premium-proof-row">${proof}</div>
        <div class="row"><a class="btn-ghost" href="${esc(template.route)}">View demo</a><button class="btn" type="button" data-use-template="${esc(template.id)}">Use this template</button></div>
      </div>
    </article>`;
  }

  function renderGrids() {
    document.querySelectorAll('[data-pbi-premium-template-grid]').forEach((target) => {
      target.innerHTML = premiumTemplates.map(card).join('');
    });
  }

  function bindFilters() {
    document.querySelectorAll('[data-premium-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.premiumFilter;
        document.querySelectorAll('[data-premium-filter]').forEach((btn) => btn.classList.toggle('active', btn === button));
        document.querySelectorAll('.pbi-premium-template-card').forEach((cardEl) => {
          const category = cardEl.dataset.templateCategory || '';
          cardEl.style.display = filter === 'all' || category === filter ? '' : 'none';
        });
      });
    });
  }

  function bindUseButtons() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-use-template]');
      if (!button) return;
      const key = button.dataset.useTemplate;
      if (!premiumPresets[key] && !window.PBITemplatePresets?.presets?.[key]) return;
      localStorage.setItem('pbi_selected_template', key);
    }, true);
  }

  window.PBIPremiumTemplates = { all: () => premiumTemplates.map((item) => ({ ...item })), presets: premiumPresets };
  document.addEventListener('DOMContentLoaded', () => { extendPresetApi(); renderGrids(); bindFilters(); bindUseButtons(); });
  extendPresetApi();
})();
