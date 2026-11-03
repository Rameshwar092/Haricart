import { VehicleServiceContact } from "@/components/VehicleServiceContact";

export function BikeServiceContact(props: Omit<React.ComponentProps<typeof VehicleServiceContact>, "kind">) {
  return <VehicleServiceContact {...props} kind="bike" />;
}
