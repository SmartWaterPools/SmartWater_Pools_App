/**
 * Server Health Monitor
 * 
 * This module provides health monitoring for the Express server with automatic recovery.
 * It helps maintain server availability by monitoring connectivity and performance issues.
 */

import { Server } from 'http';
import { log } from './vite';

interface HealthStats {
  lastPingTime: number;
  consecutiveFailures: number;
  isHealthy: boolean;
  startTime: number;
  restartCount: number;
}

export class HealthMonitor {
  private server: Server;
  private stats: HealthStats;
  private checkInterval: NodeJS.Timeout | null = null;
  private restartCallback: () => void;
  private readonly MAX_FAILURES = 3;
  private readonly CHECK_INTERVAL_MS = 10000; // 10 seconds

  constructor(server: Server, restartCallback: () => void) {
    this.server = server;
    this.restartCallback = restartCallback;
    this.stats = {
      lastPingTime: Date.now(),
      consecutiveFailures: 0,
      isHealthy: true,
      startTime: Date.now(),
      restartCount: 0
    };
  }

  /**
   * Start monitoring server health
   */
  public start(): void {
    log('Health monitor started', 'health-monitor');
    
    // Reset stats
    this.stats = {
      lastPingTime: Date.now(),
      consecutiveFailures: 0,
      isHealthy: true,
      startTime: Date.now(),
      restartCount: 0
    };
    
    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Set up regular health checks
    this.checkInterval = setInterval(() => this.checkHealth(), this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop monitoring server health
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    log('Health monitor stopped', 'health-monitor');
  }

  /**
   * Update the heartbeat timestamp to indicate server activity
   */
  public heartbeat(): void {
    this.stats.lastPingTime = Date.now();
    if (this.stats.consecutiveFailures > 0) {
      this.stats.consecutiveFailures = 0;
      if (!this.stats.isHealthy) {
        this.stats.isHealthy = true;
        log('Server health recovered', 'health-monitor');
      }
    }
  }

  /**
   * Check server health and restart if needed
   */
  private checkHealth(): void {
    const now = Date.now();
    const timeSinceLastPing = now - this.stats.lastPingTime;
    
    // If more than 15 seconds since the last activity, count as a failure
    if (timeSinceLastPing > 15000) {
      this.stats.consecutiveFailures++;
      log(`Health check failure #${this.stats.consecutiveFailures} - ${timeSinceLastPing}ms since last activity`, 'health-monitor');
      
      if (this.stats.consecutiveFailures >= this.MAX_FAILURES) {
        this.stats.isHealthy = false;
        log('Server health critical - initiating restart', 'health-monitor');
        this.restartServer();
      }
    } else {
      // Reset failures if there's recent activity
      if (this.stats.consecutiveFailures > 0) {
        this.stats.consecutiveFailures = 0;
        log('Health check passing again', 'health-monitor');
      }
    }
  }

  /**
   * Restart the server
   */
  private restartServer(): void {
    this.stats.restartCount++;
    log(`Restarting server (restart #${this.stats.restartCount})`, 'health-monitor');
    
    // Stop monitoring during restart
    this.stop();
    
    // Execute restart callback
    this.restartCallback();
    
    // Resume monitoring after restart
    setTimeout(() => this.start(), 5000);
  }

  /**
   * Get health statistics
   */
  public getStats(): HealthStats {
    return { ...this.stats };
  }

  /**
   * Get uptime in seconds
   */
  public getUptime(): number {
    return Math.floor((Date.now() - this.stats.startTime) / 1000);
  }
}