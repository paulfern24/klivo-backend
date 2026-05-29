import { mockCreateClub, mockCreateSponsor, mockListClubs } from "./mock-db.service.js";

export function seedMockDataIfEmpty() {
  if (mockListClubs({ limit: 1 }).length > 0) {
    return;
  }

  const sponsorA = mockCreateSponsor({
    name: "SportZone",
    logo_url: "https://ui-avatars.com/api/?name=SportZone&background=f59e0b&color=fff&size=128&bold=true",
    geo_zone: "PT",
    monthly_price_chf: 500
  });

  mockCreateSponsor({
    name: "EnergyDrink",
    logo_url: "https://ui-avatars.com/api/?name=Energy&background=dc2626&color=fff&size=128&bold=true",
    geo_zone: "PT",
    monthly_price_chf: 350
  });

  mockCreateClub({
    name: "FC Azul",
    city: "Porto",
    logo_url: "https://ui-avatars.com/api/?name=FC+Azul&background=1d4ed8&color=fff&size=128&bold=true",
    sponsor_id: sponsorA.id,
    monthly_fee_chf: 120
  });

  mockCreateClub({
    name: "União Vermelha",
    city: "Lisboa",
    logo_url: "https://ui-avatars.com/api/?name=Uniao&background=b91c1c&color=fff&size=128&bold=true",
    sponsor_id: sponsorA.id,
    monthly_fee_chf: 120
  });

  console.log("Mock DB seeded with demo clubs and sponsors (logos via ui-avatars).");
}
