# Dashboard Design & UI/UX Improvements Guide
## Rental Management System - Property Collections Dashboard

**Project**: Rental Management System Multi-User  
**Focus**: Main Dashboard & Collections Analytics  
**Frontend Stack**: React 18 + Vite + Tailwind CSS  
**Backend**: Supabase (PostgreSQL + Real-time)  
**Version**: 1.0 - Dashboard Enhancement Documentation

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Dashboard Architecture](#dashboard-architecture)
3. [Information Architecture - F-Pattern](#information-architecture---f-pattern)
4. [Core Components & Layouts](#core-components--layouts)
5. [CSS Design System](#css-design-system)
6. [Advanced Animations & Interactions](#advanced-animations--interactions)
7. [Real-Time Data Integration](#real-time-data-integration)
8. [Implementation Guidelines](#implementation-guidelines)

---

## 1. Executive Summary

### Problem Statement
The current Rental Manager dashboard displays functional information but lacks:
- **Visual hierarchy clarity** for critical KPIs (rent collection, occupancy)
- **Action-oriented design** (only shows data, not next-best-actions)
- **Responsive widget system** (fixed layouts vs. user customization)
- **Real-time updates** for payment status changes
- **Mobile optimization** for property managers on the move
- **Visual differentiation** between healthy/at-risk metrics

### Solution
Implement a **modular, action-driven dashboard** using:
- **F-Pattern information architecture** for natural scanning
- **Hierarchical KPI display** (primary vs. secondary metrics)
- **Drag-and-drop widget customization** for different user roles
- **Real-time Supabase subscriptions** for live payment updates
- **Color-coded status indicators** (green=paid, amber=due soon, red=overdue)
- **Mobile-first responsive design** with touch-optimized interactions

### Expected Outcomes
- ↑ **40% faster decision-making** via clearer data hierarchy
- ↑ **Real-time payment alerts** reducing collection delays
- ↓ **80% reduction in time finding critical information**
- ✓ **Professional, modern aesthetic** differentiating from generic dashboards

---

## 2. Dashboard Architecture

### 2.1 Layout Structure - F-Pattern Scanning

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Navigation + User Profile + Quick Actions          │  ← Primary scanning zone
├─────────────────────────────────────────────────────────────┤
│ PRIMARY KPI CARDS (4 columns)                               │  ← Eye focus here
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ Revenue  │ │Collections│ │Occupancy │ │Overdue  │       │
│ │$2,310    │ │ 95%       │ │ 100%     │ │ $180    │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│ LEFT COLUMN (30%)    │ CENTER COLUMN (40%)  │ RIGHT (30%)  │  ← Secondary scanning
├──────────────────────┼──────────────────────┼──────────────┤
│ QUICK ACTIONS        │ MAIN CHART           │ ALERT STACK  │
│ □ New Payment        │ Revenue Trend (L)    │ • Overdue 1  │
│ □ New Property       │ (6 months)           │ • Gas Due    │
│ □ View Reports       │                      │ • Check Rec. │
│ □ Messages (3)       │                      │              │
├──────────────────────┼──────────────────────┼──────────────┤
│ PROPERTY LIST (card) │ COLLECTIONS TABLE    │ RECENT       │
│ CASA 1               │ (Sortable/Filterable)│ ACTIVITY     │
│ ✓ Paid              │                      │ Log feed     │
│                      │                      │              │
└──────────────────────┴──────────────────────┴──────────────┘
```

**Why F-Pattern?**
- Users scan left-to-right horizontally first (KPIs)
- Then drop down to next row (action area)
- Critical info in "hot zones": top-left, center, top-right
- Secondary info naturally follows in left-column, then center

### 2.2 Grid System

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
  padding: 2rem;
}

/* Primary KPI Cards - Full Width Row */
.kpi-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

/* 3-Column Layout */
.main-content {
  grid-column: 1 / 9;  /* 2/3 width */
}

.sidebar {
  grid-column: 9 / -1;  /* 1/3 width */
}

/* Responsive Breakpoints */
@media (max-width: 1024px) {
  .main-content {
    grid-column: 1 / -1;
  }
  .sidebar {
    grid-column: 1 / -1;
  }
}
```

---

## 3. Information Architecture - F-Pattern

### 3.1 Primary Metrics (Top Row)

These are **decision-critical KPIs** visible before scrolling:

```jsx
// KPI Card Component Structure
<div className="kpi-card">
  <div className="kpi-header">
    <h3 className="kpi-label">Total Owed (This Month)</h3>
    <span className="kpi-trend down">↓ 8%</span>
  </div>
  <div className="kpi-value">RD$2,310</div>
  <div className="kpi-detail">
    <span>Collected: RD$2,130 (92%)</span>
    <span className="alert">Pending: RD$180</span>
  </div>
  <div className="kpi-action">
    <button className="btn-micro">View Details →</button>
  </div>
</div>
```

**Primary KPIs:**
1. **Total Monthly Revenue** - "RD$2,310 / 2 properties"
   - Status: Green (on track), Amber (warning), Red (behind)
   - Mini chart: 3-month trend sparkline
   
2. **Collection Rate** - "95% Collected"
   - Goal: 100% collected by month-end
   - Micro-copy: "2 months: 98% avg"
   - Action: "View Overdue →"

3. **Occupancy Rate** - "100%"
   - Secondary: "2/2 properties rented"
   - Trend: 3-month avg
   - Warning state: <90% occupancy

4. **Action Required** - "1 Overdue Rent"
   - Icon badge with count
   - Most urgent metric (always visible)
   - Link to alerts section

### 3.2 Visual Hierarchy

```css
/* Establish clear priority */
.kpi-value {
  font-size: 2.5rem;           /* Largest - grabbs attention */
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.kpi-label {
  font-size: 0.875rem;         /* Small, secondary */
  color: var(--color-text-secondary);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.kpi-detail {
  font-size: 0.8rem;           /* Tertiary info */
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
}

.alert {
  color: var(--color-error);   /* Urgent: red */
  font-weight: 600;
}

.success {
  color: var(--color-success); /* Positive: green */
}
```

---

## 4. Core Components & Layouts

### 4.1 KPI Card Component (CSS)

```css
.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

/* Hover State - Subtle elevation */
.kpi-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(33, 128, 160, 0.15);
  transform: translateY(-2px);
}

/* Accent Bar - Left border for status */
.kpi-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, 
    var(--color-primary) 0%, 
    var(--color-primary-light) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.kpi-card:hover::before {
  opacity: 1;
}

/* Status Variants */
.kpi-card.status-success {
  border-left: 4px solid var(--color-success);
}

.kpi-card.status-warning {
  border-left: 4px solid var(--color-warning);
}

.kpi-card.status-error {
  border-left: 4px solid var(--color-error);
  background: rgba(239, 68, 68, 0.05);
}

/* Sparkline Chart (Mini) */
.kpi-sparkline {
  height: 24px;
  margin-top: 1rem;
  opacity: 0.7;
}

/* Header with Trend */
.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.kpi-trend {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.kpi-trend.down {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}
```

### 4.2 Alert/Action Stack (Right Sidebar)

```css
.alert-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alert-item {
  padding: 1rem;
  border-radius: 10px;
  background: var(--color-surface);
  border-left: 4px solid var(--color-warning);
  display: flex;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.alert-item:hover {
  background: rgba(245, 158, 11, 0.08);
  transform: translateX(4px);
}

.alert-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.alert-icon.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-radius: 6px;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.alert-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Badge Counter */
.alert-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-error);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}
```

### 4.3 Chart Container (Main Content)

```css
.chart-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  grid-column: 1 / 9;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.chart-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.chart-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-period {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.btn-period.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.chart-content {
  height: 300px;
  position: relative;
}
```

### 4.4 Data Table (Collections)

```css
.collections-table {
  width: 100%;
  border-collapse: collapse;
  grid-column: 1 / -1;
  margin-top: 2rem;
}

.table-header {
  background: rgba(33, 128, 160, 0.05);
  border-bottom: 2px solid var(--color-border);
}

.table-header th {
  padding: 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  cursor: pointer;
  user-select: none;
}

.table-header th:hover {
  background: rgba(33, 128, 160, 0.1);
}

/* Sort indicator */
.table-header th.sortable::after {
  content: ' ⇅';
  opacity: 0;
  transition: opacity 0.2s ease;
}

.table-header th.sortable:hover::after {
  opacity: 0.5;
}

.table-body td {
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.table-body tr:hover {
  background: rgba(33, 128, 160, 0.02);
}

/* Status Badge in Table */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.paid {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.status-badge.pending {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.status-badge.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

/* Quick Action Buttons */
.table-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
```

---

## 5. CSS Design System

### 5.1 Extended Color Variables

```css
:root {
  /* Primary Brand */
  --color-primary: #2180a0;
  --color-primary-light: #32b8c6;
  --color-primary-dark: #186b80;
  
  /* Background */
  --color-bg-primary: #0f172e;
  --color-bg-secondary: #0a0e1f;
  --color-surface: #1a2547;
  
  /* Status Colors - Payment States */
  --color-paid: #22c55e;        /* Green - Payment complete */
  --color-pending: #f59e0b;     /* Amber - Due soon */
  --color-overdue: #ef4444;     /* Red - Past due */
  --color-partial: #3b82f6;     /* Blue - Partial payment */
  
  /* Text */
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a8b0b8;
  --color-border: #1e293b;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);
  
  /* Spacing */
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  
  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
}
```

### 5.2 Utility Classes

```css
/* Responsive Text */
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.5rem; }
.text-2xl { font-size: 2rem; }

.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

/* Spacing */
.p-1 { padding: var(--spacing-xs); }
.p-2 { padding: var(--spacing-sm); }
.p-3 { padding: var(--spacing-md); }

.m-1 { margin: var(--spacing-xs); }
.m-2 { margin: var(--spacing-sm); }

.gap-1 { gap: var(--spacing-xs); }
.gap-2 { gap: var(--spacing-sm); }
.gap-3 { gap: var(--spacing-md); }

/* Display */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }

.grid { display: grid; }

.block { display: block; }
.hidden { display: none; }

/* Colors */
.text-success { color: var(--color-success); }
.text-error { color: var(--color-error); }
.text-warning { color: var(--color-warning); }

.bg-success { background: rgba(34, 197, 94, 0.1); }
.bg-error { background: rgba(239, 68, 68, 0.1); }

/* Opacity */
.opacity-50 { opacity: 0.5; }
.opacity-75 { opacity: 0.75; }
```

---

## 6. Advanced Animations & Interactions

### 6.1 KPI Card Load Animation

```css
@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.kpi-grid > .kpi-card {
  animation: cardSlideIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
}

/* Stagger effect - each card delays */
.kpi-card:nth-child(1) { animation-delay: 0.1s; }
.kpi-card:nth-child(2) { animation-delay: 0.2s; }
.kpi-card:nth-child(3) { animation-delay: 0.3s; }
.kpi-card:nth-child(4) { animation-delay: 0.4s; }
```

### 6.2 Value Change Animation (Real-Time Updates)

```css
@keyframes valueFlip {
  0% {
    opacity: 0;
    transform: translateY(-20px) rotateX(90deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotateX(0deg);
  }
}

.kpi-value.updating {
  animation: valueFlip 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Highlight on change */
.kpi-card.changed {
  background: linear-gradient(135deg,
    rgba(34, 197, 94, 0.1) 0%,
    transparent 100%);
  animation: pulseGlow 1s ease-in-out;
}

@keyframes pulseGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}
```

### 6.3 Alert Slide-In Notification

```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.alert-item {
  animation: slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Stagger multiple alerts */
.alert-item:nth-child(1) { animation-delay: 0.1s; }
.alert-item:nth-child(2) { animation-delay: 0.2s; }
.alert-item:nth-child(3) { animation-delay: 0.3s; }

/* Exit animation */
.alert-item.removing {
  animation: slideOutRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
```

### 6.4 Loading State Skeleton

```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
  border-radius: var(--radius-md);
}

.skeleton-card {
  height: 120px;
  margin-bottom: 1rem;
}

.skeleton-line {
  height: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
}
```

---

## 7. Real-Time Data Integration

### 7.1 Supabase Real-Time Subscription (React)

```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const usePaymentUpdates = (propertyId) => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    // Initial fetch
    const fetchPayments = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      setPayments(data || []);
    };

    fetchPayments();

    // Real-time subscription
    const subscription = supabase
      .channel(`payments:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Add animation class to trigger notification
            setPayments((prev) => [payload.new, ...prev]);
            triggerAnimation('payment-received');
          } else if (payload.eventType === 'UPDATE') {
            setPayments((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [propertyId]);

  return { payments };
};
```

### 7.2 KPI Value Update with Animation

```jsx
export const KPICard = ({ label, value, prevValue, trend }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setIsUpdating(true);
      
      // Trigger animation
      setTimeout(() => {
        setDisplayValue(value);
        setTimeout(() => setIsUpdating(false), 400);
      }, 0);
    }
  }, [value, prevValue]);

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <h3 className="kpi-label">{label}</h3>
        <span className={`kpi-trend ${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      </div>
      
      <div className={`kpi-value ${isUpdating ? 'updating' : ''}`}>
        {displayValue}
      </div>

      <div className="kpi-detail">
        Trend: {trend > 0 ? '+' : ''}{trend}% from last period
      </div>
    </div>
  );
};
```

---

## 8. Implementation Guidelines

### 8.1 React Dashboard Component Structure

```jsx
// DashboardLayout.jsx
import React, { useState, useCallback } from 'react';
import { KPIGrid } from './components/KPIGrid';
import { AlertStack } from './components/AlertStack';
import { RevenueChart } from './components/RevenueChart';
import { CollectionsTable } from './components/CollectionsTable';
import './Dashboard.css';

export const Dashboard = () => {
  const [filters, setFilters] = useState({
    period: 'month',
    propertyId: 'all',
  });

  const [kpis, setKpis] = useState({
    totalRevenue: 2310,
    collectionRate: 0.95,
    occupancyRate: 1.0,
    overdueCount: 1,
  });

  const handlePeriodChange = useCallback((period) => {
    setFilters((prev) => ({ ...prev, period }));
    // Refetch data
  }, []);

  return (
    <div className="dashboard-page">
      {/* Background */}
      <div className="dashboard-background"></div>

      {/* Main Container */}
      <div className="dashboard-container">
        
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Dashboard</h1>
            <p className="subtitle">Manage your rental properties</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary">+ New Payment</button>
            <button className="btn btn-secondary">⚙ Settings</button>
          </div>
        </header>

        {/* KPI Grid */}
        <section className="kpi-grid">
          <KPICard
            label="Total Monthly Revenue"
            value="RD$2,310"
            status="success"
            trend={8}
            detail="2 properties"
          />
          <KPICard
            label="Collection Rate"
            value="95%"
            status="success"
            trend={-2}
            detail="RD$2,130 collected"
          />
          <KPICard
            label="Occupancy Rate"
            value="100%"
            status="success"
            trend={0}
            detail="2/2 properties rented"
          />
          <KPICard
            label="Overdue Rent"
            value="RD$180"
            status="error"
            action="View Details"
          />
        </section>

        {/* Main Grid */}
        <div className="dashboard-grid">
          
          {/* Left Column - Quick Actions */}
          <aside className="sidebar sidebar-left">
            <QuickActions />
          </aside>

          {/* Center - Revenue Chart */}
          <main className="main-content">
            <RevenueChart period={filters.period} />
            <CollectionsTable />
          </main>

          {/* Right Column - Alerts */}
          <aside className="sidebar sidebar-right">
            <AlertStack />
          </aside>

        </div>

      </div>
    </div>
  );
};
```

### 8.2 Responsive Mobile Adjustments

```css
/* Tablet (768px) */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }

  .main-content {
    grid-column: 1 / -1;
  }

  .sidebar-right {
    grid-column: 1 / -1;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile (480px) */
@media (max-width: 640px) {
  .dashboard-container {
    padding: 1rem;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .kpi-card {
    padding: 1rem;
  }

  .kpi-value {
    font-size: 1.5rem;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .sidebar-left,
  .main-content,
  .sidebar-right {
    grid-column: 1;
  }

  .chart-container {
    padding: 1rem;
  }

  .chart-content {
    height: 200px;
  }
}
```

---

## 9. Performance Optimization

### 9.1 Virtualization for Large Tables

```jsx
import { FixedSizeList as List } from 'react-window';

export const VirtualizedPaymentsTable = ({ payments }) => {
  const Row = ({ index, style }) => (
    <div style={style} className="table-row">
      <td>{payments[index].property}</td>
      <td>{payments[index].tenant}</td>
      <td className="text-right">{payments[index].amount}</td>
      <td>
        <span className={`status-badge status-${payments[index].status}`}>
          {payments[index].status}
        </span>
      </td>
    </div>
  );

  return (
    <List
      height={600}
      itemCount={payments.length}
      itemSize={48}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### 9.2 Memo for KPI Cards to Prevent Re-renders

```jsx
export const MemoizedKPICard = React.memo(KPICard, (prev, next) => {
  // Only re-render if value or trend changed
  return prev.value === next.value && prev.trend === next.trend;
});
```

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Page Load Time** | <2s | Lighthouse Performance API |
| **KPI Update Latency** | <500ms | Real-time subscription response time |
| **Mobile Score** | >95 | Lighthouse Mobile Audit |
| **Time to First Insight** | <1s | Time until primary KPIs visible |
| **User Action Completion** | <3 clicks | Average clicks to view overdue rents |

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Ready for Implementation