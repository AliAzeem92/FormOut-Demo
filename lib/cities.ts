// TEMPORARY: replace with PostEx official operational cities

export interface CityOption {
  value: string;
  label: string;
}

export const CITIES: readonly CityOption[] = [
  { value: "Karachi", label: "Karachi" },
  { value: "Lahore", label: "Lahore" },
  { value: "Islamabad", label: "Islamabad" },
  { value: "Rawalpindi", label: "Rawalpindi" },
  { value: "Faisalabad", label: "Faisalabad" },
  { value: "Multan", label: "Multan" },
  { value: "Peshawar", label: "Peshawar" },
  { value: "Quetta", label: "Quetta" },
  { value: "Sialkot", label: "Sialkot" },
  { value: "Gujranwala", label: "Gujranwala" },
  { value: "Hyderabad", label: "Hyderabad" },
  { value: "Bahawalpur", label: "Bahawalpur" },
  { value: "Sargodha", label: "Sargodha" },
  { value: "Sukkur", label: "Sukkur" },
  { value: "Larkana", label: "Larkana" },
] as const;

export const CITY_VALUES = CITIES.map((c) => c.value);
