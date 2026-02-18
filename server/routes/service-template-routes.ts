import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { type User, insertServiceTemplateSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

const router = Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const templates = await storage.getServiceTemplates(user.organizationId);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching service templates:', error);
    res.status(500).json({ error: 'Failed to fetch service templates' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.getServiceTemplate(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Service template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching service template:', error);
    res.status(500).json({ error: 'Failed to fetch service template' });
  }
});

// Helper to normalize and serialize checklist items
function serializeChecklistItems(items: unknown): string | null {
  if (!items) return null;
  
  // If already a string, check if it's valid JSON and return it
  if (typeof items === 'string') {
    try {
      JSON.parse(items);
      return items; // Already valid JSON string
    } catch {
      return null;
    }
  }
  
  // If it's an array, normalize and stringify
  if (Array.isArray(items)) {
    const normalized = items.map((item: unknown, index: number) => {
      if (typeof item === 'string') {
        return { id: `item-${index}`, text: item, required: true };
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          id: typeof obj.id === 'string' ? obj.id : `item-${index}`,
          text: typeof obj.text === 'string' ? obj.text : '',
          required: typeof obj.required === 'boolean' ? obj.required : true
        };
      }
      return { id: `item-${index}`, text: '', required: true };
    });
    return JSON.stringify(normalized);
  }
  
  return null;
}

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const requestBody = { ...req.body };
    
    // Normalize and serialize checklistItems
    requestBody.checklistItems = serializeChecklistItems(requestBody.checklistItems);
    
    const validatedData = insertServiceTemplateSchema.parse({
      ...requestBody,
      organizationId: user.organizationId,
    });
    
    const template = await storage.createServiceTemplate(validatedData);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating service template:', error);
    if (error instanceof ZodError) {
      const humanError = fromZodError(error);
      return res.status(400).json({ error: humanError.message });
    }
    res.status(500).json({ error: 'Failed to create service template' });
  }
});

router.patch('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingTemplate = await storage.getServiceTemplate(id);
    
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Service template not found' });
    }
    
    const requestBody = { ...req.body };
    if (requestBody.checklistItems !== undefined) {
      // Normalize and serialize checklistItems
      requestBody.checklistItems = serializeChecklistItems(requestBody.checklistItems);
    }
    
    const updatedTemplate = await storage.updateServiceTemplate(id, requestBody);
    res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating service template:', error);
    if (error instanceof ZodError) {
      const humanError = fromZodError(error);
      return res.status(400).json({ error: humanError.message });
    }
    res.status(500).json({ error: 'Failed to update service template' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteServiceTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Service template not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service template:', error);
    res.status(500).json({ error: 'Failed to delete service template' });
  }
});

router.post('/seed-defaults', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as User;
    const orgId = user.organizationId;
    
    const existing = await storage.getServiceTemplates(orgId);
    const existingNames = new Set(existing.map(t => t.name));
    
    const defaultTemplates = [
      {
        name: 'Weekly Pool Service',
        type: 'maintenance',
        description: 'Standard weekly pool maintenance service including water testing, chemical balancing, skimming, and equipment check.',
        isDefault: true,
        estimatedDuration: 45,
        defaultPriority: 'medium',
        recurrence: 'weekly',
        category: 'weekly_maintenance',
        orderType: 'maintenance_order',
        checklistItems: JSON.stringify([
          { id: 'skim-surface', text: 'Skim pool surface for debris', required: true },
          { id: 'brush-walls', text: 'Brush pool walls and tile line', required: true },
          { id: 'vacuum-pool', text: 'Vacuum pool floor', required: true },
          { id: 'empty-baskets', text: 'Empty skimmer and pump baskets', required: true },
          { id: 'test-water', text: 'Test water chemistry (pH, chlorine, alkalinity)', required: true },
          { id: 'add-chemicals', text: 'Add chemicals as needed', required: true },
          { id: 'check-filter-psi', text: 'Check filter pressure (PSI)', required: true },
          { id: 'inspect-pump', text: 'Inspect pump operation and prime', required: true },
          { id: 'check-water-level', text: 'Check and adjust water level', required: false },
          { id: 'inspect-equipment', text: 'Visual inspection of all equipment', required: false },
          { id: 'clean-waterline', text: 'Clean waterline tile if needed', required: false },
          { id: 'backwash-filter', text: 'Backwash or clean filter if pressure is high', required: false },
        ]),
      },
      {
        name: 'Monthly Chemical Balance',
        type: 'maintenance',
        description: 'Comprehensive monthly water chemistry analysis and adjustment including calcium hardness, CYA, TDS, and LSI calculation.',
        isDefault: false,
        estimatedDuration: 60,
        defaultPriority: 'medium',
        recurrence: 'monthly',
        category: 'chemical_balance',
        orderType: 'maintenance_order',
        checklistItems: JSON.stringify([
          { id: 'full-water-test', text: 'Full water chemistry test (pH, FC, TC, alkalinity, CYA, calcium, TDS)', required: true },
          { id: 'calculate-lsi', text: 'Calculate Langelier Saturation Index (LSI)', required: true },
          { id: 'adjust-ph', text: 'Adjust pH to 7.2–7.6 range', required: true },
          { id: 'adjust-alkalinity', text: 'Adjust total alkalinity to 80–120 ppm', required: true },
          { id: 'adjust-calcium', text: 'Adjust calcium hardness to 200–400 ppm', required: true },
          { id: 'adjust-cya', text: 'Check CYA level (30–50 ppm for non-salt, 60–80 for salt)', required: true },
          { id: 'shock-treatment', text: 'Apply shock treatment if combined chlorine > 0.5 ppm', required: false },
          { id: 'phosphate-test', text: 'Test and treat phosphate levels', required: false },
          { id: 'salt-level', text: 'Check salt level (salt systems only)', required: false },
          { id: 'record-readings', text: 'Record all readings in service report', required: true },
        ]),
      },
      {
        name: 'Filter Clean',
        type: 'maintenance',
        description: 'Complete filter disassembly, cleaning, inspection, and reassembly. Includes cartridge or DE grid cleaning.',
        isDefault: false,
        estimatedDuration: 90,
        defaultPriority: 'medium',
        recurrence: 'quarterly',
        category: 'filter_clean',
        orderType: 'work_order',
        checklistItems: JSON.stringify([
          { id: 'record-starting-psi', text: 'Record starting filter pressure (PSI)', required: true },
          { id: 'shut-off-pump', text: 'Shut off pump and release air pressure', required: true },
          { id: 'remove-filter', text: 'Remove filter lid/clamp and extract elements', required: true },
          { id: 'inspect-elements', text: 'Inspect cartridges/grids for damage or wear', required: true },
          { id: 'chemical-soak', text: 'Chemical soak filter elements (if needed)', required: false },
          { id: 'hose-clean', text: 'Thoroughly hose clean all filter elements', required: true },
          { id: 'inspect-manifold', text: 'Inspect manifold, laterals, and standpipe', required: true },
          { id: 'inspect-oring', text: 'Inspect and lubricate O-ring/gasket', required: true },
          { id: 'reassemble', text: 'Reassemble filter and secure clamp/lid', required: true },
          { id: 'prime-restart', text: 'Prime pump and restart system', required: true },
          { id: 'record-clean-psi', text: 'Record clean filter pressure (PSI)', required: true },
          { id: 'check-leaks', text: 'Check for leaks at all connections', required: true },
        ]),
      },
      {
        name: 'Pool Opening',
        type: 'maintenance',
        description: 'Seasonal pool opening service including cover removal, equipment startup, chemical treatment, and system inspection.',
        isDefault: false,
        estimatedDuration: 120,
        defaultPriority: 'high',
        recurrence: 'one_time',
        category: 'pool_opening',
        orderType: 'work_order',
        checklistItems: JSON.stringify([
          { id: 'remove-cover', text: 'Remove and clean pool cover', required: true },
          { id: 'remove-plugs', text: 'Remove winterizing plugs from returns and skimmer', required: true },
          { id: 'reinstall-hardware', text: 'Reinstall ladders, handrails, and accessories', required: true },
          { id: 'fill-pool', text: 'Fill pool to proper water level', required: true },
          { id: 'prime-pump', text: 'Prime and start pump', required: true },
          { id: 'inspect-filter', text: 'Inspect and clean filter', required: true },
          { id: 'check-heater', text: 'Inspect and start heater (if applicable)', required: false },
          { id: 'inspect-salt-cell', text: 'Inspect and clean salt cell (if applicable)', required: false },
          { id: 'check-automation', text: 'Check automation/timer settings', required: true },
          { id: 'shock-pool', text: 'Shock pool with appropriate chemicals', required: true },
          { id: 'add-algaecide', text: 'Add algaecide treatment', required: true },
          { id: 'test-water', text: 'Full water chemistry test and balance', required: true },
          { id: 'vacuum-debris', text: 'Vacuum any debris from pool floor', required: true },
          { id: 'system-check', text: 'Full system check - all valves, returns, and drains', required: true },
        ]),
      },
      {
        name: 'Pool Closing',
        type: 'maintenance',
        description: 'Seasonal pool closing/winterization service including chemical treatment, line blowing, and cover installation.',
        isDefault: false,
        estimatedDuration: 120,
        defaultPriority: 'high',
        recurrence: 'one_time',
        category: 'pool_closing',
        orderType: 'work_order',
        checklistItems: JSON.stringify([
          { id: 'water-chemistry', text: 'Balance water chemistry for winter', required: true },
          { id: 'shock-treatment', text: 'Add winterizing shock treatment', required: true },
          { id: 'add-algaecide', text: 'Add winterizing algaecide', required: true },
          { id: 'lower-water', text: 'Lower water level below skimmer and returns', required: true },
          { id: 'blow-lines', text: 'Blow out plumbing lines with air compressor', required: true },
          { id: 'install-plugs', text: 'Install winterizing plugs in returns and skimmer', required: true },
          { id: 'add-antifreeze', text: 'Add pool antifreeze to lines (if needed)', required: false },
          { id: 'drain-equipment', text: 'Drain pump, filter, heater, and chlorinator', required: true },
          { id: 'remove-hardware', text: 'Remove ladders, handrails, and accessories', required: true },
          { id: 'clean-cover', text: 'Clean and install pool cover', required: true },
          { id: 'store-equipment', text: 'Store removable equipment', required: false },
          { id: 'final-inspection', text: 'Final inspection of all winterization steps', required: true },
        ]),
      },
      {
        name: 'Equipment Inspection',
        type: 'maintenance',
        description: 'Comprehensive inspection of all pool equipment including pump, filter, heater, automation, and plumbing.',
        isDefault: false,
        estimatedDuration: 60,
        defaultPriority: 'medium',
        recurrence: 'monthly',
        category: 'equipment_inspection',
        orderType: 'work_order',
        checklistItems: JSON.stringify([
          { id: 'pump-inspection', text: 'Inspect pump motor, seals, and basket', required: true },
          { id: 'pump-amperage', text: 'Check pump amperage draw', required: false },
          { id: 'filter-pressure', text: 'Record filter pressure and condition', required: true },
          { id: 'heater-inspection', text: 'Inspect heater operation and heat exchanger', required: true },
          { id: 'salt-cell', text: 'Inspect salt cell (if applicable)', required: false },
          { id: 'automation', text: 'Check automation system and schedules', required: true },
          { id: 'valves', text: 'Inspect all valves for proper operation', required: true },
          { id: 'plumbing', text: 'Check all visible plumbing for leaks', required: true },
          { id: 'electrical', text: 'Inspect electrical connections and bonding', required: true },
          { id: 'lights', text: 'Test pool and spa lights', required: false },
          { id: 'cleaner', text: 'Inspect automatic pool cleaner (if applicable)', required: false },
          { id: 'safety-equipment', text: 'Check safety equipment (fence, cover, alarms)', required: false },
        ]),
      },
      {
        name: 'Green Pool Recovery',
        type: 'repair',
        description: 'Treatment plan for algae-affected pools requiring intensive chemical treatment and multiple service visits.',
        isDefault: false,
        estimatedDuration: 90,
        defaultPriority: 'high',
        recurrence: 'one_time',
        category: 'green_pool',
        orderType: 'work_order',
        checklistItems: JSON.stringify([
          { id: 'assess-severity', text: 'Assess algae severity (light/moderate/severe)', required: true },
          { id: 'test-water', text: 'Full water chemistry test', required: true },
          { id: 'brush-all', text: 'Brush all pool surfaces thoroughly', required: true },
          { id: 'shock-heavy', text: 'Apply heavy shock treatment (10x normal)', required: true },
          { id: 'add-algaecide', text: 'Add algaecide appropriate for algae type', required: true },
          { id: 'run-pump', text: 'Ensure pump runs 24/7 during recovery', required: true },
          { id: 'backwash-filter', text: 'Backwash/clean filter (may need multiple times)', required: true },
          { id: 'vacuum-waste', text: 'Vacuum dead algae to waste', required: true },
          { id: 'retest-water', text: 'Retest water after 24 hours', required: true },
          { id: 'balance-chemistry', text: 'Rebalance water chemistry', required: true },
          { id: 'document-before-after', text: 'Take before and after photos', required: true },
        ]),
      },
      {
        name: 'Leak Detection',
        type: 'repair',
        description: 'Systematic leak detection service including bucket test, dye testing, and pressure testing of plumbing lines.',
        isDefault: false,
        estimatedDuration: 120,
        defaultPriority: 'high',
        recurrence: 'one_time',
        category: 'leak_detection',
        orderType: 'work_order',
        checklistItems: JSON.stringify([
          { id: 'measure-water-loss', text: 'Document water loss rate (inches per day)', required: true },
          { id: 'bucket-test', text: 'Perform bucket test to rule out evaporation', required: true },
          { id: 'visual-inspection', text: 'Visual inspection of pool shell, returns, and fittings', required: true },
          { id: 'dye-test-fittings', text: 'Dye test all fittings, returns, and main drain', required: true },
          { id: 'dye-test-lights', text: 'Dye test light niches and conduit', required: true },
          { id: 'check-equipment', text: 'Inspect equipment pad for leaks', required: true },
          { id: 'pressure-test', text: 'Pressure test plumbing lines (if needed)', required: false },
          { id: 'mark-locations', text: 'Mark confirmed leak locations', required: true },
          { id: 'estimate-repair', text: 'Prepare repair estimate', required: true },
          { id: 'document-findings', text: 'Document all findings with photos', required: true },
        ]),
      },
    ];
    
    const created = [];
    const skipped = [];
    
    for (const template of defaultTemplates) {
      if (existingNames.has(template.name)) {
        skipped.push(template.name);
        continue;
      }
      const result = await storage.createServiceTemplate({
        ...template,
        organizationId: orgId,
      });
      created.push(result);
    }
    
    res.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      skippedNames: skipped,
      templates: created,
    });
  } catch (error) {
    console.error('Error seeding default templates:', error);
    res.status(500).json({ error: 'Failed to seed default templates' });
  }
});

export default router;
