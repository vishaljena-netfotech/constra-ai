export type TradePackageDefinition = {
  trade: string;
  description: string;
  unit: string;
  guidance: string;
};

export type TradePackageLibrarySeed = {
  name: string;
  projectType: string;
  description: string;
  packages: TradePackageDefinition[];
};

export const DEFAULT_TRADE_PACKAGE_LIBRARIES: TradePackageLibrarySeed[] = [
  {
    name: "Commercial tenant improvement",
    projectType: "Commercial tenant improvement",
    description: "A first-pass training library for office, retail, and interior commercial fit-outs.",
    packages: [
      { trade: "General conditions & logistics", description: "Site setup, protection, temporary facilities, and closeout", unit: "scope", guidance: "Training package only. Confirm requirements from drawings and project conditions." },
      { trade: "Concrete & masonry", description: "Footings, slab repairs, curbs, and masonry infill", unit: "scope", guidance: "Training package only. Confirm dimensions and extent from drawings." },
      { trade: "Structural steel & metals", description: "Framing steel, support angles, and miscellaneous metals", unit: "scope", guidance: "Training package only. Coordinate structural and architectural details." },
      { trade: "Carpentry & interiors", description: "Rough carpentry, framing, drywall, and doors", unit: "scope", guidance: "Training package only. Verify assemblies, openings, and finish levels." },
      { trade: "Mechanical (HVAC)", description: "Air distribution, equipment connections, and controls", unit: "scope", guidance: "Training package only. Verify equipment, routing, and controls drawings." },
      { trade: "Electrical & low voltage", description: "Power, lighting, devices, data, and access control", unit: "scope", guidance: "Training package only. Verify devices, circuits, and low-voltage scope." },
      { trade: "Plumbing & fire protection", description: "Domestic water, sanitary, fixtures, and sprinkler changes", unit: "scope", guidance: "Training package only. Verify fixture count and utility routing." },
      { trade: "Finishes & closeout", description: "Ceilings, flooring, paint, specialties, cleaning, and closeout", unit: "scope", guidance: "Training package only. Verify finish schedule and closeout requirements." },
    ],
  },
  {
    name: "Ground-up multifamily",
    projectType: "Ground-up multifamily",
    description: "A training library for a typical wood-frame multifamily building workflow.",
    packages: [
      { trade: "General conditions & sitework", description: "Mobilization, earthwork coordination, temporary services, and safety", unit: "scope", guidance: "Training package only. Validate the site logistics and civil drawings." },
      { trade: "Concrete foundations", description: "Footings, foundation walls, slabs, reinforcing, and waterproofing", unit: "scope", guidance: "Training package only. Confirm structural sections and details." },
      { trade: "Wood framing & sheathing", description: "Structural framing, trusses, sheathing, and blocking", unit: "scope", guidance: "Training package only. Verify framing plans and bearing conditions." },
      { trade: "Building enclosure", description: "Roofing, flashing, windows, exterior doors, siding, and weather barriers", unit: "scope", guidance: "Training package only. Verify elevations and enclosure details." },
      { trade: "MEP rough-in", description: "Mechanical, electrical, plumbing, and fire protection rough-in", unit: "scope", guidance: "Training package only. Coordinate all MEP sheets before pricing." },
      { trade: "Interiors & closeout", description: "Drywall, cabinets, finishes, fixtures, appliances, punch, and turnover", unit: "scope", guidance: "Training package only. Verify unit mix and interior schedules." },
    ],
  },
  {
    name: "Light industrial shell",
    projectType: "Light industrial shell",
    description: "A training library for a small warehouse, flex, or light-manufacturing shell.",
    packages: [
      { trade: "Sitework & utilities", description: "Grading, paving, drainage, and utility coordination", unit: "scope", guidance: "Training package only. Confirm civil drawings and authority requirements." },
      { trade: "Foundations & slab", description: "Footings, foundation walls, slab-on-grade, and reinforcing", unit: "scope", guidance: "Training package only. Confirm structural slab loads and details." },
      { trade: "Pre-engineered metal building", description: "Primary frame, secondary steel, roof panels, and wall panels", unit: "scope", guidance: "Training package only. Verify manufacturer scope and opening schedule." },
      { trade: "Doors, loading & specialties", description: "Overhead doors, dock equipment, personnel doors, and protection", unit: "scope", guidance: "Training package only. Confirm equipment responsibilities and clearances." },
      { trade: "Core MEP systems", description: "Electrical service, lighting, plumbing core, HVAC, and fire protection", unit: "scope", guidance: "Training package only. Verify tenant versus shell system boundaries." },
      { trade: "Exterior & turnover", description: "Sealants, striping, landscaping interfaces, testing, and closeout", unit: "scope", guidance: "Training package only. Verify civil, architectural, and owner closeout requirements." },
    ],
  },
];
