export interface ProductionMix {
  wind: number;
  solar: number;
  nuclear: number;
  gas: number;
  hydro: number;
  coal: number;
  biomass: number;
}

export interface EnergyData {
  zoneId: string;
  zoneName: string;
  demand: number; // in MW or relative units for 3D height
  spotPrice: number; // in EUR/MWh
  carbonIntensity: number; // gCO2/kWh
  productionMix: ProductionMix;
  timestamp: string;
}

export interface BiddingZoneFeature {
  type: "Feature";
  id: string;
  properties: {
    name: string;
    country: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
}
