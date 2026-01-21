import { Router } from "express";
import { isAuthenticated } from "../auth";
import { type User } from "@shared/schema";
import { getGoogleCalendarClient, syncMaintenanceToGoogleCalendar, listCalendarEvents } from "../services/googleCalendarService";

const router = Router();

router.get('/connection-status', isAuthenticated, async (req, res) => {
  try {
    await getGoogleCalendarClient();
    res.json({ connected: true });
  } catch (error) {
    res.json({ connected: false, error: (error as Error).message });
  }
});

router.get('/events', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const events = await listCalendarEvents(startDate as string, endDate as string);
    res.json(events);
  } catch (error) {
    console.error('Error listing calendar events:', error);
    res.status(500).json({ error: 'Failed to list calendar events' });
  }
});

router.post('/sync-work-order', isAuthenticated, async (req, res) => {
  try {
    const { id, title, description, scheduledDate, location, clientName } = req.body;
    
    if (!id || !title || !scheduledDate) {
      return res.status(400).json({ error: 'id, title, and scheduledDate are required' });
    }
    
    const event = await syncMaintenanceToGoogleCalendar({
      id,
      title,
      description,
      scheduledDate,
      location,
      clientName
    });
    
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    res.status(500).json({ error: 'Failed to sync to Google Calendar' });
  }
});

export default router;
