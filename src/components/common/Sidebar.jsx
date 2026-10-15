import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Camera,
  AlertTriangle,
  Sliders,
  Bot,
  TrendingUp,
  Leaf,
  ShieldCheck,
  Users
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, alertsCount = 0 }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'EcoPulse Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'digital-twin',
      label: 'Digital Twin (Map)',
      icon: MapPin,
      badge: '5 Zones'
    },
    {
      id: 'agentic-hub',
      label: 'Agentic AI Hub',
      icon: ShieldCheck,
      badge: '4 Active'
    },
    {
      id: 'occupancy',
      label: 'Occupancy Heatmap',
      icon: Users,
      badge: 'Live'
    },
    {
      id: 'vision-scanner',
      label: 'AI Vision Scanner',
      icon: Camera,
      badge: 'Beta'
    },
    {
      id: 'smart-alerts',
      label: 'Smart Alerts',
      icon: AlertTriangle,
      badge: alertsCount > 0 ? `${alertsCount}` : null,
      badgeVariant: alertsCount > 0 ? 'critical' : 'normal'
    },
    {
      id: 'simulator',
      label: 'What-If Simulator',
      icon: Sliders,
      badge: 'Sandbox'
    },
    {
      id: 'eco-assistant',
      label: 'Eco AI Assistant',
      icon: Bot,
      badge: 'Agent'
    },
    {
      id: 'impact-reports',
      label: 'Impact Reports',
      icon: TrendingUp,
      badge: null
    }
  ];

  return (
    <aside className="sidebar-container" aria-label="Main Navigation">
      <div className="sidebar-section-title">Campus Intelligence</div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="nav-item-icon-wrap">
                <Icon size={18} />
              </span>
              <span className="nav-item-label">{item.label}</span>
              {item.badge && (
                <span className={`nav-item-badge ${item.badgeVariant === 'critical' ? 'badge-alert' : ''}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sustainable Campus Badge Footer */}
      <div className="sidebar-footer">
        <div className="campus-cert-card">
          <div className="cert-header">
            <Leaf size={16} className="text-emerald" />
            <span className="cert-title">Green Campus Pilot</span>
          </div>
          <p className="cert-desc">Targeting net-zero emissions &amp; 85% waste diversion by 2030.</p>
          <div className="cert-status-row">
            <ShieldCheck size={14} className="text-teal" />
            <span>ISO 50001 Standard</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
