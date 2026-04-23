export interface CityData {
  name: string;
  state: string;
  lat: number;
  lng: number;
  tz: number; // UTC offset in hours (IST = +5.5)
}

// 200+ major Indian cities with coordinates
export const INDIAN_CITIES: CityData[] = [
  // Maharashtra
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, tz: 5.5 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, tz: 5.5 },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, tz: 5.5 },
  { name: 'Nashik', state: 'Maharashtra', lat: 20.0059, lng: 73.7898, tz: 5.5 },
  { name: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, tz: 5.5 },
  { name: 'Solapur', state: 'Maharashtra', lat: 17.6805, lng: 75.9064, tz: 5.5 },
  { name: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433, tz: 5.5 },
  { name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781, tz: 5.5 },
  { name: 'Amravati', state: 'Maharashtra', lat: 20.9333, lng: 77.7500, tz: 5.5 },
  { name: 'Nanded', state: 'Maharashtra', lat: 19.1383, lng: 77.3210, tz: 5.5 },
  // Delhi & NCR
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, tz: 5.5 },
  { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025, tz: 5.5 },
  { name: 'Gurgaon', state: 'Haryana', lat: 28.4595, lng: 77.0266, tz: 5.5 },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910, tz: 5.5 },
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178, tz: 5.5 },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538, tz: 5.5 },
  // Karnataka
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, tz: 5.5 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946, tz: 5.5 },
  { name: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394, tz: 5.5 },
  { name: 'Mysore', state: 'Karnataka', lat: 12.2958, lng: 76.6394, tz: 5.5 },
  { name: 'Hubballi', state: 'Karnataka', lat: 15.3647, lng: 75.1240, tz: 5.5 },
  { name: 'Mangaluru', state: 'Karnataka', lat: 12.9141, lng: 74.8560, tz: 5.5 },
  { name: 'Belagavi', state: 'Karnataka', lat: 15.8497, lng: 74.4977, tz: 5.5 },
  { name: 'Kalaburagi', state: 'Karnataka', lat: 17.3297, lng: 76.8343, tz: 5.5 },
  // Tamil Nadu
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, tz: 5.5 },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, tz: 5.5 },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, tz: 5.5 },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, tz: 5.5 },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460, tz: 5.5 },
  { name: 'Tirunelveli', state: 'Tamil Nadu', lat: 8.7139, lng: 77.7567, tz: 5.5 },
  { name: 'Vellore', state: 'Tamil Nadu', lat: 12.9165, lng: 79.1325, tz: 5.5 },
  { name: 'Erode', state: 'Tamil Nadu', lat: 11.3410, lng: 77.7172, tz: 5.5 },
  // Telangana
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, tz: 5.5 },
  { name: 'Warangal', state: 'Telangana', lat: 17.9784, lng: 79.5941, tz: 5.5 },
  { name: 'Nizamabad', state: 'Telangana', lat: 18.6725, lng: 78.0941, tz: 5.5 },
  { name: 'Khammam', state: 'Telangana', lat: 17.2473, lng: 80.1514, tz: 5.5 },
  // Andhra Pradesh
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, tz: 5.5 },
  { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480, tz: 5.5 },
  { name: 'Guntur', state: 'Andhra Pradesh', lat: 16.2985, lng: 80.4575, tz: 5.5 },
  { name: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865, tz: 5.5 },
  { name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, tz: 5.5 },
  { name: 'Kurnool', state: 'Andhra Pradesh', lat: 15.8281, lng: 78.0373, tz: 5.5 },
  // Gujarat
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, tz: 5.5 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, tz: 5.5 },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, tz: 5.5 },
  { name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022, tz: 5.5 },
  { name: 'Gandhinagar', state: 'Gujarat', lat: 23.2156, lng: 72.6369, tz: 5.5 },
  { name: 'Bhavnagar', state: 'Gujarat', lat: 21.7645, lng: 72.1519, tz: 5.5 },
  { name: 'Jamnagar', state: 'Gujarat', lat: 22.4707, lng: 70.0577, tz: 5.5 },
  { name: 'Junagadh', state: 'Gujarat', lat: 21.5222, lng: 70.4579, tz: 5.5 },
  // Rajasthan
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, tz: 5.5 },
  { name: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, tz: 5.5 },
  { name: 'Kota', state: 'Rajasthan', lat: 25.2138, lng: 75.8648, tz: 5.5 },
  { name: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lng: 73.3119, tz: 5.5 },
  { name: 'Ajmer', state: 'Rajasthan', lat: 26.4499, lng: 74.6399, tz: 5.5 },
  { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, tz: 5.5 },
  { name: 'Alwar', state: 'Rajasthan', lat: 27.5530, lng: 76.6346, tz: 5.5 },
  { name: 'Bharatpur', state: 'Rajasthan', lat: 27.2152, lng: 77.4922, tz: 5.5 },
  // Uttar Pradesh
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, tz: 5.5 },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, tz: 5.5 },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, tz: 5.5 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, tz: 5.5 },
  { name: 'Allahabad', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463, tz: 5.5 },
  { name: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463, tz: 5.5 },
  { name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064, tz: 5.5 },
  { name: 'Bareilly', state: 'Uttar Pradesh', lat: 28.3670, lng: 79.4304, tz: 5.5 },
  { name: 'Aligarh', state: 'Uttar Pradesh', lat: 27.8974, lng: 78.0880, tz: 5.5 },
  { name: 'Moradabad', state: 'Uttar Pradesh', lat: 28.8386, lng: 78.7733, tz: 5.5 },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', lat: 26.7606, lng: 83.3732, tz: 5.5 },
  { name: 'Firozabad', state: 'Uttar Pradesh', lat: 27.1591, lng: 78.3957, tz: 5.5 },
  { name: 'Mathura', state: 'Uttar Pradesh', lat: 27.4924, lng: 77.6737, tz: 5.5 },
  // Madhya Pradesh
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, tz: 5.5 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, tz: 5.5 },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864, tz: 5.5 },
  { name: 'Gwalior', state: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828, tz: 5.5 },
  { name: 'Ujjain', state: 'Madhya Pradesh', lat: 23.1765, lng: 75.7885, tz: 5.5 },
  { name: 'Sagar', state: 'Madhya Pradesh', lat: 23.8388, lng: 78.7378, tz: 5.5 },
  { name: 'Ratlam', state: 'Madhya Pradesh', lat: 23.3313, lng: 75.0375, tz: 5.5 },
  { name: 'Dewas', state: 'Madhya Pradesh', lat: 22.9623, lng: 76.0511, tz: 5.5 },
  // West Bengal
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, tz: 5.5 },
  { name: 'Howrah', state: 'West Bengal', lat: 22.5958, lng: 88.2636, tz: 5.5 },
  { name: 'Durgapur', state: 'West Bengal', lat: 23.5204, lng: 87.3119, tz: 5.5 },
  { name: 'Asansol', state: 'West Bengal', lat: 23.6739, lng: 86.9524, tz: 5.5 },
  { name: 'Siliguri', state: 'West Bengal', lat: 26.7271, lng: 88.3953, tz: 5.5 },
  // Punjab & Haryana
  { name: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794, tz: 5.5 },
  { name: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573, tz: 5.5 },
  { name: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, tz: 5.5 },
  { name: 'Jalandhar', state: 'Punjab', lat: 31.3260, lng: 75.5762, tz: 5.5 },
  { name: 'Patiala', state: 'Punjab', lat: 30.3398, lng: 76.3869, tz: 5.5 },
  { name: 'Ambala', state: 'Haryana', lat: 30.3752, lng: 76.7821, tz: 5.5 },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, tz: 5.5 },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066, tz: 5.5 },
  // Bihar & Jharkhand
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, tz: 5.5 },
  { name: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 85.0002, tz: 5.5 },
  { name: 'Bhagalpur', state: 'Bihar', lat: 25.2425, lng: 86.9842, tz: 5.5 },
  { name: 'Muzaffarpur', state: 'Bihar', lat: 26.1209, lng: 85.3647, tz: 5.5 },
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, tz: 5.5 },
  { name: 'Jamshedpur', state: 'Jharkhand', lat: 22.8046, lng: 86.2029, tz: 5.5 },
  { name: 'Dhanbad', state: 'Jharkhand', lat: 23.7957, lng: 86.4304, tz: 5.5 },
  // Odisha
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, tz: 5.5 },
  { name: 'Cuttack', state: 'Odisha', lat: 20.4625, lng: 85.8828, tz: 5.5 },
  { name: 'Rourkela', state: 'Odisha', lat: 22.2604, lng: 84.8536, tz: 5.5 },
  // Assam & Northeast
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, tz: 5.5 },
  { name: 'Silchar', state: 'Assam', lat: 24.8333, lng: 92.7789, tz: 5.5 },
  { name: 'Dibrugarh', state: 'Assam', lat: 27.4728, lng: 94.9120, tz: 5.5 },
  { name: 'Imphal', state: 'Manipur', lat: 24.8170, lng: 93.9368, tz: 5.5 },
  { name: 'Shillong', state: 'Meghalaya', lat: 25.5788, lng: 91.8933, tz: 5.5 },
  { name: 'Agartala', state: 'Tripura', lat: 23.8315, lng: 91.2868, tz: 5.5 },
  { name: 'Aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176, tz: 5.5 },
  // Himachal Pradesh & Uttarakhand
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, tz: 5.5 },
  { name: 'Dharamsala', state: 'Himachal Pradesh', lat: 32.2190, lng: 76.3234, tz: 5.5 },
  { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, tz: 5.5 },
  { name: 'Haridwar', state: 'Uttarakhand', lat: 29.9457, lng: 78.1642, tz: 5.5 },
  { name: 'Rishikesh', state: 'Uttarakhand', lat: 30.0869, lng: 78.2676, tz: 5.5 },
  // Kerala
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, tz: 5.5 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, tz: 5.5 },
  { name: 'Kozhikode', state: 'Kerala', lat: 11.2588, lng: 75.7804, tz: 5.5 },
  { name: 'Thrissur', state: 'Kerala', lat: 10.5276, lng: 76.2144, tz: 5.5 },
  { name: 'Kollam', state: 'Kerala', lat: 8.8932, lng: 76.6141, tz: 5.5 },
  // Goa
  { name: 'Panaji', state: 'Goa', lat: 15.4989, lng: 73.8278, tz: 5.5 },
  { name: 'Margao', state: 'Goa', lat: 15.2832, lng: 73.9862, tz: 5.5 },
  // J&K
  { name: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.0837, lng: 74.7973, tz: 5.5 },
  { name: 'Jammu', state: 'Jammu & Kashmir', lat: 32.7266, lng: 74.8570, tz: 5.5 },
  // Chhattisgarh
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, tz: 5.5 },
  { name: 'Bhilai', state: 'Chhattisgarh', lat: 21.1938, lng: 81.3509, tz: 5.5 },
  { name: 'Bilaspur', state: 'Chhattisgarh', lat: 22.0797, lng: 82.1409, tz: 5.5 },
  // Tripura
  { name: 'Udaipur', state: 'Tripura', lat: 23.5328, lng: 91.4856, tz: 5.5 },
  // Other notable cities
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, tz: 5.5 },
  { name: 'Leh', state: 'Ladakh', lat: 34.1526, lng: 77.5771, tz: 5.5 },
  { name: 'Port Blair', state: 'Andaman & Nicobar', lat: 11.6234, lng: 92.7265, tz: 5.5 },
  { name: 'Puducherry', state: 'Puducherry', lat: 11.9416, lng: 79.8083, tz: 5.5 },
];

export function searchCities(query: string): CityData[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return INDIAN_CITIES.filter(
    c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
  ).slice(0, 8);
}

export function getCityByName(name: string): CityData | undefined {
  const n = name.toLowerCase().trim();
  return INDIAN_CITIES.find(c => c.name.toLowerCase() === n);
}
