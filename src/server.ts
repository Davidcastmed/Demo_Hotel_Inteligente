import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI } from "@google/genai";

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json()); // Essential for parsing incoming JSON bodies in POST API requests

const angularApp = new AngularNodeAppEngine();

// Database Interface definitions representing the SaaS multi-tenant core data structure
interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  location: string;
  category: string;
  unit: string;
}

interface EventLog {
  id: string;
  timestamp: string;
  camera: string;
  type: 'INGRESO' | 'EGRESO' | 'REUBICACION' | 'SISTEMA' | 'ALERTA';
  description: string;
  items: string;
  operator: string;
}

interface Person {
  id: string;
  name: string;
  role: string;
  badge: string;
  location: string;
  detectedAt: string;
}

const initialInventory: InventoryItem[] = [
  { id: '1', name: 'Coca-Cola (Kiste x24)', stock: 45, threshold: 20, location: 'Regal A-3', category: 'Getränke', unit: 'Kisten' },
  { id: '2', name: 'Sprite (Kiste x24)', stock: 30, threshold: 15, location: 'Regal A-4', category: 'Getränke', unit: 'Kisten' },
  { id: '3', name: 'Weizenmehl (Sack 25kg)', stock: 12, threshold: 8, location: 'Regal B-1', category: 'Grundnahrungsmittel', unit: 'Säcke' },
  { id: '4', name: 'Olivenöl (Kanister 5L)', stock: 18, threshold: 8, location: 'Regal B-2', category: 'Grundnahrungsmittel', unit: 'Kanister' },
  { id: '5', name: 'Vollmilch (Karton x12)', stock: 25, threshold: 10, location: 'Regal C-1', category: 'Milchprodukte', unit: 'Kartons' },
  { id: '6', name: 'Kiste Tomaten (Frisch 10kg)', stock: 8, threshold: 6, location: 'Regal D-1', category: 'Verderbliche Waren', unit: 'Kisten' },
  { id: '7', name: 'Flüssigwaschmittel (Kanister 20L)', stock: 15, threshold: 5, location: 'Wäscherei Regal L-1', category: 'Reinigungsmittel', unit: 'Kanister' },
  { id: '8', name: 'Badetücher-Set (x10 Handtücher)', stock: 40, threshold: 25, location: 'Wäscherei Regal L-2', category: 'Wäschebestand', unit: 'Sets' },
  { id: '9', name: 'RFID-Gästekarten (Rohlinge)', stock: 50, threshold: 10, location: 'Hintergrund-Büro Lobby', category: 'Zutritt & Sicherheit', unit: 'Stück' }
];

const initialEvents: EventLog[] = [
  { id: 'evt-1', timestamp: '08:30', camera: 'IP-Kamera 05 (Laderampe)', type: 'SISTEMA', description: 'IP-Kamera 05 (Laderampe) hat das Einfahren eines Lieferfahrzeugs an der Laderampe erkannt.', items: 'Lieferfahrzeug', operator: 'Süd-Vertrieb' },
  { id: 'evt-2', timestamp: '08:33', camera: 'IP-Kamera 05 (Laderampe)', type: 'INGRESO', description: 'YOLOv10 und Karton-OCR verarbeiteten die automatische Entladung des Lieferanten: +20 Kisten Coca-Cola und +15 Kisten Sprite. Automatische Bestandsaktualisierung durchgeführt.', items: '20 Coca-Cola, 15 Sprite', operator: 'Juan Pérez (Lieferant)' },
  { id: 'evt-3', timestamp: '09:15', camera: 'IP-Kamera 02 (Hauptküche)', type: 'SISTEMA', description: 'Küchenchef Carlos Mendoza hat das Lager betreten. Mobilgerät verifiziert über KI Face ID & Dienstausweis.', items: 'QR-Ausweis verifiziert', operator: 'Carlos Mendoza (Küchenchef)' },
  { id: 'evt-4', timestamp: '09:18', camera: 'IP-Kamera 02 (Hauptküche)', type: 'EGRESO', description: 'SAM2-Segmentierung erkannte Warenentnahme: -2 Olivenöl, -5 Vollmilch, -1 Kiste Tomaten. Ziel: Hauptküche. Bestand aktualisiert.', items: '2 Olivenöl, 5 Milch, 1 Tomaten', operator: 'Carlos Mendoza (Küchenchef)' },
  { id: 'evt-5', timestamp: '11:00', camera: 'IP-Kamera 04 (Zentrallager)', type: 'REUBICACION', description: 'ByteTrack und SAM2 erkannten interne Umlagerung von 5 Säcken Weizenmehl von der Laderampe zu Regal B-1. Status: Produktstandort aktualisiert.', items: '5 Weizenmehl', operator: 'Ana Gómez (Lagerassistentin)' },
  { id: 'evt-6', timestamp: '12:30', camera: 'IP-Kamera 01 (Lobby / Eingang)', type: 'SISTEMA', description: 'Fahrzeug des Gastes (HH-MB-2026) per Kennzeichen-OCR am Haupteingang erkannt. Check-in initialisiert.', items: 'Auto HH-MB-2026', operator: 'Marina Becker (Rezeption)' }
];

const initialPeople: Person[] = [
  { id: 'p-1', name: 'Carlos Mendoza', role: 'Küchenchef', badge: 'QR-081 (Autorisiert)', location: 'Hauptküche', detectedAt: '09:18' },
  { id: 'p-2', name: 'Ana Gómez', role: 'Lagerassistentin', badge: 'RFID-411 (Autorisiert)', location: 'Zentraler Gang', detectedAt: '11:00' },
  { id: 'p-3', name: 'Juan Pérez', role: 'Zusteller / Lieferant', badge: 'Temporärer Ausweis V-102', location: 'Laderampe', detectedAt: '08:33' },
  { id: 'p-4', name: 'Marina Becker', role: 'Rezeptionistin', badge: 'RFID-102 (Autorisiert)', location: 'Haupteingang / Lobby', detectedAt: '12:30' },
  { id: 'p-5', name: 'Thomas Wagner', role: 'Wäschereileiter', badge: 'RFID-305 (Autorisiert)', location: 'Wäscherei', detectedAt: '07:45' }
];

interface MonthlyMovement {
  month: string;
  eingaenge: number;
  entnahmen: number;
  differenz: number;
  activeStock: number;
}

const initialMonthlyMovements: MonthlyMovement[] = [
  { month: 'Jan', eingaenge: 120, entnahmen: 105, differenz: 15, activeStock: 45 },
  { month: 'Feb', eingaenge: 140, entnahmen: 115, differenz: 25, activeStock: 50 },
  { month: 'Mär', eingaenge: 160, entnahmen: 150, differenz: 10, activeStock: 55 },
  { month: 'Apr', eingaenge: 110, entnahmen: 125, differenz: -15, activeStock: 48 },
  { month: 'Mai', eingaenge: 180, entnahmen: 140, differenz: 40, activeStock: 60 },
  { month: 'Jun', eingaenge: 195, entnahmen: 170, differenz: 25, activeStock: 68 },
  { month: 'Jul', eingaenge: 43, entnahmen: 8, differenz: 35, activeStock: 72 }
];

const db = {
  inventory: JSON.parse(JSON.stringify(initialInventory)),
  events: JSON.parse(JSON.stringify(initialEvents)),
  people: JSON.parse(JSON.stringify(initialPeople)),
  monthlyMovements: JSON.parse(JSON.stringify(initialMonthlyMovements))
};

// ==========================================
// CRITICAL STOCK ALERTS PREFERENCES AND HISTORY
// ==========================================
interface AlertPreference {
  emailEnabled: boolean;
  smsEnabled: boolean;
  dashboardEnabled: boolean;
  contactEmail: string;
  contactPhone: string;
}

interface AutomaticNotification {
  id: string;
  productId: string;
  productName: string;
  stockAtNotification: number;
  thresholdAtNotification: number;
  timestamp: string;
  channel: string;
  sentTo: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
}

let alertPreferences: AlertPreference = {
  emailEnabled: true,
  smsEnabled: false,
  dashboardEnabled: true,
  contactEmail: 'coordinador.bodega@hotel-hamburg.de',
  contactPhone: '+49 176 1234 5678'
};

let notificationHistory: AutomaticNotification[] = [
  {
    id: 'notif-1',
    productId: '3',
    productName: 'Weizenmehl (Sack 25kg)',
    stockAtNotification: 7,
    thresholdAtNotification: 8,
    timestamp: '05.07.2026, 09:12 Uhr',
    channel: 'EMAIL + DASHBOARD',
    sentTo: 'coordinador.bodega@hotel-hamburg.de',
    status: 'SENT'
  }
];

function checkAndGenerateStockAlerts(previousInventory: InventoryItem[]) {
  const now = new Date();
  const timestamp = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
                    ', ' + 
                    now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  const eventTimestamp = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  db.inventory.forEach((item: InventoryItem) => {
    const prev = previousInventory.find(p => p.id === item.id);
    const wasBelow = prev ? prev.stock <= prev.threshold : false;
    const isBelow = item.stock <= item.threshold;

    // Trigger only if we crossed the threshold or if the threshold was edited to make it below
    if (isBelow && (!wasBelow || (prev && prev.threshold !== item.threshold))) {
      const channels: string[] = [];
      if (alertPreferences.dashboardEnabled) channels.push('DASHBOARD');
      if (alertPreferences.emailEnabled) channels.push('EMAIL');
      if (alertPreferences.smsEnabled) channels.push('SMS');

      const channelStr = channels.length > 0 ? channels.join(' + ') : 'DASHBOARD';
      const sentTo = [
        alertPreferences.emailEnabled ? alertPreferences.contactEmail : '',
        alertPreferences.smsEnabled ? alertPreferences.contactPhone : ''
      ].filter(Boolean).join(' | ') || 'Dashboard Visual';

      const notificationId = `notif-${Date.now()}-${item.id}`;
      const newNotif: AutomaticNotification = {
        id: notificationId,
        productId: item.id,
        productName: item.name,
        stockAtNotification: item.stock,
        thresholdAtNotification: item.threshold,
        timestamp,
        channel: channelStr,
        sentTo,
        status: 'SENT'
      };

      notificationHistory.unshift(newNotif);

      // Register warning in the main event logs
      db.events.unshift({
        id: `evt-${Date.now()}-autoalert-${item.id}`,
        timestamp: eventTimestamp,
        camera: 'Warnsystem',
        type: 'ALERTA',
        description: `⚠️ WARNUNG: Der Bestand von ${item.name} ist unter den Mindestwert gefallen. Bestand: ${item.stock} ${item.unit} (Mindestwert: ${item.threshold}). Benachrichtigung über ${channelStr} an ${sentTo} gesendet.`,
        items: item.name,
        operator: 'Automatische Überwachung'
      });
    }
  });
}

// Lazy Gemini Client initialization to prevent dev server crash when key is missing
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiInstance;
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// ==========================================
// CRITICAL ALERTS API ENDPOINTS
// ==========================================

// Get current alert configuration / preferences
app.get('/api/inventory/alerts/preferences', (req, res) => {
  res.json(alertPreferences);
});

// Update alert configurations / preferences
app.post('/api/inventory/alerts/preferences', (req, res) => {
  const { emailEnabled, smsEnabled, dashboardEnabled, contactEmail, contactPhone } = req.body;
  alertPreferences = {
    emailEnabled: emailEnabled !== undefined ? !!emailEnabled : alertPreferences.emailEnabled,
    smsEnabled: smsEnabled !== undefined ? !!smsEnabled : alertPreferences.smsEnabled,
    dashboardEnabled: dashboardEnabled !== undefined ? !!dashboardEnabled : alertPreferences.dashboardEnabled,
    contactEmail: contactEmail || alertPreferences.contactEmail,
    contactPhone: contactPhone || alertPreferences.contactPhone
  };
  res.json({ success: true, preferences: alertPreferences });
});

// Get automatic stock alerts notification history
app.get('/api/inventory/alerts/history', (req, res) => {
  res.json(notificationHistory);
});

// Clear stock alerts history
app.post('/api/inventory/alerts/clear', (req, res) => {
  notificationHistory = [];
  res.json({ success: true, notifications: notificationHistory });
});

// Update critical stock threshold for a product
app.post('/api/inventory/threshold', (req, res) => {
  const { itemId, threshold } = req.body;
  const item = db.inventory.find((i: InventoryItem) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: 'Item no encontrado' });
    return;
  }

  const prevInventory = JSON.parse(JSON.stringify(db.inventory));
  item.threshold = parseInt(threshold) >= 0 ? parseInt(threshold) : 0;

  // Run the check engine
  checkAndGenerateStockAlerts(prevInventory);

  res.json({
    success: true,
    inventory: db.inventory,
    events: db.events,
    notifications: notificationHistory
  });
});

// Direct stock modification for testing and simulation
app.post('/api/inventory/update-stock', (req, res) => {
  const { itemId, stock } = req.body;
  const item = db.inventory.find((i: InventoryItem) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: 'Item no encontrado' });
    return;
  }

  const prevInventory = JSON.parse(JSON.stringify(db.inventory));
  item.stock = parseInt(stock) >= 0 ? parseInt(stock) : 0;

  // Run the check engine
  checkAndGenerateStockAlerts(prevInventory);

  res.json({
    success: true,
    inventory: db.inventory,
    events: db.events,
    notifications: notificationHistory
  });
});

// Get inventory state
app.get('/api/inventory', (req, res) => {
  res.json(db.inventory);
});

// Get inventory predictions based on historical average usage scaled by occupancy
app.get('/api/inventory/predictions', (req, res) => {
  const occupancy = parseFloat(req.query['occupancy'] as string) || 75;
  const scale = occupancy / 75;

  const itemConfigs: Record<string, { baseRate: number; leadTime: number; reorderQty: number }> = {
    '1': { baseRate: 1.8, leadTime: 2, reorderQty: 30 },
    '2': { baseRate: 1.2, leadTime: 2, reorderQty: 20 },
    '3': { baseRate: 0.5, leadTime: 3, reorderQty: 10 },
    '4': { baseRate: 0.7, leadTime: 3, reorderQty: 15 },
    '5': { baseRate: 1.5, leadTime: 1, reorderQty: 20 },
    '6': { baseRate: 0.9, leadTime: 1, reorderQty: 10 },
    '7': { baseRate: 0.4, leadTime: 4, reorderQty: 10 },
    '8': { baseRate: 0.6, leadTime: 5, reorderQty: 15 },
    '9': { baseRate: 2.5, leadTime: 5, reorderQty: 50 }
  };

  const predictions = db.inventory.map((item: InventoryItem) => {
    const config = itemConfigs[item.id] || { baseRate: 1.0, leadTime: 2, reorderQty: 20 };
    const dailyUsage = parseFloat((config.baseRate * scale).toFixed(2));
    const daysToThreshold = dailyUsage > 0 ? (item.stock - item.threshold) / dailyUsage : 999;
    const daysToEmpty = dailyUsage > 0 ? item.stock / dailyUsage : 999;

    let priority: 'CRITICAL' | 'WARNING' | 'STABIL' = 'STABIL';
    let recommendedDays = daysToThreshold;

    if (item.stock <= item.threshold) {
      priority = 'CRITICAL';
      recommendedDays = 0;
    } else if (daysToThreshold <= 3) {
      priority = 'CRITICAL';
    } else if (daysToThreshold <= 7) {
      priority = 'WARNING';
    }

    // Recommended order date: today + recommendedDays
    const reorderDate = new Date();
    reorderDate.setDate(reorderDate.getDate() + Math.max(0, Math.floor(recommendedDays)));
    const reorderDateStr = reorderDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Predicted depletion date: today + daysToEmpty
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + Math.max(0, Math.floor(daysToEmpty)));
    const depletionDateStr = depletionDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return {
      itemId: item.id,
      name: item.name,
      stock: item.stock,
      threshold: item.threshold,
      unit: item.unit,
      category: item.category,
      dailyUsage,
      daysToThreshold: parseFloat(Math.max(0, daysToThreshold).toFixed(1)),
      daysToEmpty: parseFloat(Math.max(0, daysToEmpty).toFixed(1)),
      reorderDate: recommendedDays === 0 ? 'SOFORT ERFORDERLICH' : reorderDateStr,
      depletionDate: depletionDateStr,
      priority,
      leadTime: config.leadTime,
      reorderQty: config.reorderQty
    };
  });

  res.json({ occupancy, predictions });
});

// Perform simulation order for an item
app.post('/api/inventory/order', (req, res) => {
  const { itemId, quantity } = req.body;
  const item = db.inventory.find((i: InventoryItem) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: 'Item nicht gefunden' });
    return;
  }

  const orderQty = parseInt(quantity) || 10;
  item.stock += orderQty;

  const now = new Date();
  const timestamp = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // Add event log
  const newEvent: EventLog = {
    id: `evt-${Date.now()}-order`,
    timestamp,
    camera: 'Bedarfsanalyse-Engine',
    type: 'INGRESO',
    description: `[Prognose-System] Automatische Nachbestellung für ${item.name} abgeschlossen (+${orderQty} ${item.unit}). Bestand auf ${item.stock} Einheiten aktualisiert.`,
    items: `+${orderQty} ${item.unit}`,
    operator: 'KI-System (Einkauf)'
  };

  db.events = [newEvent, ...db.events];

  res.json({
    success: true,
    item,
    events: db.events,
    inventory: db.inventory
  });
});

// Get recent events log
app.get('/api/events', (req, res) => {
  res.json(db.events);
});

// Get active people list
app.get('/api/people', (req, res) => {
  res.json(db.people);
});

// Get monthly warehouse movements
app.get('/api/monthly-movements', (req, res) => {
  res.json(db.monthlyMovements);
});

// Simulate events in real-time
app.post('/api/simulate', (req, res) => {
  const { action } = req.body;
  const now = new Date();
  const timestamp = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const prevInventory = JSON.parse(JSON.stringify(db.inventory));

  if (action === 'supplier_arrival') {
    // Supplier delivers +20 Coca-Cola, +15 Sprite, +8 Harina
    db.inventory = db.inventory.map((item: InventoryItem) => {
      if (item.id === '1') return { ...item, stock: item.stock + 20 };
      if (item.id === '2') return { ...item, stock: item.stock + 15 };
      if (item.id === '3') return { ...item, stock: item.stock + 8 };
      return item;
    });

    const newEvents: EventLog[] = [
      {
        id: `evt-${Date.now()}-1`,
        timestamp,
        camera: 'CAM_05_LADERAMPE',
        type: 'SISTEMA',
        description: 'Laderampe (CAM_05): Cargo-LKW erkannt per YOLOv10 (Kennzeichen SH-PL-405). Automatische Entladefreigabe erteilt.',
        items: 'Cargo-LKW',
        operator: 'Juan Pérez (Lieferant)'
      },
      {
        id: `evt-${Date.now()}-2`,
        timestamp,
        camera: 'CAM_05_LADERAMPE',
        type: 'INGRESO',
        description: 'Laderampe-Kamera: KI verarbeitete automatische Entladung per OCR-Prüfung der Barcodes gegen Bestellung #OC-7721: +20 Coca-Cola (Kiste x24), +15 Sprite (Kiste x24) und +8 Weizenmehl (Sack 25kg).',
        items: '20 Coca-Cola, 15 Sprite, 8 Weizenmehl',
        operator: 'Juan Pérez (Lieferant)'
      }
    ];
    db.events = [...newEvents, ...db.events];

    db.people = db.people.map((p: Person) => {
      if (p.id === 'p-3') return { ...p, location: 'Laderampe (Entladend)', detectedAt: timestamp };
      return p;
    });

    // Update Jul monthly movements (add 43 inbound items)
    db.monthlyMovements = db.monthlyMovements.map((m: MonthlyMovement) => {
      if (m.month === 'Jul') {
        const newEingaenge = m.eingaenge + 43;
        return {
          ...m,
          eingaenge: newEingaenge,
          differenz: newEingaenge - m.entnahmen,
          activeStock: m.activeStock + 8
        };
      }
      return m;
    });

  } else if (action === 'chef_withdrawal') {
    // Chef withdraws -2 Aceites, -5 Leches, -1 Caja de Tomates
    db.inventory = db.inventory.map((item: InventoryItem) => {
      if (item.id === '4') return { ...item, stock: Math.max(0, item.stock - 2) };
      if (item.id === '5') return { ...item, stock: Math.max(0, item.stock - 5) };
      if (item.id === '6') return { ...item, stock: Math.max(0, item.stock - 1) };
      return item;
    });

    const newEvents: EventLog[] = [
      {
        id: `evt-${Date.now()}-1`,
        timestamp,
        camera: 'CAM_02_HAUPTKUECHE',
        type: 'SISTEMA',
        description: 'Hauptküche (CAM_02): Thermalkamera erfasst Grilltemperatur bei 180°C. Küchenchef Carlos Mendoza am Vorbereitungstisch identifiziert.',
        items: 'Dienstausweis verifiziert',
        operator: 'Carlos Mendoza (Küchenchef)'
      },
      {
        id: `evt-${Date.now()}-2`,
        timestamp,
        camera: 'CAM_02_HAUPTKUECHE',
        type: 'EGRESO',
        description: 'Küchen-Kamera: SAM2-Objektsegmentierung verfolgte physische Entnahme von Produkten für das Abendessen: -2 Olivenöl (Kanister 5L), -5 Vollmilch (Karton x12), -1 Kiste Tomaten. Bestand aktualisiert.',
        items: '2 Olivenöl, 5 Vollmilch, 1 Tomaten',
        operator: 'Carlos Mendoza (Küchenchef)'
      }
    ];

    // Check thresholds and add alert event if needed
    db.inventory.forEach((item: InventoryItem) => {
      if (item.stock <= item.threshold && (item.id === '4' || item.id === '5' || item.id === '6')) {
        newEvents.push({
          id: `evt-${Date.now()}-alert`,
          timestamp,
          camera: 'Warnsystem',
          type: 'ALERTA',
          description: `Kritischer Mindestbestand: Das Produkt ${item.name} liegt bei ${item.stock} Einheiten (Minimum: ${item.threshold}).`,
          items: item.name,
          operator: 'Vision-KI-System'
        });
      }
    });

    db.events = [...newEvents, ...db.events];

    db.people = db.people.map((p: Person) => {
      if (p.id === 'p-1') return { ...p, location: 'Hauptküche (Kochbereich)', detectedAt: timestamp };
      return p;
    });

    // Update Jul monthly movements (add 8 outbound items)
    db.monthlyMovements = db.monthlyMovements.map((m: MonthlyMovement) => {
      if (m.month === 'Jul') {
        const newEntnahmen = m.entnahmen + 8;
        return {
          ...m,
          entnahmen: newEntnahmen,
          differenz: m.eingaenge - newEntnahmen,
          activeStock: Math.max(0, m.activeStock - 4)
        };
      }
      return m;
    });

  } else if (action === 'laundry_cycle') {
    // Laundry uses -1 Detergente, and folds +10 Sets de Toallas
    db.inventory = db.inventory.map((item: InventoryItem) => {
      if (item.id === '7') return { ...item, stock: Math.max(0, item.stock - 1) };
      if (item.id === '8') return { ...item, stock: item.stock + 10 };
      return item;
    });

    const newEvents: EventLog[] = [
      {
        id: `evt-${Date.now()}-1`,
        timestamp,
        camera: 'CAM_03_WAESCHEREI',
        type: 'SISTEMA',
        description: 'Wäscherei (CAM_03): Start des Desinfektionswaschzyklus in Waschmaschine #2 (60°C). Dosierpumpe verbraucht 1 Kanister Flüssigwaschmittel.',
        items: 'Waschmaschine #2 Aktiviert',
        operator: 'Thomas Wagner (Wäschereileiter)'
      },
      {
        id: `evt-${Date.now()}-2`,
        timestamp,
        camera: 'CAM_03_WAESCHEREI',
        type: 'INGRESO',
        description: 'Wäscherei-Kamera: 10 frisch desinfizierte Badetücher-Sets automatisch über die Faltungs-Bilderkennung erfasst, gezählt und dem Regal L-2 hinzugefügt (+10 Sets).',
        items: '10 Badetücher-Sets',
        operator: 'Thomas Wagner (Wäschereileiter)'
      }
    ];

    // Check thresholds for laundry detergent
    db.inventory.forEach((item: InventoryItem) => {
      if (item.id === '7' && item.stock <= item.threshold) {
        newEvents.push({
          id: `evt-${Date.now()}-alert`,
          timestamp,
          camera: 'Warnsystem',
          type: 'ALERTA',
          description: `Kritischer Mindestbestand Wäscherei: Flüssigwaschmittel liegt bei ${item.stock} Kanister (Minimum: ${item.threshold}).`,
          items: item.name,
          operator: 'Vision-KI-System'
        });
      }
    });

    db.events = [...newEvents, ...db.events];

    db.people = db.people.map((p: Person) => {
      if (p.id === 'p-5') return { ...p, location: 'Wäscherei (Bedienung)', detectedAt: timestamp };
      return p;
    });

    // Update Jul monthly movements
    db.monthlyMovements = db.monthlyMovements.map((m: MonthlyMovement) => {
      if (m.month === 'Jul') {
        const newEingaenge = m.eingaenge + 10;
        const newEntnahmen = m.entnahmen + 1;
        return {
          ...m,
          eingaenge: newEingaenge,
          entnahmen: newEntnahmen,
          differenz: newEingaenge - newEntnahmen,
          activeStock: m.activeStock + 9
        };
      }
      return m;
    });

  } else if (action === 'guest_arrival') {
    // Reception uses -1 Tarjeta de Invitado RFID
    db.inventory = db.inventory.map((item: InventoryItem) => {
      if (item.id === '9') return { ...item, stock: Math.max(0, item.stock - 1) };
      return item;
    });

    const newEvents: EventLog[] = [
      {
        id: `evt-${Date.now()}-1`,
        timestamp,
        camera: 'CAM_01_HAUPTEINGANG',
        type: 'SISTEMA',
        description: 'Haupteingang (CAM_01): Fahrzeug des Gastes per Kennzeichen-OCR erkannt (HH-MB-2026). Check-in-Signal an Rezeption übermittelt.',
        items: 'Auto HH-MB-2026',
        operator: 'Marina Becker (Rezeption)'
      },
      {
        id: `evt-${Date.now()}-2`,
        timestamp,
        camera: 'CAM_01_HAUPTEINGANG',
        type: 'INGRESO',
        description: 'Lobby-Kamera: Automatische Zuweisung von Zimmer 104 per Gesichtserkennung. RFID-Gästekarte codiert und für Gast Sarah Connor vorbereitet (-1 Gästekarte Rohling).',
        items: '1 RFID-Gästekarte',
        operator: 'Marina Becker (Rezeption)'
      }
    ];
    db.events = [...newEvents, ...db.events];

    db.people = db.people.map((p: Person) => {
      if (p.id === 'p-4') return { ...p, location: 'Haupteingang / Lobby', detectedAt: timestamp };
      return p;
    });

    // Update Jul monthly movements
    db.monthlyMovements = db.monthlyMovements.map((m: MonthlyMovement) => {
      if (m.month === 'Jul') {
        const newEntnahmen = m.entnahmen + 1;
        return {
          ...m,
          entnahmen: newEntnahmen,
          differenz: m.eingaenge - newEntnahmen,
          activeStock: Math.max(0, m.activeStock - 1)
        };
      }
      return m;
    });

  } else if (action === 'item_relocation') {
    // Reallocate 3 Coca-Cola to another shelf (e.g. Estante D-2)
    db.inventory = db.inventory.map((item: InventoryItem) => {
      if (item.id === '1') return { ...item, location: 'Regal D-2 (Zuvor A-3)' };
      return item;
    });

    const newEvents: EventLog[] = [
      {
        id: `evt-${Date.now()}-1`,
        timestamp,
        camera: 'CAM_04_ZENTRALLAGER',
        type: 'REUBICACION',
        description: 'Zentrallager (CAM_04): ByteTrack und SAM2 erfassten interne Umlagerung: 3 Kisten Coca-Cola wurden durch Lagerassistentin Ana Gómez von Regal A-3 nach Regal D-2 bewegt. Gesamtbestand bleibt unverändert.',
        items: '3 Coca-Cola (Kisten)',
        operator: 'Ana Gómez (Lagerassistentin)'
      }
    ];
    db.events = [...newEvents, ...db.events];

    db.people = db.people.map((p: Person) => {
      if (p.id === 'p-2') return { ...p, location: 'Gang D (Umlagernd)', detectedAt: timestamp };
      return p;
    });

  } else if (action === 'reset') {
    // Reset to default
    db.inventory = JSON.parse(JSON.stringify(initialInventory));
    db.events = JSON.parse(JSON.stringify(initialEvents));
    db.people = JSON.parse(JSON.stringify(initialPeople));
    db.monthlyMovements = JSON.parse(JSON.stringify(initialMonthlyMovements));
  }
  
  if (action !== 'reset') {
    checkAndGenerateStockAlerts(prevInventory);
  }

  res.json({
    success: true,
    inventory: db.inventory,
    events: db.events,
    people: db.people,
    monthlyMovements: db.monthlyMovements
  });
});

// Simulate specific item changes from active cameras
app.post('/api/simulate-item-change', (req, res) => {
  const { itemId, change, camera } = req.body;
  const item = db.inventory.find((i: InventoryItem) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: 'Produkt nicht gefunden.' });
    return;
  }

  const now = new Date();
  const timestamp = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Apply stock change
  const oldStock = item.stock;
  item.stock = Math.max(0, item.stock + change);
  const diff = item.stock - oldStock;

  if (diff === 0) {
    res.json({
      success: true,
      inventory: db.inventory,
      events: db.events,
      people: db.people,
      monthlyMovements: db.monthlyMovements
    });
    return;
  }

  const type = diff > 0 ? 'INGRESO' : 'EGRESO';
  const actionText = diff > 0 ? 'Hinzufügung' : 'Entnahme';
  const op = diff > 0 ? 'Lagerassistentin' : 'Küchenchef';
  const operatorName = diff > 0 ? 'Ana Gómez' : 'Carlos Mendoza';

  const newEvent: EventLog = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp,
    camera: camera || 'CAM_04_ZENTRALLAGER',
    type,
    description: `KI-Bilderkennung (${camera || 'CAM_04_ZENTRALLAGER'}): Automatische ${actionText} von ${Math.abs(diff)} ${item.unit} ${item.name} erfasst. Bestand von ${oldStock} auf ${item.stock} angepasst.`,
    items: `${Math.abs(diff)} ${item.unit} ${item.name}`,
    operator: `${operatorName} (${op})`
  };

  db.events = [newEvent, ...db.events];

  // Verify threshold alerts
  if (item.stock <= item.threshold && oldStock > item.threshold) {
    db.events = [{
      id: `evt-${Date.now()}-alert`,
      timestamp,
      camera: 'Warnsystem',
      type: 'ALERTA',
      description: `Kritischer Mindestbestand erreicht: Das Produkt ${item.name} liegt bei ${item.stock} ${item.unit} (Minimum: ${item.threshold}).`,
      items: item.name,
      operator: 'Vision-KI-System'
    }, ...db.events];
  }

  // Update monthly movements for July
  db.monthlyMovements = db.monthlyMovements.map((m: MonthlyMovement) => {
    if (m.month === 'Jul') {
      const newEingaenge = diff > 0 ? m.eingaenge + diff : m.eingaenge;
      const newEntnahmen = diff < 0 ? m.entnahmen + Math.abs(diff) : m.entnahmen;
      return {
        ...m,
        eingaenge: newEingaenge,
        entnahmen: newEntnahmen,
        differenz: newEingaenge - newEntnahmen,
        activeStock: m.activeStock + diff
      };
    }
    return m;
  });

  res.json({
    success: true,
    inventory: db.inventory,
    events: db.events,
    people: db.people,
    monthlyMovements: db.monthlyMovements
  });
});

// Natural Language Queries through Gemini (Server-side)
app.post('/api/gemini/query', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Falta el parámetro prompt.' });
    return;
  }

  const ai = getGeminiClient();

  if (!ai) {
    // High-Fidelity local simulation parser when Gemini API key is missing
    console.log('GEMINI_API_KEY no configurado en secretos de la aplicación. Ejecutando motor de respuesta local.');
    const queryLower = prompt.toLowerCase();
    let responseText = '';

    if (queryLower.includes('coca-cola') || queryLower.includes('coca') || queryLower.includes('getränke') || queryLower.includes('cola')) {
      const cokeItem = db.inventory.find((i: InventoryItem) => i.id === '1');
      const movements = db.events.filter((e: EventLog) => e.items.includes('Coca-Cola') || e.description.includes('Coca-Cola'));
      responseText = `### 🥤 Status der Getränke (Coca-Cola)

Derzeit sind **${cokeItem ? cokeItem.stock : 0} Kisten** Coca-Cola in **${cokeItem ? cokeItem.location : 'Regal A-3'}** registriert (erfasst via Computer Vision). 

**Letzte Video-Analyse-Ereignisse:**
${movements.map((m: EventLog) => `- **[${m.timestamp}]** ${m.description} (*Bediener: ${m.operator}*)`).join('\n')}

*Hinweis: Der Mindestbestand liegt bei ${cokeItem ? cokeItem.threshold : 20} Einheiten.*`;
    } else if (queryLower.includes('mehl') || queryLower.includes('weizenmehl') || queryLower.includes('sack')) {
      const flourItem = db.inventory.find((i: InventoryItem) => i.id === '3');
      const movements = db.events.filter((e: EventLog) => e.items.includes('Weizenmehl') || e.items.includes('Harina') || e.description.includes('Weizenmehl') || e.description.includes('Mehl'));
      responseText = `### 🍞 Rückverfolgbarkeit von Weizenmehl

Es wurden **${flourItem ? flourItem.stock : 0} Säcke** (Sack 25kg) im **${flourItem ? flourItem.location : 'Regal B-1'}** erfasst.

**Heutige KI-verarbeitete Lagerbewegungen:**
${movements.length > 0 ? movements.map((m: EventLog) => `- **[${m.timestamp}]** ${m.description} (*Von: ${m.operator}*)`).join('\n') : '- Es wurden am heutigen Tag keine Mehlentnahmen registriert.'}

*Mindestbestand: ${flourItem ? flourItem.threshold : 8} Säcke.*`;
    } else if (queryLower.includes('mindestbestand') || queryLower.includes('kritisch') || queryLower.includes('warnung') || queryLower.includes('lagerbestand') || queryLower.includes('stock')) {
      const lowStockItems = db.inventory.filter((i: InventoryItem) => i.stock <= i.threshold);
      if (lowStockItems.length > 0) {
        responseText = `### ⚠️ Warnungen zum Mindestbestand (Vision KI)

Das System hat **${lowStockItems.length} Produkte** unterhalb des Sicherheitsbestands erkannt:

| Produkt | Aktueller Bestand | Mindestbestand | Registrierter Ort |
| :--- | :---: | :---: | :--- |
| ${lowStockItems.map((item: InventoryItem) => `**${item.name}** | \`${item.stock} ${item.unit}\` | ${item.threshold} | *${item.location}*`).join('\n| ')} |

*Empfehlung:* Ein Nachbestellungsentwurf für das ERP des Hotels wurde vorbereitet.`;
      } else {
        responseText = `### ✅ Überprüfung des Lagerbestands

Alle Artikel im Zentrallager liegen **über dem kritischen Mindestbestand**. Die IP-Kameras melden keine Unregelmäßigkeiten oder leeren Regale.`;
      }
    } else if (queryLower.includes('chef') || queryLower.includes('carlos') || queryLower.includes('koch') || queryLower.includes('entnahme') || queryLower.includes('entnahm')) {
      const chefEvts = db.events.filter((e: EventLog) => e.operator.includes('Carlos Mendoza') || e.description.includes('Küchenchef'));
      responseText = `### 🧑‍🍳 Aktivitätsprüfung - Küchenchef Carlos Mendoza

Die IP-Kameras des Lagers haben folgende Aktivitäten für **Carlos Mendoza (Küchenchef)** mittels Gesichtserkennung und automatischem Dienstausweis-Scan registriert:

${chefEvts.map((e: EventLog) => `- **[${e.timestamp}]** ${e.description} (*Beteiligte Artikel: ${e.items}*)`).join('\n')}

*Autorisierungsstatus:* Dienstausweis aktiv, regulärer Zugang.`;
    } else if (queryLower.includes('inventar') || queryLower.includes('lager') || queryLower.includes('bestand') || queryLower.includes('zusammenfassung')) {
      responseText = `### 📊 Echtzeit-Lagerbestandsbericht

Konsolidierter Bestandsbericht, verarbeitet von der Computer-Vision-Engine des **Hotel Hamburg**:

| Produkt | Menge | Minimum | Standort | Kategorie |
| :--- | :---: | :---: | :--- | :--- |
${db.inventory.map((i: InventoryItem) => `| ${i.name} | **${i.stock}** | ${i.threshold} | \`${i.location}\` | ${i.category} |`).join('\n')}

*Die Zählgenauigkeit beträgt 99,42 % durch YOLOv10 + SAM2 + OCR-Kreuzvalidierung.*`;
    } else {
      responseText = `### 🤖 Virtueller Assistent - Hotel Hamburg

Hallo! Ich bin der kognitive Assistenz-Engine, der in Echtzeit mit dem Kamerasystem des Lagers verbunden ist.

Ich kann alle Fragen zum heutigen Betrieb beantworten. Fragen Sie mich zum Beispiel:
1. 📈 *Welche Produkte haben derzeit einen kritischen Bestand?*
2. 🧑‍🍳 *Welche Zutaten hat Küchenchef Carlos Mendoza entnommen?*
3. 🥤 *Wie hoch ist der Bestand an Coca-Cola und welche Bewegungen gab es?*
4. 📋 *Gib mir eine vollständige Bestandsübersicht*`;
    }

    res.json({ response: responseText });
    return;
  }

  try {
    const systemInstruction = `
    Du bist die Künstliche Intelligenz von "Hotel Hamburg", ein intelligentes Hotelbetriebssystem, das Videodaten von Sicherheitskameras in betriebliche Ereignisse und Bestandsdaten umwandelt.
    Nachfolgend findest du den aktuellen Zustand des Inventars, die registrierten Bestandsbewegungen und das aktive Personal im Zentrallager des Hotels:

    --- AKTUELLES INVENTAR ---
    ${JSON.stringify(db.inventory, null, 2)}

    --- REGISTRIERTE EREIGNISSE DER VISION-MODELLE (YOLOv10, SAM2, OCR, Face ID) ---
    ${JSON.stringify(db.events, null, 2)}

    --- ERFASSTES PERSONAL IN DEN BEREICHEN ---
    ${JSON.stringify(db.people, null, 2)}

    --- ANTWORT-RICHTLINIEN ---
    1. Antworte hochprofessionell, sachlich und absolut präzise.
    2. Antworte IMMER auf Deutsch (fehlerfreies, professionelles Deutsch).
    3. Formuliere deine Antworten auf der strikten Grundlage der bereitgestellten Inventar- und Protokolldaten.
    4. Erkläre, welche Kameras oder Computer-Vision-Vorgänge (z. B. SAM2-Segmentierung, ByteTrack-Verfolgung, OCR oder Face ID) die Ereignisse erfasst haben, um den Bezug zum "Hotel Hamburg" zu demonstrieren.
    5. Verwende elegantes Markdown (Tabellen, Listen, Fettschrift), um deine Antwort optimal zu strukturieren.
    6. Identifiziere dich als die integrierte KI-Sicherheits- und Analyse-Schnittstelle des Hotel Hamburg.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    });

    res.json({ response: response.text });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error al invocar la API de Gemini:', err);
    res.status(500).json({ error: 'Error procesando tu consulta con el motor de IA.', details: errorMsg });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
