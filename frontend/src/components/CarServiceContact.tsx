import { VehicleServiceContact } from "@/components/VehicleServiceContact";

export function CarServiceContact(props: Omit<React.ComponentProps<typeof VehicleServiceContact>, "kind">) {
  return <VehicleServiceContact {...props} kind="car" />;
}
