import { describe, expect, it } from "vitest";
import { BIKE_SERVICES, CAR_SERVICES, getVehicleServiceLabel, getVehicleServices, VEHICLE_SERVICE_CONTACT } from "@shared/vehicle-services";

describe("vehicle resident services", () => {
  it("keeps distinct car and bike service catalogs", () => {
    expect(CAR_SERVICES.length).toBeGreaterThan(0);
    expect(BIKE_SERVICES.length).toBeGreaterThan(0);
    expect(getVehicleServices("car")).toEqual(CAR_SERVICES);
    expect(getVehicleServices("bike")).toEqual(BIKE_SERVICES);
    expect(getVehicleServiceLabel("car")).toBe("Car Service");
    expect(getVehicleServiceLabel("bike")).toBe("Bike Service");
  });

  it("uses the shared resident service contact number", () => {
    expect(VEHICLE_SERVICE_CONTACT).toBe("9170367884");
  });
});
