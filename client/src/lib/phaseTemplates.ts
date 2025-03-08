/**
 * Pool and construction project phase templates
 * These templates provide standardized phases for different types of construction projects
 */

export interface PhaseTemplate {
  name: string;
  description: string;
  estimatedDuration: number;
  order: number;
  permitRequired?: boolean;
  inspectionRequired?: boolean;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  phases: PhaseTemplate[];
}

/**
 * Gunite Pool Construction Template
 * Provides standardized phases for gunite pool construction projects
 */
export const gunitePoolTemplate: ProjectTemplate = {
  name: "Gunite Pool Construction",
  description: "Standard phases for constructing a gunite (shotcrete) swimming pool",
  phases: [
    {
      name: "Design and Permitting",
      description: "Creating pool design, obtaining necessary permits and approvals",
      estimatedDuration: 14,
      order: 1,
      permitRequired: true,
      inspectionRequired: false
    },
    {
      name: "Layout and Excavation",
      description: "Marking pool boundaries and excavating the pool area",
      estimatedDuration: 5,
      order: 2,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Plumbing and Electrical",
      description: "Installing plumbing lines, drains, and electrical conduits",
      estimatedDuration: 4,
      order: 3,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Steel Framework",
      description: "Creating and installing the steel rebar framework",
      estimatedDuration: 3,
      order: 4,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Gunite Application",
      description: "Applying gunite/shotcrete to form the pool shell",
      estimatedDuration: 2,
      order: 5,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Coping and Tile",
      description: "Installing coping stones and waterline tile",
      estimatedDuration: 4,
      order: 6,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Deck Construction",
      description: "Building the pool deck and surrounding areas",
      estimatedDuration: 7,
      order: 7,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Interior Finish",
      description: "Applying plaster or other interior finish to the pool",
      estimatedDuration: 3,
      order: 8,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Equipment Installation",
      description: "Installing pump, filter, heater, and other equipment",
      estimatedDuration: 2,
      order: 9,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Filling and Chemical Balancing",
      description: "Filling the pool and balancing chemicals",
      estimatedDuration: 3,
      order: 10,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Final Inspection and Handover",
      description: "Final inspection, client training, and project completion",
      estimatedDuration: 1,
      order: 11,
      permitRequired: false,
      inspectionRequired: true
    }
  ]
};

/**
 * Fiberglass Pool Installation Template
 * Provides standardized phases for fiberglass pool installation projects
 */
export const fiberglassPoolTemplate: ProjectTemplate = {
  name: "Fiberglass Pool Installation",
  description: "Standard phases for installing a pre-fabricated fiberglass swimming pool",
  phases: [
    {
      name: "Design and Permitting",
      description: "Selecting pool model, creating site plan, obtaining necessary permits",
      estimatedDuration: 10,
      order: 1,
      permitRequired: true,
      inspectionRequired: false
    },
    {
      name: "Site Preparation",
      description: "Clearing the site, marking pool boundaries, and prep work",
      estimatedDuration: 2,
      order: 2,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Excavation",
      description: "Digging the hole to spec with precise dimensions for the fiberglass shell",
      estimatedDuration: 3,
      order: 3,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Base Preparation",
      description: "Installing drainage system and preparing sand or gravel base",
      estimatedDuration: 2,
      order: 4,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Plumbing and Electrical",
      description: "Installing plumbing lines, electrical conduits, and equipment pad",
      estimatedDuration: 3,
      order: 5,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Pool Delivery and Setting",
      description: "Delivering and crane-setting the fiberglass shell into position",
      estimatedDuration: 1,
      order: 6,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Backfilling",
      description: "Carefully backfilling around the pool shell with specified material",
      estimatedDuration: 2,
      order: 7,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Coping and Patio",
      description: "Installing coping and constructing the surrounding deck or patio",
      estimatedDuration: 5,
      order: 8,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Equipment Installation",
      description: "Installing pump, filter, heater, and other equipment",
      estimatedDuration: 2,
      order: 9,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Filling and Startup",
      description: "Filling the pool, starting equipment, and balancing chemicals",
      estimatedDuration: 2,
      order: 10,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Final Inspection and Handover",
      description: "Final inspection, client training, and project completion",
      estimatedDuration: 1,
      order: 11,
      permitRequired: false,
      inspectionRequired: true
    }
  ]
};

/**
 * Additional templates can be added here
 */

/**
 * Vinyl Liner Pool Construction Template
 * Provides standardized phases for vinyl liner pool construction projects
 */
export const vinylPoolTemplate: ProjectTemplate = {
  name: "Vinyl Liner Pool Construction",
  description: "Standard phases for constructing a vinyl liner swimming pool",
  phases: [
    {
      name: "Design and Permitting",
      description: "Creating pool design, selecting liner pattern, obtaining permits",
      estimatedDuration: 10,
      order: 1,
      permitRequired: true,
      inspectionRequired: false
    },
    {
      name: "Layout and Excavation",
      description: "Marking pool boundaries and excavating the pool area",
      estimatedDuration: 3,
      order: 2,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Drainage and Base",
      description: "Installing drainage system and preparing crushed stone base",
      estimatedDuration: 2,
      order: 3,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Wall Panel Installation",
      description: "Assembling and installing wall panels (steel, polymer, or aluminum)",
      estimatedDuration: 3,
      order: 4,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Plumbing and Electrical",
      description: "Installing plumbing lines, drains, and electrical components",
      estimatedDuration: 3,
      order: 5,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Floor Preparation",
      description: "Pouring vermiculite or sand bottom and troweling smooth",
      estimatedDuration: 2,
      order: 6,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Liner Installation",
      description: "Installing and securing the vinyl liner",
      estimatedDuration: 1,
      order: 7,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Coping and Decking",
      description: "Installing coping stones and building the pool deck",
      estimatedDuration: 5,
      order: 8,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Equipment Installation",
      description: "Installing pump, filter, heater, and other equipment",
      estimatedDuration: 2,
      order: 9,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Filling and Chemical Balancing",
      description: "Filling the pool and balancing initial water chemistry",
      estimatedDuration: 2,
      order: 10,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Final Inspection and Handover",
      description: "Final inspection, client training, and project completion",
      estimatedDuration: 1,
      order: 11,
      permitRequired: false,
      inspectionRequired: true
    }
  ]
};

/**
 * Residential Construction Template
 * Provides standardized phases for small to medium residential construction projects
 */
export const residentialConstructionTemplate: ProjectTemplate = {
  name: "Residential Construction",
  description: "Standard phases for small to medium residential construction projects",
  phases: [
    {
      name: "Design and Planning",
      description: "Creating architectural plans, obtaining client approval",
      estimatedDuration: 14,
      order: 1,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Permitting",
      description: "Submitting plans and obtaining necessary building permits",
      estimatedDuration: 21,
      order: 2,
      permitRequired: true,
      inspectionRequired: false
    },
    {
      name: "Site Preparation",
      description: "Clearing land, grading, and initial site work",
      estimatedDuration: 5,
      order: 3,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Foundation",
      description: "Excavation and pouring concrete foundation",
      estimatedDuration: 10,
      order: 4,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Framing",
      description: "Erecting the structural frame of the building",
      estimatedDuration: 15,
      order: 5,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Roofing",
      description: "Installing roof structure, sheathing, and materials",
      estimatedDuration: 7,
      order: 6,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Exterior Finishes",
      description: "Installing siding, windows, doors, and exterior trim",
      estimatedDuration: 12,
      order: 7,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Rough Electrical",
      description: "Installing electrical wiring, outlets, and switches",
      estimatedDuration: 7,
      order: 8,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Rough Plumbing",
      description: "Installing water supply and drain pipes",
      estimatedDuration: 7,
      order: 9,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "HVAC Installation",
      description: "Installing heating, ventilation, and air conditioning systems",
      estimatedDuration: 5,
      order: 10,
      permitRequired: true,
      inspectionRequired: true
    },
    {
      name: "Insulation",
      description: "Installing wall, floor, and ceiling insulation",
      estimatedDuration: 4,
      order: 11,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Drywall and Interior Finishes",
      description: "Installing drywall, taping, and finishing interior walls and ceilings",
      estimatedDuration: 12,
      order: 12,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Interior Trim and Cabinetry",
      description: "Installing interior doors, trim, and cabinetry",
      estimatedDuration: 10,
      order: 13,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Flooring",
      description: "Installing hardwood, tile, carpet, or other flooring materials",
      estimatedDuration: 7,
      order: 14,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Painting",
      description: "Priming and painting interior and exterior surfaces",
      estimatedDuration: 7,
      order: 15,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Fixtures and Appliances",
      description: "Installing plumbing fixtures, light fixtures, and appliances",
      estimatedDuration: 5,
      order: 16,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Final Inspections",
      description: "Obtaining final building, electrical, plumbing, and other inspections",
      estimatedDuration: 5,
      order: 17,
      permitRequired: false,
      inspectionRequired: true
    },
    {
      name: "Landscaping",
      description: "Grading, planting, and finishing exterior landscaping",
      estimatedDuration: 7,
      order: 18,
      permitRequired: false,
      inspectionRequired: false
    },
    {
      name: "Final Walkthrough and Handover",
      description: "Client walkthrough, addressing punch list items, and project completion",
      estimatedDuration: 3,
      order: 19,
      permitRequired: false,
      inspectionRequired: false
    }
  ]
};

export const projectTemplates: Record<string, ProjectTemplate> = {
  "gunite-pool": gunitePoolTemplate,
  "fiberglass-pool": fiberglassPoolTemplate,
  "vinyl-pool": vinylPoolTemplate,
  "residential-construction": residentialConstructionTemplate,
  // Add more templates as needed
};

/**
 * Get available project template options
 */
export const getTemplateOptions = (): { label: string; value: string }[] => {
  return Object.entries(projectTemplates).map(([key, template]) => ({
    label: template.name,
    value: key
  }));
};

/**
 * Get template by key
 */
export const getTemplateByKey = (key: string): ProjectTemplate | undefined => {
  return projectTemplates[key];
};