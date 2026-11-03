import React from "react";
import { formatCatalogOrigin } from "../../../shared/catalog";

type CatalogOriginLabelProps = {
  value: string | null | undefined;
};

export function CatalogOriginLabel({ value }: CatalogOriginLabelProps) {
  return <p className="mt-1 text-xs text-muted-foreground">Origin: {formatCatalogOrigin(value)}</p>;
}
