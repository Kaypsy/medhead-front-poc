export type EmergencyHospital = {
  id: number;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phoneNumber?: string;
  latitude: number;
  longitude: number;
};

export type EmergencySpecialty = {
  code: string;
  name: string;
};

export type EmergencyResponse = {
  hospital: EmergencyHospital;
  specialty: EmergencySpecialty;
  availableBeds: number;
  distanceKm: number;
  estimatedTimeMinutes: number;
};
