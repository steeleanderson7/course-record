/**
 * Major-city reference dots for the state-view territory map (see
 * `lib/geo/stateMapDetail.ts` and `components/map/StateMap.tsx`) — purely
 * for orientation, never interactive. 4-6 cities per state: the capital and
 * largest city/cities, plus one or two smaller-but-recognizable picks (same
 * mix the design handoff used for Utah: Salt Lake City/Provo/Ogden are
 * capital/largest, St. George/Park City are smaller but well-known). Hand-
 * compiled from general knowledge, the same workflow already used for
 * `scripts/seed-tpc-courses.ts`'s/`seed-architect-courses.ts`'s course
 * lists — lat/lon here are approximate city-center coordinates, fine for a
 * stylized reference dot, not meant to be survey-grade.
 *
 * Keyed by the exact state-name strings `US_STATE_FEATURES` already uses
 * (see `lib/geo/us-projection.ts`), e.g. "Utah", "New York".
 */

export type CityRef = { name: string; lat: number; lon: number };

export const US_STATE_CITIES: Record<string, CityRef[]> = {
  Alabama: [
    { name: "Birmingham", lat: 33.5207, lon: -86.8025 },
    { name: "Montgomery", lat: 32.3668, lon: -86.3 },
    { name: "Mobile", lat: 30.6954, lon: -88.0399 },
    { name: "Huntsville", lat: 34.7304, lon: -86.5861 },
  ],
  Alaska: [
    { name: "Anchorage", lat: 61.2181, lon: -149.9003 },
    { name: "Juneau", lat: 58.3019, lon: -134.4197 },
    { name: "Fairbanks", lat: 64.8378, lon: -147.7164 },
  ],
  Arizona: [
    { name: "Phoenix", lat: 33.4484, lon: -112.074 },
    { name: "Tucson", lat: 32.2226, lon: -110.9747 },
    { name: "Flagstaff", lat: 35.1983, lon: -111.6513 },
    { name: "Scottsdale", lat: 33.4942, lon: -111.9261 },
    { name: "Sedona", lat: 34.8697, lon: -111.761 },
  ],
  Arkansas: [
    { name: "Little Rock", lat: 34.7465, lon: -92.2896 },
    { name: "Fayetteville", lat: 36.0626, lon: -94.1574 },
    { name: "Hot Springs", lat: 34.5037, lon: -93.0552 },
    { name: "Fort Smith", lat: 35.3859, lon: -94.3985 },
  ],
  California: [
    { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
    { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
    { name: "San Diego", lat: 32.7157, lon: -117.1611 },
    { name: "Sacramento", lat: 38.5816, lon: -121.4944 },
    { name: "Palm Springs", lat: 33.8303, lon: -116.5453 },
  ],
  Colorado: [
    { name: "Denver", lat: 39.7392, lon: -104.9903 },
    { name: "Colorado Springs", lat: 38.8339, lon: -104.8214 },
    { name: "Boulder", lat: 40.015, lon: -105.2705 },
    { name: "Aspen", lat: 39.1911, lon: -106.8175 },
    { name: "Vail", lat: 39.6403, lon: -106.3742 },
  ],
  Connecticut: [
    { name: "Hartford", lat: 41.7658, lon: -72.6734 },
    { name: "Bridgeport", lat: 41.1792, lon: -73.1894 },
    { name: "New Haven", lat: 41.3083, lon: -72.9279 },
    { name: "Stamford", lat: 41.0534, lon: -73.5387 },
  ],
  Delaware: [
    { name: "Dover", lat: 39.1582, lon: -75.5244 },
    { name: "Wilmington", lat: 39.7447, lon: -75.5466 },
    { name: "Rehoboth Beach", lat: 38.721, lon: -75.076 },
  ],
  Florida: [
    { name: "Miami", lat: 25.7617, lon: -80.1918 },
    { name: "Orlando", lat: 28.5383, lon: -81.3792 },
    { name: "Tampa", lat: 27.9506, lon: -82.4572 },
    { name: "Jacksonville", lat: 30.3322, lon: -81.6557 },
    { name: "Tallahassee", lat: 30.4383, lon: -84.2807 },
    { name: "Naples", lat: 26.142, lon: -81.7948 },
  ],
  Georgia: [
    { name: "Atlanta", lat: 33.749, lon: -84.388 },
    { name: "Savannah", lat: 32.0809, lon: -81.0912 },
    { name: "Augusta", lat: 33.4735, lon: -82.0105 },
    { name: "Columbus", lat: 32.461, lon: -84.9877 },
  ],
  Hawaii: [
    { name: "Honolulu", lat: 21.3069, lon: -157.8583 },
    { name: "Hilo", lat: 19.7297, lon: -155.089 },
    { name: "Lahaina", lat: 20.8783, lon: -156.6825 },
    { name: "Kailua-Kona", lat: 19.64, lon: -155.9969 },
  ],
  Idaho: [
    { name: "Boise", lat: 43.615, lon: -116.2023 },
    { name: "Coeur d'Alene", lat: 47.6777, lon: -116.7805 },
    { name: "Idaho Falls", lat: 43.4917, lon: -112.0339 },
    { name: "Sun Valley", lat: 43.6963, lon: -114.3517 },
  ],
  Illinois: [
    { name: "Chicago", lat: 41.8781, lon: -87.6298 },
    { name: "Springfield", lat: 39.7817, lon: -89.6501 },
    { name: "Peoria", lat: 40.6936, lon: -89.589 },
    { name: "Naperville", lat: 41.7508, lon: -88.1535 },
    { name: "Rockford", lat: 42.2711, lon: -89.094 },
  ],
  Indiana: [
    { name: "Indianapolis", lat: 39.7684, lon: -86.1581 },
    { name: "Fort Wayne", lat: 41.0793, lon: -85.1394 },
    { name: "South Bend", lat: 41.6764, lon: -86.252 },
    { name: "Gary", lat: 41.5934, lon: -87.3464 },
  ],
  Iowa: [
    { name: "Des Moines", lat: 41.5868, lon: -93.625 },
    { name: "Cedar Rapids", lat: 41.9779, lon: -91.6656 },
    { name: "Iowa City", lat: 41.6611, lon: -91.5302 },
    { name: "Davenport", lat: 41.5236, lon: -90.5776 },
  ],
  Kansas: [
    { name: "Wichita", lat: 37.6872, lon: -97.3301 },
    { name: "Topeka", lat: 39.0473, lon: -95.6752 },
    { name: "Overland Park", lat: 38.9822, lon: -94.6708 },
    { name: "Dodge City", lat: 37.7528, lon: -100.0171 },
  ],
  Kentucky: [
    { name: "Louisville", lat: 38.2527, lon: -85.7585 },
    { name: "Lexington", lat: 38.0406, lon: -84.5037 },
    { name: "Frankfort", lat: 38.2009, lon: -84.8733 },
    { name: "Bowling Green", lat: 36.9685, lon: -86.4808 },
  ],
  Louisiana: [
    { name: "New Orleans", lat: 29.9511, lon: -90.0715 },
    { name: "Baton Rouge", lat: 30.4515, lon: -91.1871 },
    { name: "Lafayette", lat: 30.2241, lon: -92.0198 },
    { name: "Shreveport", lat: 32.5252, lon: -93.7502 },
  ],
  Maine: [
    { name: "Portland", lat: 43.6591, lon: -70.2568 },
    { name: "Augusta", lat: 44.3106, lon: -69.7795 },
    { name: "Bar Harbor", lat: 44.3876, lon: -68.2039 },
    { name: "Bangor", lat: 44.8012, lon: -68.7778 },
  ],
  Maryland: [
    { name: "Baltimore", lat: 39.2904, lon: -76.6122 },
    { name: "Annapolis", lat: 38.9784, lon: -76.4922 },
    { name: "Ocean City", lat: 38.3365, lon: -75.0849 },
    { name: "Frederick", lat: 39.4143, lon: -77.4105 },
  ],
  Massachusetts: [
    { name: "Boston", lat: 42.3601, lon: -71.0589 },
    { name: "Cambridge", lat: 42.3736, lon: -71.1097 },
    { name: "Worcester", lat: 42.2626, lon: -71.8023 },
    { name: "Hyannis", lat: 41.6529, lon: -70.2856 },
    { name: "Springfield", lat: 42.1015, lon: -72.5898 },
  ],
  Michigan: [
    { name: "Detroit", lat: 42.3314, lon: -83.0458 },
    { name: "Grand Rapids", lat: 42.9634, lon: -85.6681 },
    { name: "Lansing", lat: 42.7325, lon: -84.5555 },
    { name: "Ann Arbor", lat: 42.2808, lon: -83.743 },
    { name: "Traverse City", lat: 44.7631, lon: -85.6206 },
  ],
  Minnesota: [
    { name: "Minneapolis", lat: 44.9778, lon: -93.265 },
    { name: "St. Paul", lat: 44.9537, lon: -93.09 },
    { name: "Duluth", lat: 46.7867, lon: -92.1005 },
    { name: "Rochester", lat: 44.0121, lon: -92.4802 },
  ],
  Mississippi: [
    { name: "Jackson", lat: 32.2988, lon: -90.1848 },
    { name: "Gulfport", lat: 30.3674, lon: -89.0928 },
    { name: "Biloxi", lat: 30.396, lon: -88.8853 },
    { name: "Tupelo", lat: 34.2576, lon: -88.7034 },
  ],
  Missouri: [
    { name: "St. Louis", lat: 38.627, lon: -90.1994 },
    { name: "Kansas City", lat: 39.0997, lon: -94.5786 },
    { name: "Jefferson City", lat: 38.5767, lon: -92.1735 },
    { name: "Branson", lat: 36.6437, lon: -93.2185 },
    { name: "Springfield", lat: 37.209, lon: -93.2923 },
  ],
  Montana: [
    { name: "Billings", lat: 45.7833, lon: -108.5007 },
    { name: "Missoula", lat: 46.8721, lon: -113.994 },
    { name: "Helena", lat: 46.5891, lon: -112.0391 },
    { name: "Bozeman", lat: 45.677, lon: -111.0429 },
    { name: "Kalispell", lat: 48.192, lon: -114.3168 },
  ],
  Nebraska: [
    { name: "Omaha", lat: 41.2565, lon: -95.9345 },
    { name: "Lincoln", lat: 40.8136, lon: -96.7026 },
    { name: "Kearney", lat: 40.6993, lon: -99.0817 },
    { name: "North Platte", lat: 41.1239, lon: -100.7654 },
  ],
  Nevada: [
    { name: "Las Vegas", lat: 36.1699, lon: -115.1398 },
    { name: "Reno", lat: 39.5296, lon: -119.8138 },
    { name: "Carson City", lat: 39.1638, lon: -119.7674 },
    { name: "Henderson", lat: 36.0395, lon: -114.9817 },
  ],
  "New Hampshire": [
    { name: "Manchester", lat: 42.9956, lon: -71.4548 },
    { name: "Concord", lat: 43.2081, lon: -71.5376 },
    { name: "Nashua", lat: 42.7654, lon: -71.4676 },
    { name: "Portsmouth", lat: 43.0718, lon: -70.7626 },
  ],
  "New Jersey": [
    { name: "Newark", lat: 40.7357, lon: -74.1724 },
    { name: "Jersey City", lat: 40.7178, lon: -74.0431 },
    { name: "Trenton", lat: 40.2171, lon: -74.7429 },
    { name: "Atlantic City", lat: 39.3643, lon: -74.4229 },
    { name: "Princeton", lat: 40.3573, lon: -74.6672 },
  ],
  "New Mexico": [
    { name: "Albuquerque", lat: 35.0844, lon: -106.6504 },
    { name: "Santa Fe", lat: 35.687, lon: -105.9378 },
    { name: "Las Cruces", lat: 32.3199, lon: -106.7637 },
    { name: "Taos", lat: 36.4072, lon: -105.5731 },
  ],
  "New York": [
    { name: "New York City", lat: 40.7128, lon: -74.006 },
    { name: "Buffalo", lat: 42.8864, lon: -78.8784 },
    { name: "Albany", lat: 42.6526, lon: -73.7562 },
    { name: "Rochester", lat: 43.1566, lon: -77.6088 },
    { name: "Syracuse", lat: 43.0481, lon: -76.1474 },
  ],
  "North Carolina": [
    { name: "Charlotte", lat: 35.2271, lon: -80.8431 },
    { name: "Raleigh", lat: 35.7796, lon: -78.6382 },
    { name: "Asheville", lat: 35.5951, lon: -82.5515 },
    { name: "Wilmington", lat: 34.2257, lon: -77.9447 },
    { name: "Pinehurst", lat: 35.1954, lon: -79.4695 },
  ],
  "North Dakota": [
    { name: "Fargo", lat: 46.8772, lon: -96.7898 },
    { name: "Bismarck", lat: 46.8083, lon: -100.7837 },
    { name: "Grand Forks", lat: 47.9253, lon: -97.0329 },
    { name: "Minot", lat: 48.233, lon: -101.2963 },
  ],
  Ohio: [
    { name: "Columbus", lat: 39.9612, lon: -82.9988 },
    { name: "Cleveland", lat: 41.4993, lon: -81.6944 },
    { name: "Cincinnati", lat: 39.1031, lon: -84.512 },
    { name: "Toledo", lat: 41.6528, lon: -83.5379 },
  ],
  Oklahoma: [
    { name: "Oklahoma City", lat: 35.4676, lon: -97.5164 },
    { name: "Tulsa", lat: 36.154, lon: -95.9928 },
    { name: "Norman", lat: 35.2226, lon: -97.4395 },
    { name: "Stillwater", lat: 36.1156, lon: -97.0584 },
  ],
  Oregon: [
    { name: "Portland", lat: 45.5152, lon: -122.6784 },
    { name: "Salem", lat: 44.9429, lon: -123.0351 },
    { name: "Eugene", lat: 44.0521, lon: -123.0868 },
    { name: "Bend", lat: 44.0582, lon: -121.3153 },
  ],
  Pennsylvania: [
    { name: "Philadelphia", lat: 39.9526, lon: -75.1652 },
    { name: "Pittsburgh", lat: 40.4406, lon: -79.9959 },
    { name: "Harrisburg", lat: 40.2732, lon: -76.8867 },
    { name: "Erie", lat: 42.1292, lon: -80.0851 },
    { name: "Lancaster", lat: 40.0379, lon: -76.3055 },
  ],
  "Rhode Island": [
    { name: "Providence", lat: 41.824, lon: -71.4128 },
    { name: "Newport", lat: 41.4901, lon: -71.3128 },
    { name: "Warwick", lat: 41.7001, lon: -71.4162 },
  ],
  "South Carolina": [
    { name: "Columbia", lat: 34.0007, lon: -81.0348 },
    { name: "Charleston", lat: 32.7765, lon: -79.9311 },
    { name: "Myrtle Beach", lat: 33.6891, lon: -78.8867 },
    { name: "Greenville", lat: 34.8526, lon: -82.394 },
  ],
  "South Dakota": [
    { name: "Sioux Falls", lat: 43.5446, lon: -96.7311 },
    { name: "Rapid City", lat: 44.0805, lon: -103.231 },
    { name: "Pierre", lat: 44.3683, lon: -100.3509 },
    { name: "Deadwood", lat: 44.3767, lon: -103.7294 },
  ],
  Tennessee: [
    { name: "Nashville", lat: 36.1627, lon: -86.7816 },
    { name: "Memphis", lat: 35.1495, lon: -90.049 },
    { name: "Knoxville", lat: 35.9606, lon: -83.9207 },
    { name: "Chattanooga", lat: 35.0456, lon: -85.3097 },
  ],
  Texas: [
    { name: "Houston", lat: 29.7604, lon: -95.3698 },
    { name: "San Antonio", lat: 29.4241, lon: -98.4936 },
    { name: "Dallas", lat: 32.7767, lon: -96.797 },
    { name: "Austin", lat: 30.2672, lon: -97.7431 },
    { name: "Fort Worth", lat: 32.7555, lon: -97.3308 },
  ],
  Utah: [
    { name: "Salt Lake City", lat: 40.7608, lon: -111.891 },
    { name: "Provo", lat: 40.2338, lon: -111.6585 },
    { name: "Ogden", lat: 41.223, lon: -111.9738 },
    { name: "St. George", lat: 37.0965, lon: -113.5684 },
    { name: "Park City", lat: 40.6461, lon: -111.498 },
  ],
  Vermont: [
    { name: "Burlington", lat: 44.4759, lon: -73.2121 },
    { name: "Montpelier", lat: 44.2601, lon: -72.5754 },
    { name: "Stowe", lat: 44.4654, lon: -72.6874 },
  ],
  Virginia: [
    { name: "Virginia Beach", lat: 36.8529, lon: -75.978 },
    { name: "Richmond", lat: 37.5407, lon: -77.436 },
    { name: "Norfolk", lat: 36.8508, lon: -76.2859 },
    { name: "Charlottesville", lat: 38.0293, lon: -78.4767 },
    { name: "Alexandria", lat: 38.8048, lon: -77.0469 },
  ],
  Washington: [
    { name: "Seattle", lat: 47.6062, lon: -122.3321 },
    { name: "Spokane", lat: 47.6588, lon: -117.426 },
    { name: "Tacoma", lat: 47.2529, lon: -122.4443 },
    { name: "Olympia", lat: 47.0379, lon: -122.9007 },
  ],
  "West Virginia": [
    { name: "Charleston", lat: 38.3498, lon: -81.6326 },
    { name: "Morgantown", lat: 39.6295, lon: -79.9559 },
    { name: "Harpers Ferry", lat: 39.3246, lon: -77.7392 },
    { name: "Huntington", lat: 38.4192, lon: -82.4452 },
  ],
  Wisconsin: [
    { name: "Milwaukee", lat: 43.0389, lon: -87.9065 },
    { name: "Madison", lat: 43.0731, lon: -89.4012 },
    { name: "Green Bay", lat: 44.5133, lon: -88.0133 },
    { name: "Sturgeon Bay", lat: 44.8343, lon: -87.3773 },
  ],
  Wyoming: [
    { name: "Cheyenne", lat: 41.14, lon: -104.8202 },
    { name: "Jackson", lat: 43.4799, lon: -110.7624 },
    { name: "Casper", lat: 42.8501, lon: -106.3252 },
    { name: "Laramie", lat: 41.3114, lon: -105.5911 },
  ],
};
