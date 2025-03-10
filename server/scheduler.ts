import { DatabaseStorage, MemStorage } from './storage';
import { log } from './vite';

/**
 * Scheduler class to handle recurring tasks
 */
export class Scheduler {
  private storage: DatabaseStorage | MemStorage;
  private scheduledTasks: NodeJS.Timeout[] = [];

  constructor(storage: DatabaseStorage | MemStorage) {
    this.storage = storage;
  }

  /**
   * Initialize the scheduler and start all scheduled tasks
   */
  public initialize(): void {
    this.startRescheduleIncompleteMaintenancesJob();
    log('Scheduler initialized', 'scheduler');
  }

  /**
   * Schedule the job to run at midnight to reschedule incomplete maintenances
   */
  private startRescheduleIncompleteMaintenancesJob(): void {
    // Calculate time until next midnight
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Set to next midnight
    
    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    // Schedule first run at midnight
    const timeoutId = setTimeout(async () => {
      await this.rescheduleIncompleteMaintenances();
      
      // Then schedule to run daily at midnight
      const dailyInterval = setInterval(async () => {
        await this.rescheduleIncompleteMaintenances();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      this.scheduledTasks.push(dailyInterval);
    }, timeUntilMidnight);
    
    this.scheduledTasks.push(timeoutId);
    
    log(`Scheduler: Incomplete maintenance rescheduling job scheduled to run in ${Math.floor(timeUntilMidnight / 60000)} minutes`, 'scheduler');
  }

  /**
   * Reschedule incomplete maintenances from the previous day
   */
  private async rescheduleIncompleteMaintenances(): Promise<void> {
    try {
      log('Scheduler: Running incomplete maintenance rescheduling job', 'scheduler');
      const rescheduledMaintenances = await this.storage.rescheduleIncompleteMaintenances();
      log(`Scheduler: Successfully rescheduled ${rescheduledMaintenances.length} incomplete maintenances`, 'scheduler');
    } catch (error) {
      log(`Scheduler: Error rescheduling incomplete maintenances: ${error}`, 'scheduler');
    }
  }

  /**
   * Stop all scheduled tasks
   */
  public stop(): void {
    this.scheduledTasks.forEach(task => clearTimeout(task));
    this.scheduledTasks = [];
    log('Scheduler stopped', 'scheduler');
  }
}