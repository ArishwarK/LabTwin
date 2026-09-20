import React from 'react';
import { FloorLabInfo, LabDevice } from '../types';
import { 
  Monitor, 
  Server, 
  Printer, 
  ShieldAlert, 
  Zap, 
  GraduationCap
} from 'lucide-react';

interface LabFloorPlanProps {
  floor: FloorLabInfo;
  devices: LabDevice[];
  selectedDevice: LabDevice | null;
  onSelectDevice: (device: LabDevice) => void;
  theme: 'light' | 'dark';
}

export default function LabFloorPlan({
  floor,
  devices,
  selectedDevice,
  onSelectDevice,
  theme
}: LabFloorPlanProps) {
  const isDark = theme === 'dark';

  // Group devices by bench
  const podiumDevice = devices.find(d => d.bench.includes('Podium') || (d.category === 'workstation' && d.id.includes('PODIUM')));
  const benchADevices = devices.filter(d => d.bench.includes('Row 1') || d.bench.includes('Bench A'));
  const benchBDevices = devices.filter(d => d.bench.includes('Row 2') || d.bench.includes('Bench B'));
  const serverDevices = devices.filter(d => d.category === 'server');
  const peripheralDevices = devices.filter(d => d.category === 'peripheral');
  const safetyDevices = devices.filter(d => d.category === 'safety');

  const renderDeviceCard = (device: LabDevice, isPodium: boolean = false) => {
    const isSelected = selectedDevice?.id === device.id;

    return (
      <button
        key={device.id}
        type="button"
        id={`plan-device-${device.id}`}
        onClick={() => onSelectDevice(device)}
        className={`w-full min-w-0 overflow-hidden p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group ${
          isPodium ? 'min-h-[96px]' : 'min-h-[86px]'
        } ${
          isSelected
            ? isDark
              ? 'bg-slate-750 border-blue-500 ring-2 ring-blue-500/40 shadow-md text-white'
              : 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/30 shadow-sm text-blue-950'
            : isDark
              ? 'bg-slate-800 border-slate-750 hover:border-blue-500/60 hover:bg-slate-750 text-slate-200'
              : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-800 shadow-xs'
        }`}
      >
        {/* Card Header: Device Name & ID */}
        <div className="flex items-start justify-between gap-2 w-full min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 w-full">
              {isPodium ? (
                <GraduationCap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              ) : device.category === 'server' ? (
                <Server className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              ) : device.category === 'peripheral' ? (
                <Printer className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
              ) : device.category === 'safety' ? (
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
              ) : (
                <Monitor className={`h-3.5 w-3.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              )}
              <span className={`text-xs font-bold truncate block min-w-0 ${
                isSelected 
                  ? isDark ? 'text-white' : 'text-blue-900' 
                  : isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                {device.name}
              </span>
            </div>
            <span className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate min-w-0">
              {device.id} • {device.ipAddress}
            </span>
          </div>

          {/* Status dots */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            {/* Ping Indicator */}
            <span 
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                device.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'
              }`} 
              title={device.isOnline ? 'Online (Ping Reachable)' : 'Offline (Unreachable)'}
            />
            {/* Power Relay Indicator */}
            <span 
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                device.isPoweredOn ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-slate-400'
              }`} 
              title={device.isPoweredOn ? 'Relay Power ON' : 'Relay Power OFF'}
            />
          </div>
        </div>

        {/* Card Footer: Live Watts & State Label */}
        <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] font-mono w-full min-w-0">
          <span className={`flex items-center gap-1 flex-shrink-0 ${
            device.isPoweredOn 
              ? isDark ? 'text-blue-400 font-bold' : 'text-blue-700 font-bold' 
              : 'text-slate-400 dark:text-slate-500'
          }`}>
            <Zap className="h-3 w-3 flex-shrink-0" />
            <span>{device.isPoweredOn ? `${device.energyUsage} W` : '0 W'}</span>
          </span>

          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
            device.isOnline && device.isPoweredOn
              ? isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : !device.isOnline
              ? isDark ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' : 'bg-rose-50 text-rose-700 border border-rose-200'
              : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {device.isOnline ? (device.isPoweredOn ? 'ACTIVE' : 'STANDBY') : 'OFFLINE'}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div 
      id="lab-floor-plan-card"
      className={`rounded-2xl border shadow-sm overflow-hidden transition-colors w-full min-w-0 ${
        isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
      }`}
    >
      {/* Plan Header */}
      <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50/70 border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
              Floor Digital Twin Architecture • {floor.roomNumber}
            </h3>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              isDark ? 'bg-blue-900/50 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              {floor.labCode}
            </span>
          </div>
          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Click any workstation or system component to view diagnostics and manage relay state.
          </p>
        </div>

        {/* Legend */}
        <div className={`flex flex-wrap items-center gap-3 text-xs font-mono px-3 py-1.5 rounded-xl border ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
            <span>Offline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400"></span>
            <span>Power ON</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
            <span>Power OFF</span>
          </div>
        </div>
      </div>

      {/* Blueprint Grid Layout */}
      <div className={`p-4 sm:p-5 w-full min-w-0 ${
        isDark ? 'bg-slate-900' : 'bg-slate-50/70'
      }`}>
        
        {/* Lab Perimeter Outline */}
        <div className={`border-2 rounded-2xl p-4 sm:p-5 relative w-full min-w-0 overflow-hidden ${
          isDark ? 'border-slate-700 bg-slate-850/90' : 'border-slate-200 bg-white'
        }`}>
          {/* Room Badge in corner */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b pb-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                isDark ? 'bg-blue-600 text-white' : 'bg-blue-700 text-white'
              }`}>
                {floor.floorName.toUpperCase()} ENTRANCE
              </span>
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {floor.labName}
              </span>
            </div>
            <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Capacity: {floor.totalCapacity} Workstations
            </span>
          </div>

          {/* Section 1: Front Demonstration & Teaching Stage (Podium) */}
          <div className="mb-5 w-full min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${
                isDark ? 'text-blue-400' : 'text-blue-700'
              }`}>
                [Zone 0] Faculty Demonstration Stage & Master Console
              </span>
            </div>
            
            <div className={`p-3 rounded-xl border max-w-md mx-auto w-full min-w-0 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              {podiumDevice ? (
                renderDeviceCard(podiumDevice, true)
              ) : (
                <div className="text-center py-2 text-xs text-slate-400">Faculty Master Console</div>
              )}
            </div>
          </div>

          {/* Section 2: Student Computer Benches (Bench A & Bench B) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full min-w-0">
            {/* Bench A / Row 1 */}
            <div className={`p-3.5 rounded-xl border w-full min-w-0 overflow-hidden ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${
                  isDark ? 'text-blue-400' : 'text-blue-700'
                }`}>
                  Row 1 • Workstation Bench A
                </span>
                <span className="text-[10px] font-mono text-slate-400">{benchADevices.length} Stations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full min-w-0">
                {benchADevices.map(d => renderDeviceCard(d))}
              </div>
            </div>

            {/* Bench B / Row 2 */}
            <div className={`p-3.5 rounded-xl border w-full min-w-0 overflow-hidden ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${
                  isDark ? 'text-blue-400' : 'text-blue-700'
                }`}>
                  Row 2 • Workstation Bench B
                </span>
                <span className="text-[10px] font-mono text-slate-400">{benchBDevices.length} Stations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full min-w-0">
                {benchBDevices.map(d => renderDeviceCard(d))}
              </div>
            </div>
          </div>

          {/* Section 3: Facility Infrastructure Zone (Servers, Peripherals & Safety) */}
          {/* Guaranteed NO overlap: Each column is strictly bounded with min-w-0 and responsive grid */}
          <div className="w-full min-w-0 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="mb-3">
              <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Facility Infrastructure & Auxiliary Relays
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
              {/* 1. Server Rack Bay */}
              <div className={`p-3.5 rounded-xl border w-full min-w-0 overflow-hidden flex flex-col justify-start ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-700 w-full min-w-0">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono truncate ${
                    isDark ? 'text-blue-400' : 'text-blue-700'
                  }`}>
                    Server & Rack Unit
                  </span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex-shrink-0 ml-1">
                    Rack Bay
                  </span>
                </div>
                <div className="space-y-2 w-full min-w-0">
                  {serverDevices.length > 0 ? (
                    serverDevices.map(d => renderDeviceCard(d))
                  ) : (
                    <div className="text-center py-4 text-[11px] text-slate-400 font-mono">
                      No rack servers on this floor
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Peripherals Bay */}
              <div className={`p-3.5 rounded-xl border w-full min-w-0 overflow-hidden flex flex-col justify-start ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-700 w-full min-w-0">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider font-mono truncate ${
                    isDark ? 'text-blue-400' : 'text-blue-700'
                  }`}>
                    Peripheral Bay
                  </span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex-shrink-0 ml-1">
                    Shared Hub
                  </span>
                </div>
                <div className="space-y-2 w-full min-w-0">
                  {peripheralDevices.length > 0 ? (
                    peripheralDevices.map(d => renderDeviceCard(d))
                  ) : (
                    <div className="text-center py-4 text-[11px] text-slate-400 font-mono">
                      No peripherals on this floor
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Safety & Breaker */}
              <div className={`p-3.5 rounded-xl border w-full min-w-0 overflow-hidden flex flex-col justify-start ${
                isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-700 w-full min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-rose-600 dark:text-rose-400 truncate">
                    Safety & Breaker
                  </span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex-shrink-0 ml-1">
                    Panel
                  </span>
                </div>
                <div className="space-y-2 w-full min-w-0">
                  {safetyDevices.length > 0 ? (
                    safetyDevices.map(d => renderDeviceCard(d))
                  ) : (
                    <div className="text-center py-4 text-[11px] text-slate-400 font-mono">
                      No safety breakers on this floor
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
