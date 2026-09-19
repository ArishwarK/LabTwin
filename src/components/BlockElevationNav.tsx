import React from 'react';
import { FloorLabInfo, LabDevice } from '../types';
import { 
  Building2, 
  ChevronRight, 
  Zap, 
  Wifi, 
  Users, 
  Clock,
  ArrowRight,
  Laptop
} from 'lucide-react';

interface BlockElevationNavProps {
  floors: FloorLabInfo[];
  selectedFloorNumber: number;
  onSelectFloor: (floorNumber: number) => void;
  devices: LabDevice[];
  theme: 'light' | 'dark';
}

export default function BlockElevationNav({
  floors,
  selectedFloorNumber,
  onSelectFloor,
  devices,
  theme
}: BlockElevationNavProps) {
  // Sort floors descending (4, 3, 2, 1, 0) to simulate architectural floor elevation stack
  const sortedFloors = [...floors].sort((a, b) => b.floorNumber - a.floorNumber);

  const isDark = theme === 'dark';

  return (
    <div 
      id="block-elevation-container"
      className={`rounded-xl border transition-colors shadow-sm overflow-hidden ${
        isDark 
          ? 'bg-slate-850 border-slate-700' 
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50/70 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-blue-950'}`}>
                Library Block (Block-A) • Architectural Floor Elevation
              </h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                isDark 
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                5 Floors • 1 Lab Per Floor
              </span>
            </div>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Complete vertical cutaway of all 5 floors in Library Block. Click any floor to jump into its live Digital Twin.
            </p>
          </div>
        </div>
      </div>

      {/* Building Floor Stack (Architectural Cutaway View) */}
      <div className="p-4 space-y-3">
        {sortedFloors.map((floor) => {
          const isSelected = floor.floorNumber === selectedFloorNumber;
          const floorDevices = devices.filter(d => d.floorNumber === floor.floorNumber);
          const activeDevices = floorDevices.filter(d => d.isOnline && d.isPoweredOn).length;
          const totalPower = floorDevices.reduce((sum, d) => sum + (d.isPoweredOn ? d.energyUsage : 0), 0);
          const onlineCount = floorDevices.filter(d => d.isOnline).length;
          const pingRate = floorDevices.length > 0 ? Math.round((onlineCount / floorDevices.length) * 100) : 0;
          
          return (
            <div
              key={floor.labId}
              id={`elevation-floor-card-${floor.floorNumber}`}
              className={`p-4 rounded-xl border transition-all relative ${
                isSelected
                  ? isDark
                    ? 'bg-slate-800 border-blue-500 ring-2 ring-blue-500/40 shadow-md'
                    : 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/30 shadow-sm'
                  : isDark
                    ? 'bg-slate-800/60 border-slate-700 hover:border-blue-500/50 hover:bg-slate-800'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Left Floor Badge & Names */}
                <div className="flex items-start gap-3.5">
                  {/* Floor Level Pill */}
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono flex-shrink-0 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : isDark
                        ? 'bg-slate-700 text-slate-300 border-slate-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-tighter">LEVEL</span>
                    <span className="text-lg font-black leading-none">
                      {floor.floorNumber === 0 ? 'GF' : `${floor.floorNumber}F`}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? isDark ? 'bg-blue-900/60 text-blue-300 border border-blue-600' : 'bg-blue-100 text-blue-800 border border-blue-300'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {floor.labCode}
                      </span>
                      <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {floor.roomNumber}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                          Active Selection
                        </span>
                      )}
                    </div>

                    <h3 className={`text-sm font-extrabold mt-1 ${
                      isSelected 
                        ? isDark ? 'text-white' : 'text-blue-950'
                        : isDark ? 'text-slate-200' : 'text-slate-900'
                    }`}>
                      {floor.labName}
                    </h3>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {floor.department} • Faculty In-Charge: <strong>{floor.facultyInCharge}</strong>
                    </p>
                  </div>
                </div>

                {/* Middle: Live Floor Telemetry Chips */}
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {/* Power Draw */}
                  <div className={`p-2 rounded-lg border text-center ${
                    isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <Zap className="h-3 w-3 text-blue-500" />
                      <span>Power</span>
                    </div>
                    <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                      {totalPower} W
                    </span>
                  </div>

                  {/* Online ping rate */}
                  <div className={`p-2 rounded-lg border text-center ${
                    isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <Wifi className="h-3 w-3 text-emerald-500" />
                      <span>Ping Rate</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {pingRate}%
                    </span>
                  </div>

                  {/* Active workstations */}
                  <div className={`p-2 rounded-lg border text-center ${
                    isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <Laptop className="h-3 w-3 text-indigo-500" />
                      <span>Stations</span>
                    </div>
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {activeDevices}/{floorDevices.length}
                    </span>
                  </div>
                </div>

                {/* Right: Select Floor Button */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectFloor(floor.floorNumber)}
                    className={`py-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : isDark
                          ? 'bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white'
                          : 'bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 shadow-xs'
                    }`}
                  >
                    <span>{isSelected ? 'Currently Viewing' : 'Switch To Lab'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Class Session Mini Banner */}
              {floor.currentSession && (
                <div className={`mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between text-xs font-mono ${
                  isDark ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    <span>Live Class: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                      {floor.currentSession.courseCode} — {floor.currentSession.courseTitle}
                    </strong> ({floor.currentSession.batch})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Attendance: <strong>{floor.currentSession.attendance}</strong> / {floor.totalCapacity} Students</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
