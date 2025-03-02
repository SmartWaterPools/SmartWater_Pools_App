// Import PostgreSQL pool
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
import bcrypt from 'bcrypt';
const { hash } = bcrypt;
import { randomUUID } from 'crypto';

/**
 * Script to create three test customers with full profiles
 * Run this script with: node createTestCustomers.js
 */

async function createTestCustomers() {
  console.log('Creating test customers...');
  
  try {
    // Create users first (with hashed passwords)
    const users = [
      {
        username: 'test.client1',
        password: await hash('password123', 10),
        name: 'John Smith',
        email: 'test.client1@example.com',
        role: 'client',
        phone: '555-123-4567',
        address: '123 Main Street, Anytown, CA 90210'
      },
      {
        username: 'test.client2',
        password: await hash('password123', 10),
        name: 'Sarah Jones',
        email: 'test.client2@example.com',
        role: 'client',
        phone: '555-234-5678',
        address: '456 Park Avenue, Springfield, CA 90211'
      },
      {
        username: 'test.client3',
        password: await hash('password123', 10),
        name: 'Michael Wilson',
        email: 'test.client3@example.com',
        role: 'client',
        phone: '555-345-6789',
        address: '789 Ocean Drive, Seaside, CA 90212'
      }
    ];
    
    // Insert users
    const userIds = [];
    for (const user of users) {
      const result = await pool.query(
        `INSERT INTO users (username, password, name, email, role, phone, address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [user.username, user.password, user.name, user.email, user.role, user.phone, user.address]
      );
      userIds.push(result.rows[0].id);
      console.log(`Created user: ${user.name} with ID: ${result.rows[0].id}`);
    }
    
    // Create clients with different pool information
    const clients = [
      {
        userId: userIds[0],
        contractType: 'residential',
        poolType: 'inground',
        poolSize: '20,000 gallons',
        filterType: 'sand',
        heaterType: 'gas',
        chemicalSystem: 'chlorine',
        specialNotes: 'Pool is surrounded by trees, requires frequent skimming',
        serviceDay: 'monday'
      },
      {
        userId: userIds[1],
        contractType: 'residential',
        poolType: 'fiberglass',
        poolSize: '15,000 gallons',
        filterType: 'cartridge',
        heaterType: 'electric',
        chemicalSystem: 'salt',
        specialNotes: 'Owner wants chlorine levels kept lower than standard',
        serviceDay: 'wednesday'
      },
      {
        userId: userIds[2],
        contractType: 'commercial',
        poolType: 'gunite',
        poolSize: '35,000 gallons',
        filterType: 'de',
        heaterType: 'solar',
        chemicalSystem: 'chlorine',
        specialNotes: 'Community pool with heavy usage during summer months',
        serviceDay: 'friday'
      }
    ];
    
    // Insert clients
    const clientIds = [];
    for (const client of clients) {
      const result = await pool.query(
        `INSERT INTO clients (user_id, contract_type, pool_type, pool_size, filter_type, heater_type, chemical_system, special_notes, service_day) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [client.userId, client.contractType, client.poolType, client.poolSize, client.filterType, client.heaterType, client.chemicalSystem, client.specialNotes, client.serviceDay]
      );
      clientIds.push(result.rows[0].id);
      console.log(`Created client record for user ${client.userId} with client ID: ${result.rows[0].id}`);
    }
    
    // Add equipment for each client
    const equipmentList = [
      // Equipment for John Smith
      [
        {
          name: 'Hayward Super Pump',
          type: 'pump',
          brand: 'Hayward',
          model: 'SP2610X15',
          serialNumber: 'HAY123456789',
          installDate: new Date('2022-05-15').toISOString(),
          lastServiceDate: new Date('2023-09-20').toISOString(),
          status: 'working',
          notes: 'Running well after bearing replacement'
        },
        {
          name: 'Pentair MasterTemp',
          type: 'heater',
          brand: 'Pentair',
          model: 'MT400',
          serialNumber: 'PEN987654321',
          installDate: new Date('2022-05-15').toISOString(),
          lastServiceDate: new Date('2023-09-20').toISOString(),
          status: 'working',
          notes: 'Regular maintenance required before winter'
        },
        {
          name: 'Sand Filter System',
          type: 'filter',
          brand: 'Pentair',
          model: 'TA100D',
          serialNumber: 'FLTR123456',
          installDate: new Date('2022-05-15').toISOString(),
          lastServiceDate: new Date('2023-09-20').toISOString(),
          status: 'working',
          notes: 'Sand replacement due in 6 months'
        }
      ],
      // Equipment for Sarah Jones
      [
        {
          name: 'Intelliflo Variable Speed Pump',
          type: 'pump',
          brand: 'Pentair',
          model: 'IntelliFlo VS',
          serialNumber: 'IFP789012345',
          installDate: new Date('2021-06-10').toISOString(),
          lastServiceDate: new Date('2023-08-15').toISOString(),
          status: 'working',
          notes: 'Set to energy-saving schedule'
        },
        {
          name: 'Salt Chlorine Generator',
          type: 'chlorinator',
          brand: 'Hayward',
          model: 'AquaRite 900',
          serialNumber: 'SCG456789012',
          installDate: new Date('2021-06-10').toISOString(),
          lastServiceDate: new Date('2023-08-15').toISOString(),
          status: 'working',
          notes: 'Cell cleaning needed within 3 months'
        },
        {
          name: 'Cartridge Filter',
          type: 'filter',
          brand: 'Hayward',
          model: 'C1200',
          serialNumber: 'CF234567890',
          installDate: new Date('2021-06-10').toISOString(),
          lastServiceDate: new Date('2023-07-01').toISOString(),
          status: 'needs attention',
          notes: 'Cartridge replacement recommended on next visit'
        }
      ],
      // Equipment for Michael Wilson
      [
        {
          name: 'Commercial Pool Pump',
          type: 'pump',
          brand: 'Pentair',
          model: 'EQ1500',
          serialNumber: 'CPP123987654',
          installDate: new Date('2020-04-20').toISOString(),
          lastServiceDate: new Date('2023-10-05').toISOString(),
          status: 'working',
          notes: 'High capacity pump for large pool'
        },
        {
          name: 'Solar Heating System',
          type: 'heater',
          brand: 'SunTouch',
          model: 'ST2000',
          serialNumber: 'SOL234098765',
          installDate: new Date('2020-04-20').toISOString(),
          lastServiceDate: new Date('2023-06-15').toISOString(),
          status: 'needs attention',
          notes: 'Some panels need replacement due to weathering'
        },
        {
          name: 'DE Filter System',
          type: 'filter',
          brand: 'Pentair',
          model: 'FNS Plus 60',
          serialNumber: 'DEF345109876',
          installDate: new Date('2020-04-20').toISOString(),
          lastServiceDate: new Date('2023-09-01').toISOString(),
          status: 'working',
          notes: 'DE powder replenished monthly due to heavy use'
        },
        {
          name: 'UV Sanitizer',
          type: 'sanitizer',
          brand: 'Delta',
          model: 'UV2000',
          serialNumber: 'UVS456210987',
          installDate: new Date('2020-04-20').toISOString(),
          lastServiceDate: new Date('2023-08-20').toISOString(),
          status: 'working',
          notes: 'Bulb replacement scheduled for next month'
        }
      ]
    ];
    
    // Insert equipment
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const equipment = equipmentList[i];
      
      for (const item of equipment) {
        await pool.query(
          `INSERT INTO pool_equipment (client_id, name, type, brand, model, serial_number, install_date, last_service_date, status, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [clientId, item.name, item.type, item.brand, item.model, item.serialNumber, item.installDate, item.lastServiceDate, item.status, item.notes]
        );
      }
      console.log(`Added ${equipment.length} equipment items for client ID: ${clientId}`);
    }
    
    // Add maintenance records
    const now = new Date();
    const maintenanceRecords = [
      // Maintenance for John Smith
      {
        clientId: clientIds[0],
        technicianId: null, // Will be assigned later
        scheduleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
        completionDate: null,
        type: 'regular',
        status: 'scheduled',
        notes: 'Regular weekly maintenance'
      },
      // Maintenance for Sarah Jones
      {
        clientId: clientIds[1],
        technicianId: null,
        scheduleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
        completionDate: null,
        type: 'chemical',
        status: 'scheduled',
        notes: 'Check salt levels and backwash filter'
      },
      // Maintenance for Michael Wilson
      {
        clientId: clientIds[2],
        technicianId: null,
        scheduleDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4),
        completionDate: null,
        type: 'deep-clean',
        status: 'scheduled',
        notes: 'Deep cleaning and chemistry balance'
      }
    ];
    
    // Insert maintenance
    for (const maintenance of maintenanceRecords) {
      await pool.query(
        `INSERT INTO maintenances (client_id, technician_id, schedule_date, completion_date, type, status, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [maintenance.clientId, maintenance.technicianId, maintenance.scheduleDate, maintenance.completionDate, maintenance.type, maintenance.status, maintenance.notes]
      );
    }
    console.log(`Added maintenance records for ${maintenanceRecords.length} clients`);
    
    // Add repair records
    const repairRecords = [
      // Repair for John Smith
      {
        clientId: clientIds[0],
        technicianId: null,
        reportedDate: new Date(),
        scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        completionDate: null,
        issue: 'noise',
        description: 'Pump making unusual noise',
        notes: 'May need new impeller',
        status: 'scheduled',
        priority: 'medium',
        scheduledTime: '10:00:00'
      },
      // Repair for Sarah Jones
      {
        clientId: clientIds[1],
        technicianId: null,
        reportedDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        scheduledDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        completionDate: null,
        issue: 'error',
        description: 'Salt cell reporting error code E-77',
        notes: 'Possible salt cell replacement needed',
        status: 'assigned',
        priority: 'high',
        scheduledTime: '14:30:00'
      }
    ];
    
    // Insert repairs
    for (const repair of repairRecords) {
      await pool.query(
        `INSERT INTO repairs (client_id, technician_id, reported_date, scheduled_date, completion_date, issue, description, notes, status, priority, scheduled_time) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [repair.clientId, repair.technicianId, repair.reportedDate, repair.scheduledDate, repair.completionDate, repair.issue, repair.description, repair.notes, repair.status, repair.priority, repair.scheduledTime]
      );
    }
    console.log(`Added repair records for ${repairRecords.length} clients`);
    
    console.log('Test customers created successfully!');
    console.log('Login with any of these usernames: test.client1, test.client2, test.client3');
    console.log('Password for all test accounts: password123');
    
  } catch (error) {
    console.error('Error creating test customers:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

createTestCustomers();