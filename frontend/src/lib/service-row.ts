export type ResidentServiceRowVisibility = {
  isCustomerSurface: boolean;
  cartOpen: boolean;
  availabilityOpen: boolean;
  discountBannerOpen: boolean;
  welcomeOpen: boolean;
};

export function shouldShowResidentServiceRow({
  isCustomerSurface,
  cartOpen,
  availabilityOpen,
  discountBannerOpen,
  welcomeOpen,
}: ResidentServiceRowVisibility) {
  return isCustomerSurface && !cartOpen && !availabilityOpen && !discountBannerOpen && !welcomeOpen;
}
