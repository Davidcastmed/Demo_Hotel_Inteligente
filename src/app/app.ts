import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { jsPDF } from 'jspdf';
import { Database } from './database';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  location: string;
  category: string;
  unit: string;
}

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

interface EventLog {
  id: string;
  timestamp: string;
  camera: string;
  type: 'INGRESO' | 'EGRESO' | 'REUBICACION' | 'SISTEMA' | 'ALERTA';
  description: string;
  items: string;
  operator: string;
  date?: string;
}

interface Person {
  id: string;
  name: string;
  role: string;
  badge: string;
  location: string;
  detectedAt: string;
}

interface MonthlyMovement {
  month: string;
  eingaenge: number;
  entnahmen: number;
  differenz: number;
  activeStock: number;
  activeStockRange?: [number, number];
}

interface DetectionBox {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface PredictionItem {
  itemId: string;
  name: string;
  stock: number;
  threshold: number;
  unit: string;
  category: string;
  dailyUsage: number;
  daysToThreshold: number;
  daysToEmpty: number;
  reorderDate: string;
  depletionDate: string;
  priority: 'CRITICAL' | 'WARNING' | 'STABIL';
  leadTime: number;
  reorderQty: number;
}

interface ReactRoot {
  render: (element: unknown) => void;
  unmount: () => void;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private db = inject(Database);

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
  private reactRoot?: ReactRoot;

  // App Navigation and tab state
  private _activeTab: 'dashboard' | 'camera' | 'inventory' | 'assistant' | 'architecture' | 'reports' | 'system_health' = 'dashboard';
  
  get activeTab() {
    return this._activeTab;
  }
  
  set activeTab(tab) {
    this._activeTab = tab;
    if (tab === 'dashboard') {
      setTimeout(() => this.renderChart(), 100);
    }
  }

  isMobileMenuOpen = false;
  isDarkMode = true;

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    setTimeout(() => this.renderChart(), 50);
    this.cdr.markForCheck();
  }

  // Configuration for Sidebar and Dashboard panel visibility
  sidebarMode: 'full' | 'icons' | 'hidden' = 'full';

  showFiltersPanel = true;
  showKpisPanel = true;
  showStatsPanel = true;
  showChartPanel = true;
  showForecastPanel = true;
  showInventoryEventsPanel = true;
  showHeatmapPersonnelPanel = true;

  toggleAllDashboardPanels(show: boolean) {
    this.showFiltersPanel = show;
    this.showKpisPanel = show;
    this.showStatsPanel = show;
    this.showChartPanel = show;
    this.showForecastPanel = show;
    this.showInventoryEventsPanel = show;
    this.showHeatmapPersonnelPanel = show;
    if (this.showChartPanel) {
      setTimeout(() => this.renderChart(), 100);
    }
  }

  toggleFiltersPanel() {
    this.showFiltersPanel = !this.showFiltersPanel;
  }

  toggleKpisPanel() {
    this.showKpisPanel = !this.showKpisPanel;
  }

  toggleStatsPanel() {
    this.showStatsPanel = !this.showStatsPanel;
  }

  toggleChartPanel() {
    this.showChartPanel = !this.showChartPanel;
    if (this.showChartPanel) {
      setTimeout(() => this.renderChart(), 100);
    }
  }

  toggleForecastPanel() {
    this.showForecastPanel = !this.showForecastPanel;
  }

  toggleInventoryEventsPanel() {
    this.showInventoryEventsPanel = !this.showInventoryEventsPanel;
  }

  toggleHeatmapPersonnelPanel() {
    this.showHeatmapPersonnelPanel = !this.showHeatmapPersonnelPanel;
  }

  setSidebarMode(mode: 'full' | 'icons' | 'hidden') {
    this.sidebarMode = mode;
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        this.renderChart();
      }, 150);
    }
  }

  ngAfterViewInit() {
    if (this.activeTab === 'dashboard') {
      setTimeout(() => this.renderChart(), 150);
    }
  }

  async renderChart() {
    if (this.activeTab !== 'dashboard') return;
    if (isPlatformBrowser(this.platformId)) {
      let React: { createElement: (type: unknown, props?: unknown, ...children: unknown[]) => unknown };
      let ReactDOMClient: { createRoot: (container: HTMLElement) => ReactRoot };
      let Recharts: {
        ResponsiveContainer: unknown;
        ComposedChart: unknown;
        CartesianGrid: unknown;
        XAxis: unknown;
        YAxis: unknown;
        Tooltip: unknown;
        Legend: unknown;
        Line: unknown;
        Area: unknown;
      };
      
      try {
        const reactMod = await import('react') as any;
        React = reactMod.createElement ? reactMod : (reactMod.default?.createElement ? reactMod.default : reactMod);
        
        const reactDomMod = await import('react-dom/client') as any;
        ReactDOMClient = reactDomMod.createRoot ? reactDomMod : (reactDomMod.default?.createRoot ? reactDomMod.default : reactDomMod);
        
        const rechartsMod = await import('recharts') as any;
        const getComp = (name: string) => {
          if (rechartsMod && rechartsMod[name] !== undefined) return rechartsMod[name];
          if (rechartsMod && rechartsMod.default && rechartsMod.default[name] !== undefined) return rechartsMod.default[name];
          return undefined;
        };

        Recharts = {
          ResponsiveContainer: getComp('ResponsiveContainer'),
          ComposedChart: getComp('ComposedChart'),
          CartesianGrid: getComp('CartesianGrid'),
          XAxis: getComp('XAxis'),
          YAxis: getComp('YAxis'),
          Tooltip: getComp('Tooltip'),
          Legend: getComp('Legend'),
          Line: getComp('Line'),
          Area: getComp('Area'),
        };
      } catch (err) {
        console.error('Error importing react/recharts:', err);
        return;
      }

      const container = this.chartContainer?.nativeElement;
      if (!container) return;

      // Clean up previous root if exists
      if (this.reactRoot) {
        try {
          this.reactRoot.unmount();
        } catch {
          // ignore unmount errors
        }
        this.reactRoot = undefined;
      }

      try {
        this.reactRoot = ReactDOMClient.createRoot(container);
        
        const chartElement = React.createElement(
          Recharts.ResponsiveContainer,
          { width: '100%', height: '100%' },
          React.createElement(
            Recharts.ComposedChart,
            { 
              data: this.filteredMonthlyMovements, 
              margin: { top: 20, right: 30, left: 10, bottom: 10 } 
            },
            React.createElement(Recharts.CartesianGrid, { strokeDasharray: '3 3', stroke: this.isDarkMode ? '#1F1F23' : '#E4E4E7' }),
            React.createElement(Recharts.XAxis, { 
              dataKey: 'month', 
              stroke: '#71717A', 
              fontSize: 10,
              tickLine: false,
              axisLine: { stroke: this.isDarkMode ? '#27272A' : '#E4E4E7' }
            }),
            React.createElement(Recharts.YAxis, { 
              stroke: '#71717A', 
              fontSize: 10,
              tickLine: false,
              axisLine: { stroke: this.isDarkMode ? '#27272A' : '#E4E4E7' }
            }),
            React.createElement(Recharts.Tooltip, {
              contentStyle: { 
                backgroundColor: this.isDarkMode ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                borderColor: this.isDarkMode ? '#27272a' : '#E4E4E7', 
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
              },
              labelStyle: { color: this.isDarkMode ? '#a1a1aa' : '#52525B', fontWeight: 'bold', fontSize: '11px', fontFamily: 'monospace' },
              itemStyle: { color: this.isDarkMode ? '#f4f4f5' : '#18181B', fontSize: '11px' }
            }),
            React.createElement(Recharts.Legend, { 
              verticalAlign: 'top', 
              height: 36,
              iconType: 'circle',
              formatter: (value: string) => {
                if (value === 'eingaenge') return 'Waren-Eingänge';
                if (value === 'entnahmen') return 'Waren-Entnahmen';
                if (value === 'activeStock') return 'Lagerindex';
                if (value === 'activeStockRange') return '95% Konfidenzbereich';
                return value;
              }
            }),
            React.createElement(Recharts.Area, { 
              type: 'monotone', 
              dataKey: 'activeStockRange', 
              stroke: 'none', 
              fill: '#6366F1', 
              fillOpacity: 0.12, 
              name: 'activeStockRange'
            }),
            React.createElement(Recharts.Line, { 
              type: 'monotone', 
              dataKey: 'eingaenge', 
              name: 'eingaenge', 
              stroke: '#10B981', 
              strokeWidth: 2.5,
              dot: { r: 3, fill: '#10B981', strokeWidth: 0 },
              activeDot: { r: 6, strokeWidth: 1 }
            }),
            React.createElement(Recharts.Line, { 
              type: 'monotone', 
              dataKey: 'entnahmen', 
              name: 'entnahmen', 
              stroke: '#F43F5E', 
              strokeWidth: 2.5,
              dot: { r: 3, fill: '#F43F5E', strokeWidth: 0 },
              activeDot: { r: 6, strokeWidth: 1 }
            }),
            React.createElement(Recharts.Line, { 
              type: 'monotone', 
              dataKey: 'activeStock', 
              name: 'activeStock', 
              stroke: '#6366F1', 
              strokeWidth: 2,
              strokeDasharray: '3 3',
              dot: { r: 2, fill: '#6366F1', strokeWidth: 0 },
              activeDot: { r: 5, strokeWidth: 1 }
            })
          )
        );
        
        this.reactRoot.render(chartElement);
      } catch (err) {
        console.error('Error rendering Recharts inside Angular:', err);
      }
    }
  }

  // System Health state
  networkLatency = 42; // ms
  packetLoss = 0.0; // %
  clusterAvailability = 99.98; // %
  clusterStatus: 'OPTIMAL' | 'DEGRADED' | 'MAINTENANCE' = 'OPTIMAL';
  clusterNodes = [
    { name: 'Edge-Node-01 (Hamburg-Lobby)', status: 'ONLINE', load: 45, temp: 42, ram: '14.2/32 GB', throughput: '2.1 GB/s' },
    { name: 'Edge-Node-02 (Hamburg-Küche)', status: 'ONLINE', load: 38, temp: 40, ram: '11.8/32 GB', throughput: '1.8 GB/s' },
    { name: 'Cloud-GPU-Cluster-01 (Hamburg-Central)', status: 'ONLINE', load: 12, temp: 65, ram: '6.4/16 GB', throughput: '0.8 GB/s' },
  ];

  camerasHealth = [
    { id: 'entrada', name: 'CAM_01: Haupteingang / Lobby', location: 'Haupteingang', status: 'ONLINE', fps: 30, resolution: '1920x1080', latency: 8, packetLoss: 0.0, bitrate: '4.2 Mbps' },
    { id: 'cocina', name: 'CAM_02: Hauptküche', location: 'Hauptküche', status: 'ONLINE', fps: 30, resolution: '1920x1080', latency: 12, packetLoss: 0.0, bitrate: '4.8 Mbps' },
    { id: 'lavanderia', name: 'CAM_03: Wäscherei & Leinen', location: 'Wäscherei', status: 'ONLINE', fps: 30, resolution: '1920x1080', latency: 15, packetLoss: 0.1, bitrate: '3.9 Mbps' },
    { id: 'bodega', name: 'CAM_04: Zentrallager', location: 'Zentrallager', status: 'ONLINE', fps: 30, resolution: '1920x1080', latency: 10, packetLoss: 0.0, bitrate: '4.1 Mbps' },
    { id: 'muelle', name: 'CAM_05: Laderampe', location: 'Laderampe', status: 'ONLINE', fps: 30, resolution: '1920x1080', latency: 18, packetLoss: 0.2, bitrate: '5.2 Mbps' },
  ];

  // API State
  inventory: InventoryItem[] = [];
  events: EventLog[] = [];
  people: Person[] = [];
  monthlyMovements: MonthlyMovement[] = [];
  
  // Prediction Engine State
  predictions: PredictionItem[] = [];
  occupancyRate = 75; // percentage
  predictionLoading = false;
  desiredConfidenceLevel = 95; // 90, 95, or 99 percent

  // Filters State
  filterStartDate = '2026-01-01';
  filterEndDate = '2026-07-31';
  selectedCategory = 'Alle';
  
  categories = [
    'Alle',
    'Getränke',
    'Grundnahrungsmittel',
    'Milchprodukte',
    'Verderbliche Waren',
    'Reinigungsmittel',
    'Wäschebestand',
    'Zutritt & Sicherheit'
  ];

  get filteredMonthlyMovements(): MonthlyMovement[] {
    let data = this.monthlyMovements;
    
    if (this.selectedCategory !== 'Alle') {
      const ratios: Record<string, { eingaenge: number, entnahmen: number, activeStock: number }> = {
        'Getränke': { eingaenge: 0.35, entnahmen: 0.32, activeStock: 0.40 },
        'Grundnahrungsmittel': { eingaenge: 0.25, entnahmen: 0.22, activeStock: 0.25 },
        'Milchprodukte': { eingaenge: 0.15, entnahmen: 0.18, activeStock: 0.12 },
        'Verderbliche Waren': { eingaenge: 0.12, entnahmen: 0.15, activeStock: 0.08 },
        'Reinigungsmittel': { eingaenge: 0.08, entnahmen: 0.07, activeStock: 0.08 },
        'Wäschebestand': { eingaenge: 0.10, entnahmen: 0.09, activeStock: 0.15 },
        'Zutritt & Sicherheit': { eingaenge: 0.05, entnahmen: 0.04, activeStock: 0.05 },
      };
      
      const ratio = ratios[this.selectedCategory] || { eingaenge: 1, entnahmen: 1, activeStock: 1 };
      
      data = this.monthlyMovements.map(m => {
        const e = Math.round(m.eingaenge * ratio.eingaenge);
        const en = Math.round(m.entnahmen * ratio.entnahmen);
        const s = Math.round(m.activeStock * ratio.activeStock);
        return {
          month: m.month,
          eingaenge: e,
          entnahmen: en,
          differenz: e - en,
          activeStock: s
        };
      });
    }
    
    const monthDates: Record<string, string> = {
      'Jan': '2026-01-01',
      'Feb': '2026-02-01',
      'Mär': '2026-03-01',
      'Apr': '2026-04-01',
      'Mai': '2026-05-01',
      'Jun': '2026-06-01',
      'Jul': '2026-07-01'
    };
    
    const filtered = data.filter(m => {
      const dateStr = monthDates[m.month];
      if (!dateStr) return true;
      return dateStr >= this.filterStartDate && dateStr <= this.filterEndDate;
    });

    const multiplier = this.desiredConfidenceLevel === 90 ? 0.12 : (this.desiredConfidenceLevel === 99 ? 0.26 : 0.18);
    return filtered.map(m => {
      const margin = Math.max(5, Math.round(m.activeStock * multiplier));
      return {
        ...m,
        activeStockRange: [Math.max(0, m.activeStock - margin), m.activeStock + margin]
      };
    });
  }

  get probabilisticForecasts() {
    return this.predictions.map(pred => {
      const item = this.inventory.find(i => i.id === pred.itemId) || pred;
      
      const relevantEvents = this.events.filter(evt => {
        const isEg = evt.type === 'EGRESO';
        const matchesName = (evt.items || '').toLowerCase().includes(pred.name.toLowerCase()) || 
                            (evt.description || '').toLowerCase().includes(pred.name.toLowerCase());
        return isEg && matchesName;
      });

      let withdrawalQuantities: number[] = [];
      relevantEvents.forEach(evt => {
        const regex = new RegExp(`(\\d+)\\s+(${pred.name}|${pred.name.split(' ')[0]})`, 'i');
        const match = (evt.items || evt.description || '').match(regex);
        if (match) {
          withdrawalQuantities.push(parseInt(match[1], 10));
        } else {
          withdrawalQuantities.push(2);
        }
      });

      if (withdrawalQuantities.length === 0) {
        withdrawalQuantities = [pred.dailyUsage * 1.2, pred.dailyUsage * 0.8, pred.dailyUsage * 1.5, pred.dailyUsage * 0.5];
      }

      const n = withdrawalQuantities.length;
      const meanDemand = withdrawalQuantities.reduce((a, b) => a + b, 0) / n;
      const variance = withdrawalQuantities.reduce((sum, val) => sum + Math.pow(val - meanDemand, 2), 0) / Math.max(1, n - 1);
      const stdDevDemand = Math.sqrt(variance);

      const leadTimeDays = pred.leadTime || 2;
      const meanLT = pred.dailyUsage * leadTimeDays;
      const dailyVolatility = stdDevDemand > 0 ? stdDevDemand : (pred.dailyUsage * 0.25);
      const stdDevLT = Math.sqrt(leadTimeDays) * dailyVolatility;

      let serviceLevelZ = 1.645;
      if (this.desiredConfidenceLevel === 90) {
        serviceLevelZ = 1.282;
      } else if (this.desiredConfidenceLevel === 99) {
        serviceLevelZ = 2.326;
      }
      const safetyStock = parseFloat((serviceLevelZ * stdDevLT).toFixed(1));

      const reorderPoint = parseFloat((meanLT + safetyStock).toFixed(1));

      const currentStock = item.stock;
      let stockoutRisk = 0;
      if (stdDevLT > 0) {
        const zScore = (currentStock - meanLT) / stdDevLT;
        const t = 1.0 / (1.0 + 0.2316419 * Math.abs(zScore));
        const d = 0.39894228 * Math.exp(-zScore * zScore / 2.0);
        let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
        if (zScore > 0) p = 1.0 - p;
        stockoutRisk = Math.round((1.0 - p) * 100);
      } else {
        stockoutRisk = currentStock < meanLT ? 100 : 0;
      }

      if (currentStock <= item.threshold) {
        stockoutRisk = 100;
      } else {
        stockoutRisk = Math.max(1, Math.min(99, stockoutRisk));
      }

      const isReorderRecommended = currentStock <= reorderPoint;

      return {
        itemId: pred.itemId,
        name: pred.name,
        stock: currentStock,
        unit: pred.unit,
        category: pred.category,
        dailyUsage: pred.dailyUsage,
        leadTime: leadTimeDays,
        safetyStock,
        reorderPoint,
        stockoutRisk,
        isReorderRecommended,
        suggestedReorderQty: pred.reorderQty,
        priority: currentStock <= item.threshold ? 'CRITICAL' : (isReorderRecommended ? 'WARNING' : 'STABIL')
      };
    });
  }

  matchesCategory(evt: EventLog, cat: string): boolean {
    if (cat === 'Alle') return true;
    const desc = (evt.description || '').toLowerCase();
    const items = (evt.items || '').toLowerCase();
    const text = `${desc} ${items}`;
    
    if (cat === 'Getränke') {
      return text.includes('coca-cola') || text.includes('sprite') || text.includes('getränke') || text.includes('cola');
    }
    if (cat === 'Grundnahrungsmittel') {
      return text.includes('weizenmehl') || text.includes('olivenöl') || text.includes('mehl') || text.includes('harina');
    }
    if (cat === 'Milchprodukte') {
      return text.includes('vollmilch') || text.includes('milch') || text.includes('karton');
    }
    if (cat === 'Verderbliche Waren') {
      return text.includes('tomaten') || text.includes('frisch') || text.includes('kiste');
    }
    if (cat === 'Reinigungsmittel') {
      return text.includes('waschmittel') || text.includes('flüssigwaschmittel') || text.includes('reinigung');
    }
    if (cat === 'Wäschebestand') {
      return text.includes('badetücher') || text.includes('handtuch') || text.includes('wäsche');
    }
    if (cat === 'Zutritt & Sicherheit') {
      return text.includes('rfid') || text.includes('zutritt') || text.includes('check-in') || text.includes('schlüssel') || text.includes('kennzeichen') || text.includes('auto') || text.includes('lkw') || text.includes('fahrzeug') || text.includes('qr-ausweis') || text.includes('dienstausweis') || text.includes('ausweis') || text.includes('rezeption');
    }
    return false;
  }

  get filteredEvents(): EventLog[] {
    const enrichedEvents = this.events.map((evt, index) => {
      if (evt.date) return evt;
      let dateStr = '2026-07-06';
      if (evt.id === 'evt-3') dateStr = '2026-07-05';
      else if (evt.id === 'evt-4') dateStr = '2026-07-04';
      else if (evt.id === 'evt-5') dateStr = '2026-07-03';
      else if (evt.id === 'evt-6') dateStr = '2026-07-02';
      else if (index >= 6) {
        const dayOffset = Math.min(5, Math.floor(index / 2));
        const day = 6 - dayOffset;
        dateStr = `2026-07-0${day}`;
      }
      return { ...evt, date: dateStr };
    });

    return enrichedEvents.filter(evt => {
      const matchesCat = this.matchesCategory(evt, this.selectedCategory);
      if (!matchesCat) return false;

      const evtDate = evt.date || '2026-07-06';
      return evtDate >= this.filterStartDate && evtDate <= this.filterEndDate;
    });
  }

  onStartDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.filterStartDate = value;
      this.renderChart();
      this.cdr.markForCheck();
    }
  }

  onEndDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.filterEndDate = value;
      this.renderChart();
      this.cdr.markForCheck();
    }
  }

  onCategoryChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.selectedCategory = value;
      this.renderChart();
      this.cdr.markForCheck();
    }
  }

  resetFilters() {
    this.filterStartDate = '2026-01-01';
    this.filterEndDate = '2026-07-31';
    this.selectedCategory = 'Alle';
    this.renderChart();
    this.cdr.markForCheck();
  }

  // Alerts calculated locally
  alertsCount = 0;

  // Alert module state
  alertPreferences: AlertPreference = {
    emailEnabled: true,
    smsEnabled: false,
    dashboardEnabled: true,
    contactEmail: 'lager.koordinator@hotel-hamburg.de',
    contactPhone: '+49 176 1234 5678'
  };
  notificationHistory: AutomaticNotification[] = [];
  alertSaving = false;
  editingThresholdId: string | null = null;
  editingThresholdValue = 0;

  // Dynamic KPIs calculations based on real-time data
  get meanCameraDowntime(): string {
    const baseDowntime = 8.5; // minutes
    const offlineCount = this.camerasHealth.filter(c => c.status === 'OFFLINE').length;
    const meanDowntime = baseDowntime + (offlineCount * 45.2);
    return meanDowntime.toFixed(1) + ' min';
  }

  get aiInferenceAccuracy(): string {
    const baseAccuracy = 99.42;
    const latencyFactor = this.networkLatency > 150 ? (this.networkLatency - 150) * 0.05 : 0;
    const packetLossFactor = this.packetLoss * 0.8;
    const offlineFactor = this.camerasHealth.filter(c => c.status === 'OFFLINE').length * 1.5;
    const accuracy = Math.max(75.0, baseAccuracy - latencyFactor - packetLossFactor - offlineFactor);
    return accuracy.toFixed(2) + '%';
  }

  get inventoryTurnoverEfficiency(): string {
    const items = this.inventory;
    if (!items || items.length === 0) return '85.4%';
    
    let totalScore = 0;
    items.forEach(item => {
      const ratio = item.stock / (item.threshold || 1);
      if (ratio >= 1.0 && ratio <= 2.5) {
        totalScore += 95; // Optimal level
      } else if (ratio > 2.5) {
        totalScore += Math.max(50, 95 - (ratio - 2.5) * 10); // Overstocked
      } else {
        totalScore += Math.max(30, ratio * 95); // Understocked
      }
    });
    
    const avgScore = totalScore / items.length;
    const occupancyFactor = (this.occupancyRate - 75) * 0.1;
    const finalScore = Math.min(100, Math.max(40, avgScore + occupancyFactor));
    return finalScore.toFixed(1) + '%';
  }

  // Selected month for chart tooltip hover
  hoveredMonth: MonthlyMovement | null = null;

  // Real-time camera stream visualizer simulation
  activeCamera: 'entrada' | 'cocina' | 'lavanderia' | 'bodega' | 'muelle' = 'entrada';
  cameraStatus: 'ONLINE' | 'RECORDING' | 'OFFLINE' = 'ONLINE';
  isSimulating = false;
  activeSimulationType: string | null = null;
  simulationProgress = 0;
  simulationLogs: string[] = [];

  // Continuous Scanner Loop Simulation Properties
  isAutoScanning = false;
  private autoScanTimerId: ReturnType<typeof setInterval> | null = null;
  cameraScanning = false;
  lastDetectedItem: { name: string; change: number; camera: string; timestamp: string; action: string; unit: string } | null = null;
  detectedItemsLog: { name: string; change: number; camera: string; timestamp: string; action: string; unit: string }[] = [];

  // Active simulated AI detections for overlapping the video frames
  detections: DetectionBox[] = [];

  // Algorithm Live Inspector states
  showAlgorithmInspector = true;
  pipelineMetrics = {
    gpuLoad: 38,
    vram: 2.38,
    latency: 42,
    fps: 29.8,
    tensorShape: '[1, 3, 640, 640]',
    activeFilters: Array(32).fill(0).map(() => Math.random() * 100),
    activeModel: 'YOLOv10 (Object Detection)'
  };

  // Gemini AI Assistant state
  assistantQuery = '';
  assistantMessages: { sender: 'user' | 'ai'; text: string; timestamp: string }[] = [
    {
      sender: 'ai',
      text: '🤖 **Willkommen im Hotel Hamburg!**\n\nIch bin der kognitive Hotel-Betriebsassistent, der direkt mit den IP-Kameras des Zentrallagers verbunden ist.\n\nIch kann komplexe Fragen zu Beständen, Zugriffen oder heutigen Bewegungen beantworten. Versuchen Sie mich zu fragen:\n- *Welche Produkte haben einen geringen Lagerbestand?*\n- *Welche Zutaten hat Küchenchef Carlos Mendoza heute entnommen?*\n- *Wie viele Kisten Coca-Cola wurden geliefert?*',
      timestamp: '02:37'
    }
  ];
  assistantLoading = false;

  // Technical Proposal form state
  proposalSubmitted = false;
  proposalLoading = false;

  // PDF Report configurations
  reportTitle = 'Täglicher Betriebsbericht';
  reportShift = 'Ganztägig (24 Std.)';
  includeStockSummary = true;
  includeLowStockAlerts = true;
  includeEventLogs = true;
  includePersonnelLogs = true;
  reportObservations = '';
  isGeneratingPDF = false;

  get chartPoints() {
    return this.filteredMonthlyMovements.map((m, i) => {
      const x = 50 + i * 100;
      return {
        month: m.month,
        eingaenge: m.eingaenge,
        entnahmen: m.entnahmen,
        differenz: m.differenz,
        activeStock: m.activeStock,
        x,
        yEingaenge: 250 - (m.eingaenge / 220) * 210,
        yEntnahmen: 250 - (m.entnahmen / 220) * 210,
        yActiveStock: 250 - (m.activeStock / 220) * 210,
        raw: m
      };
    });
  }

  get eingaengePath(): string {
    if (!this.filteredMonthlyMovements || this.filteredMonthlyMovements.length === 0) return '';
    return this.filteredMonthlyMovements.map((m, i) => {
      const x = 50 + i * 100;
      const y = 250 - (m.eingaenge / 220) * 210;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get eingaengeAreaPath(): string {
    const linePath = this.eingaengePath;
    if (!linePath) return '';
    const lastX = 50 + (this.filteredMonthlyMovements.length - 1) * 100;
    return `${linePath} L ${lastX} 250 L 50 250 Z`;
  }

  get entnahmenPath(): string {
    if (!this.filteredMonthlyMovements || this.filteredMonthlyMovements.length === 0) return '';
    return this.filteredMonthlyMovements.map((m, i) => {
      const x = 50 + i * 100;
      const y = 250 - (m.entnahmen / 220) * 210;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get entnahmenAreaPath(): string {
    const linePath = this.entnahmenPath;
    if (!linePath) return '';
    const lastX = 50 + (this.filteredMonthlyMovements.length - 1) * 100;
    return `${linePath} L ${lastX} 250 L 50 250 Z`;
  }

  get differenzPath(): string {
    if (!this.filteredMonthlyMovements || this.filteredMonthlyMovements.length === 0) return '';
    return this.filteredMonthlyMovements.map((m, i) => {
      const x = 50 + i * 100;
      const y = 250 - (m.activeStock / 220) * 210;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  get differenzAreaPath(): string {
    const linePath = this.differenzPath;
    if (!linePath) return '';
    const lastX = 50 + (this.filteredMonthlyMovements.length - 1) * 100;
    return `${linePath} L ${lastX} 250 L 50 250 Z`;
  }

  getHoverPoint() {
    if (!this.hoveredMonth) return null;
    const idx = this.filteredMonthlyMovements.findIndex(m => m.month === this.hoveredMonth?.month);
    if (idx === -1) return null;
    return {
      x: 50 + idx * 100,
      ...this.filteredMonthlyMovements[idx]
    };
  }

  get hoverPoint() {
    return this.getHoverPoint();
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchData();
      this.updateCameraDetections();
      
      // Simulate current clock updating
      setInterval(() => {
        this.cdr.markForCheck();
      }, 1000);

      // Fluctuate computer vision neural network pipeline telemetry metrics in real-time
      setInterval(() => {
        this.updatePipelineMetrics();
        this.cdr.markForCheck();
      }, 300);
    }
  }

  updatePipelineMetrics() {
    // Determine which algorithm is active based on camera and simulation status
    if (this.isSimulating) {
      const p = this.simulationProgress;
      if (p <= 20) {
        this.pipelineMetrics.activeModel = 'YOLOv10 (Multi-Object Detection)';
        this.pipelineMetrics.tensorShape = '[1, 3, 640, 640]';
      } else if (p <= 45) {
        this.pipelineMetrics.activeModel = 'SAM 2 (Segment Anything - Instance Segmentation)';
        this.pipelineMetrics.tensorShape = '[1, 256, 64, 64]';
      } else if (p <= 70) {
        this.pipelineMetrics.activeModel = 'ByteTrack (Multi-Object Association & Tracking)';
        this.pipelineMetrics.tensorShape = '[N, 128] Embeddings';
      } else if (p <= 90) {
        this.pipelineMetrics.activeModel = 'FaceNet & ResNet-50 (Biometric Face ID)';
        this.pipelineMetrics.tensorShape = '[1, 512] Landmark Embs';
      } else {
        this.pipelineMetrics.activeModel = 'EasyOCR / CRNN (Optical Character Recognition)';
        this.pipelineMetrics.tensorShape = '[1, 1, 32, 100] Word Patch';
      }
    } else {
      switch (this.activeCamera) {
        case 'entrada':
          this.pipelineMetrics.activeModel = 'YOLOv10 + ALPR (Automatic License Plate Recognition)';
          this.pipelineMetrics.tensorShape = '[1, 3, 640, 640]';
          break;
        case 'cocina':
          this.pipelineMetrics.activeModel = 'YOLOv10 + Thermal Heatmap Interpolation';
          this.pipelineMetrics.tensorShape = '[1, 1, 120, 160]';
          break;
        case 'lavanderia':
          this.pipelineMetrics.activeModel = 'SAM 2 + Instance Count Classification';
          this.pipelineMetrics.tensorShape = '[1, 3, 1024, 1024]';
          break;
        case 'bodega':
          this.pipelineMetrics.activeModel = 'YOLOv10 + ByteTrack (Inventory Association)';
          this.pipelineMetrics.tensorShape = '[1, 3, 640, 640]';
          break;
        case 'muelle':
          this.pipelineMetrics.activeModel = 'Florence-2-Large (Vision-Language counting)';
          this.pipelineMetrics.tensorShape = '[Tokens, ImagePatch]';
          break;
      }
    }

    // Fluctuate CPU/GPU, VRAM and inference latency slightly to resemble a real hardware sensor
    const gpuDelta = Math.floor(Math.random() * 7) - 3; // -3 to +3
    this.pipelineMetrics.gpuLoad = Math.max(25, Math.min(92, this.pipelineMetrics.gpuLoad + gpuDelta));

    const vramDelta = (Math.random() * 0.08) - 0.04; // -0.04 to +0.04
    this.pipelineMetrics.vram = parseFloat(Math.max(1.9, Math.min(3.8, this.pipelineMetrics.vram + vramDelta)).toFixed(2));

    const latDelta = Math.floor(Math.random() * 5) - 2; // -2 to +2
    this.pipelineMetrics.latency = Math.max(32, Math.min(58, this.pipelineMetrics.latency + latDelta));

    const fpsDelta = (Math.random() * 0.4) - 0.2; // -0.2 to +0.2
    this.pipelineMetrics.fps = parseFloat(Math.max(29.4, Math.min(30.4, this.pipelineMetrics.fps + fpsDelta)).toFixed(1));

    // Randomize CNN filter map intensities slightly for animation
    this.pipelineMetrics.activeFilters = this.pipelineMetrics.activeFilters.map(() => Math.random() * 100);

    // Fluctuate general system health metrics
    if (this.clusterStatus === 'OPTIMAL') {
      const latencyDelta = Math.floor(Math.random() * 3) - 1; // -1 to +1
      this.networkLatency = Math.max(28, Math.min(52, this.networkLatency + latencyDelta));
      this.packetLoss = 0.0;
    } else if (this.clusterStatus === 'DEGRADED') {
      const latencyDelta = Math.floor(Math.random() * 11) - 5;
      this.networkLatency = Math.max(180, Math.min(310, this.networkLatency + latencyDelta));
    }

    // Fluctuate individual cameras metrics
    this.camerasHealth.forEach(cam => {
      if (cam.status === 'ONLINE') {
        const camLatDelta = Math.floor(Math.random() * 3) - 1;
        cam.latency = Math.max(5, Math.min(38, cam.latency + camLatDelta));

        const lossDelta = (Math.random() * 0.06) - 0.03;
        cam.packetLoss = parseFloat(Math.max(0.0, Math.min(1.2, cam.packetLoss + lossDelta)).toFixed(2));

        const baseBitrate = parseFloat(cam.bitrate.split(' ')[0]);
        const bDelta = (Math.random() * 0.16) - 0.08;
        cam.bitrate = parseFloat(Math.max(3.0, Math.min(5.8, baseBitrate + bDelta)).toFixed(1)) + ' Mbps';
      } else {
        cam.latency = 0;
        cam.packetLoss = 100.0;
        cam.bitrate = '0.0 Mbps';
      }
    });

    // Fluctuate node processing loads and temperatures
    this.clusterNodes.forEach(node => {
      if (node.status === 'ONLINE') {
        const loadDelta = Math.floor(Math.random() * 9) - 4;
        node.load = Math.max(15, Math.min(88, node.load + loadDelta));

        const tempDelta = Math.floor(Math.random() * 3) - 1;
        node.temp = Math.max(38, Math.min(74, node.temp + tempDelta));
      }
    });
  }

  getOnlineCamerasCount(): number {
    return this.camerasHealth.filter(c => c.status === 'ONLINE').length;
  }

  toggleCameraStatus(camId: string) {
    const cam = this.camerasHealth.find(c => c.id === camId);
    if (cam) {
      cam.status = cam.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
      // If we disconnect/reconnect the active stream camera, update its visual status in the cctv viewer
      if (camId === this.activeCamera) {
        this.cameraStatus = cam.status as 'ONLINE' | 'OFFLINE';
      }
      this.cdr.markForCheck();
    }
  }

  simulateLatencySpike() {
    this.clusterStatus = 'DEGRADED';
    this.networkLatency = 245;
    this.packetLoss = 4.2;
    this.camerasHealth.forEach(cam => {
      if (cam.status === 'ONLINE') {
        cam.latency = Math.floor(Math.random() * 110) + 140;
        cam.packetLoss = parseFloat((Math.random() * 4.2 + 1.8).toFixed(2));
      }
    });
    this.cdr.markForCheck();

    // Auto recover after 5 seconds
    setTimeout(() => {
      this.clusterStatus = 'OPTIMAL';
      this.networkLatency = 42;
      this.packetLoss = 0.0;
      this.camerasHealth.forEach(cam => {
        if (cam.status === 'ONLINE') {
          cam.latency = cam.id === 'entrada' ? 8 : cam.id === 'cocina' ? 12 : cam.id === 'lavanderia' ? 15 : cam.id === 'bodega' ? 10 : 18;
          cam.packetLoss = 0.0;
        }
      });
      this.cdr.markForCheck();
    }, 5000);
  }

  reconnectAllCameras() {
    this.camerasHealth.forEach(cam => {
      cam.status = 'ONLINE';
    });
    const currentActiveCam = this.camerasHealth.find(c => c.id === this.activeCamera);
    if (currentActiveCam) {
      this.cameraStatus = 'ONLINE';
    }
    this.clusterStatus = 'OPTIMAL';
    this.cdr.markForCheck();
  }

  fetchData() {
    this.inventory = this.db.getInventory();
    this.events = this.db.getEvents();
    this.people = this.db.getPeople();
    this.monthlyMovements = this.db.getMonthlyMovements();
    this.alertPreferences = this.db.getAlertPreferences();
    this.notificationHistory = this.db.getNotificationHistory();
    this.alertsCount = this.inventory.filter(item => item.stock <= item.threshold).length;
    this.fetchPredictions();
    this.cdr.markForCheck();
    setTimeout(() => this.renderChart(), 100);
  }

  fetchPredictions() {
    this.predictionLoading = true;
    this.cdr.markForCheck();
    try {
      const data = this.db.getPredictions(this.occupancyRate);
      this.predictions = data.predictions;
      this.predictionLoading = false;
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Error fetching inventory predictions:', err);
      this.predictionLoading = false;
      this.cdr.markForCheck();
    }
  }

  updateOccupancyRate(rate: number) {
    this.occupancyRate = Math.max(10, Math.min(150, rate));
    this.fetchPredictions();
  }

  orderItem(itemId: string, quantity: number) {
    this.db.orderItem(itemId, quantity);
    this.fetchData();
  }

  // Switch camera feed and update corresponding YOLO bounding boxes
  switchCamera(cam: 'entrada' | 'cocina' | 'lavanderia' | 'bodega' | 'muelle') {
    this.activeCamera = cam;
    this.updateCameraDetections();
    this.cdr.markForCheck();
  }

  updateCameraDetections() {
    if (this.activeCamera === 'entrada') {
      this.detections = [
        { label: 'Fahrzeug: HH-MB-2026 [98.2%]', x: 15, y: 20, w: 30, h: 50, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
        { label: 'Gast: Sarah Connor [97.5%]', x: 50, y: 25, w: 15, h: 65, color: 'border-indigo-500 text-indigo-400 bg-indigo-500/10' },
        { label: 'Gepäckwagen [95.4%]', x: 68, y: 45, w: 20, h: 45, color: 'border-amber-500 text-amber-400 bg-amber-500/10' }
      ];
    } else if (this.activeCamera === 'cocina') {
      this.detections = [
        { label: 'Person: Carlos M. [99.2%]', x: 20, y: 15, w: 22, h: 70, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
        { label: 'Pfanne (Temp: 180°C)', x: 45, y: 40, w: 18, h: 20, color: 'border-rose-500 text-rose-400 bg-rose-500/10' },
        { label: 'Hygiene: Schutzhaube [OK]', x: 22, y: 10, w: 12, h: 10, color: 'border-blue-500 text-blue-400 bg-blue-500/10' }
      ];
    } else if (this.activeCamera === 'lavanderia') {
      this.detections = [
        { label: 'Waschmaschine #2 [AKTIV]', x: 15, y: 15, w: 30, h: 60, color: 'border-indigo-500 text-indigo-400 bg-indigo-500/10' },
        { label: 'Stapel Handtücher [40 Sets]', x: 55, y: 30, w: 18, h: 40, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
        { label: 'Kanister: Waschmittel [15L]', x: 78, y: 40, w: 12, h: 30, color: 'border-amber-500 text-amber-400 bg-amber-500/10' }
      ];
    } else if (this.activeCamera === 'bodega') {
      this.detections = [
        { label: 'Person: Ana G. [Lager]', x: 45, y: 15, w: 20, h: 68, color: 'border-blue-500 text-blue-400 bg-blue-500/10' },
        { label: 'Kiste Coca-Cola [99.1%]', x: 70, y: 25, w: 14, h: 18, color: 'border-rose-500 text-rose-400 bg-rose-500/10' },
        { label: 'Regale A-B [Stand: 65%]', x: 10, y: 10, w: 25, h: 80, color: 'border-zinc-500 text-zinc-300 bg-zinc-500/10' }
      ];
    } else {
      this.detections = [
        { label: 'Lieferfahrzeug [96.7%]', x: 10, y: 10, w: 40, h: 80, color: 'border-indigo-500 text-indigo-400 bg-indigo-500/10' },
        { label: 'Lieferant: Juan P. [99.0%]', x: 55, y: 30, w: 15, h: 60, color: 'border-cyan-500 text-cyan-400 bg-cyan-500/10' },
        { label: 'Transportwagen [94.5%]', x: 72, y: 50, w: 18, h: 35, color: 'border-purple-500 text-purple-400 bg-purple-500/10' }
      ];
    }
  }

  // Active AI simulation sequence showing the deep visual pipeline logs to users
  runSimulation(action: 'guest_arrival' | 'chef_withdrawal' | 'laundry_cycle' | 'item_relocation' | 'supplier_arrival' | 'reset') {
    if (this.isSimulating) return;

    this.isSimulating = true;
    this.activeSimulationType = action;
    this.simulationProgress = 0;
    this.simulationLogs = [];
    this.cdr.markForCheck();

    const logsByAction = {
      guest_arrival: [
        '🔄 [0ms] Analysiere Videostrom von IP-Kamera 01 (Haupteingang)...',
        '🚗 [400ms] YOLOv10: Fahrzeug erkannt (HH-MB-2026). Kennzeichen-OCR erfolgreich verifiziert.',
        '🧳 [800ms] SAM2-Tracker: Verfolge Gepäckwagen mit 4 Gepäckstücken. Ziel: Gepäckraum.',
        '🧑‍💼 [1200ms] Face ID: Rezeptionistin Marina Becker am Empfangstisch identifiziert. Schicht aktiv.',
        '🔑 [1600ms] Event Engine: Automatischer Zimmerschlüssel-Check für Gast Sarah Connor eingeleitet (Zimmer 104).',
        '✅ [2000ms] Synchronisierung abgeschlossen: Gästeankunft registriert und RFID-Schlüsseldaten aktualisiert.'
      ],
      chef_withdrawal: [
        '🔄 [0ms] Analysiere Videostrom von IP-Kamera 02 (Hauptküche)...',
        '🧑‍🍳 [400ms] Face ID & QR-Ausweis: Person als Carlos Mendoza (Küchenchef) identifiziert.',
        '🔥 [800ms] Thermo-Vision: Grill und Kochstelle auf optimaler Betriebstemperatur (180°C) verifiziert.',
        '🥫 [1200ms] SAM2-Tracker: Entnahme von 2 Olivenölkanistern (5L) und 1 Kiste Tomaten aus Regal B-2 registriert.',
        '📉 [1600ms] Event Engine: Reduziere Küchenbestand im Zentralsystem. Sicherheitsgrenzen überprüft.',
        '✅ [2000ms] Synchronisierung abgeschlossen: Küchenbestand aktualisiert und in Echtzeit verbucht.'
      ],
      laundry_cycle: [
        '🔄 [0ms] Analysiere Videostrom von IP-Kamera 03 (Wäscherei)...',
        '🧺 [400ms] SAM2-Tracker: Wäscheleiter Thomas Wagner gestartet mit 4 Beuteln verschmutzter Bettwäsche.',
        '🧼 [800ms] OCR Füllstandmessung: Flüssigwaschmittel-Düse gestartet. -1 Kanister (20L) verbraucht.',
        '🌀 [1200ms] Status-Analyse: Waschmaschine #2 im aktiven Desinfektionszyklus (60°C) erkannt.',
        '🧺 [1600ms] Computer Vision: Stapel von 10 frisch gereinigten Handtuch-Sets erfasst und verbucht (+10 Sets).',
        '✅ [2000ms] Synchronisierung abgeschlossen: Wäschereibestand aktualisiert und Zykluszeiten protokolliert.'
      ],
      item_relocation: [
        '🔄 [0ms] Analysiere Umlagerung via IP-Kamera 04 (Zentrallager)...',
        '👷 [400ms] RFID-Gate: Tag von Assistentin Ana Gómez beim Betreten des Gangs gescannt.',
        '📦 [800ms] YOLOv10 + ByteTrack: Kiste Coca-Cola von Regal A-3 entnommen.',
        '📌 [1200ms] Raumanalyse: Neupositionierung in Regal D-2 erkannt.',
        '💾 [1600ms] Event Engine: Standort auf Regal D-2 erfolgreich aktualisiert. Gesamtbestand unverändert.',
        '✅ [2000ms] Synchronisierung abgeschlossen: Lagerkoordinaten in der Datenbank aktualisiert.'
      ],
      supplier_arrival: [
        '🔄 [0ms] Analysiere Videostrom von IP-Kamera 05 (Laderampe)...',
        '🚚 [400ms] YOLOv10: Lieferfahrzeug erkannt (SH-PL-405). Starte SAM2-Segmentierung.',
        '📦 [800ms] Florence-2: Verarbeite multimodale Zählung der entladenen Getränkekisten und Säcke.',
        '🔍 [1200ms] OCR Barcode-Scan: Palettenetiketten verifiziert gegen Bestellung #OC-7721 (+20 Coca-Cola, +15 Sprite, +8 Weizenmehl).',
        '💾 [1600ms] Event Engine: Abgleich der gelieferten Bestände mit dem Wareneingangsjournal abgeschlossen.',
        '✅ [2000ms] Synchronisierung abgeschlossen: Bestandsdaten und Lieferantenstatus aktualisiert.'
      ],
      reset: [
        '🔄 [0ms] Fordere allgemeinen Reset vom Zentralserver an...',
        '🧹 [500ms] Bereinige Simulationsprotokolle und Lagerbestände...',
        '✅ [1000ms] Lagerdatenbank erfolgreich auf Anfangswerte zurückgesetzt.'
      ]
    };

    const actionLogs = logsByAction[action];
    let currentLogIndex = 0;

    const interval = setInterval(() => {
      if (currentLogIndex < actionLogs.length) {
        this.simulationLogs.push(actionLogs[currentLogIndex]);
        this.simulationProgress = Math.round(((currentLogIndex + 1) / actionLogs.length) * 100);
        currentLogIndex++;
        this.cdr.markForCheck();
      } else {
        clearInterval(interval);
        try {
          this.db.simulateAction(action);
          this.fetchData();
          this.isSimulating = false;
          this.activeSimulationType = null;
          this.cdr.markForCheck();
        } catch (err) {
          console.error('Error running simulated action:', err);
          this.isSimulating = false;
          this.activeSimulationType = null;
          this.cdr.markForCheck();
        }
      }
    }, 350);
  }

  // Clear interval on destroy
  ngOnDestroy() {
    this.stopAutoScan();
  }

  toggleAutoScan() {
    if (this.isAutoScanning) {
      this.stopAutoScan();
    } else {
      this.startAutoScan();
    }
  }

  startAutoScan() {
    this.isAutoScanning = true;
    this.cdr.markForCheck();

    // Trigger immediate first scan
    this.runSingleAutoScanTick();

    // Setup interval to scan every 8 seconds
    this.autoScanTimerId = setInterval(() => {
      this.runSingleAutoScanTick();
    }, 8000);
  }

  stopAutoScan() {
    this.isAutoScanning = false;
    if (this.autoScanTimerId) {
      clearInterval(this.autoScanTimerId);
      this.autoScanTimerId = null;
    }
    this.cameraScanning = false;
    this.cdr.markForCheck();
  }

  runSingleAutoScanTick() {
    if (this.isSimulating) return; // Wait if another heavy simulation is already active

    // 1. Rotate to next camera sequentially to make it highly visual
    const cameras: ('entrada' | 'cocina' | 'lavanderia' | 'bodega' | 'muelle')[] = ['entrada', 'cocina', 'lavanderia', 'bodega', 'muelle'];
    const nextIndex = (cameras.indexOf(this.activeCamera) + 1) % cameras.length;
    this.activeCamera = cameras[nextIndex];
    this.updateCameraDetections();
    this.cameraScanning = true;
    this.cdr.markForCheck();

    // 2. We define simulated scan detection variations based on the camera
    const possibleDetections: Record<string, { itemId: string; name: string; change: number; label: string; x: number; y: number; w: number; h: number; color: string; unit: string }[]> = {
      entrada: [
        { itemId: '9', name: 'RFID-Gästekarten (Rohlinge)', change: -1, label: 'Gast checkt ein: -1 RFID Gästekarte [99.5%]', x: 45, y: 35, w: 20, h: 40, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Stück' },
        { itemId: '9', name: 'RFID-Gästekarten (Rohlinge)', change: -2, label: 'Doppel-Checkin: -2 RFID Gästekarten [98.4%]', x: 45, y: 35, w: 20, h: 40, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Stück' }
      ],
      cocina: [
        { itemId: '4', name: 'Olivenöl (Kanister 5L)', change: -1, label: 'SAM2: -1 Olivenölkanister entnommen [97.1%]', x: 40, y: 40, w: 18, h: 32, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Kanister' },
        { itemId: '5', name: 'Vollmilch (Karton x12)', change: -2, label: 'SAM2: -2 Milchkartons entnommen [96.8%]', x: 50, y: 35, w: 22, h: 30, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Kartons' },
        { itemId: '6', name: 'Kiste Tomaten (Frisch 10kg)', change: -1, label: 'YOLOv10: -1 Kiste Tomaten entnommen [99.0%]', x: 30, y: 50, w: 25, h: 25, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Kisten' }
      ],
      lavanderia: [
        { itemId: '7', name: 'Flüssigwaschmittel (Kanister 20L)', change: -1, label: 'Dosierpumpe: -1 Waschmittelkanister [99.9%]', x: 75, y: 45, w: 15, h: 35, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Kanister' },
        { itemId: '8', name: 'Badetücher-Set (x10 Handtücher)', change: 5, label: 'Reinigung abgeschlossen: +5 Handtuch-Sets [94.2%]', x: 55, y: 30, w: 22, h: 42, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10', unit: 'Sets' },
        { itemId: '8', name: 'Badetücher-Set (x10 Handtücher)', change: 10, label: 'Reinigung abgeschlossen: +10 Handtuch-Sets [95.7%]', x: 55, y: 30, w: 22, h: 42, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10', unit: 'Sets' }
      ],
      bodega: [
        { itemId: '1', name: 'Coca-Cola (Kiste x24)', change: -2, label: 'YOLO: Entnahme -2 Kisten Coca-Cola [99.2%]', x: 70, y: 25, w: 20, h: 20, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Kisten' },
        { itemId: '2', name: 'Sprite (Kiste x24)', change: -1, label: 'YOLO: Entnahme -1 Kiste Sprite [98.5%]', x: 65, y: 30, w: 18, h: 18, color: 'border-rose-500 text-rose-400 bg-rose-500/10', unit: 'Kisten' },
        { itemId: '1', name: 'Coca-Cola (Kiste x24)', change: 4, label: 'Umlagerung: +4 Kisten Coca-Cola [97.0%]', x: 20, y: 40, w: 24, h: 24, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10', unit: 'Kisten' }
      ],
      muelle: [
        { itemId: '3', name: 'Weizenmehl (Sack 25kg)', change: 5, label: 'Lieferung: +5 Säcke Weizenmehl [98.1%]', x: 60, y: 40, w: 20, h: 35, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10', unit: 'Säcke' },
        { itemId: '1', name: 'Coca-Cola (Kiste x24)', change: 10, label: 'Lieferung: +10 Kisten Coca-Cola [99.4%]', x: 72, y: 50, w: 22, h: 30, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10', unit: 'Kisten' }
      ]
    };

    const currentCam = this.activeCamera;
    const camEvents = possibleDetections[currentCam] || [];
    if (camEvents.length === 0) return;

    // Pick a random event for this camera
    const selectedEvent = camEvents[Math.floor(Math.random() * camEvents.length)];

    // 3. We simulate scanning for 2.5 seconds, then post the result to the server
    setTimeout(() => {
      // If we turned off scanning or switched tab during timeout, abort
      if (!this.isAutoScanning || this.activeCamera !== currentCam) {
        this.cameraScanning = false;
        this.cdr.markForCheck();
        return;
      }

      this.cameraScanning = false;

      // 4. Temporarily override or inject the scanning bounding box as the active detection!
      const detectionBox: DetectionBox = {
        label: selectedEvent.label,
        x: selectedEvent.x,
        y: selectedEvent.y,
        w: selectedEvent.w,
        h: selectedEvent.h,
        color: selectedEvent.color
      };
      this.detections = [detectionBox, ...this.detections.slice(0, 2)];

      // 5. Update last detected state for HUD display
      const now = new Date();
      this.lastDetectedItem = {
        name: selectedEvent.name,
        change: selectedEvent.change,
        camera: currentCam === 'entrada' ? 'CAM_01: Lobby' :
                currentCam === 'cocina' ? 'CAM_02: Küche' :
                currentCam === 'lavanderia' ? 'CAM_03: Wäscherei' :
                currentCam === 'bodega' ? 'CAM_04: Lager' : 'CAM_05: Rampe',
        timestamp: now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: selectedEvent.change > 0 ? 'SUMME' : 'REST',
        unit: selectedEvent.unit
      };

      // Add to beginning of local detection history log
      this.detectedItemsLog = [this.lastDetectedItem, ...this.detectedItemsLog].slice(0, 15);

      // 6. Update stock change via local Database service
      try {
        const targetCam = currentCam === 'entrada' ? 'CAM_01_HAUPTEINGANG' :
                          currentCam === 'cocina' ? 'CAM_02_HAUPTKUECHE' :
                          currentCam === 'lavanderia' ? 'CAM_03_WAESCHEREI' :
                          currentCam === 'bodega' ? 'CAM_04_ZENTRALLAGER' : 'CAM_05_LADERAMPE';
        this.db.simulateItemChange(selectedEvent.itemId, selectedEvent.change, targetCam);
        this.fetchData();
        setTimeout(() => this.renderChart(), 50);
      } catch (err) {
        console.error('Error simulating item change in local database:', err);
      }

      this.cdr.markForCheck();
    }, 2500);
  }

  // Handle Input text from user inside Chat Assistant
  onQueryInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.assistantQuery = target.value;
  }

  // Send query to Gemini API (or local smart parser fallback)
  submitAssistantQuery() {
    const queryText = this.assistantQuery.trim();
    if (!queryText || this.assistantLoading) return;

    this.assistantMessages.push({
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    });

    this.assistantQuery = '';
    this.assistantLoading = true;
    this.cdr.markForCheck();

    // Scroll chat bottom smoothly
    setTimeout(() => {
      const chatContainer = document.getElementById('chat-scroll-pane');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);

    fetch('/api/gemini/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: queryText })
    })
    .then(res => res.json())
    .then(data => {
      this.assistantMessages.push({
        sender: 'ai',
        text: data.response || data.error || 'Keine Antwort vom kognitiven System erhalten.',
        timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      });
      this.assistantLoading = false;
      this.cdr.markForCheck();

      setTimeout(() => {
        const chatContainer = document.getElementById('chat-scroll-pane');
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 50);
    })
    .catch(err => {
      console.error('Error invoking Gemini endpoint:', err);
      this.assistantMessages.push({
        sender: 'ai',
        text: '❌ **Netzwerkfehler**: Die Kommunikation mit dem zentralen KI-Server ist fehlgeschlagen.',
        timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      });
      this.assistantLoading = false;
      this.cdr.markForCheck();
    });
  }

  // Pre-fill a suggestion in the chat input
  useSuggestion(suggestion: string) {
    this.assistantQuery = suggestion;
    this.submitAssistantQuery();
  }

  // Formatting markdown-like texts beautifully in helper
  formatMessageText(text: string): string {
    // Process headers
    let html = text
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-white mt-3 mb-1 font-sans">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-4 mb-2 border-b border-white/10 pb-1 font-sans">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-white mt-5 mb-3 font-sans">$1</h1>');

    // Process bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-400 font-medium">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="text-zinc-400">$1</em>');

    // Process single backticks (codes)
    html = html.replace(/`(.*?)`/g, '<code class="bg-zinc-950 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono border border-zinc-850">$1</code>');

    // Process lists (unordered)
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-gray-300 text-sm py-0.5">$1</li>');

    // Process table syntax (simple markdown table generator replacement)
    if (html.includes('|')) {
      const lines = html.split('\n');
      let tableOpen = false;
      const newLines: string[] = [];

      for (const line of lines) {
        if (line.trim().startsWith('|')) {
          const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          
          if (line.includes('---') || line.includes(':---')) {
            // Divider row, skip
            continue;
          }

          if (!tableOpen) {
            newLines.push('<div class="overflow-x-auto my-3"><table class="w-full text-xs text-left text-gray-300 border border-white/10 rounded-lg"><thead><tr class="bg-slate-950/80 text-gray-400 uppercase font-mono tracking-wider border-b border-white/10">');
            cells.forEach(c => {
              newLines.push(`<th class="px-3 py-2 border-r border-white/10">${c}</th>`);
            });
            newLines.push('</tr></thead><tbody>');
            tableOpen = true;
          } else {
            newLines.push('<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">');
            cells.forEach(c => {
              newLines.push(`<td class="px-3 py-2 border-r border-white/5 font-sans">${c}</td>`);
            });
            newLines.push('</tr>');
          }
        } else {
          if (tableOpen) {
            newLines.push('</tbody></table></div>');
            tableOpen = false;
          }
          newLines.push(line);
        }
      }
      if (tableOpen) {
        newLines.push('</tbody></table></div>');
      }
      html = newLines.join('\n');
    }

    return html;
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (GMT-7)';
  }

  submitProposal(event: Event) {
    event.preventDefault();
    this.proposalLoading = true;
    this.cdr.markForCheck();
    
    setTimeout(() => {
      this.proposalLoading = false;
      this.proposalSubmitted = true;
      this.cdr.markForCheck();
    }, 1500);
  }

  exportPDF() {
    this.isGeneratingPDF = true;
    this.cdr.markForCheck();

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        let y = 20;
        const pageHeight = 297;
        const margin = 15;
        const pageWidth = 210;
        const contentWidth = pageWidth - (margin * 2);

        const checkPageBreak = (neededHeight: number) => {
          if (y + neededHeight > pageHeight - 20) {
            doc.addPage();
            y = 20;
            drawPageHeaderFooter();
          }
        };

        const drawPageHeaderFooter = () => {
          // Top line
          doc.setFillColor(79, 70, 229);
          doc.rect(margin, 10, contentWidth, 1.5, 'F');
          
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text('Hotel Hamburg - Intelligentes Edge-System', margin, pageHeight - 10);
          doc.text(`Generiert: ${new Date().toLocaleDateString('de-DE')} | Seite ${doc.getNumberOfPages()}`, pageWidth - margin - 50, pageHeight - 10);
        };

        drawPageHeaderFooter();

        // BRANDING
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text('HOTEL HAMBURG', margin, y + 5);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229);
        doc.text('KOGNITIVE AUDITIERUNG & BESTANDSKONTROLLE', margin, y + 10);
        
        y += 18;

        // Metadata box
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 24, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, contentWidth, 24, 'D');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('AUDIT-DATEN:', margin + 5, y + 6);
        doc.text('SYSTEMSTATUS:', margin + 95, y + 6);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`Titel: ${this.reportTitle}`, margin + 5, y + 12);
        doc.text(`Tenant: Hotel Hamburg (ID: Tenant-08221)`, margin + 5, y + 17);
        doc.text(`Schicht: ${this.reportShift}`, margin + 5, y + 22);

        doc.text(`Ausstellungsdatum: ${new Date().toLocaleString('de-DE')}`, margin + 95, y + 12);
        doc.text('Inferenzgenauigkeit: 99.42% (YOLOv10 / SAM2)', margin + 95, y + 17);
        doc.text(`CCTV-Kameras: 2/2 Verbunden (Edge)`, margin + 95, y + 22);

        y += 32;

        // SUMMARY METRICS
        checkPageBreak(30);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('Zusammenfassung der Betriebskennzahlen', margin, y);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + 2, margin + contentWidth, y + 2);
        y += 8;

        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, contentWidth, 12, 'F');
        doc.rect(margin, y, contentWidth, 12, 'D');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('EREIGNISVERLAUF', margin + 5, y + 5);
        doc.text('LAGERSITUATION', margin + 50, y + 5);
        doc.text('KRITISCHE WARNUNGEN', margin + 95, y + 5);
        doc.text('REGISTRIERTES PERSONAL', margin + 140, y + 5);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229);
        doc.text(`${this.events.length} Ereignisse`, margin + 5, y + 10);
        doc.text(`${this.inventory.length} Aktive Artikel`, margin + 50, y + 10);
        doc.text(`${this.alertsCount} Unter Minimum`, margin + 95, y + 10);
        doc.text(`${this.people.length} Mitarbeiter`, margin + 140, y + 10);

        y += 18;

        // INVENTORY TABLE
        if (this.includeStockSummary) {
          checkPageBreak(50);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text('Zentrallager-Inventar (Regalebenen)', margin, y);
          doc.line(margin, y + 2, margin + contentWidth, y + 2);
          y += 8;

          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, 7, 'F');
          doc.rect(margin, y, contentWidth, 7, 'D');

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text('ID', margin + 3, y + 5);
          doc.text('Zutat / Produkt', margin + 15, y + 5);
          doc.text('Kategorie', margin + 65, y + 5);
          doc.text('Standort', margin + 100, y + 5);
          doc.text('Bestand', margin + 140, y + 5);
          doc.text('Minimum', margin + 160, y + 5);
          y += 7;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          
          this.inventory.forEach((item, index) => {
            checkPageBreak(10);
            
            if (index % 2 === 0) {
              doc.setFillColor(252, 253, 254);
              doc.rect(margin, y, contentWidth, 7, 'F');
            }
            doc.setDrawColor(241, 245, 249);
            doc.rect(margin, y, contentWidth, 7, 'D');

            doc.text(`#00${item.id}`, margin + 3, y + 5);
            doc.text(`${item.name} (${item.unit})`, margin + 15, y + 5);
            doc.text(item.category, margin + 65, y + 5);
            doc.text(item.location, margin + 100, y + 5);

            if (item.stock <= item.threshold) {
              doc.setFont('Helvetica', 'bold');
              doc.setTextColor(220, 38, 38);
              doc.text(`${item.stock}`, margin + 140, y + 5);
              doc.setFont('Helvetica', 'normal');
              doc.setTextColor(15, 23, 42);
            } else {
              doc.text(`${item.stock}`, margin + 140, y + 5);
            }

            doc.text(`${item.threshold}`, margin + 160, y + 5);
            y += 7;
          });

          y += 5;
        }

        // LOW STOCK ALERTS WARNING BOX
        if (this.includeLowStockAlerts && this.alertsCount > 0) {
          checkPageBreak(25);
          y += 5;
          doc.setFillColor(254, 243, 199);
          doc.rect(margin, y, contentWidth, 16, 'F');
          doc.setDrawColor(251, 191, 36);
          doc.rect(margin, y, contentWidth, 16, 'D');

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(146, 64, 14);
          doc.text('LOGISTIK-AUFMERKSAMKEIT - LAGERAUFFÜLLUNG ERFORDERLICH:', margin + 5, y + 5);

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(180, 83, 9);
          const alertItems = this.inventory
            .filter(item => item.stock <= item.threshold)
            .map(item => `${item.name} (${item.stock} ${item.unit} verbleibend)`)
            .join(', ');
          
          const alertLines = doc.splitTextToSize(alertItems, contentWidth - 10);
          doc.text(alertLines, margin + 5, y + 10);
          y += 22;
        }

        // EVENT LOGS
        if (this.includeEventLogs && this.events.length > 0) {
          checkPageBreak(50);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text('Heutiger Ereignisverlauf und KI-Inferenzen', margin, y);
          doc.line(margin, y + 2, margin + contentWidth, y + 2);
          y += 8;

          this.events.forEach((evt, index) => {
            checkPageBreak(22);

            if (index > 0) {
              doc.setDrawColor(241, 245, 249);
              doc.line(margin, y, margin + contentWidth, y);
              y += 2;
            }

            let badgeBg = [226, 232, 240];
            let badgeText = [71, 85, 105];
            if (evt.type === 'INGRESO') { badgeBg = [224, 242, 254]; badgeText = [3, 105, 161]; }
            else if (evt.type === 'EGRESO') { badgeBg = [255, 228, 230]; badgeText = [190, 18, 60]; }
            else if (evt.type === 'REUBICACION') { badgeBg = [254, 243, 199]; badgeText = [180, 83, 9]; }
            else if (evt.type === 'ALERTA') { badgeBg = [254, 226, 226]; badgeText = [220, 38, 38]; }

            doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
            doc.rect(margin, y, 22, 5, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
            const translatedType = evt.type === 'INGRESO' ? 'EINGANG' : evt.type === 'EGRESO' ? 'ENTNAHME' : evt.type === 'REUBICACION' ? 'UMLAGERUNG' : evt.type === 'ALERTA' ? 'WARNUNG' : 'SYSTEM';
            doc.text(translatedType, margin + 2, y + 3.5);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(`${evt.camera} | ${evt.timestamp}`, margin + 26, y + 3.5);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            const descLines = doc.splitTextToSize(evt.description, contentWidth - 5);
            doc.text(descLines, margin, y + 8);
            y += 5 + (descLines.length * 4);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Verantwortlich: ${evt.operator} ${evt.items ? ' | Artikel: ' + evt.items : ''}`, margin, y);
            y += 6;
          });
          y += 4;
        }

        // PERSONNEL LOGS
        if (this.includePersonnelLogs && this.people.length > 0) {
          checkPageBreak(40);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text('Mitarbeiterkontrolle und Ausweiszutritte', margin, y);
          doc.line(margin, y + 2, margin + contentWidth, y + 2);
          y += 8;

          this.people.forEach((p) => {
            checkPageBreak(12);
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, contentWidth, 10, 'F');
            doc.setDrawColor(241, 245, 249);
            doc.rect(margin, y, contentWidth, 10, 'D');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(p.name, margin + 4, y + 4);
            
            doc.setFont('Helvetica', 'normal');
            doc.text(p.role, margin + 4, y + 8);

            doc.setFont('Helvetica', 'bold');
            doc.text('Dienstausweis:', margin + 65, y + 4);
            doc.setFont('Helvetica', 'normal');
            doc.text(p.badge, margin + 65, y + 8);

            doc.setFont('Helvetica', 'bold');
            doc.text('Letzte Erfassung:', margin + 115, y + 4);
            doc.setFont('Helvetica', 'normal');
            doc.text(`${p.location} um ${p.detectedAt} Uhr`, margin + 115, y + 8);

            y += 12;
          });
          y += 4;
        }

        // OBSERVATIONS FROM MANAGER
        if (this.reportObservations.trim()) {
          checkPageBreak(30);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text('Notizen und Anmerkungen des Managements', margin, y);
          doc.line(margin, y + 2, margin + contentWidth, y + 2);
          y += 8;

          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y, contentWidth, 18, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, y, contentWidth, 18, 'D');

          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          const obsLines = doc.splitTextToSize(this.reportObservations.trim(), contentWidth - 10);
          doc.text(obsLines, margin + 5, y + 6);
          y += 24;
        }

        // SIGNATURE LINE
        checkPageBreak(30);
        y += 10;
        doc.setDrawColor(203, 213, 225);
        doc.line(margin + 5, y, margin + 70, y);
        doc.line(margin + 105, y, margin + 170, y);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Unterschrift Betriebsleiter', margin + 15, y + 4);
        doc.text('Sicherheitssiegel Hotel Hamburg', margin + 110, y + 4);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Verantwortlicher Zentralschicht', margin + 18, y + 8);
        doc.text('Autonom durch KI validiert', margin + 114, y + 8);

        const fileName = `betriebsbericht_hotel_hamburg_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
        this.isGeneratingPDF = false;
        this.cdr.markForCheck();
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        this.isGeneratingPDF = false;
        this.cdr.markForCheck();
      }
    }, 1200);
  }
}
