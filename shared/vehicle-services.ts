export const CAR_SERVICES = [
  "Periodic car servicing",
  "Engine diagnostics",
  "Battery check and replacement",
  "Tyre puncture and replacement",
  "AC check and repair",
  "Brake inspection",
  "Car wash and detailing",
  "Emergency roadside assistance",
] as const;

export const BIKE_SERVICES = [
  "Periodic bike servicing",
  "Engine diagnostics",
  "Battery check and replacement",
  "Tyre puncture and replacement",
  "Brake inspection",
  "Chain adjustment and lubrication",
  "Bike wash and detailing",
  "Emergency roadside assistance",
] as const;

export const VEHICLE_SERVICE_CONTACT = "9170367884";

export type VehicleServiceKind = "car" | "bike";

export function getVehicleServices(kind: VehicleServiceKind) {
  return kind === "car" ? CAR_SERVICES : BIKE_SERVICES;
}

export function getVehicleServiceLabel(kind: VehicleServiceKind) {
  return kind === "car" ? "Car Service" : "Bike Service";
}
