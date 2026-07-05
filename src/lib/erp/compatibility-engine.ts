import type { ErpPart, InstallationCalculationInput, PartCompatibility } from "./types";

const matchesTarget = (compatibility: PartCompatibility, input: InstallationCalculationInput) => {
  if (compatibility.target_kind === "installation_type") {
    return (
      compatibility.target_id === input.installationTypeId ||
      compatibility.target_value === input.installationTypeName
    );
  }
  if (compatibility.target_kind === "brand") return compatibility.target_id === input.brandId;
  if (compatibility.target_kind === "model") return compatibility.target_id === input.modelId;
  if (compatibility.target_kind === "motorization") {
    return String(compatibility.target_value) === (input.isMotorized ? "motorized" : "manual");
  }
  return true;
};

export function filterCompatibleParts(
  parts: ErpPart[],
  compatibilities: PartCompatibility[],
  input: InstallationCalculationInput,
) {
  if (compatibilities.length === 0) return parts;
  return parts.filter((part) => {
    const partCompatibilities = compatibilities.filter((row) => row.part_id === part.id);
    return (
      partCompatibilities.length === 0 ||
      partCompatibilities.some((row) => matchesTarget(row, input))
    );
  });
}
