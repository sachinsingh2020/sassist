export interface GeoState {
  name: string;
  code: string;
  zone: "North" | "South" | "East" | "West" | "Central" | "North-East";
  cities: {
    name: string;
    district: string;
    territories: string[];
    samplePincodes: string[];
  }[];
}

export const INDIA_GEO_DATA: GeoState[] = [
  {
    name: "Maharashtra",
    code: "MH",
    zone: "West",
    cities: [
      {
        name: "Mumbai",
        district: "Mumbai Suburban",
        territories: ["Mumbai Central", "Andheri West", "Bandra Kurla", "Borivali East", "Thane City"],
        samplePincodes: ["400001", "400050", "400051", "400053", "400092"],
      },
      {
        name: "Pune",
        district: "Pune",
        territories: ["Kothrud", "Shivajinagar", "Hinjawadi IT", "Hadapsar", "Viman Nagar"],
        samplePincodes: ["411001", "411004", "411038", "411057", "411014"],
      },
      {
        name: "Nagpur",
        district: "Nagpur",
        territories: ["Sitabuldi", "Dharampeth", "Wardhaman Nagar", "MIDC Butibori"],
        samplePincodes: ["440001", "440010", "440008", "441108"],
      },
      {
        name: "Nashik",
        district: "Nashik",
        territories: ["Panchavati", "Satpur MIDC", "Indira Nagar", "Ambad"],
        samplePincodes: ["422001", "422003", "422007", "422010"],
      },
    ],
  },
  {
    name: "Delhi",
    code: "DL",
    zone: "North",
    cities: [
      {
        name: "New Delhi",
        district: "Central Delhi",
        territories: ["Connaught Place", "Karol Bagh", "Lajpat Nagar", "Chandni Chowk"],
        samplePincodes: ["110001", "110005", "110024", "110006"],
      },
      {
        name: "South Delhi",
        district: "South Delhi",
        territories: ["Saket", "Hauz Khas", "Okhla Industrial", "Nehru Place"],
        samplePincodes: ["110017", "110016", "110020", "110019"],
      },
    ],
  },
  {
    name: "Karnataka",
    code: "KA",
    zone: "South",
    cities: [
      {
        name: "Bengaluru",
        district: "Bengaluru Urban",
        territories: ["Indiranagar", "Koramangala", "Whitefield", "Jayanagar", "Electronic City"],
        samplePincodes: ["560001", "560034", "560038", "560066", "560100"],
      },
      {
        name: "Mysuru",
        district: "Mysuru",
        territories: ["Gokulam", "Jayalakshmipuram", "Kuvempunagar", "Hebbal Industrial"],
        samplePincodes: ["570001", "570002", "570023", "570016"],
      },
    ],
  },
  {
    name: "Gujarat",
    code: "GJ",
    zone: "West",
    cities: [
      {
        name: "Ahmedabad",
        district: "Ahmedabad",
        territories: ["Navrangpura", "SG Highway", "Maninagar", "Prahlad Nagar", "Naroda GIDC"],
        samplePincodes: ["380001", "380009", "380015", "380051", "382330"],
      },
      {
        name: "Surat",
        district: "Surat",
        territories: ["Athwa Lines", "Ring Road Textile", "Adajan", "Varachha Diamond"],
        samplePincodes: ["395001", "395002", "395007", "395006"],
      },
    ],
  },
  {
    name: "Tamil Nadu",
    code: "TN",
    zone: "South",
    cities: [
      {
        name: "Chennai",
        district: "Chennai",
        territories: ["T Nagar", "Anna Nagar", "Adyar", "Guindy Industrial", "Velachery"],
        samplePincodes: ["600001", "600017", "600020", "600032", "600042"],
      },
      {
        name: "Coimbatore",
        district: "Coimbatore",
        territories: ["RS Puram", "Gandhipuram", "Peelamedu", "Sidco Industrial"],
        samplePincodes: ["641001", "641002", "641004", "641021"],
      },
    ],
  },
  {
    name: "Uttar Pradesh",
    code: "UP",
    zone: "North",
    cities: [
      {
        name: "Noida",
        district: "Gautam Buddha Nagar",
        territories: ["Sector 18 Commercial", "Sector 62 IT Park", "Sector 63 Industrial", "Greater Noida"],
        samplePincodes: ["201301", "201309", "201307", "201310"],
      },
      {
        name: "Lucknow",
        district: "Lucknow",
        territories: ["Hazratganj", "Gomti Nagar", "Alambagh", "Indira Nagar"],
        samplePincodes: ["226001", "226010", "226005", "226016"],
      },
      {
        name: "Kanpur",
        district: "Kanpur Nagar",
        territories: ["Mall Road", "Fazalganj Industrial", "Civil Lines", "Govind Nagar"],
        samplePincodes: ["208001", "208012", "208006", "208022"],
      },
    ],
  },
  {
    name: "West Bengal",
    code: "WB",
    zone: "East",
    cities: [
      {
        name: "Kolkata",
        district: "Kolkata",
        territories: ["Park Street", "Salt Lake Sector V", "Bara Bazaar", "New Town"],
        samplePincodes: ["700001", "700016", "700091", "700156"],
      },
    ],
  },
  {
    name: "Telangana",
    code: "TS",
    zone: "South",
    cities: [
      {
        name: "Hyderabad",
        district: "Hyderabad",
        territories: ["HITEC City", "Banjara Hills", "Secunderabad", "Gachibowli", "Begumpet"],
        samplePincodes: ["500001", "500034", "500081", "500032", "500003"],
      },
    ],
  },
];

export function getStates(): { name: string; code: string; zone: string }[] {
  return INDIA_GEO_DATA.map((s) => ({ name: s.name, code: s.code, zone: s.zone }));
}

export function getCities(stateName: string) {
  const found = INDIA_GEO_DATA.find((s) => s.name.toLowerCase() === stateName.toLowerCase());
  return found ? found.cities : [];
}

export function getTerritories(stateName: string, cityName: string): string[] {
  const cities = getCities(stateName);
  const city = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
  return city ? city.territories : [];
}

export function getDistrict(stateName: string, cityName: string): string | null {
  const cities = getCities(stateName);
  const city = cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
  return city ? city.district : null;
}
